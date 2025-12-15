import { useEffect, useRef, useCallback, useState } from 'react';
import { useCardStore } from '../store/cardStore';
import { useThemeStore } from '../store/themeStore';
import { createCanvasController, type CanvasController } from '../lib/canvasController';
import { createDragHandler, type DragHandler } from '../lib/dragHandler';
import { createResizeHandler, type ResizeHandler } from '../lib/resizeHandler';
import { createPasteHandler, type PasteHandler } from '../lib/pasteHandler';
import { Card } from './Card';
import { Menu } from './Menu';
import { FontSizeControl } from './FontSizeControl';
import { v4 as uuidv4 } from 'uuid';
import type { Card as CardType } from '../types';

export function Canvas() {
    const containerRef = useRef<HTMLDivElement>(null);
    const transformRef = useRef<HTMLDivElement>(null);
    const canvasControllerRef = useRef<CanvasController | null>(null);
    const dragHandlerRef = useRef<DragHandler | null>(null);
    const resizeHandlerRef = useRef<ResizeHandler | null>(null);
    const pasteHandlerRef = useRef<PasteHandler | null>(null);

    const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
    const [editingCardId, setEditingCardId] = useState<string | null>(null);

    const cards = useCardStore((s) => s.cards);
    const isHydrated = useCardStore((s) => s.isHydrated);
    const hydrate = useCardStore((s) => s.hydrate);
    const addCard = useCardStore((s) => s.addCard);
    const updateCardPosition = useCardStore((s) => s.updateCardPosition);
    const updateCardSize = useCardStore((s) => s.updateCardSize);
    const updateCardContent = useCardStore((s) => s.updateCardContent);
    const removeCard = useCardStore((s) => s.removeCard);

    const isDark = useThemeStore((s) => s.isDark);

    // Apply dark mode class to body
    useEffect(() => {
        document.body.classList.toggle('dark', isDark);
    }, [isDark]);

    // Initialize on mount
    useEffect(() => {
        hydrate();
    }, [hydrate]);

    // Set up imperative handlers
    useEffect(() => {
        if (!containerRef.current || !transformRef.current) return;

        const canvasController = createCanvasController(
            containerRef.current,
            transformRef.current
        );
        canvasControllerRef.current = canvasController;

        const dragHandler = createDragHandler(
            (cardId, x, y) => updateCardPosition(cardId, x, y),
            () => canvasController.getScale()
        );
        dragHandlerRef.current = dragHandler;

        const resizeHandler = createResizeHandler(
            (cardId, x, y, w, h) => useCardStore.getState().updateCardGeometry(cardId, x, y, w, h),
            () => canvasController.getScale()
        );
        resizeHandlerRef.current = resizeHandler;

        const pasteHandler = createPasteHandler(
            (screenX, screenY) => canvasController.screenToCanvas(screenX, screenY),
            (card) => addCard(card),
            containerRef.current
        );
        pasteHandlerRef.current = pasteHandler;

        return () => {
            canvasController.destroy();
            dragHandler.destroy();
            resizeHandler.destroy();
            pasteHandler.destroy();
        };
    }, [addCard, updateCardPosition, updateCardSize]);

    // Keyboard handler for delete
    useEffect(() => {
        function handleKeyDown(e: KeyboardEvent) {
            if (e.key === 'Backspace' || e.key === 'Delete') {
                // Don't delete if typing in an input
                if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
                    return;
                }
                if (selectedCardId && !editingCardId) {
                    e.preventDefault();
                    removeCard(selectedCardId);
                    setSelectedCardId(null);
                }
            }
            // Escape to deselect
            if (e.key === 'Escape') {
                setSelectedCardId(null);
                setEditingCardId(null);
            }
        }

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selectedCardId, editingCardId, removeCard]);

    // Double-click to create text card
    const handleDoubleClick = useCallback((e: React.MouseEvent) => {
        // Only on canvas background
        const target = e.target as HTMLElement;
        if (target !== containerRef.current && target !== transformRef.current) {
            return;
        }

        const canvasPos = canvasControllerRef.current?.screenToCanvas(e.clientX, e.clientY);
        if (!canvasPos) return;

        const newCard: CardType = {
            id: uuidv4(),
            type: 'text',
            content: '',
            position: { x: canvasPos.x, y: canvasPos.y },
            createdAt: Date.now(),
        };
        addCard(newCard);
        setSelectedCardId(newCard.id);
        setEditingCardId(newCard.id);
    }, [addCard]);

    // Click to select card
    const handleCardSelect = useCallback((cardId: string) => {
        setSelectedCardId(cardId);
    }, []);

    // Sync selection state with resize handler
    useEffect(() => {
        resizeHandlerRef.current?.setSelected(selectedCardId);
    }, [selectedCardId]);

    // Click canvas to deselect
    const handleCanvasClick = useCallback((e: React.MouseEvent) => {
        const target = e.target as HTMLElement;
        if (target === containerRef.current || target === transformRef.current) {
            setSelectedCardId(null);
            setEditingCardId(null);
        }
    }, []);

    // Card content update handler
    const handleCardContentUpdate = useCallback((cardId: string, content: string) => {
        updateCardContent(cardId, content);
    }, [updateCardContent]);

    // Stop editing
    const handleCardBlur = useCallback(() => {
        setEditingCardId(null);
    }, []);

    // Drag handler registration
    const registerDrag = useCallback((element: HTMLElement, cardId: string) => {
        dragHandlerRef.current?.register(element, cardId);
    }, []);

    const unregisterDrag = useCallback((cardId: string) => {
        dragHandlerRef.current?.unregister(cardId);
    }, []);

    const registerResize = useCallback((element: HTMLElement, cardId: string) => {
        resizeHandlerRef.current?.register(element, cardId);
    }, []);

    const unregisterResize = useCallback((cardId: string) => {
        resizeHandlerRef.current?.unregister(cardId);
    }, []);

    return (
        <div
            className="canvas-container"
            ref={containerRef}
            onClick={handleCanvasClick}
            onDoubleClick={handleDoubleClick}
        >
            <div className="canvas-transform" ref={transformRef}>
                {cards.map((card) => (
                    <Card
                        key={card.id}
                        card={card}
                        isSelected={selectedCardId === card.id}
                        isEditing={editingCardId === card.id}
                        onSelect={handleCardSelect}
                        onContentUpdate={handleCardContentUpdate}
                        onBlur={handleCardBlur}
                        registerDrag={registerDrag}
                        unregisterDrag={unregisterDrag}
                        registerResize={registerResize}
                        unregisterResize={unregisterResize}
                        onDelete={removeCard}
                    />
                ))}
            </div>

            {/* Hint text */}
            {isHydrated && cards.length === 0 && (
                <div className="hint-text">paste anything</div>
            )}

            <Menu />
            <FontSizeControl selectedCard={cards.find(c => c.id === selectedCardId) || null} />
        </div>
    );
}

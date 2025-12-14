import { useEffect, useRef, useCallback } from 'react';
import { useCardStore } from '../store/cardStore';
import { createCanvasController, type CanvasController } from '../lib/canvasController';
import { createDragHandler, type DragHandler } from '../lib/dragHandler';
import { createResizeHandler, type ResizeHandler } from '../lib/resizeHandler';
import { createPasteHandler, type PasteHandler } from '../lib/pasteHandler';
import { Card } from './Card';
import { Menu } from './Menu';

export function Canvas() {
    const containerRef = useRef<HTMLDivElement>(null);
    const transformRef = useRef<HTMLDivElement>(null);
    const canvasControllerRef = useRef<CanvasController | null>(null);
    const dragHandlerRef = useRef<DragHandler | null>(null);
    const resizeHandlerRef = useRef<ResizeHandler | null>(null);
    const pasteHandlerRef = useRef<PasteHandler | null>(null);

    const cards = useCardStore((s) => s.cards);
    const isHydrated = useCardStore((s) => s.isHydrated);
    const hydrate = useCardStore((s) => s.hydrate);
    const addCard = useCardStore((s) => s.addCard);
    const updateCardPosition = useCardStore((s) => s.updateCardPosition);
    const updateCardSize = useCardStore((s) => s.updateCardSize);
    const removeCard = useCardStore((s) => s.removeCard);

    // Initialize on mount
    useEffect(() => {
        hydrate();
    }, [hydrate]);

    // Set up imperative handlers
    useEffect(() => {
        if (!containerRef.current || !transformRef.current) return;

        // Canvas controller for pan/zoom
        const canvasController = createCanvasController(
            containerRef.current,
            transformRef.current
        );
        canvasControllerRef.current = canvasController;

        // Drag handler
        const dragHandler = createDragHandler(
            (cardId, x, y) => updateCardPosition(cardId, x, y),
            () => canvasController.getScale()
        );
        dragHandlerRef.current = dragHandler;

        // Resize handler
        const resizeHandler = createResizeHandler(
            (cardId, w, h) => updateCardSize(cardId, w, h),
            () => canvasController.getScale()
        );
        resizeHandlerRef.current = resizeHandler;

        // Paste handler (with drag-drop support)
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

    // Drag handler registration callbacks
    const registerDrag = useCallback((element: HTMLElement, cardId: string) => {
        dragHandlerRef.current?.register(element, cardId);
    }, []);

    const unregisterDrag = useCallback((cardId: string) => {
        dragHandlerRef.current?.unregister(cardId);
    }, []);

    // Resize handler registration callbacks
    const registerResize = useCallback((element: HTMLElement, cardId: string) => {
        resizeHandlerRef.current?.register(element, cardId);
    }, []);

    const unregisterResize = useCallback((cardId: string) => {
        resizeHandlerRef.current?.unregister(cardId);
    }, []);

    return (
        <div className="canvas-container" ref={containerRef}>
            <div className="canvas-transform" ref={transformRef}>
                {cards.map((card) => (
                    <Card
                        key={card.id}
                        card={card}
                        registerDrag={registerDrag}
                        unregisterDrag={unregisterDrag}
                        registerResize={registerResize}
                        unregisterResize={unregisterResize}
                        onDelete={removeCard}
                    />
                ))}
            </div>

            {/* Hint text - only show when empty and hydrated */}
            {isHydrated && cards.length === 0 && (
                <div className="hint-text">paste or drop anything</div>
            )}

            <Menu />
        </div>
    );
}

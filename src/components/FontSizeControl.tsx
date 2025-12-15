import { useState, useRef, useEffect } from 'react';
import { useCardStore } from '../store/cardStore';
import type { Card } from '../types';

interface FontSizeControlProps {
    card: Card | null;
}

export function FontSizeControl({ card }: FontSizeControlProps) {
    const updateFontSize = useCardStore((s) => s.updateCardFontSize);
    const [isEditing, setIsEditing] = useState(false);
    const [inputValue, setInputValue] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);
    const [isPopping, setIsPopping] = useState(false);

    // Use optional chaining or default for hook stability, though we return null if no card
    const currentSize = card?.fontSize || 14;

    // Store previous size AND previous card ID
    const prevSizeRef = useRef(currentSize);
    const prevCardIdRef = useRef(card?.id);

    // Focus input when editing starts
    useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, [isEditing]);

    // Update refs when card changes to prevent animation
    if (card && card.id !== prevCardIdRef.current) {
        prevCardIdRef.current = card.id;
        prevSizeRef.current = currentSize;
        // Ensure popping is off when switching cards
        // modify state during render is okay if conditional, but here we can just rely on effect logic
        // Actually, we should reset state in useEffect or just ensure the effect below handles it.
    }

    // Trigger pop animation on size change
    useEffect(() => {
        // Only trigger if size changed AND card ID is the same (handled by the if-check above syncing ref)
        // Wait, if we sync ref above during render, this effect might not see the diff?
        // Let's rely on standard effect logic but filter out card switches.

        if (card && card.id === prevCardIdRef.current && currentSize !== prevSizeRef.current) {
            setIsPopping(true);
            const timer = setTimeout(() => {
                setIsPopping(false);
            }, 500);
            prevSizeRef.current = currentSize;
            return () => clearTimeout(timer);
        } else if (card && card.id !== prevCardIdRef.current) {
            // Card switched, just sync ref, don't pop
            prevSizeRef.current = currentSize;
            prevCardIdRef.current = card.id;
            setIsPopping(false);
        }
    }, [currentSize, card?.id]); // Add card.id dependency

    // Only render if we have a valid text card
    if (!card || card.type !== 'text') {
        return null;
    }

    const handleWheel = (e: React.WheelEvent) => {
        e.stopPropagation();
        e.preventDefault();

        const direction = e.deltaY > 0 ? -1 : 1;
        const newSize = Math.max(8, Math.min(200, currentSize + direction));

        if (newSize !== currentSize) {
            updateFontSize(card.id, newSize);
        }
    };

    const handleClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        setInputValue(currentSize.toString());
        setIsEditing(true);
    };

    const handleBlur = () => {
        setIsEditing(false);
        const newSize = parseInt(inputValue, 10);
        if (!isNaN(newSize) && newSize >= 8 && newSize <= 200) {
            updateFontSize(card.id, newSize);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleBlur();
        } else if (e.key === 'Escape') {
            setIsEditing(false);
        }
        e.stopPropagation();
    };

    return (
        <div
            className="font-size-control"
            onWheel={handleWheel}
            title="Scroll to change size, Click to type"
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
        >
            <div className="font-size-row">
                <div className={`font-size-anim-wrapper ${isPopping ? 'pop' : ''}`}>
                    {isEditing ? (
                        <input
                            ref={inputRef}
                            type="number"
                            className="font-size-input"
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            onBlur={handleBlur}
                            onKeyDown={handleKeyDown}
                        />
                    ) : (
                        <span
                            className="font-size-value"
                            onClick={handleClick}
                        >
                            {currentSize}
                        </span>
                    )}
                </div>

                {/* Vertical double-headed arrow icon - Right side */}
                <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="font-size-icon"
                >
                    <path d="M7 17l5 5 5-5" />
                    <path d="M7 7l5-5 5 5" />
                    <path d="M12 2v20" />
                </svg>
            </div>
        </div>
    );
}

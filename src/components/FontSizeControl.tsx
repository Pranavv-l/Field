import { useState, useRef, useEffect } from 'react';
import { useCardStore } from '../store/cardStore';
import type { Card } from '../types';

interface FontSizeControlProps {
    selectedCard: Card | null;
}

export function FontSizeControl({ selectedCard }: FontSizeControlProps) {
    const updateFontSize = useCardStore((s) => s.updateCardFontSize);
    const [isEditing, setIsEditing] = useState(false);
    const [inputValue, setInputValue] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);

    // Focus input when editing starts
    useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, [isEditing]);

    // Only show for selected text cards
    if (!selectedCard || selectedCard.type !== 'text') {
        return null;
    }

    const currentSize = selectedCard.fontSize || 14;

    const handleWheel = (e: React.WheelEvent) => {
        e.stopPropagation();
        e.preventDefault();

        // Threshold calculation could be improved, but usually deltaY is +/- 100 or small values for trackpads
        const direction = e.deltaY > 0 ? -1 : 1;
        const newSize = Math.max(8, Math.min(200, currentSize + direction)); // Clamp between 8px and 200px

        if (newSize !== currentSize) {
            updateFontSize(selectedCard.id, newSize);
        }
    };

    const handleClick = () => {
        setInputValue(currentSize.toString());
        setIsEditing(true);
    };

    const handleBlur = () => {
        setIsEditing(false);
        const newSize = parseInt(inputValue, 10);
        if (!isNaN(newSize) && newSize >= 8 && newSize <= 200) {
            updateFontSize(selectedCard.id, newSize);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleBlur();
        } else if (e.key === 'Escape') {
            setIsEditing(false);
        }
    };

    return (
        <div
            className="font-size-control"
            onWheel={handleWheel}
            title="Scroll to change size, Click to type"
        >
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
                    style={{ cursor: 'ns-resize', minWidth: '40px' }}
                >
                    {currentSize}
                </span>
            )}
        </div>
    );
}

import { useEffect, useRef, memo, useState } from 'react';
import type { Card as CardType } from '../types';
import { ContentEditable } from './ContentEditable';

interface CardProps {
    card: CardType;
    isSelected: boolean;
    isEditing: boolean;
    onSelect: (cardId: string) => void;
    onContentUpdate: (cardId: string, content: string) => void;
    onBlur: () => void;
    registerDrag: (element: HTMLElement, cardId: string) => void;
    unregisterDrag: (cardId: string) => void;
    registerResize: (element: HTMLElement, cardId: string) => void;
    unregisterResize: (cardId: string) => void;
    onDelete: (id: string) => void;
}

export const Card = memo(function Card({
    card,
    isSelected,
    isEditing,
    onSelect,
    onContentUpdate,
    onBlur,
    registerDrag,
    unregisterDrag,
    registerResize,
    unregisterResize,
    onDelete,
}: CardProps) {
    const cardRef = useRef<HTMLDivElement>(null);
    const [localContent, setLocalContent] = useState(card.content);

    // Sync local content when card content changes from outside
    useEffect(() => {
        setLocalContent(card.content);
    }, [card.content]);

    // Register drag/resize handlers
    useEffect(() => {
        const element = cardRef.current;
        if (element) {
            registerDrag(element, card.id);
            registerResize(element, card.id);
        }
        return () => {
            unregisterDrag(card.id);
            unregisterResize(card.id);
        };
    }, [card.id, registerDrag, unregisterDrag, registerResize, unregisterResize]);

    // Focus is handled by ContentEditable internally when isEditing becomes true

    // Handle click to select
    const handleClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        onSelect(card.id);
    };

    // Handle delete on right click
    const handleContextMenu = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        onDelete(card.id);
    };

    // Save content on blur or delete if empty
    const handleTextBlur = () => {
        // Use a more robust check for "empty" (remove resizing/whitespace)
        const cleanContent = localContent.replace(/<[^>]*>/g, '').trim();

        if (!cleanContent) {
            onDelete(card.id);
        } else if (localContent !== card.content) {
            onContentUpdate(card.id, localContent);
        }
        onBlur();
    };

    const style: React.CSSProperties = {
        transform: `translate3d(${card.position.x}px, ${card.position.y}px, 0)`,
        ...(card.size ? { width: card.size.w, height: card.size.h } : {}),
    };

    // Calculate image scale factor from current size / natural size  
    // This allows scaling beyond 100% of original image size
    const getImageStyle = (): React.CSSProperties | undefined => {
        if (card.type !== 'image' || !card.size || !card.naturalSize) return undefined;
        const scaleX = card.size.w / card.naturalSize.w;
        const scaleY = card.size.h / card.naturalSize.h;
        return {
            transformOrigin: 'top left',
            transform: `scale(${scaleX}, ${scaleY})`,
            width: card.naturalSize.w,
            height: card.naturalSize.h,
        };
    };

    // Text card styles with per-card font size
    const getTextStyle = (): React.CSSProperties => {
        return card.fontSize ? { fontSize: card.fontSize } : {};
    };

    const className = `card card-${card.type}${isSelected ? ' card-selected' : ''}`;

    return (
        <div
            ref={cardRef}
            className={className}
            style={style}
            onClick={handleClick}
            onContextMenu={handleContextMenu}
        >
            {card.type === 'text' && (
                <div className="card-text" style={getTextStyle()}>
                    {isEditing ? (
                        <ContentEditable
                            html={localContent}
                            className="card-text-editable"
                            onChange={setLocalContent}
                            onBlur={handleTextBlur}
                            style={{
                                width: '100%',
                                outline: 'none',
                                // Let parent flexbox handle vertical centering
                                // Do NOT force height 100% or it will align to top
                            }}
                            placeholder="Type something..."
                        />
                    ) : (
                        card.content || <span className="card-placeholder-text">Empty card</span>
                    )}
                </div>
            )}

            {card.type === 'image' && (
                <img
                    src={card.content}
                    alt=""
                    className="card-image"
                    draggable={false}
                    style={getImageStyle()}
                    onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                        const parent = (e.target as HTMLElement).parentElement;
                        if (parent && !parent.querySelector('.card-placeholder')) {
                            const placeholder = document.createElement('div');
                            placeholder.className = 'card-placeholder';
                            placeholder.textContent = 'Image unavailable';
                            parent.appendChild(placeholder);
                        }
                    }}
                />
            )}

            {card.type === 'link' && (
                <a
                    href={card.content}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="card-link"
                    draggable={false}
                    onClick={(e) => e.stopPropagation()}
                    onDragStart={(e) => e.preventDefault()}
                >
                    {card.content}
                </a>
            )}
        </div>
    );
});

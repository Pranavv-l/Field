import { useEffect, useRef, memo } from 'react';
import type { Card as CardType } from '../types';

interface CardProps {
    card: CardType;
    registerDrag: (element: HTMLElement, cardId: string) => void;
    unregisterDrag: (cardId: string) => void;
    registerResize: (element: HTMLElement, cardId: string) => void;
    unregisterResize: (cardId: string) => void;
    onDelete: (id: string) => void;
}

export const Card = memo(function Card({
    card,
    registerDrag,
    unregisterDrag,
    registerResize,
    unregisterResize,
    onDelete,
}: CardProps) {
    const cardRef = useRef<HTMLDivElement>(null);

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

    // Handle delete on right click
    const handleContextMenu = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        onDelete(card.id);
    };

    const style: React.CSSProperties = {
        transform: `translate3d(${card.position.x}px, ${card.position.y}px, 0)`,
        ...(card.size ? { width: card.size.w, height: card.size.h } : {}),
    };

    return (
        <div
            ref={cardRef}
            className={`card card-${card.type}`}
            style={style}
            onContextMenu={handleContextMenu}
        >
            {card.type === 'text' && <div className="card-text">{card.content}</div>}

            {card.type === 'image' && (
                <img
                    src={card.content}
                    alt=""
                    className="card-image"
                    draggable={false}
                    onError={(e) => {
                        // Show placeholder on error
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

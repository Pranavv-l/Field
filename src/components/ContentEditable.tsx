import { useRef, useEffect, forwardRef } from 'react';

interface ContentEditableProps {
    html: string;
    tagName?: string;
    className?: string;
    style?: React.CSSProperties;
    onChange?: (content: string) => void;
    onBlur?: () => void;
    placeholder?: string;
}

export const ContentEditable = forwardRef<HTMLElement, ContentEditableProps>(({
    html,
    tagName = 'div',
    className,
    style,
    onChange,
    onBlur,
    placeholder
}, ref) => {
    const contentEditableRef = useRef<HTMLElement>(null);
    // Use forwarded ref or internal ref
    const elementRef = (ref as React.MutableRefObject<HTMLElement>) || contentEditableRef;

    useEffect(() => {
        // Only update if content differs and WE ARE NOT FOCUSING IT (to avoid cursor jump loops)
        // Or if we are careful about selection storage, but simpler is:
        // If the user is typing, the local state matches the input.
        // We only need to sync if the prop changes OUTSIDE of typing (e.g. undo/redo).

        if (
            elementRef.current &&
            elementRef.current.innerText !== html &&
            document.activeElement !== elementRef.current
        ) {
            elementRef.current.innerText = html;
        }
    }, [html, elementRef]);

    useEffect(() => {
        const el = elementRef.current;
        if (el) {
            el.focus();
            // Move cursor to end
            const range = document.createRange();
            range.selectNodeContents(el);
            range.collapse(false);
            const sel = window.getSelection();
            if (sel) {
                sel.removeAllRanges();
                sel.addRange(range);
            }
        }
    }, [elementRef]);

    const handleInput = (e: React.FormEvent<HTMLElement>) => {
        if (onChange) {
            onChange(e.currentTarget.innerText);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            e.currentTarget.blur();
        }
        if (e.key === 'Escape') {
            e.currentTarget.blur();
        }
    };

    const Tag = tagName as any;

    return (
        <Tag
            ref={elementRef}
            className={className}
            style={style}
            contentEditable
            suppressContentEditableWarning
            onInput={handleInput}
            onBlur={onBlur}
            onKeyDown={handleKeyDown}
            data-placeholder={placeholder}
        />
    );
});

ContentEditable.displayName = 'ContentEditable';

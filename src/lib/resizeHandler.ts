export interface ResizeHandler {
    register: (element: HTMLElement, cardId: string) => void;
    unregister: (cardId: string) => void;
    setSelected: (cardId: string | null) => void;
    destroy: () => void;
}

type Corner = 'tl' | 'tr' | 'bl' | 'br';

export function createResizeHandler(
    onResizeEnd: (cardId: string, x: number, y: number, w: number, h: number) => void,
    getScale: () => number
): ResizeHandler {
    const registeredElements = new Map<string, HTMLElement>();
    const handleElements = new Map<string, { [key in Corner]: HTMLElement }>();
    let selectedCardId: string | null = null;

    let isResizing = false;
    let currentCardId: string | null = null;
    let currentElement: HTMLElement | null = null;
    let currentImageElement: HTMLImageElement | null = null;
    let imageNaturalSize: { w: number, h: number } | null = null;

    // Resize state capture
    let startX = 0; // Mouse X at start (world coords)
    let startY = 0; // Mouse Y at start (world coords)
    let initialX = 0; // Card X at start
    let initialY = 0; // Card Y at start
    let initialWidth = 0;
    let initialHeight = 0;
    let activeHandle: Corner | null = null;

    function handleResizeStart(e: MouseEvent, cardId: string, cardElement: HTMLElement, corner: Corner) {
        e.preventDefault();
        e.stopPropagation();

        isResizing = true;
        currentCardId = cardId;
        currentElement = cardElement;
        activeHandle = corner;

        // Check for image element and get natural size for live scaling
        const img = cardElement.querySelector('img.card-image') as HTMLImageElement;
        if (img) {
            currentImageElement = img;
            // Use naturalWidth/Height from the DOM element
            imageNaturalSize = { w: img.width, h: img.height };
        } else {
            currentImageElement = null;
            imageNaturalSize = null;
        }

        const scale = getScale();
        startX = e.clientX / scale;
        startY = e.clientY / scale;

        // Get initial card state from CSS transform
        // We can't rely solely on getBoundingClientRect for X/Y because of parent transforms
        // But we can parse the inline style transform if available, or assume the store state matches.
        // Better: Read current transform from style (safest source of truth for visual position)
        const transform = cardElement.style.transform; // "translate3d(x, y, 0)"
        const match = transform.match(/translate3d\(([-\d.]+)px,\s*([-\d.]+)px/);

        if (match) {
            initialX = parseFloat(match[1]);
            initialY = parseFloat(match[2]);
        } else {
            // Fallback (shouldn't happen with our setup)
            initialX = 0;
            initialY = 0;
        }

        const rect = cardElement.getBoundingClientRect();
        initialWidth = rect.width / scale;
        initialHeight = rect.height / scale;

        cardElement.classList.add('is-resizing');
        document.body.style.cursor = getCursorForHandle(corner);
    }

    function getCursorForHandle(corner: Corner): string {
        switch (corner) {
            case 'tl': return 'nwse-resize';
            case 'br': return 'nwse-resize';
            case 'tr': return 'nesw-resize';
            case 'bl': return 'nesw-resize';
        }
    }

    function handleMouseMove(e: MouseEvent) {
        if (!isResizing || !currentElement || !activeHandle) return;

        const scale = getScale();
        const mouseX = e.clientX / scale;
        const mouseY = e.clientY / scale;

        const dx = mouseX - startX;
        const dy = mouseY - startY;

        let newX = initialX;
        let newY = initialY;
        let newWidth = initialWidth;
        let newHeight = initialHeight;

        // Minimum dimensions
        const MIN_W = 60;
        const MIN_H = 30;

        switch (activeHandle) {
            case 'br': {
                // Anchor: Top-Left
                newWidth = Math.max(MIN_W, initialWidth + dx);
                newHeight = Math.max(MIN_H, initialHeight + dy);
                break;
            }
            case 'bl': {
                // Anchor: Top-Right
                const targetWidth = initialWidth - dx;
                newWidth = Math.max(MIN_W, targetWidth);
                // Adjust X if clamping occurred
                // newX = initialX + (initialWidth - newWidth)
                newX = initialX + (initialWidth - newWidth);
                newHeight = Math.max(MIN_H, initialHeight + dy);
                break;
            }
            case 'tr': {
                // Anchor: Bottom-Left
                newWidth = Math.max(MIN_W, initialWidth + dx);
                const targetHeight = initialHeight - dy;
                newHeight = Math.max(MIN_H, targetHeight);
                newY = initialY + (initialHeight - newHeight);
                break;
            }
            case 'tl': {
                // Anchor: Bottom-Right
                const targetWidth = initialWidth - dx;
                newWidth = Math.max(MIN_W, targetWidth);
                newX = initialX + (initialWidth - newWidth);

                const targetHeight = initialHeight - dy;
                newHeight = Math.max(MIN_H, targetHeight);
                newY = initialY + (initialHeight - newHeight);
                break;
            }
        }

        // Direct DOM manipulation
        currentElement.style.width = `${newWidth}px`;
        currentElement.style.height = `${newHeight}px`;
        currentElement.style.transform = `translate3d(${newX}px, ${newY}px, 0)`;

        // Imperative image scaling
        if (currentImageElement && imageNaturalSize) {
            const scaleX = newWidth / imageNaturalSize.w;
            const scaleY = newHeight / imageNaturalSize.h;
            currentImageElement.style.transform = `scale(${scaleX}, ${scaleY})`;
        }
    }

    function handleMouseUp() {
        if (!isResizing || !currentElement || !currentCardId) return;

        currentElement.classList.remove('is-resizing');
        document.body.style.cursor = '';

        // Get final values from DOM styles that we just set
        const style = currentElement.style;
        const width = parseFloat(style.width);
        const height = parseFloat(style.height);

        let x = initialX;
        let y = initialY;

        const match = style.transform.match(/translate3d\(([-\d.]+)px,\s*([-\d.]+)px/);
        if (match) {
            x = parseFloat(match[1]);
            y = parseFloat(match[2]);
        }

        // Commit to store
        onResizeEnd(currentCardId, x, y, width, height);

        isResizing = false;
        currentCardId = null;
        currentElement = null;
        currentImageElement = null;
        imageNaturalSize = null;
        activeHandle = null;
    }

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    function updateHandleVisibility(cardId: string) {
        const handles = handleElements.get(cardId);
        if (handles) {
            const isSelected = cardId === selectedCardId;
            Object.values(handles).forEach(h => {
                h.style.display = isSelected ? 'block' : 'none';
            });
        }
    }

    function register(cardElement: HTMLElement, cardId: string) {
        const corners: Corner[] = ['tl', 'tr', 'bl', 'br'];
        const handles: Partial<{ [key in Corner]: HTMLElement }> = {};

        corners.forEach(corner => {
            const handle = document.createElement('div');
            handle.className = `resize-handle resize-handle-${corner}`;

            const handler = (e: MouseEvent) => handleResizeStart(e, cardId, cardElement, corner);
            handle.addEventListener('mousedown', handler);
            (handle as any).__resizeHandler = handler;

            cardElement.appendChild(handle);
            handles[corner] = handle;

            handle.style.display = 'none';
        });

        handleElements.set(cardId, handles as { [key in Corner]: HTMLElement });
        registeredElements.set(cardId, cardElement);
    }

    function unregister(cardId: string) {
        const handles = handleElements.get(cardId);
        if (handles) {
            Object.values(handles).forEach(handle => {
                const handler = (handle as any).__resizeHandler;
                if (handler) {
                    handle.removeEventListener('mousedown', handler);
                }
                handle.remove();
            });
            handleElements.delete(cardId);
        }
        registeredElements.delete(cardId);
    }

    function setSelected(cardId: string | null) {
        const previousId = selectedCardId;
        selectedCardId = cardId;

        if (previousId) updateHandleVisibility(previousId);
        if (cardId) updateHandleVisibility(cardId);
    }

    return {
        register,
        unregister,
        setSelected,
        destroy: () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
            handleElements.forEach((handles) => {
                Object.values(handles).forEach(h => h.remove());
            });
            handleElements.clear();
            registeredElements.clear();
        },
    };
}

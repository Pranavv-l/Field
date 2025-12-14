export interface ResizeHandler {
    register: (element: HTMLElement, cardId: string) => void;
    unregister: (cardId: string) => void;
    destroy: () => void;
}

export function createResizeHandler(
    onResizeEnd: (cardId: string, w: number, h: number) => void,
    getScale: () => number
): ResizeHandler {
    const registeredElements = new Map<string, HTMLElement>();
    let isResizing = false;
    let currentCardId: string | null = null;
    let currentElement: HTMLElement | null = null;
    let startX = 0;
    let startY = 0;
    let initialWidth = 0;
    let initialHeight = 0;

    function handleResizeStart(e: MouseEvent, cardId: string, cardElement: HTMLElement) {
        e.preventDefault();
        e.stopPropagation();

        isResizing = true;
        currentCardId = cardId;
        currentElement = cardElement;

        const scale = getScale();
        startX = e.clientX / scale;
        startY = e.clientY / scale;

        const rect = cardElement.getBoundingClientRect();
        initialWidth = rect.width / scale;
        initialHeight = rect.height / scale;

        // Add resizing class
        cardElement.classList.add('is-resizing');
    }

    function handleMouseMove(e: MouseEvent) {
        if (!isResizing || !currentElement) return;

        const scale = getScale();
        const dx = e.clientX / scale - startX;
        const dy = e.clientY / scale - startY;

        const newWidth = Math.max(100, initialWidth + dx);
        const newHeight = Math.max(50, initialHeight + dy);

        // Direct DOM manipulation
        currentElement.style.width = `${newWidth}px`;
        currentElement.style.height = `${newHeight}px`;
    }

    function handleMouseUp() {
        if (!isResizing || !currentElement || !currentCardId) return;

        currentElement.classList.remove('is-resizing');

        // Get final size
        const rect = currentElement.getBoundingClientRect();
        const scale = getScale();
        const w = rect.width / scale;
        const h = rect.height / scale;

        // Commit to store
        onResizeEnd(currentCardId, w, h);

        isResizing = false;
        currentCardId = null;
        currentElement = null;
    }

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    function register(cardElement: HTMLElement, cardId: string) {
        // Create resize handle
        const handle = document.createElement('div');
        handle.className = 'resize-handle';
        cardElement.appendChild(handle);

        const handler = (e: MouseEvent) => handleResizeStart(e, cardId, cardElement);
        handle.addEventListener('mousedown', handler);

        (handle as unknown as { __resizeHandler: (e: MouseEvent) => void }).__resizeHandler = handler;
        registeredElements.set(cardId, cardElement);
    }

    function unregister(cardId: string) {
        const cardElement = registeredElements.get(cardId);
        if (cardElement) {
            const handle = cardElement.querySelector('.resize-handle');
            if (handle) {
                const handler = (handle as unknown as { __resizeHandler?: (e: MouseEvent) => void }).__resizeHandler;
                if (handler) {
                    handle.removeEventListener('mousedown', handler as EventListener);
                }
                handle.remove();
            }
            registeredElements.delete(cardId);
        }
    }

    return {
        register,
        unregister,
        destroy: () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
            registeredElements.forEach((_, cardId) => unregister(cardId));
            registeredElements.clear();
        },
    };
}

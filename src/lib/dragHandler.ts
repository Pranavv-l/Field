export interface DragHandler {
    register: (element: HTMLElement, cardId: string) => void;
    unregister: (cardId: string) => void;
    destroy: () => void;
}

export function createDragHandler(
    onDragEnd: (cardId: string, x: number, y: number) => void,
    getScale: () => number
): DragHandler {
    const registeredElements = new Map<string, HTMLElement>();
    let isDragging = false;
    let currentCardId: string | null = null;
    let currentElement: HTMLElement | null = null;
    let startX = 0;
    let startY = 0;
    let initialTransformX = 0;
    let initialTransformY = 0;

    function parseTransform(el: HTMLElement): { x: number; y: number } {
        const style = window.getComputedStyle(el);
        const matrix = new DOMMatrix(style.transform);
        return { x: matrix.m41, y: matrix.m42 };
    }

    function handleMouseDown(e: MouseEvent, cardId: string, element: HTMLElement) {
        // Only left click, and not if space is pressed (panning)
        if (e.button !== 0) return;

        e.stopPropagation();
        isDragging = true;
        currentCardId = cardId;
        currentElement = element;

        const scale = getScale();
        startX = e.clientX / scale;
        startY = e.clientY / scale;

        const transform = parseTransform(element);
        initialTransformX = transform.x;
        initialTransformY = transform.y;

        // Lift shadow effect
        element.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.12)';
        element.style.zIndex = '1000';
    }

    function handleMouseMove(e: MouseEvent) {
        if (!isDragging || !currentElement) return;

        const scale = getScale();
        const dx = e.clientX / scale - startX;
        const dy = e.clientY / scale - startY;

        const newX = initialTransformX + dx;
        const newY = initialTransformY + dy;

        // Direct DOM manipulation - no React
        currentElement.style.transform = `translate3d(${newX}px, ${newY}px, 0)`;
    }

    function handleMouseUp() {
        if (!isDragging || !currentElement || !currentCardId) return;

        // Reset shadow
        currentElement.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.08)';
        currentElement.style.zIndex = '';

        // Get final position
        const transform = parseTransform(currentElement);

        // Commit to store (this is the only time we update React state)
        onDragEnd(currentCardId, transform.x, transform.y);

        isDragging = false;
        currentCardId = null;
        currentElement = null;
    }

    // Global mouse events
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    function register(element: HTMLElement, cardId: string) {
        const handler = (e: MouseEvent) => handleMouseDown(e, cardId, element);
        element.addEventListener('mousedown', handler);
        element.dataset.dragCardId = cardId;
        (element as HTMLElement & { __dragHandler: (e: MouseEvent) => void }).__dragHandler = handler;
        registeredElements.set(cardId, element);
    }

    function unregister(cardId: string) {
        const element = registeredElements.get(cardId);
        if (element) {
            const handler = (element as HTMLElement & { __dragHandler?: (e: MouseEvent) => void }).__dragHandler;
            if (handler) {
                element.removeEventListener('mousedown', handler);
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
            registeredElements.clear();
        },
    };
}

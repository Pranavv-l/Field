import { saveViewport, loadViewport } from '../db/database';

export interface CanvasController {
    getScale: () => number;
    getTranslate: () => { x: number; y: number };
    screenToCanvas: (screenX: number, screenY: number) => { x: number; y: number };
    destroy: () => void;
}

export function createCanvasController(
    containerEl: HTMLElement,
    transformEl: HTMLElement
): CanvasController {
    // Canvas state
    let scale = 1;
    let translateX = 0;
    let translateY = 0;

    // Constraints
    const MIN_SCALE = 0.1;
    const MAX_SCALE = 10;

    // Mouse drag state
    let isDragging = false;
    let dragStartX = 0;
    let dragStartY = 0;

    // rAF batching - accumulate deltas and apply once per frame
    let pendingPanX = 0;
    let pendingPanY = 0;
    let pendingZoom: { delta: number; centerX: number; centerY: number } | null = null;
    let rafId: number | null = null;

    // Apply transform to DOM
    function applyTransform() {
        transformEl.style.transform = `translate3d(${translateX}px, ${translateY}px, 0) scale(${scale})`;
    }

    // Cursor-anchored zoom: world position under cursor stays fixed
    function zoomAtPoint(zoomDelta: number, screenX: number, screenY: number) {
        const rect = containerEl.getBoundingClientRect();
        const cursorX = screenX - rect.left;
        const cursorY = screenY - rect.top;

        // World position under cursor BEFORE zoom
        const worldX = (cursorX - translateX) / scale;
        const worldY = (cursorY - translateY) / scale;

        // Apply exponential zoom
        const newScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale * Math.exp(zoomDelta)));

        // Adjust translation so world position stays under cursor
        translateX = cursorX - worldX * newScale;
        translateY = cursorY - worldY * newScale;
        scale = newScale;
    }

    // Process accumulated input in rAF
    function processFrame() {
        rafId = null;

        // Process zoom if pending (zoom takes priority)
        if (pendingZoom) {
            zoomAtPoint(pendingZoom.delta, pendingZoom.centerX, pendingZoom.centerY);
            pendingZoom = null;
        }

        // Process pan
        if (pendingPanX !== 0 || pendingPanY !== 0) {
            translateX += pendingPanX;
            translateY += pendingPanY;
            pendingPanX = 0;
            pendingPanY = 0;
        }

        applyTransform();
    }

    function scheduleFrame() {
        if (rafId === null) {
            rafId = requestAnimationFrame(processFrame);
        }
    }

    // Wheel event handler - unified for mouse and trackpad
    function handleWheel(e: WheelEvent) {
        e.preventDefault();

        // INTENT DETECTION:
        // - ctrlKey = pinch gesture on trackpad (macOS/Chrome) → ZOOM
        // - deltaX !== 0 = horizontal scroll = two-finger pan → PAN
        // - Pure vertical scroll without ctrlKey:
        //   - deltaMode === 1 (DOM_DELTA_LINE) = mouse wheel → ZOOM
        //   - deltaMode === 0 (DOM_DELTA_PIXEL) = trackpad scroll → PAN

        const isZoomIntent = e.ctrlKey || e.metaKey || e.deltaMode === 1;

        if (isZoomIntent) {
            // ZOOM
            // Use smaller multiplier for smoother zoom
            // Negative deltaY = zoom in, positive = zoom out
            const zoomSpeed = e.ctrlKey ? 0.01 : 0.002; // Pinch vs wheel
            const delta = -e.deltaY * zoomSpeed;

            pendingZoom = {
                delta,
                centerX: e.clientX,
                centerY: e.clientY,
            };
        } else {
            // PAN - two-finger scroll on trackpad
            pendingPanX -= e.deltaX;
            pendingPanY -= e.deltaY;
        }

        scheduleFrame();
    }

    // Mouse drag handlers
    function handleMouseDown(e: MouseEvent) {
        // Left click initiates drag
        if (e.button === 0) {
            // Only start drag if clicking on canvas background, not on cards
            const target = e.target as HTMLElement;
            if (target === containerEl || target === transformEl) {
                e.preventDefault();
                isDragging = true;
                dragStartX = e.clientX;
                dragStartY = e.clientY;
                containerEl.style.cursor = 'grabbing';
            }
        }
    }

    function handleMouseMove(e: MouseEvent) {
        if (!isDragging) return;

        const dx = e.clientX - dragStartX;
        const dy = e.clientY - dragStartY;
        dragStartX = e.clientX;
        dragStartY = e.clientY;

        // Immediate response - apply directly without rAF for drag
        translateX += dx;
        translateY += dy;
        applyTransform();
    }

    function handleMouseUp() {
        if (isDragging) {
            isDragging = false;
            containerEl.style.cursor = 'default';
            saveViewport({ scale, translateX, translateY });
        }
    }

    // Prevent context menu
    function handleContextMenu(e: MouseEvent) {
        // Allow context menu on cards, prevent on canvas
        const target = e.target as HTMLElement;
        if (target === containerEl || target === transformEl) {
            e.preventDefault();
        }
    }

    // Initialize from persisted state
    async function init() {
        const viewport = await loadViewport();
        if (viewport) {
            scale = viewport.scale;
            translateX = viewport.translateX;
            translateY = viewport.translateY;
            applyTransform();
        }
    }

    // Debounced save on wheel end
    let saveTimeout: ReturnType<typeof setTimeout> | null = null;
    function handleWheelEnd() {
        if (saveTimeout) clearTimeout(saveTimeout);
        saveTimeout = setTimeout(() => {
            saveViewport({ scale, translateX, translateY });
        }, 150);
    }

    // Combined wheel handler with save
    function handleWheelWithSave(e: WheelEvent) {
        handleWheel(e);
        handleWheelEnd();
    }

    // Set up event listeners
    containerEl.addEventListener('wheel', handleWheelWithSave, { passive: false });
    containerEl.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    containerEl.addEventListener('contextmenu', handleContextMenu);

    // Initialize
    init();

    // Convert screen coordinates to canvas (world) coordinates
    function screenToCanvas(screenX: number, screenY: number): { x: number; y: number } {
        const rect = containerEl.getBoundingClientRect();
        const x = (screenX - rect.left - translateX) / scale;
        const y = (screenY - rect.top - translateY) / scale;
        return { x, y };
    }

    return {
        getScale: () => scale,
        getTranslate: () => ({ x: translateX, y: translateY }),
        screenToCanvas,
        destroy: () => {
            if (rafId) cancelAnimationFrame(rafId);
            if (saveTimeout) clearTimeout(saveTimeout);
            containerEl.removeEventListener('wheel', handleWheelWithSave);
            containerEl.removeEventListener('mousedown', handleMouseDown);
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
            containerEl.removeEventListener('contextmenu', handleContextMenu);
        },
    };
}

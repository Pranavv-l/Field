import type { Card } from '../types';
import { v4 as uuidv4 } from 'uuid';

export type PasteCallback = (card: Card) => void;

export interface PasteHandler {
    destroy: () => void;
}

// Detect if string is a URL
function isUrl(str: string): boolean {
    try {
        const url = new URL(str);
        return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
        return false;
    }
}

// Convert blob/file to data URL
function fileToDataUrl(file: File | Blob): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            if (typeof reader.result === 'string') {
                resolve(reader.result);
            } else {
                reject(new Error('Failed to read file'));
            }
        };
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(file);
    });
}

export function createPasteHandler(
    screenToCanvas: (screenX: number, screenY: number) => { x: number; y: number },
    onPaste: PasteCallback,
    containerEl: HTMLElement
): PasteHandler {
    let lastMouseX = window.innerWidth / 2;
    let lastMouseY = window.innerHeight / 2;

    // Track mouse position for paste/drop location
    function handleMouseMove(e: MouseEvent) {
        lastMouseX = e.clientX;
        lastMouseY = e.clientY;
    }

    // Handle paste event
    function handlePaste(e: ClipboardEvent) {
        const clipboardData = e.clipboardData;
        if (!clipboardData) return;

        const canvasPos = screenToCanvas(lastMouseX, lastMouseY);

        // Try to get files first (works for images from file system)
        const files = clipboardData.files;
        if (files && files.length > 0) {
            for (const file of Array.from(files)) {
                if (file.type.startsWith('image/')) {
                    e.preventDefault();
                    fileToDataUrl(file)
                        .then((dataUrl) => {
                            const card: Card = {
                                id: uuidv4(),
                                type: 'image',
                                content: dataUrl,
                                position: { x: canvasPos.x, y: canvasPos.y },
                                createdAt: Date.now(),
                            };
                            onPaste(card);
                        })
                        .catch(() => { /* silent fail */ });
                    return;
                }
            }
        }

        // Check items for images (works for screenshots/copied images)
        const items = clipboardData.items;
        if (items) {
            for (const item of Array.from(items)) {
                if (item.type.startsWith('image/')) {
                    e.preventDefault();
                    const blob = item.getAsFile();
                    if (blob) {
                        fileToDataUrl(blob)
                            .then((dataUrl) => {
                                const card: Card = {
                                    id: uuidv4(),
                                    type: 'image',
                                    content: dataUrl,
                                    position: { x: canvasPos.x, y: canvasPos.y },
                                    createdAt: Date.now(),
                                };
                                onPaste(card);
                            })
                            .catch(() => { /* silent fail */ });
                        return;
                    }
                }
            }

            // Check for text/URL
            for (const item of Array.from(items)) {
                if (item.type === 'text/plain') {
                    e.preventDefault();
                    item.getAsString((text) => {
                        const trimmed = text.trim();
                        if (!trimmed) return;

                        const card: Card = {
                            id: uuidv4(),
                            type: isUrl(trimmed) ? 'link' : 'text',
                            content: trimmed,
                            position: { x: canvasPos.x, y: canvasPos.y },
                            createdAt: Date.now(),
                        };
                        onPaste(card);
                    });
                    return;
                }
            }
        }
    }

    // Drag and drop handlers
    function handleDragOver(e: DragEvent) {
        if (e.dataTransfer?.types.includes('Files')) {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'copy';
        }
    }

    function handleDrop(e: DragEvent) {
        const files = e.dataTransfer?.files;
        if (!files || files.length === 0) return;

        e.preventDefault();
        const canvasPos = screenToCanvas(e.clientX, e.clientY);

        for (const file of Array.from(files)) {
            if (file.type.startsWith('image/')) {
                const pos = { ...canvasPos };
                fileToDataUrl(file)
                    .then((dataUrl) => {
                        const card: Card = {
                            id: uuidv4(),
                            type: 'image',
                            content: dataUrl,
                            position: pos,
                            createdAt: Date.now(),
                        };
                        onPaste(card);
                    })
                    .catch(() => { /* silent fail */ });
                canvasPos.x += 20;
                canvasPos.y += 20;
            }
        }
    }

    // Attach listeners
    document.addEventListener('paste', handlePaste);
    window.addEventListener('mousemove', handleMouseMove);
    containerEl.addEventListener('dragover', handleDragOver);
    containerEl.addEventListener('drop', handleDrop);

    return {
        destroy: () => {
            document.removeEventListener('paste', handlePaste);
            window.removeEventListener('mousemove', handleMouseMove);
            containerEl.removeEventListener('dragover', handleDragOver);
            containerEl.removeEventListener('drop', handleDrop);
        },
    };
}

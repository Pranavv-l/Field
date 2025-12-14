// Card types
export interface Card {
  id: string;
  type: 'text' | 'image' | 'link';
  content: string; // text content, image data URL, or URL
  position: { x: number; y: number };
  size?: { w: number; h: number }; // Only persisted when explicitly resized
  createdAt: number;
}

// Canvas viewport state
export interface CanvasViewport {
  id: string; // Always 'main'
  scale: number;
  translateX: number;
  translateY: number;
}

// Cursor position for paste operations
export interface CursorPosition {
  x: number;
  y: number;
}

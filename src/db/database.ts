import Dexie, { type EntityTable } from 'dexie';
import type { Card, CanvasViewport } from '../types';

// Database schema
const db = new Dexie('FieldCanvas') as Dexie & {
    cards: EntityTable<Card, 'id'>;
    viewport: EntityTable<CanvasViewport, 'id'>;
};

db.version(1).stores({
    cards: 'id, type, createdAt',
    viewport: 'id',
});

// Debounce utility
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function debounce<T extends (...args: any[]) => any>(fn: T, ms: number): T {
    let timeoutId: ReturnType<typeof setTimeout>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return ((...args: any[]) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => fn(...args), ms);
    }) as T;
}

// Card operations
export async function loadCards(): Promise<Card[]> {
    try {
        return await db.cards.toArray();
    } catch {
        console.warn('Failed to load cards from IndexedDB');
        return [];
    }
}

export async function saveCard(card: Card): Promise<void> {
    try {
        await db.cards.put(card);
    } catch {
        console.warn('Failed to save card to IndexedDB');
    }
}

export const saveCardDebounced = debounce(saveCard, 300);

export async function deleteCard(id: string): Promise<void> {
    try {
        await db.cards.delete(id);
    } catch {
        console.warn('Failed to delete card from IndexedDB');
    }
}

export async function clearAllCards(): Promise<void> {
    try {
        await db.cards.clear();
    } catch {
        console.warn('Failed to clear cards from IndexedDB');
    }
}

// Viewport operations
export async function loadViewport(): Promise<CanvasViewport | undefined> {
    try {
        return await db.viewport.get('main');
    } catch {
        console.warn('Failed to load viewport from IndexedDB');
        return undefined;
    }
}

export const saveViewport = debounce(async (viewport: Omit<CanvasViewport, 'id'>): Promise<void> => {
    try {
        await db.viewport.put({ id: 'main', ...viewport });
    } catch {
        console.warn('Failed to save viewport to IndexedDB');
    }
}, 300);

export { db };

import { create } from 'zustand';
import type { Card } from '../types';
import { loadCards, saveCard, deleteCard, clearAllCards } from '../db/database';

interface CardStore {
    cards: Card[];
    isHydrated: boolean;

    // Actions - only for creation, deletion, and final position commits
    hydrate: () => Promise<void>;
    addCard: (card: Card) => void;
    updateCardPosition: (id: string, x: number, y: number) => void;
    updateCardSize: (id: string, w: number, h: number) => void;
    removeCard: (id: string) => void;
    clearAll: () => void;
}

export const useCardStore = create<CardStore>((set, get) => ({
    cards: [],
    isHydrated: false,

    hydrate: async () => {
        const cards = await loadCards();
        set({ cards, isHydrated: true });
    },

    addCard: (card: Card) => {
        set((state) => ({ cards: [...state.cards, card] }));
        saveCard(card);
    },

    // Called only on drag END, not during drag
    updateCardPosition: (id: string, x: number, y: number) => {
        const cards = get().cards;
        const card = cards.find((c) => c.id === id);
        if (card) {
            const updated = { ...card, position: { x, y } };
            set((state) => ({
                cards: state.cards.map((c) => (c.id === id ? updated : c)),
            }));
            saveCard(updated);
        }
    },

    // Called only on explicit resize END
    updateCardSize: (id: string, w: number, h: number) => {
        const cards = get().cards;
        const card = cards.find((c) => c.id === id);
        if (card) {
            const updated = { ...card, size: { w, h } };
            set((state) => ({
                cards: state.cards.map((c) => (c.id === id ? updated : c)),
            }));
            saveCard(updated);
        }
    },

    removeCard: (id: string) => {
        set((state) => ({
            cards: state.cards.filter((c) => c.id !== id),
        }));
        deleteCard(id);
    },

    clearAll: () => {
        set({ cards: [] });
        clearAllCards();
    },
}));

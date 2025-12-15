import { useState, useRef, useEffect } from 'react';
import { useCardStore } from '../store/cardStore';
import { useThemeStore } from '../store/themeStore';

export function Menu() {
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    const clearAll = useCardStore((s) => s.clearAll);
    const cardCount = useCardStore((s) => s.cards.length);
    const { isDark, toggle: toggleDark } = useThemeStore();

    // Close menu when clicking outside
    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        }
        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen]);

    const handleClearAll = () => {
        if (cardCount > 0) {
            clearAll();
        }
        setIsOpen(false);
    };

    const handleToggleDark = () => {
        toggleDark();
    };

    return (
        <div className="menu" ref={menuRef}>
            <button
                className="menu-button"
                onClick={() => setIsOpen(!isOpen)}
                aria-label="Menu"
            >
                <span className="menu-line"></span>
                <span className="menu-line"></span>
                <span className="menu-line"></span>
            </button>

            {isOpen && (
                <div className="menu-dropdown">
                    <button
                        className="menu-item"
                        onClick={handleToggleDark}
                        title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}
                    >
                        {isDark ? '☀️' : '🌙'}
                    </button>
                    <button
                        className="menu-item"
                        onClick={handleClearAll}
                        disabled={cardCount === 0}
                    >
                        Clear all ({cardCount})
                    </button>
                </div>
            )}
        </div>
    );
}

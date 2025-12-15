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
        // Don't auto-close for better UX on desktop, or do? User didn't specify. 
        // Keeping it open usually feels better for sidebars.
        // But for "Clear All" maybe close? Let's close.
        setIsOpen(false);
    };

    return (
        <div ref={menuRef}>
            {/* Toggle Button */}
            <button
                className="menu-button"
                onClick={() => setIsOpen(!isOpen)}
                aria-label="Menu"
                style={{ position: 'fixed', top: '16px', right: '16px', zIndex: 1001 }}
            >
                <span className="menu-line" style={{ background: isOpen ? (isDark ? '#1a1a1a' : '#FAFAFA') : undefined }}></span>
                <span className="menu-line" style={{ background: isOpen ? (isDark ? '#1a1a1a' : '#FAFAFA') : undefined }}></span>
                <span className="menu-line" style={{ background: isOpen ? (isDark ? '#1a1a1a' : '#FAFAFA') : undefined }}></span>
            </button>

            {/* Sidebar */}
            <div className={`sidebar ${isOpen ? 'open' : ''}`}>
                <div className="sidebar-content">
                    {/* Clear Button - Centered */}
                    <button
                        className="sidebar-item clear-btn"
                        onClick={handleClearAll}
                        disabled={cardCount === 0}
                    >
                        Clear
                    </button>

                    {/* Dark Mode Icon - Bottom */}
                    <button
                        className="sidebar-item theme-btn"
                        onClick={toggleDark}
                        title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
                    >
                        {/* Modern SVG Icons */}
                        {isDark ? (
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="5"></circle>
                                <line x1="12" y1="1" x2="12" y2="3"></line>
                                <line x1="12" y1="21" x2="12" y2="23"></line>
                                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
                                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
                                <line x1="1" y1="12" x2="3" y2="12"></line>
                                <line x1="21" y1="12" x2="23" y2="12"></line>
                                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
                                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
                            </svg>
                        ) : (
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
                            </svg>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}

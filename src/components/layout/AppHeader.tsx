import React from 'react'
import { useApp } from '../../context/useApp'
import { ThemeToggle } from '../common/ThemeToggle'
import { StatusBadge } from '../common/StatusBadge'
import { CountdownBadge } from '../common/CountdownBadge'

export const AppHeader: React.FC = () => {
  const { toggleMobileNav, isMobileNavOpen } = useApp()

  return (
    <header className="app-header" role="banner">
      <div className="header-left">
        <button
          type="button"
          className="mobile-nav-toggle"
          onClick={toggleMobileNav}
          aria-label={isMobileNavOpen ? 'Close navigation menu' : 'Open navigation menu'}
          aria-expanded={isMobileNavOpen}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>

        <div className="brand-container">
          <span className="brand-logo-badge">DSA-CC</span>
          <h1 className="brand-title">DSA End-Sem Command Centre</h1>
        </div>
      </div>

      <div className="header-right">
        <CountdownBadge />
        <StatusBadge />
        <ThemeToggle />
      </div>
    </header>
  )
}

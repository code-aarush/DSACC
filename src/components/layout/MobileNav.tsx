import React, { useEffect } from 'react'
import { useApp } from '../../context/useApp'
import { SECTIONS } from '../../context/navigationSections'

export const MobileNav: React.FC = () => {
  const { isMobileNavOpen, setIsMobileNavOpen, activeSection, setActiveSection } = useApp()

  // Close drawer on escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isMobileNavOpen) {
        setIsMobileNavOpen(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isMobileNavOpen, setIsMobileNavOpen])

  if (!isMobileNavOpen) return null

  return (
    <>
      <div
        className="mobile-nav-backdrop"
        onClick={() => setIsMobileNavOpen(false)}
        aria-hidden="true"
      />
      <div
        className={`mobile-nav-drawer ${isMobileNavOpen ? 'open' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label="Navigation Menu"
      >
        <div className="mobile-nav-header">
          <span className="brand-title">Modules</span>
          <button
            type="button"
            className="mobile-nav-close"
            onClick={() => setIsMobileNavOpen(false)}
            aria-label="Close drawer"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <nav className="sidebar-nav">
          {SECTIONS.map(section => {
            const isActive = activeSection === section.id
            return (
              <button
                key={section.id}
                type="button"
                className={`nav-item ${isActive ? 'active' : ''}`}
                onClick={() => {
                  setActiveSection(section.id)
                  setIsMobileNavOpen(false)
                }}
                aria-current={isActive ? 'page' : undefined}
              >
                <span>{section.title}</span>
                {section.badge && <span className="nav-item-badge">{section.badge}</span>}
              </button>
            )
          })}
        </nav>
      </div>
    </>
  )
}

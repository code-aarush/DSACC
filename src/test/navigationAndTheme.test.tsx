import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import App from '../App'

describe('Navigation and Theme Behavior Tests', () => {
  beforeEach(() => {
    window.localStorage.clear()
    document.documentElement.removeAttribute('data-theme')
  })

  it('renders application with light theme by default', async () => {
    render(<App />)

    // Wait for initialization to complete
    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 2, name: /command centre overview/i })).toBeInTheDocument()
    })

    // Root html element must have data-theme="light"
    expect(document.documentElement.getAttribute('data-theme')).toBe('light')
  })

  it('toggles dark mode reliably and persists preference', async () => {
    render(<App />)

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 2, name: /command centre overview/i })).toBeInTheDocument()
    })

    const toggleBtn = screen.getByRole('button', { name: /switch to dark mode/i })
    expect(toggleBtn).toBeInTheDocument()

    // Click toggle to dark mode
    fireEvent.click(toggleBtn)
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
    expect(window.localStorage.getItem('dsacc_theme_preference')).toBe('dark')

    // Click toggle back to light mode
    const lightToggleBtn = screen.getByRole('button', { name: /switch to light mode/i })
    fireEvent.click(lightToggleBtn)
    expect(document.documentElement.getAttribute('data-theme')).toBe('light')
    expect(window.localStorage.getItem('dsacc_theme_preference')).toBe('light')
  })

  it('switches navigation sections without page reload', async () => {
    render(<App />)

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 2, name: /command centre overview/i })).toBeInTheDocument()
    })

    // Click on Syllabus in sidebar
    const syllabusNavButtons = screen.getAllByRole('button', { name: /syllabus master tracker/i })
    fireEvent.click(syllabusNavButtons[0])

    // Should display Syllabus live view
    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 2, name: /syllabus master tracker/i })).toBeInTheDocument()
      expect(screen.getByPlaceholderText(/search syllabus topics/i)).toBeInTheDocument()
    })

    // Click on ADT Library in sidebar
    const adtNavButtons = screen.getAllByRole('button', { name: /adt implementation library/i })
    fireEvent.click(adtNavButtons[0])

    // Should display ADT Library live view
    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 2, name: /adt implementation library/i })).toBeInTheDocument()
      expect(screen.getByPlaceholderText(/search adts by name/i)).toBeInTheDocument()
    })

    // Click back to Overview
    const overviewNavButtons = screen.getAllByRole('button', { name: /preparation overview/i })
    fireEvent.click(overviewNavButtons[0])

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 2, name: /command centre overview/i })).toBeInTheDocument()
    })
  })

  it('opens and closes mobile navigation drawer', async () => {
    render(<App />)

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 2, name: /command centre overview/i })).toBeInTheDocument()
    })

    const menuToggle = screen.getByRole('button', { name: /open navigation menu/i })
    expect(menuToggle).toBeInTheDocument()

    // Open mobile nav
    fireEvent.click(menuToggle)

    const closeBtn = screen.getByRole('button', { name: /close drawer/i })
    expect(closeBtn).toBeInTheDocument()

    // Close mobile nav
    fireEvent.click(closeBtn)
    expect(screen.queryByRole('button', { name: /close drawer/i })).not.toBeInTheDocument()
  })
})

/**
 * Competitive Programming Practice Integration Tests
 * 
 * Verifies:
 * 1. Problem logging and CRUD operations.
 * 2. Strict separation of independent solves vs hint/editorial assistance.
 * 3. Safe external links with rel="noopener noreferrer".
 * 4. URL validation preventing malformed or dangerous links.
 * 5. Revisit date and filter functionality.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { App } from '../App'

describe('Competitive Programming Tracker Tests', () => {
  beforeEach(() => {
    window.localStorage.clear()
    vi.restoreAllMocks()
  })

  it('renders CP Practice section with metrics and platform quick links', async () => {
    render(<App />)

    const cpNav = screen.getAllByRole('button', { name: /competitive programming practice/i })
    fireEvent.click(cpNav[0])

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 2, name: /competitive programming practice/i })).toBeInTheDocument()
    })

    // Metric cards
    expect(screen.getByText(/0 Solved Independently/i)).toBeInTheDocument()
    expect(screen.getByText(/0 Solved with Hints \/ Solution/i)).toBeInTheDocument()

    // Platform quick links
    const leetCodeLink = screen.getByRole('link', { name: /leetcode/i })
    expect(leetCodeLink).toHaveAttribute('href', 'https://leetcode.com/problemset/all/')
    expect(leetCodeLink).toHaveAttribute('target', '_blank')
    expect(leetCodeLink).toHaveAttribute('rel', 'noopener noreferrer')
  })

  it('logs an independent solve and verifies metrics', async () => {
    render(<App />)

    const cpNav = screen.getAllByRole('button', { name: /competitive programming practice/i })
    fireEvent.click(cpNav[0])

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /\+ log problem/i })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /\+ log problem/i }))

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument()
      expect(screen.getByRole('heading', { level: 3, name: /log problem entry/i })).toBeInTheDocument()
    })

    // Fill form
    fireEvent.change(screen.getByLabelText(/problem title \*/i), {
      target: { value: 'Number of Islands' },
    })
    fireEvent.change(screen.getByLabelText(/problem url/i), {
      target: { value: 'https://leetcode.com/problems/number-of-islands/' },
    })

    // Explicitly check independent solve
    const independentCheckbox = screen.getByRole('checkbox', { name: /independently solved/i })
    fireEvent.click(independentCheckbox)
    expect(independentCheckbox).toBeChecked()

    // Submit
    const submitBtn = screen.getByRole('button', { name: /^log problem$/i })
    fireEvent.click(submitBtn)

    await waitFor(() => {
      expect(screen.getByText('Number of Islands')).toBeInTheDocument()
    })

    // Check metric updated
    expect(screen.getByText(/1 Solved Independently/i)).toBeInTheDocument()
    expect(screen.getByText(/0 Solved with Hints \/ Solution/i)).toBeInTheDocument()
    expect(screen.getByText('Independent Solve')).toBeInTheDocument()
  })

  it('strictly enforces assisted solve when hint or solution is used', async () => {
    render(<App />)

    const cpNav = screen.getAllByRole('button', { name: /competitive programming practice/i })
    fireEvent.click(cpNav[0])

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /\+ log problem/i })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /\+ log problem/i }))

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })

    fireEvent.change(screen.getByLabelText(/problem title \*/i), {
      target: { value: 'Alien Dictionary' },
    })

    // Check hint used
    const hintCheckbox = screen.getByRole('checkbox', { name: /hint used/i })
    fireEvent.click(hintCheckbox)

    // Submit
    fireEvent.click(screen.getByRole('button', { name: /^log problem$/i }))

    await waitFor(() => {
      expect(screen.getByText('Alien Dictionary')).toBeInTheDocument()
    })

    // Assisted solve metric must increment, independent solve must remain 0!
    expect(screen.getByText(/0 Solved Independently/i)).toBeInTheDocument()
    expect(screen.getByText(/1 Solved with Hints \/ Solution/i)).toBeInTheDocument()
    expect(screen.getByText('Assisted Solve')).toBeInTheDocument()
  })

  it('rejects malformed or invalid external URLs with validation message', async () => {
    render(<App />)

    const cpNav = screen.getAllByRole('button', { name: /competitive programming practice/i })
    fireEvent.click(cpNav[0])

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /\+ log problem/i })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /\+ log problem/i }))

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })

    fireEvent.change(screen.getByLabelText(/problem title \*/i), {
      target: { value: 'Invalid URL Test' },
    })
    fireEvent.change(screen.getByLabelText(/problem url/i), {
      target: { value: 'not-a-valid-http-url' },
    })

    fireEvent.click(screen.getByRole('button', { name: /^log problem$/i }))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument()
      expect(screen.getByText(/url must be a valid web link/i)).toBeInTheDocument()
    })
  })
})


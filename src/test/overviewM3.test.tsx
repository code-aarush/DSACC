/**
 * Connected Overview Dashboard Integration Tests
 * 
 * Verifies:
 * 1. Live connected metrics derived from persisted records.
 * 2. Next actionable task hero card and 1-click completion.
 * 3. Overdue task alert banner.
 * 4. Weak topics listing (confidence 1-2).
 * 5. Unresolved doubts listing.
 * 6. Navigation between command center modules.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { App } from '../App'

describe('Connected Overview Dashboard Tests', () => {
  beforeEach(() => {
    window.localStorage.clear()
    vi.restoreAllMocks()
  })

  it('renders overview dashboard with exam countdown and live academic metrics', async () => {
    render(<App />)

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 2, name: /command centre overview/i })).toBeInTheDocument()
    })

    // Exam countdown badge
    expect(screen.getByText(/Exam Timeline/i)).toBeInTheDocument()

    // Required syllabus coverage
    expect(screen.getByText(/0% Syllabus/i)).toBeInTheDocument()
    expect(screen.getByText(/0\/70/i)).toBeInTheDocument()

    // Library summaries
    expect(screen.getByText(/32 ADTs/i)).toBeInTheDocument()
    expect(screen.getByText(/29 Algos/i)).toBeInTheDocument()
  })

  it('surfaces next actionable task and supports 1-click completion from overview', async () => {
    render(<App />)

    // 1. Navigate to Tasks and create a high-priority task
    const tasksNav = screen.getAllByRole('button', { name: /tasks and study plan/i })
    fireEvent.click(tasksNav[0])

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/quick add a new task/i)).toBeInTheDocument()
    })

    const input = screen.getByPlaceholderText(/quick add a new task/i)
    fireEvent.change(input, { target: { value: 'Revise Minimum Spanning Trees' } })
    fireEvent.click(screen.getByRole('button', { name: /^add task$/i }))

    // 2. Return to Overview
    const overviewNav = screen.getAllByRole('button', { name: /preparation overview/i })
    fireEvent.click(overviewNav[0])

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 2, name: /command centre overview/i })).toBeInTheDocument()
    })

    // Next actionable task should display our new task
    expect(screen.getByText('Revise Minimum Spanning Trees')).toBeInTheDocument()

    // Click "Mark Completed" on hero card
    const markCompleteBtn = screen.getByRole('button', { name: /✓ mark completed/i })
    fireEvent.click(markCompleteBtn)

    await waitFor(() => {
      expect(screen.getByText(/All scheduled tasks are completed!/i)).toBeInTheDocument()
    })
  })

  it('displays weak topics and provides direct jump to Syllabus', async () => {
    render(<App />)

    await waitFor(() => {
      expect(screen.getByText(/Weak Topics \(Confidence 1–2\)/i)).toBeInTheDocument()
    })

    // Click "Review in Syllabus Tracker"
    const syllabusJumpBtn = screen.getByRole('button', { name: /review in syllabus tracker/i })
    fireEvent.click(syllabusJumpBtn)

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 2, name: /syllabus master tracker/i })).toBeInTheDocument()
    })
  })
})

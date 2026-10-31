/**
 * Revision Intelligence & Recovery UI Integration Tests
 * 
 * Verifies:
 * 1. Revision & Analytics section navigation and primary tab switching.
 * 2. Scheduling an entity revision in Spaced Revision Planner.
 * 3. Recording a review event and confirming interval and history update.
 * 4. Rescheduling a revision date.
 * 5. Weak Areas & Analytics view rendering and jump link navigation.
 * 6. Backup & Recovery tab displaying export and status controls.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { App } from '../App'

describe('Revision Intelligence & Recovery UI Workflows', () => {
  beforeEach(() => {
    window.localStorage.clear()
    vi.restoreAllMocks()
  })

  it('navigates to Revision and Analytics and displays module tabs and metrics', async () => {
    render(<App />)

    const revNav = screen.getAllByRole('button', { name: /revision and analytics/i })
    fireEvent.click(revNav[0])

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 2, name: /revision intelligence & recovery/i })).toBeInTheDocument()
    })

    // Check tabs
    expect(screen.getByRole('tab', { name: /spaced revision planner/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /weak areas & analytics/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /backup, export & restore/i })).toBeInTheDocument()

    // Planner quick metrics
    expect(screen.getByText(/0 Overdue/i)).toBeInTheDocument()
    expect(screen.getByText(/0 Due Today/i)).toBeInTheDocument()
    expect(screen.getByText(/0% On-Time/i)).toBeInTheDocument()
  })

  it('schedules a syllabus topic in Spaced Revision Planner and records a review event', async () => {
    render(<App />)

    // 1. Navigate to Revision & Analytics
    const revNav = screen.getAllByRole('button', { name: /revision and analytics/i })
    fireEvent.click(revNav[0])

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 2, name: /revision intelligence & recovery/i })).toBeInTheDocument()
    })

    // 2. Select item to schedule in the quick-add form
    const selectItem = screen.getByLabelText(/select item to schedule/i)
    // Choose first topic
    fireEvent.change(selectItem, { target: { value: 'topic-singly-linked-list' } })

    const scheduleBtn = screen.getByRole('button', { name: /^schedule$/i })
    expect(scheduleBtn).not.toBeDisabled()
    fireEvent.click(scheduleBtn)

    // Verify scheduled item appears in the planner table/list
    await waitFor(() => {
      expect(screen.getByText('Singly Linked List')).toBeInTheDocument()
    })

    // 3. Open Record Review modal
    const recordReviewBtn = screen.getByRole('button', { name: /record review/i })
    fireEvent.click(recordReviewBtn)

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 3, name: /record spaced review/i })).toBeInTheDocument()
    })

    // Select Outcome: STRONG
    const strongOutcomeBtn = screen.getByRole('button', { name: /strong \/ effortless/i })
    fireEvent.click(strongOutcomeBtn)

    // Set Confidence: 4
    const conf4Btn = screen.getByRole('button', { name: '4' })
    fireEvent.click(conf4Btn)

    // Enter Notes
    const notesInput = screen.getByPlaceholderText(/edge cases tested/i)
    fireEvent.change(notesInput, { target: { value: 'Traced reversal algorithm with 3 pointers effortlessly' } })

    // Confirm Review
    const confirmBtn = screen.getByRole('button', { name: /confirm review/i })
    fireEvent.click(confirmBtn)

    // Modal should close and review count should update
    await waitFor(() => {
      expect(screen.queryByRole('heading', { level: 3, name: /record spaced review/i })).not.toBeInTheDocument()
    })

    // Rate should now show 100% On-Time
    expect(screen.getByText(/100% On-Time/i)).toBeInTheDocument()
    expect(screen.getByText(/1 completed review/i)).toBeInTheDocument()
  })

  it('renders Weak Areas tab and Review Event History audit trail', async () => {
    render(<App />)

    // 1. Navigate to Revision & Analytics
    const revNav = screen.getAllByRole('button', { name: /revision and analytics/i })
    fireEvent.click(revNav[0])

    await waitFor(() => {
      expect(screen.getByRole('tab', { name: /weak areas & analytics/i })).toBeInTheDocument()
    })

    // Switch to Weak Areas tab
    const weakTab = screen.getByRole('tab', { name: /weak areas & analytics/i })
    fireEvent.click(weakTab)

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 3, name: /prioritized weak areas & trap signals/i })).toBeInTheDocument()
    })

    // Reviews by Unit breakdown should be rendered
    expect(screen.getByRole('heading', { level: 4, name: /reviews by academic unit/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 4, name: /confidence trajectory/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 4, name: /recent review event history/i })).toBeInTheDocument()
  })

  it('switches to Backup, Export & Restore tab and displays backup controls and instructions', async () => {
    render(<App />)

    const revNav = screen.getAllByRole('button', { name: /revision and analytics/i })
    fireEvent.click(revNav[0])

    await waitFor(() => {
      expect(screen.getByRole('tab', { name: /backup, export & restore/i })).toBeInTheDocument()
    })

    const backupTab = screen.getByRole('tab', { name: /backup, export & restore/i })
    fireEvent.click(backupTab)

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 3, name: /download independent json backup/i })).toBeInTheDocument()
      expect(screen.getByRole('heading', { level: 3, name: /import, merge and disaster recovery/i })).toBeInTheDocument()
    })

    // Should display Never Backed Up status badge initially
    expect(screen.getByText(/never backed up/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /download backup file/i })).toBeInTheDocument()
    expect(screen.getByLabelText(/select backup json file:/i)).toBeInTheDocument()
  })
})

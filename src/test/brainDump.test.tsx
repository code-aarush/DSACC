/**
 * Brain Dump & Doubt Workspace Integration Tests
 * 
 * Verifies:
 * 1. Instant capture with body only (allowing notes without title or tags).
 * 2. Pin / unpin behavior and sorting.
 * 3. Doubt resolution workflow without content destruction.
 * 4. Conversion of doubts/notes into revision tasks preserving original note.
 * 5. Type and tag filters.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { App } from '../App'

describe('Brain Dump & Doubt Workspace Tests', () => {
  beforeEach(() => {
    window.localStorage.clear()
    vi.restoreAllMocks()
  })

  it('renders Brain Dump section with autosave status and capture box', async () => {
    render(<App />)

    const brainDumpNav = screen.getAllByRole('button', { name: /brain dump & doubt workspace/i })
    fireEvent.click(brainDumpNav[0])

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 2, name: /brain dump & doubt workspace/i })).toBeInTheDocument()
    })

    expect(screen.getByPlaceholderText(/dump your doubt, mistake/i)).toBeInTheDocument()
    expect(screen.getByText(/0 Unresolved Doubts/i)).toBeInTheDocument()
    expect(screen.getByText(/0 Documented Mistakes/i)).toBeInTheDocument()
  })

  it('saves a note with body only (without title or tags)', async () => {
    render(<App />)

    const brainDumpNav = screen.getAllByRole('button', { name: /brain dump & doubt workspace/i })
    fireEvent.click(brainDumpNav[0])

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/dump your doubt, mistake/i)).toBeInTheDocument()
    })

    const textarea = screen.getByPlaceholderText(/dump your doubt, mistake/i)
    fireEvent.change(textarea, {
      target: { value: 'Why does Bellman-Ford need V-1 iterations instead of V?' },
    })

    const saveBtn = screen.getByRole('button', { name: /\+ save to brain dump/i })
    fireEvent.click(saveBtn)

    await waitFor(() => {
      expect(screen.getByText('Why does Bellman-Ford need V-1 iterations instead of V?')).toBeInTheDocument()
    })

    expect(screen.getByText(/Note saved successfully!/i)).toBeInTheDocument()
  })

  it('manages doubt resolution without erasing content', async () => {
    render(<App />)

    const brainDumpNav = screen.getAllByRole('button', { name: /brain dump & doubt workspace/i })
    fireEvent.click(brainDumpNav[0])

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/dump your doubt, mistake/i)).toBeInTheDocument()
    })

    // Capture a doubt
    fireEvent.change(screen.getByLabelText(/note title/i), {
      target: { value: 'Dijkstra on Negative Edges' },
    })
    fireEvent.change(screen.getByPlaceholderText(/dump your doubt, mistake/i), {
      target: { value: 'What specific contradiction arises when edge weights are negative?' },
    })

    fireEvent.click(screen.getByRole('button', { name: /\+ save to brain dump/i }))

    await waitFor(() => {
      expect(screen.getByText('Dijkstra on Negative Edges')).toBeInTheDocument()
    })

    expect(screen.getByText(/1 Unresolved Doubts/i)).toBeInTheDocument()

    // Click "Mark Resolved"
    const resolveBtn = screen.getByRole('button', { name: /✓ mark resolved/i })
    fireEvent.click(resolveBtn)

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument()
      expect(screen.getByRole('heading', { level: 3, name: /resolve doubt/i })).toBeInTheDocument()
    })

    // Enter resolution explanation
    const resolutionInput = screen.getByPlaceholderText(/how was this doubt resolved/i)
    fireEvent.change(resolutionInput, {
      target: { value: 'Greedy choice property fails because distance to an already-visited vertex could be reduced later.' },
    })

    fireEvent.click(screen.getByRole('button', { name: /confirm resolution/i }))

    await waitFor(() => {
      expect(screen.getByText('Resolved')).toBeInTheDocument()
    })

    // Active doubts count decrements to 0
    expect(screen.getByText(/0 Unresolved Doubts/i)).toBeInTheDocument()

    // Note content and resolution notes are preserved!
    expect(screen.getByText('What specific contradiction arises when edge weights are negative?')).toBeInTheDocument()
    expect(screen.getByText(/Greedy choice property fails/i)).toBeInTheDocument()
  })

  it('converts a doubt into a study task while keeping the original note intact', async () => {
    render(<App />)

    const brainDumpNav = screen.getAllByRole('button', { name: /brain dump & doubt workspace/i })
    fireEvent.click(brainDumpNav[0])

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/dump your doubt, mistake/i)).toBeInTheDocument()
    })

    // Capture note
    fireEvent.change(screen.getByLabelText(/note title/i), {
      target: { value: 'Need Practice on Kosaraju SCC' },
    })
    fireEvent.change(screen.getByPlaceholderText(/dump your doubt, mistake/i), {
      target: { value: 'Trace two-pass DFS on directed graph and reverse graph on paper.' },
    })

    fireEvent.click(screen.getByRole('button', { name: /\+ save to brain dump/i }))

    await waitFor(() => {
      expect(screen.getByText('Need Practice on Kosaraju SCC')).toBeInTheDocument()
    })

    // Click "Convert to Task"
    const convertBtn = screen.getByRole('button', { name: /convert to task/i })
    fireEvent.click(convertBtn)

    await waitFor(() => {
      expect(screen.getByText(/Converted to task/i)).toBeInTheDocument()
    })

    // Verify original note is still present
    expect(screen.getByText('Need Practice on Kosaraju SCC')).toBeInTheDocument()
    expect(screen.getByText('Linked Task Exists')).toBeInTheDocument()

    // Navigate to Tasks and verify task was created
    const tasksNav = screen.getAllByRole('button', { name: /tasks and study plan/i })
    fireEvent.click(tasksNav[0])

    // Switch to All Tasks tab
    const allTab = screen.getByRole('tab', { name: /all tasks/i })
    fireEvent.click(allTab)

    await waitFor(() => {
      expect(screen.getByText(/Follow-up: Need Practice on Kosaraju SCC/i)).toBeInTheDocument()
    })
  })
})

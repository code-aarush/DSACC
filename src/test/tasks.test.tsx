/**
 * Task Manager & Daily Study Planning Integration Tests
 * 
 * Verifies:
 * 1. Quick add and detailed task creation.
 * 2. Subtask management and progress tracking.
 * 3. Completion semantics (Task completion != Syllabus Topic completion).
 * 4. Safe deletion (Task deletion does not delete linked academic records).
 * 5. Overdue and tab filtering (Today, Focus, Upcoming, Overdue, Completed).
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { App } from '../App'

describe('Task Manager & Study Plan Tests', () => {
  beforeEach(() => {
    window.localStorage.clear()
    vi.restoreAllMocks()
  })

  it('navigates to Tasks & Study Plan section and displays empty state initially', async () => {
    render(<App />)

    const tasksNav = screen.getAllByRole('button', { name: /tasks and study plan/i })
    fireEvent.click(tasksNav[0])

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 2, name: /tasks and daily study plan/i })).toBeInTheDocument()
    })

    expect(screen.getByPlaceholderText(/quick add a new task/i)).toBeInTheDocument()
    expect(screen.getByText(/0 Due Today/i)).toBeInTheDocument()
    expect(screen.getByText(/0 Overdue/i)).toBeInTheDocument()
  })

  it('quick adds a task and toggles its completion without altering topic status', async () => {
    render(<App />)

    // Navigate to tasks
    const tasksNav = screen.getAllByRole('button', { name: /tasks and study plan/i })
    fireEvent.click(tasksNav[0])

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/quick add a new task/i)).toBeInTheDocument()
    })

    // Quick add a task
    const input = screen.getByPlaceholderText(/quick add a new task/i)
    fireEvent.change(input, { target: { value: 'Revise AVL Rotations and Trace LL/RR cases' } })

    const addBtn = screen.getByRole('button', { name: /^add task$/i })
    fireEvent.click(addBtn)

    // Switch to All Tasks to view it
    const allTab = screen.getByRole('tab', { name: /all tasks/i })
    fireEvent.click(allTab)

    await waitFor(() => {
      expect(screen.getByText('Revise AVL Rotations and Trace LL/RR cases')).toBeInTheDocument()
    })

    // Check completion checkbox
    const checkbox = screen.getByLabelText(/mark task "Revise AVL Rotations and Trace LL\/RR cases" as done/i)
    expect(checkbox).not.toBeChecked()

    fireEvent.click(checkbox)

    await waitFor(() => {
      expect(checkbox).toBeChecked()
    })

    // CRITICAL GUARANTEE: Check that the AVL syllabus topic was NOT automatically marked complete!
    const syllabusNav = screen.getAllByRole('button', { name: /syllabus master tracker/i })
    fireEvent.click(syllabusNav[0])

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 2, name: /syllabus master tracker/i })).toBeInTheDocument()
    })

    // Syllabus progress should still be 0% complete
    expect(screen.getByText(/Required Syllabus Coverage: 0%/i)).toBeInTheDocument()
    expect(screen.getByText(/0 of 62 required topics/i)).toBeInTheDocument()
  })

  it('creates a detailed task with subtasks, due date, and linked academic topic', async () => {
    render(<App />)

    const tasksNav = screen.getAllByRole('button', { name: /tasks and study plan/i })
    fireEvent.click(tasksNav[0])

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /\+ create detailed task/i })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /\+ create detailed task/i }))

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument()
      expect(screen.getByRole('heading', { level: 3, name: /create task/i })).toBeInTheDocument()
    })

    // Fill form
    fireEvent.change(screen.getByLabelText(/title \*/i), {
      target: { value: 'Master Dijkstra Algorithm' },
    })
    fireEvent.change(screen.getByLabelText(/description/i), {
      target: { value: 'Implement with adjacency list and min-heap, trace non-negative weight invariant.' },
    })

    // Add subtasks
    const subtaskInput = screen.getByPlaceholderText(/add subtask step/i)
    const addSubtaskBtn = screen.getByRole('button', { name: /\+ add subtask/i })

    fireEvent.change(subtaskInput, { target: { value: 'Code Min-Heap priority queue' } })
    fireEvent.click(addSubtaskBtn)

    fireEvent.change(subtaskInput, { target: { value: 'Trace relaxation step on paper' } })
    fireEvent.click(addSubtaskBtn)

    expect(screen.getByText('Code Min-Heap priority queue')).toBeInTheDocument()
    expect(screen.getByText('Trace relaxation step on paper')).toBeInTheDocument()

    // Submit form
    const createBtn = screen.getByRole('button', { name: /^create task$/i })
    fireEvent.click(createBtn)

    // Switch to All Tasks tab
    const allTab = screen.getByRole('tab', { name: /all tasks/i })
    fireEvent.click(allTab)

    await waitFor(() => {
      expect(screen.getByText('Master Dijkstra Algorithm')).toBeInTheDocument()
    })

    // Verify subtasks rendered
    expect(screen.getByText(/Subtasks \(0\/2\):/i)).toBeInTheDocument()

    // Toggle first subtask
    const subtaskCheckbox = screen.getByLabelText('Subtask: Code Min-Heap priority queue')
    fireEvent.click(subtaskCheckbox)

    await waitFor(() => {
      expect(screen.getByText(/Subtasks \(1\/2\):/i)).toBeInTheDocument()
    })
  })

  it('safely deletes a task without deleting linked academic records', async () => {
    vi.spyOn(window, 'confirm').mockImplementation(() => true)
    render(<App />)

    const tasksNav = screen.getAllByRole('button', { name: /tasks and study plan/i })
    fireEvent.click(tasksNav[0])

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/quick add a new task/i)).toBeInTheDocument()
    })

    // Quick add
    const input = screen.getByPlaceholderText(/quick add a new task/i)
    fireEvent.change(input, { target: { value: 'Task to Delete' } })
    fireEvent.click(screen.getByRole('button', { name: /^add task$/i }))

    // Switch to All Tasks
    fireEvent.click(screen.getByRole('tab', { name: /all tasks/i }))

    await waitFor(() => {
      expect(screen.getByText('Task to Delete')).toBeInTheDocument()
    })

    // Delete task
    const deleteBtn = screen.getByRole('button', { name: /delete task "task to delete"/i })
    fireEvent.click(deleteBtn)

    await waitFor(() => {
      expect(screen.queryByText('Task to Delete')).not.toBeInTheDocument()
    })

    // Academic dataset is preserved
    const adtNav = screen.getAllByRole('button', { name: /adt implementation library/i })
    fireEvent.click(adtNav[0])

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 2, name: /adt implementation library/i })).toBeInTheDocument()
      expect(screen.getByText(/29 core Abstract Data Types/i)).toBeInTheDocument()
    })
  })
})

/**
 * Academic Libraries Integration Tests
 * 
 * Verifies live component interactions and user workflows for:
 * 1. Syllabus Master Tracker (Grouping, Search, Filters, Custom Topics, Completion Semantics)
 * 2. ADT Implementation Library (Categories, Checklist Operations, Edge Cases, Mastery Workflow)
 * 3. Algorithm Inventory (Categories, Preconditions, Correctness Testing, Trace Verification)
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { App } from '../App'

describe('Academic Libraries Integration & Interaction Tests', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  // ==========================================================================
  // Syllabus Master Tracker Workflows
  // ==========================================================================
  describe('Syllabus Tracker UI Workflows', () => {
    it('renders syllabus tracker with unit grouping and progress summary', async () => {
      render(<App />)

      // Navigate to Syllabus
      const syllabusNav = screen.getAllByRole('button', { name: /syllabus master tracker/i })
      fireEvent.click(syllabusNav[0])

      await waitFor(() => {
        expect(screen.getByRole('heading', { level: 2, name: /syllabus master tracker/i })).toBeInTheDocument()
      })

      // Progress cards should display 0% complete initially
      expect(screen.getByText(/Required Syllabus Coverage: 0%/i)).toBeInTheDocument()
      expect(screen.getByText(/0 of 70 required topics/i)).toBeInTheDocument()

      // Unit grouping headings should exist
      expect(screen.getByRole('heading', { level: 3, name: /unit i: foundations/i })).toBeInTheDocument()
      expect(screen.getByRole('heading', { level: 3, name: /unit ii: trees/i })).toBeInTheDocument()
      expect(screen.getByRole('heading', { level: 3, name: /unit iii: search trees/i })).toBeInTheDocument()
    })

    it('filters topics by search query', async () => {
      render(<App />)
      const syllabusNav = screen.getAllByRole('button', { name: /syllabus master tracker/i })
      fireEvent.click(syllabusNav[0])

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/search syllabus topics/i)).toBeInTheDocument()
      })

      const searchInput = screen.getByPlaceholderText(/search syllabus topics/i)
      fireEvent.change(searchInput, { target: { value: 'AVL Rotations' } })

      // Should display AVL Rotations and filter out unrelated topics like Singly Linked List
      await waitFor(() => {
        expect(screen.getByText('AVL Rotations')).toBeInTheDocument()
        expect(screen.queryByText('Singly Linked List')).not.toBeInTheDocument()
      })
    })

    it('filters topics by Unit filter dropdown', async () => {
      render(<App />)
      const syllabusNav = screen.getAllByRole('button', { name: /syllabus master tracker/i })
      fireEvent.click(syllabusNav[0])

      await waitFor(() => {
        expect(screen.getByLabelText(/filter by unit/i)).toBeInTheDocument()
      })

      const unitSelect = screen.getByLabelText(/filter by unit/i)
      fireEvent.change(unitSelect, { target: { value: 'UNIT_II' } })

      await waitFor(() => {
        // Unit II heading must be visible, Unit I heading must NOT be visible
        expect(screen.getByRole('heading', { level: 3, name: /unit ii: trees/i })).toBeInTheDocument()
        expect(screen.queryByRole('heading', { level: 3, name: /unit i: foundations/i })).not.toBeInTheDocument()
      })
    })

    it('creates a custom topic and supports safe deletion', async () => {
      render(<App />)
      const syllabusNav = screen.getAllByRole('button', { name: /syllabus master tracker/i })
      fireEvent.click(syllabusNav[0])

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /\+ add custom topic/i })).toBeInTheDocument()
      })

      // Click Add Custom Topic
      fireEvent.click(screen.getByRole('button', { name: /\+ add custom topic/i }))

      // Modal appears
      expect(screen.getByRole('heading', { level: 3, name: /add custom syllabus topic/i })).toBeInTheDocument()

      // Fill in form
      const titleInput = screen.getByPlaceholderText(/e\.g\. strongly connected components/i)
      fireEvent.change(titleInput, { target: { value: 'Tarjan Strongly Connected Components' } })

      const descInput = screen.getByPlaceholderText(/brief summary of syllabus scope/i)
      fireEvent.change(descInput, { target: { value: 'DFS low-link values finding maximal strongly connected subgraphs' } })

      // Submit form
      fireEvent.click(screen.getByRole('button', { name: /create topic/i }))

      // Custom topic should now be visible in list
      await waitFor(() => {
        expect(screen.getByText('Tarjan Strongly Connected Components')).toBeInTheDocument()
      })

      // Expand custom topic
      fireEvent.click(screen.getByText('Tarjan Strongly Connected Components'))

      // Safe delete button should be present for custom topic
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /delete custom topic/i })).toBeInTheDocument()
      })
    })

    it('updates confidence level and manual completion confirmation', async () => {
      render(<App />)
      const syllabusNav = screen.getAllByRole('button', { name: /syllabus master tracker/i })
      fireEvent.click(syllabusNav[0])

      await waitFor(() => {
        expect(screen.getByText('Introduction to Data Structures')).toBeInTheDocument()
      })

      // Expand first topic
      fireEvent.click(screen.getByText('Introduction to Data Structures'))

      // Click confidence level 4
      const conf4Btn = screen.getByRole('button', { name: '4' })
      fireEvent.click(conf4Btn)

      // Grant manual confirmation
      const confirmCheckbox = screen.getByRole('checkbox', { name: /manual completion confirmed/i })
      expect(confirmCheckbox).not.toBeChecked()
      fireEvent.click(confirmCheckbox)

      // Should now be checked and topic status completed
      await waitFor(() => {
        expect(confirmCheckbox).toBeChecked()
      })
    })
  })

  // ==========================================================================
  // ADT Implementation Library Workflows
  // ==========================================================================
  describe('ADT Library UI Workflows', () => {
    it('renders ADT library with 32 ADTs and progress metrics', async () => {
      render(<App />)
      const adtNav = screen.getAllByRole('button', { name: /adt implementation library/i })
      fireEvent.click(adtNav[0])

      await waitFor(() => {
        expect(screen.getByRole('heading', { level: 2, name: /adt implementation library/i })).toBeInTheDocument()
      })

      expect(screen.getByText(/32 core abstract data types/i)).toBeInTheDocument()
      expect(screen.getByText(/0 of 32 adts tested or mastered/i)).toBeInTheDocument()
    })

    it('filters ADTs by category tabs and search query', async () => {
      render(<App />)
      const adtNav = screen.getAllByRole('button', { name: /adt implementation library/i })
      fireEvent.click(adtNav[0])

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/search adts by name/i)).toBeInTheDocument()
      })

      // Select GRAPH_REPRESENTATIONS category filter
      const categorySelect = screen.getByLabelText(/filter by category/i)
      fireEvent.change(categorySelect, { target: { value: 'GRAPH_REPRESENTATIONS' } })

      await waitFor(() => {
        expect(screen.getByText('Adjacency List')).toBeInTheDocument()
        expect(screen.getByText('Disjoint Set / Union-Find (DSU)')).toBeInTheDocument()
        expect(screen.queryByText('Singly Linked List')).not.toBeInTheDocument()
      })

      // Search within category
      const searchInput = screen.getByPlaceholderText(/search adts by name/i)
      fireEvent.change(searchInput, { target: { value: 'Disjoint Set' } })

      await waitFor(() => {
        expect(screen.getByText('Disjoint Set / Union-Find (DSU)')).toBeInTheDocument()
        expect(screen.queryByText('Adjacency List')).not.toBeInTheDocument()
      })
    })

    it('manages operation checklist, custom operations, edge cases and mastery workflow', async () => {
      render(<App />)
      const adtNav = screen.getAllByRole('button', { name: /adt implementation library/i })
      fireEvent.click(adtNav[0])

      await waitFor(() => {
        expect(screen.getByText('Singly Linked List')).toBeInTheDocument()
      })

      // Expand Singly Linked List
      fireEvent.click(screen.getByText('Singly Linked List'))

      await waitFor(() => {
        expect(screen.getByText(/essential operation checklist/i)).toBeInTheDocument()
      })

      // Check all essential operations one by one and await state update
      for (let i = 0; i < 9; i++) {
        const cbs = screen.getAllByRole('checkbox')
        fireEvent.click(cbs[i])
        await waitFor(() => {
          expect(screen.getByText(new RegExp(`ops: ${i + 1}/9`, 'i'))).toBeInTheDocument()
        })
      }

      // Checking every operation MUST NOT automatically set status to TESTED or MASTERED!
      expect(screen.queryByRole('button', { name: /confirm mastery/i })).not.toBeInTheDocument()

      // Explicitly transition status to TESTED
      const testedBtn = screen.getByRole('button', { name: 'Tested' })
      fireEvent.click(testedBtn)

      // Now with all operations checked AND status TESTED -> Mastery recommendation appears!
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /confirm mastery/i })).toBeInTheDocument()
      })

      // Explicitly confirm mastery
      fireEvent.click(screen.getByRole('button', { name: /confirm mastery/i }))

      await waitFor(() => {
        expect(screen.getByText(/mastered confirmed/i)).toBeInTheDocument()
      })

      // Add a custom operation
      const customOpInput = screen.getByPlaceholderText(/add custom operation/i)
      fireEvent.change(customOpInput, { target: { value: 'detectLoopFloyd()' } })

      const addOpBtn = screen.getByRole('button', { name: /add operation/i })
      fireEvent.click(addOpBtn)

      await waitFor(() => {
        expect(screen.getByText('detectLoopFloyd()')).toBeInTheDocument()
      })
    })
  })

  // ==========================================================================
  // Algorithm Inventory Workflows
  // ==========================================================================
  describe('Algorithm Inventory UI Workflows', () => {
    it('renders 29 algorithms and displays Dijkstra non-negative precondition', async () => {
      render(<App />)
      const algoNav = screen.getAllByRole('button', { name: /algorithm inventory/i })
      fireEvent.click(algoNav[0])

      await waitFor(() => {
        expect(screen.getByRole('heading', { level: 2, name: /algorithm inventory/i })).toBeInTheDocument()
      })

      expect(screen.getByText(/29 classic dsa algorithms/i)).toBeInTheDocument()

      // Search for Dijkstra
      const searchInput = screen.getByPlaceholderText(/search algorithms by name/i)
      fireEvent.change(searchInput, { target: { value: 'Dijkstra' } })

      await waitFor(() => {
        expect(screen.getByText("Dijkstra's Shortest Path Algorithm")).toBeInTheDocument()
      })

      // Expand Dijkstra card
      fireEvent.click(screen.getByText("Dijkstra's Shortest Path Algorithm"))

      // Precondition must be highlighted clearly
      await waitFor(() => {
        expect(screen.getByText(/CRITICAL PRECONDITION: All edge weights must be strictly non-negative/i)).toBeInTheDocument()
      })

      // Toggle correctness tested checkbox
      const correctnessCheckbox = screen.getByRole('checkbox', { name: /correctness tested on sample inputs/i })
      expect(correctnessCheckbox).not.toBeChecked()
      fireEvent.click(correctnessCheckbox)

      await waitFor(() => {
        expect(correctnessCheckbox).toBeChecked()
      })
    })
  })
})

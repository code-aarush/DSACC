import React, { useState, useMemo } from 'react'
import { useApp } from '../../context/useApp'
import {
  ADTImplementation,
  ADTStatus,
  OperationChecklistItem,
} from '../../types/domain'
import { calculateADTProgress, isADTElegibleForMastery } from '../../lib/progress/progressCalculators'
import { generateStableId } from '../../lib/ids/idGenerator'
import { getCurrentIsoTimestamp } from '../../lib/date/dateUtils'

export const ADTSection: React.FC = () => {
  const { appState, updateAppState } = useApp()
  const adts = useMemo(() => appState?.data.adts || [], [appState?.data.adts])

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL')
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL')

  // Expanded ADT cards
  const [expandedAdtIds, setExpandedAdtIds] = useState<Set<string>>(new Set())

  // New custom operation input state per ADT
  const [newOpName, setNewOpName] = useState<Record<string, string>>({})
  const [newOpComplexity, setNewOpComplexity] = useState<Record<string, string>>({})

  // New edge case input state per ADT
  const [newEdgeCaseText, setNewEdgeCaseText] = useState<Record<string, string>>({})

  // Progress summary
  const progress = useMemo(() => calculateADTProgress(adts), [adts])

  const toggleExpand = (id: string) => {
    setExpandedAdtIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  // Update a single ADT
  const handleUpdateADT = (adtId: string, mutator: (a: ADTImplementation) => ADTImplementation) => {
    updateAppState(prev => ({
      ...prev,
      data: {
        ...prev.data,
        adts: prev.data.adts.map(a => (a.id === adtId ? mutator(a) : a)),
      },
    }))
  }

  // Status transition
  const handleStatusChange = (adtId: string, status: ADTStatus) => {
    handleUpdateADT(adtId, a => ({
      ...a,
      status,
      lastTestedAt: status === 'TESTED' ? getCurrentIsoTimestamp() : a.lastTestedAt,
      masteredAt: status === 'MASTERED' ? (a.masteredAt || getCurrentIsoTimestamp()) : undefined,
      updatedAt: getCurrentIsoTimestamp(),
    }))
  }

  // Toggle essential operation checklist item
  const handleToggleOperation = (adtId: string, opId: string, forced?: boolean) => {
    handleUpdateADT(adtId, a => {
      const updatedOps = a.essentialOperations.map(op =>
        op.id === opId ? { ...op, isCompleted: typeof forced === 'boolean' ? forced : !op.isCompleted } : op
      )
      const hasAnyCompleted = updatedOps.some(op => op.isCompleted)
      let nextStatus = a.status
      if (hasAnyCompleted && a.status === 'NOT_STARTED') {
        nextStatus = 'IN_PROGRESS'
      } else if (!hasAnyCompleted && a.status === 'IN_PROGRESS') {
        nextStatus = 'NOT_STARTED'
      }
      return {
        ...a,
        status: nextStatus,
        essentialOperations: updatedOps,
        updatedAt: getCurrentIsoTimestamp(),
      }
    })
  }

  // Add custom operation to ADT
  const handleAddCustomOperation = (adtId: string) => {
    const name = newOpName[adtId]?.trim()
    if (!name) return

    const newOp: OperationChecklistItem = {
      id: generateStableId('op'),
      name,
      description: 'Custom user-defined operation',
      isCompleted: false,
      timeComplexity: newOpComplexity[adtId]?.trim() || 'O(1)',
      isCustom: true,
    }

    handleUpdateADT(adtId, a => ({
      ...a,
      essentialOperations: [...a.essentialOperations, newOp],
      updatedAt: getCurrentIsoTimestamp(),
    }))

    setNewOpName(prev => ({ ...prev, [adtId]: '' }))
    setNewOpComplexity(prev => ({ ...prev, [adtId]: '' }))
  }

  // Remove custom operation
  const handleRemoveCustomOperation = (adtId: string, opId: string) => {
    handleUpdateADT(adtId, a => ({
      ...a,
      essentialOperations: a.essentialOperations.filter(op => op.id !== opId),
      updatedAt: getCurrentIsoTimestamp(),
    }))
  }

  // Add Edge Case verified
  const handleAddEdgeCase = (adtId: string) => {
    const text = newEdgeCaseText[adtId]?.trim()
    if (!text) return

    handleUpdateADT(adtId, a => ({
      ...a,
      edgeCasesVerified: [...(a.edgeCasesVerified || []), text],
      updatedAt: getCurrentIsoTimestamp(),
    }))

    setNewEdgeCaseText(prev => ({ ...prev, [adtId]: '' }))
  }

  // Remove Edge Case
  const handleRemoveEdgeCase = (adtId: string, index: number) => {
    handleUpdateADT(adtId, a => ({
      ...a,
      edgeCasesVerified: a.edgeCasesVerified.filter((_, i) => i !== index),
      updatedAt: getCurrentIsoTimestamp(),
    }))
  }

  // File path change
  const handleFilePathChange = (adtId: string, filePath: string) => {
    handleUpdateADT(adtId, a => ({
      ...a,
      filePath,
      updatedAt: getCurrentIsoTimestamp(),
    }))
  }

  // Known issues change
  const handleKnownIssuesChange = (adtId: string, knownIssues: string) => {
    handleUpdateADT(adtId, a => ({
      ...a,
      knownIssues,
      updatedAt: getCurrentIsoTimestamp(),
    }))
  }

  // Complexity notes change
  const handleComplexityNotesChange = (adtId: string, complexityNotes: string) => {
    handleUpdateADT(adtId, a => ({
      ...a,
      complexityNotes,
      updatedAt: getCurrentIsoTimestamp(),
    }))
  }

  // Filtered ADTs
  const filteredADTs = useMemo(() => {
    return adts.filter(a => {
      if (selectedCategory !== 'ALL' && a.category !== selectedCategory) return false
      if (selectedStatus !== 'ALL' && a.status !== selectedStatus) return false
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase()
        const matchName = a.name.toLowerCase().includes(query)
        const matchComplexity = a.complexityNotes.toLowerCase().includes(query)
        const matchIssues = (a.knownIssues || '').toLowerCase().includes(query)
        if (!matchName && !matchComplexity && !matchIssues) return false
      }
      return true
    })
  }, [adts, selectedCategory, selectedStatus, searchQuery])

  return (
    <div className="adt-library-container" role="region" aria-labelledby="adt-library-title">
      <div className="section-header">
        <div className="section-header-top">
          <div>
            <h2 id="adt-library-title" className="section-title">ADT Implementation Library</h2>
            <p className="section-subtitle">
              Comprehensive inventory of 29 core Abstract Data Types and representations with operation checklists, complexity notes, and mastery tracking
            </p>
          </div>
        </div>
      </div>

      {/* Progress Summary Cards */}
      <div className="card" style={{ marginBottom: 'var(--space-4)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-2)' }}>
          <div>
            <strong style={{ fontSize: 'var(--font-size-base)' }}>Verified Implementations: {progress.percentageTestedOrMastered}%</strong>
            <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', marginLeft: 'var(--space-2)' }}>
              ({progress.tested + progress.mastered} of {progress.total} ADTs tested or mastered)
            </span>
          </div>
          <span className="badge badge-accent">
            Mastered: {progress.mastered} &bull; Tested: {progress.tested}
          </span>
        </div>

        <div className="progress-bar-container" style={{ marginBottom: 'var(--space-3)' }}>
          <div className="progress-bar-track">
            <div
              className={`progress-bar-fill ${progress.percentageTestedOrMastered === 100 ? 'success' : ''}`}
              style={{ width: `${progress.percentageTestedOrMastered}%` }}
              role="progressbar"
              aria-valuenow={progress.percentageTestedOrMastered}
              aria-valuemin={0}
              aria-valuemax={100}
            />
          </div>
        </div>

        {/* Overall Operation Checklist Progress */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'var(--space-3)', marginBottom: 'var(--space-1)', fontSize: 'var(--font-size-xs)' }}>
          <span><strong>Overall Operations Checklist:</strong> {progress.completedOperations} of {progress.totalOperations} operations ({progress.percentageOperationsCompleted}%)</span>
        </div>
        <div className="progress-bar-container" style={{ marginBottom: 'var(--space-3)' }}>
          <div className="progress-bar-track">
            <div
              className={`progress-bar-fill ${progress.percentageOperationsCompleted === 100 ? 'success' : ''}`}
              style={{ width: `${progress.percentageOperationsCompleted}%` }}
              role="progressbar"
              aria-valuenow={progress.percentageOperationsCompleted}
              aria-valuemin={0}
              aria-valuemax={100}
            />
          </div>
        </div>

        {/* Status breakdown pills */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)', fontSize: 'var(--font-size-xs)' }}>
          <span className="badge badge-neutral">Not Started: {progress.notStarted}</span>
          <span className="badge badge-neutral">In Progress: {progress.inProgress}</span>
          <span className="badge badge-neutral">Implemented: {progress.implemented}</span>
          <span className="badge badge-accent">Tested: {progress.tested}</span>
          <span className="badge badge-neutral" style={{ backgroundColor: 'var(--color-success-bg)', color: 'var(--color-success-text)' }}>
            Mastered: {progress.mastered}
          </span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="filter-bar">
        <div className="filter-group">
          <input
            type="search"
            className="search-input"
            placeholder="Search ADTs by name, complexity, issues..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            aria-label="Search ADTs"
          />

          <select
            className="filter-select"
            value={selectedCategory}
            onChange={e => setSelectedCategory(e.target.value)}
            aria-label="Filter by category"
          >
            <option value="ALL">All Categories</option>
            <option value="LINEAR">Linear Structures</option>
            <option value="TREES_AND_PRIORITY">Trees &amp; Priority</option>
            <option value="MAPS_AND_DICTIONARIES">Maps &amp; Dictionaries</option>
            <option value="ADVANCED">Advanced Structures</option>
            <option value="GRAPH_REPRESENTATIONS">Graph Representations</option>
          </select>

          <select
            className="filter-select"
            value={selectedStatus}
            onChange={e => setSelectedStatus(e.target.value)}
            aria-label="Filter by status"
          >
            <option value="ALL">All Statuses</option>
            <option value="NOT_STARTED">Not Started</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="IMPLEMENTED">Implemented</option>
            <option value="TESTED">Tested</option>
            <option value="MASTERED">Mastered</option>
          </select>
        </div>
      </div>

      {/* ADT Cards List */}
      <div className="adt-list" role="feed" aria-label="ADT implementations list">
        {filteredADTs.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: 'var(--space-8)' }}>
            <p className="card-description">No ADTs match the current filters.</p>
          </div>
        ) : (
          filteredADTs.map(adt => {
            const isExpanded = expandedAdtIds.has(adt.id)
            const completedOpsCount = adt.essentialOperations.filter(op => op.isCompleted).length
            const totalOpsCount = adt.essentialOperations.length
            const isEligible = isADTElegibleForMastery(adt)

            return (
              <div key={adt.id} className="record-card">
                <div
                  className="record-card-header"
                  onClick={() => toggleExpand(adt.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') toggleExpand(adt.id) }}
                  aria-expanded={isExpanded}
                >
                  <div className="record-title-area">
                    <span className="badge badge-neutral">{adt.category.replace(/_/g, ' ')}</span>
                    <span className="record-title">{adt.name}</span>
                  </div>

                  <div className="record-meta-area">
                    <span style={{ fontSize: 'var(--font-size-xs)', fontFamily: 'var(--font-family-mono)', color: 'var(--color-text-muted)' }}>
                      Ops: {completedOpsCount}/{totalOpsCount} ({totalOpsCount > 0 ? Math.round((completedOpsCount / totalOpsCount) * 100) : 0}%)
                    </span>
                    <span className={`badge ${adt.status === 'MASTERED' ? 'badge-neutral' : adt.status === 'TESTED' ? 'badge-accent' : 'badge-neutral'}`}
                          style={{
                            backgroundColor: adt.status === 'MASTERED' ? 'var(--color-success-bg)' : undefined,
                            color: adt.status === 'MASTERED' ? 'var(--color-success-text)' : undefined,
                          }}>
                      {adt.status.replace(/_/g, ' ')}
                    </span>
                    <span style={{ fontSize: 'var(--font-size-xs)' }}>{isExpanded ? '▲' : '▼'}</span>
                  </div>
                </div>

                {isExpanded && (
                  <div className="record-details">
                    {/* Status & Mastery Control Bar */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)', alignItems: 'center', padding: 'var(--space-3)', backgroundColor: 'var(--color-bg-surface)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border-default)' }}>
                      <span style={{ fontSize: 'var(--font-size-xs)', fontWeight: 'var(--font-weight-semibold)' }}>Transition Status:</span>
                      <button
                        type="button"
                        className={`btn btn-sm ${adt.status === 'NOT_STARTED' ? 'btn-primary' : 'btn-secondary'}`}
                        onClick={() => handleStatusChange(adt.id, 'NOT_STARTED')}
                      >
                        Not Started
                      </button>
                      <button
                        type="button"
                        className={`btn btn-sm ${adt.status === 'IN_PROGRESS' ? 'btn-primary' : 'btn-secondary'}`}
                        onClick={() => handleStatusChange(adt.id, 'IN_PROGRESS')}
                      >
                        In Progress
                      </button>
                      <button
                        type="button"
                        className={`btn btn-sm ${adt.status === 'IMPLEMENTED' ? 'btn-primary' : 'btn-secondary'}`}
                        onClick={() => handleStatusChange(adt.id, 'IMPLEMENTED')}
                      >
                        Implemented
                      </button>
                      <button
                        type="button"
                        className={`btn btn-sm ${adt.status === 'TESTED' ? 'btn-primary' : 'btn-secondary'}`}
                        onClick={() => handleStatusChange(adt.id, 'TESTED')}
                      >
                        Tested
                      </button>

                      {/* Mastery Confirmation Requirement */}
                      {isEligible && adt.status !== 'MASTERED' && (
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-2)', marginLeft: 'auto' }}>
                          <span className="badge badge-warning">Eligible for Mastery</span>
                          <button
                            type="button"
                            className="btn btn-sm btn-success"
                            onClick={() => handleStatusChange(adt.id, 'MASTERED')}
                          >
                            Explicitly Confirm Mastery
                          </button>
                        </div>
                      )}

                      {adt.status === 'MASTERED' && (
                        <div style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                          <span className="badge" style={{ backgroundColor: 'var(--color-success-bg)', color: 'var(--color-success-text)' }}>
                            Mastered Confirmed
                          </span>
                          <button
                            type="button"
                            className="btn btn-sm btn-secondary"
                            onClick={() => handleStatusChange(adt.id, 'TESTED')}
                          >
                            Revert Status
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Local File Path input */}
                    <div className="form-group">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <label className="form-label">Local File Path (informational reference):</label>
                        <span style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)' }}>
                          No automatic filesystem execution
                        </span>
                      </div>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="e.g., d:/Aarush/Career/Projects/DSA/src/structures/SinglyLinkedList.ts"
                        value={adt.filePath || ''}
                        onChange={e => handleFilePathChange(adt.id, e.target.value)}
                      />
                    </div>

                    {/* Essential Operations Checklist */}
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <strong style={{ fontSize: 'var(--font-size-sm)' }}>Essential Operation Checklist:</strong>
                        <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
                          {completedOpsCount}/{totalOpsCount} ({totalOpsCount > 0 ? Math.round((completedOpsCount / totalOpsCount) * 100) : 0}%) &bull; Checklist does not auto-mark Tested
                        </span>
                      </div>

                      <div className="progress-bar-container" style={{ margin: 'var(--space-1) 0 var(--space-3)' }}>
                        <div className="progress-bar-track">
                          <div
                            className={`progress-bar-fill ${completedOpsCount === totalOpsCount && totalOpsCount > 0 ? 'success' : ''}`}
                            style={{ width: `${totalOpsCount > 0 ? Math.round((completedOpsCount / totalOpsCount) * 100) : 0}%` }}
                            role="progressbar"
                            aria-valuenow={totalOpsCount > 0 ? Math.round((completedOpsCount / totalOpsCount) * 100) : 0}
                            aria-valuemin={0}
                            aria-valuemax={100}
                          />
                        </div>
                      </div>

                      <div className="checklist">
                        {adt.essentialOperations.map(op => (
                          <div key={op.id} className={`checklist-item ${op.isCompleted ? 'completed' : ''}`}>
                            <input
                              type="checkbox"
                              className="checklist-checkbox"
                              checked={op.isCompleted}
                              onChange={e => handleToggleOperation(adt.id, op.id, e.target.checked)}
                              id={`check-${adt.id}-${op.id}`}
                            />
                            <div className="checklist-content">
                              <label htmlFor={`check-${adt.id}-${op.id}`} className="checklist-title" style={{ cursor: 'pointer' }}>
                                {op.name}
                              </label>
                              {op.description && <div className="checklist-desc">{op.description}</div>}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                              {op.timeComplexity && (
                                <span className="checklist-complexity">Time: {op.timeComplexity}</span>
                              )}
                              {op.isCustom && (
                                <button
                                  type="button"
                                  className="btn btn-sm btn-danger"
                                  onClick={() => handleRemoveCustomOperation(adt.id, op.id)}
                                  title="Delete custom operation"
                                >
                                  &times;
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Add Custom Operation Row */}
                      <div style={{ display: 'flex', gap: 'var(--space-2)', marginTop: 'var(--space-2)' }}>
                        <input
                          type="text"
                          className="form-input"
                          placeholder="Add custom operation (e.g., middleNode())"
                          style={{ flex: 2 }}
                          value={newOpName[adt.id] || ''}
                          onChange={e => setNewOpName(prev => ({ ...prev, [adt.id]: e.target.value }))}
                        />
                        <input
                          type="text"
                          className="form-input"
                          placeholder="Complexity (e.g. O(N))"
                          style={{ flex: 1 }}
                          value={newOpComplexity[adt.id] || ''}
                          onChange={e => setNewOpComplexity(prev => ({ ...prev, [adt.id]: e.target.value }))}
                        />
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => handleAddCustomOperation(adt.id)}
                        >
                          + Add Operation
                        </button>
                      </div>
                    </div>

                    {/* Edge Cases Verified */}
                    <div>
                      <strong style={{ fontSize: 'var(--font-size-sm)', display: 'block', marginBottom: '4px' }}>
                        Edge Cases Verified:
                      </strong>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)', marginBottom: 'var(--space-2)' }}>
                        {(adt.edgeCasesVerified || []).length === 0 ? (
                          <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
                            No edge cases logged yet (e.g. empty structure, single element, boundary capacities).
                          </span>
                        ) : (
                          adt.edgeCasesVerified.map((ec, idx) => (
                            <span key={idx} className="badge badge-neutral" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                              <span>{ec}</span>
                              <button
                                type="button"
                                style={{ cursor: 'pointer', background: 'none', border: 'none', color: 'inherit' }}
                                onClick={() => handleRemoveEdgeCase(adt.id, idx)}
                              >
                                &times;
                              </button>
                            </span>
                          ))
                        )}
                      </div>

                      <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                        <input
                          type="text"
                          className="form-input"
                          placeholder="Log verified edge case (e.g., Dequeue on single-element queue sets tail null)"
                          style={{ flex: 1 }}
                          value={newEdgeCaseText[adt.id] || ''}
                          onChange={e => setNewEdgeCaseText(prev => ({ ...prev, [adt.id]: e.target.value }))}
                        />
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => handleAddEdgeCase(adt.id)}
                        >
                          + Log Case
                        </button>
                      </div>
                    </div>

                    {/* Complexity Notes and Known Issues */}
                    <div className="grid-2">
                      <div className="form-group">
                        <label className="form-label">Complexity Notes:</label>
                        <textarea
                          className="form-textarea"
                          value={adt.complexityNotes}
                          onChange={e => handleComplexityNotesChange(adt.id, e.target.value)}
                        />
                      </div>

                      <div className="form-group">
                        <label className="form-label">Known Issues / Traps:</label>
                        <textarea
                          className="form-textarea"
                          placeholder="Document tricky pointer traps, memory leaks, or underflow bugs..."
                          value={adt.knownIssues || ''}
                          onChange={e => handleKnownIssuesChange(adt.id, e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

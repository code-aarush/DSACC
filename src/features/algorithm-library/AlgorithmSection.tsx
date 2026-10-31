import React, { useState, useMemo } from 'react'
import { useApp } from '../../context/useApp'
import {
  Algorithm,
  AlgorithmStatus,
} from '../../types/domain'
import { calculateAlgorithmProgress } from '../../lib/progress/progressCalculators'
import { getCurrentIsoTimestamp } from '../../lib/date/dateUtils'

export const AlgorithmSection: React.FC = () => {
  const { appState, updateAppState } = useApp()
  const algorithms = useMemo(() => appState?.data.algorithms || [], [appState?.data.algorithms])

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL')
  const [selectedClassification, setSelectedClassification] = useState<string>('ALL')
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL')

  // Expanded card IDs
  const [expandedAlgoIds, setExpandedAlgoIds] = useState<Set<string>>(new Set())

  // Progress summary
  const progress = useMemo(() => calculateAlgorithmProgress(algorithms), [algorithms])

  const toggleExpand = (id: string) => {
    setExpandedAlgoIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  // Update a single Algorithm
  const handleUpdateAlgorithm = (algoId: string, mutator: (al: Algorithm) => Algorithm) => {
    updateAppState(prev => ({
      ...prev,
      data: {
        ...prev.data,
        algorithms: prev.data.algorithms.map(al => (al.id === algoId ? mutator(al) : al)),
      },
    }))
  }

  // Handle Status change
  const handleStatusChange = (algoId: string, status: AlgorithmStatus) => {
    handleUpdateAlgorithm(algoId, al => ({
      ...al,
      status,
      updatedAt: getCurrentIsoTimestamp(),
    }))
  }

  // Handle Correctness Tested toggle
  const handleToggleCorrectnessTested = (algoId: string) => {
    handleUpdateAlgorithm(algoId, al => {
      const nextState = !al.isCorrectnessTested
      return {
        ...al,
        isCorrectnessTested: nextState,
        status: nextState && al.status === 'NOT_STARTED' ? 'IN_PROGRESS' : al.status,
        updatedAt: getCurrentIsoTimestamp(),
      }
    })
  }

  // Handle Sample Trace toggle
  const handleToggleSampleTrace = (algoId: string) => {
    handleUpdateAlgorithm(algoId, al => ({
      ...al,
      isSampleTraceCompleted: !al.isSampleTraceCompleted,
      updatedAt: getCurrentIsoTimestamp(),
    }))
  }

  // File path change
  const handleFilePathChange = (algoId: string, filePath: string) => {
    handleUpdateAlgorithm(algoId, al => ({
      ...al,
      filePath,
      updatedAt: getCurrentIsoTimestamp(),
    }))
  }

  // Notes change
  const handleNotesChange = (algoId: string, notes: string) => {
    handleUpdateAlgorithm(algoId, al => ({
      ...al,
      notes,
      updatedAt: getCurrentIsoTimestamp(),
    }))
  }

  // Filtered Algorithms
  const filteredAlgorithms = useMemo(() => {
    return algorithms.filter(al => {
      if (selectedCategory !== 'ALL' && al.category !== selectedCategory) return false
      if (selectedClassification !== 'ALL' && al.classification !== selectedClassification) return false
      if (selectedStatus !== 'ALL' && al.status !== selectedStatus) return false
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase()
        const matchName = al.name.toLowerCase().includes(query)
        const matchPre = al.preconditions.toLowerCase().includes(query)
        const matchMistakes = al.commonMistakesAndNotes.toLowerCase().includes(query)
        const matchTime = al.timeComplexity.toLowerCase().includes(query)
        if (!matchName && !matchPre && !matchMistakes && !matchTime) return false
      }
      return true
    })
  }, [algorithms, selectedCategory, selectedClassification, selectedStatus, searchQuery])

  return (
    <div className="algorithm-library-container" role="region" aria-labelledby="algo-library-title">
      <div className="section-header">
        <div className="section-header-top">
          <div>
            <h2 id="algo-library-title" className="section-title">Algorithm Inventory</h2>
            <p className="section-subtitle">
              Verified catalog of 31 classic DSA algorithms with asymptotic complexity, preconditions, and correctness testing tracking
            </p>
          </div>
        </div>
      </div>

      {/* Progress Summary Cards */}
      <div className="card" style={{ marginBottom: 'var(--space-4)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-2)' }}>
          <div>
            <strong style={{ fontSize: 'var(--font-size-base)' }}>Correctness-Tested Algorithms: {progress.percentageTested}%</strong>
            <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', marginLeft: 'var(--space-2)' }}>
              ({progress.correctnessTestedRequired} of {progress.totalRequired} algorithms verified)
            </span>
          </div>
          <span className="badge badge-accent">
            Implemented: {progress.implementedRequired} / {progress.totalRequired}
          </span>
        </div>

        <div className="progress-bar-container" style={{ marginBottom: 'var(--space-3)' }}>
          <div className="progress-bar-track">
            <div
              className={`progress-bar-fill ${progress.percentageTested === 100 ? 'success' : ''}`}
              style={{ width: `${progress.percentageTested}%` }}
              role="progressbar"
              aria-valuenow={progress.percentageTested}
              aria-valuemin={0}
              aria-valuemax={100}
            />
          </div>
        </div>

        {/* Verification Breakdown */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)', fontSize: 'var(--font-size-xs)' }}>
          <span className="badge badge-neutral">Implemented: {progress.implementedRequired}</span>
          <span className="badge badge-accent">Correctness Tested: {progress.correctnessTestedRequired}</span>
          <span className="badge badge-neutral" style={{ backgroundColor: 'var(--color-info-bg)', color: 'var(--color-info-text)' }}>
            Sample Traced: {progress.sampleTraceCompletedRequired}
          </span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="filter-bar">
        <div className="filter-group">
          <input
            type="search"
            className="search-input"
            placeholder="Search algorithms by name, complexity, preconditions..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            aria-label="Search algorithms"
          />

          <select
            className="filter-select"
            value={selectedCategory}
            onChange={e => setSelectedCategory(e.target.value)}
            aria-label="Filter by category"
          >
            <option value="ALL">All Categories</option>
            <option value="COMPLEXITY_AND_RECURSION">Complexity &amp; Recursion</option>
            <option value="SEARCHING">Searching</option>
            <option value="SORTING">Sorting</option>
            <option value="TREE_ALGORITHMS">Tree Algorithms</option>
            <option value="GRAPH_ALGORITHMS">Graph Algorithms</option>
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

          <select
            className="filter-select"
            value={selectedClassification}
            onChange={e => setSelectedClassification(e.target.value)}
            aria-label="Filter by classification"
          >
            <option value="ALL">All Types</option>
            <option value="REQUIRED">Required Only</option>
            <option value="OPTIONAL">Optional Only</option>
          </select>
        </div>
      </div>

      {/* Algorithms List */}
      <div className="algo-list" role="feed" aria-label="Algorithms list">
        {filteredAlgorithms.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: 'var(--space-8)' }}>
            <p className="card-description">No algorithms match the current criteria.</p>
          </div>
        ) : (
          filteredAlgorithms.map(algo => {
            const isExpanded = expandedAlgoIds.has(algo.id)

            return (
              <div key={algo.id} className="record-card">
                <div
                  className="record-card-header"
                  onClick={() => toggleExpand(algo.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') toggleExpand(algo.id) }}
                  aria-expanded={isExpanded}
                >
                  <div className="record-title-area">
                    <span className="badge badge-neutral">{algo.category.replace(/_/g, ' ')}</span>
                    <span className="record-title">{algo.name}</span>
                  </div>

                  <div className="record-meta-area">
                    <span style={{ fontSize: 'var(--font-size-xs)', fontFamily: 'var(--font-family-mono)', color: 'var(--color-text-muted)' }}>
                      {algo.timeComplexity.split(' ')[0]}
                    </span>
                    <span className={`badge ${algo.isCorrectnessTested ? 'badge-accent' : 'badge-neutral'}`}>
                      {algo.isCorrectnessTested ? 'Tested' : 'Untested'}
                    </span>
                    <span className="badge badge-neutral">
                      {algo.status.replace(/_/g, ' ')}
                    </span>
                    <span style={{ fontSize: 'var(--font-size-xs)' }}>{isExpanded ? '▲' : '▼'}</span>
                  </div>
                </div>

                {isExpanded && (
                  <div className="record-details">
                    {/* Status and Verification Controls */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-4)', alignItems: 'center', padding: 'var(--space-3)', backgroundColor: 'var(--color-bg-surface)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border-default)' }}>
                      <div className="form-group">
                        <label className="form-label">Algorithm Status:</label>
                        <select
                          className="filter-select"
                          value={algo.status}
                          onChange={e => handleStatusChange(algo.id, e.target.value as AlgorithmStatus)}
                        >
                          <option value="NOT_STARTED">Not Started</option>
                          <option value="IN_PROGRESS">In Progress</option>
                          <option value="IMPLEMENTED">Implemented</option>
                          <option value="TESTED">Tested</option>
                          <option value="MASTERED">Mastered</option>
                        </select>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)', marginTop: '16px' }}>
                        <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: 'var(--font-size-sm)', cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={algo.isCorrectnessTested}
                            onChange={() => handleToggleCorrectnessTested(algo.id)}
                          />
                          <span><strong>Correctness Tested on Sample Inputs</strong></span>
                        </label>

                        <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: 'var(--font-size-sm)', cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={algo.isSampleTraceCompleted}
                            onChange={() => handleToggleSampleTrace(algo.id)}
                          />
                          <span>Sample Trace on Paper Completed</span>
                        </label>
                      </div>
                    </div>

                    {/* Preconditions Highlight Alert */}
                    <div className="alert-banner info" style={{ margin: 0 }}>
                      <div>
                        <strong>Preconditions &amp; Invariants: </strong>
                        <span>{algo.preconditions}</span>
                      </div>
                    </div>

                    {/* Complexity Badges */}
                    <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
                      <div className="card" style={{ flex: 1, padding: 'var(--space-3)' }}>
                        <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>Asymptotic Time Complexity:</div>
                        <div style={{ fontFamily: 'var(--font-family-mono)', fontWeight: 'var(--font-weight-bold)', fontSize: 'var(--font-size-sm)', marginTop: '2px' }}>
                          {algo.timeComplexity}
                        </div>
                      </div>
                      <div className="card" style={{ flex: 1, padding: 'var(--space-3)' }}>
                        <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>Auxiliary Space Complexity:</div>
                        <div style={{ fontFamily: 'var(--font-family-mono)', fontWeight: 'var(--font-weight-bold)', fontSize: 'var(--font-size-sm)', marginTop: '2px' }}>
                          {algo.auxiliarySpaceComplexity}
                        </div>
                      </div>
                    </div>

                    {/* Common Mistakes & Notes */}
                    <div className="form-group">
                      <label className="form-label">Common Traps &amp; Invariant Notes:</label>
                      <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', padding: 'var(--space-3)', backgroundColor: 'var(--color-bg-surface)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border-default)', lineHeight: 'var(--line-height-relaxed)' }}>
                        {algo.commonMistakesAndNotes}
                      </div>
                    </div>

                    {/* File Path */}
                    <div className="form-group">
                      <label className="form-label">Local File Path (informational reference):</label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="e.g., d:/Aarush/Career/Projects/DSA/src/algorithms/dijkstra.ts"
                        value={algo.filePath || ''}
                        onChange={e => handleFilePathChange(algo.id, e.target.value)}
                      />
                    </div>

                    {/* Personal Notes */}
                    <div className="form-group">
                      <label className="form-label">Personal Implementation Notes:</label>
                      <textarea
                        className="form-textarea"
                        placeholder="Document personal trace notes, tricky edge cases, or code snippets..."
                        value={algo.notes || ''}
                        onChange={e => handleNotesChange(algo.id, e.target.value)}
                      />
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

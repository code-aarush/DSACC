import React, { useState, useMemo } from 'react'
import { useApp } from '../../context/useApp'
import {
  SyllabusTopic,
  SyllabusUnit,
  TopicStudyStatus,
  TopicPriority,
  SyllabusTopicClassification,
  TopicConfidenceLevel,
  TopicImplementationStatus,
} from '../../types/domain'
import { calculateSyllabusProgress, isTopicRequirementsSatisfied } from '../../lib/progress/progressCalculators'
import { generateStableId } from '../../lib/ids/idGenerator'
import { getCurrentIsoTimestamp } from '../../lib/date/dateUtils'

const UNIT_GROUP_HEADINGS: Record<SyllabusUnit, string> = {
  UNIT_I: 'Unit I: Foundations, Linear Structures and Recursion',
  UNIT_II: 'Unit II: Trees, Priority Queues, Maps and Skip Lists',
  UNIT_III: 'Unit III: Search Trees, External Memory and Graphs',
}

export const SyllabusSection: React.FC = () => {
  const { appState, updateAppState } = useApp()
  const topics = useMemo(() => appState?.data.topics || [], [appState?.data.topics])
  const adts = useMemo(() => appState?.data.adts || [], [appState?.data.adts])
  const algorithms = useMemo(() => appState?.data.algorithms || [], [appState?.data.algorithms])

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedUnit, setSelectedUnit] = useState<string>('ALL')
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL')
  const [selectedPriority, setSelectedPriority] = useState<string>('ALL')
  const [selectedClassification, setSelectedClassification] = useState<string>('ALL')
  const [sortBy, setSortBy] = useState<string>('DEFAULT')

  // Expanded topic IDs
  const [expandedTopicIds, setExpandedTopicIds] = useState<Set<string>>(new Set())

  // Custom Topic Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [newTopicUnit, setNewTopicUnit] = useState<SyllabusUnit>('UNIT_I')
  const [newTopicChapter, setNewTopicChapter] = useState('Foundations')
  const [newTopicTitle, setNewTopicTitle] = useState('')
  const [newTopicDescription, setNewTopicDescription] = useState('')
  const [newTopicPriority, setNewTopicPriority] = useState<TopicPriority>('MEDIUM')
  const [newTopicClassification, setNewTopicClassification] = useState<SyllabusTopicClassification>('REQUIRED')

  // Progress calculations
  const progress = useMemo(() => calculateSyllabusProgress(topics), [topics])

  const toggleExpand = (id: string) => {
    setExpandedTopicIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  // Update a single topic
  const handleUpdateTopic = (topicId: string, mutator: (t: SyllabusTopic) => SyllabusTopic) => {
    updateAppState(prev => ({
      ...prev,
      data: {
        ...prev.data,
        topics: prev.data.topics.map(t => (t.id === topicId ? mutator(t) : t)),
      },
    }))
  }

  // Handle Study Status change
  const handleStatusChange = (topicId: string, status: TopicStudyStatus) => {
    handleUpdateTopic(topicId, t => ({
      ...t,
      studyStatus: status,
      updatedAt: getCurrentIsoTimestamp(),
    }))
  }

  // Handle Confidence change
  const handleConfidenceChange = (topicId: string, confidence: TopicConfidenceLevel) => {
    handleUpdateTopic(topicId, t => ({
      ...t,
      confidence,
      updatedAt: getCurrentIsoTimestamp(),
    }))
  }

  // Handle Implementation Status change
  const handleImplementationStatusChange = (topicId: string, implStatus: TopicImplementationStatus) => {
    handleUpdateTopic(topicId, t => ({
      ...t,
      implementationStatus: implStatus,
      updatedAt: getCurrentIsoTimestamp(),
    }))
  }

  // Handle Manual Confirmation toggle
  const handleManualConfirmationToggle = (topicId: string) => {
    handleUpdateTopic(topicId, t => {
      const isGranted = !t.completionRequirements.manualConfirmationGranted
      const willBeCompleted = isGranted && isTopicRequirementsSatisfied(
        { ...t, completionRequirements: { ...t.completionRequirements, manualConfirmationGranted: isGranted } },
        adts,
        algorithms
      )
      return {
        ...t,
        studyStatus: willBeCompleted ? 'COMPLETED' : t.studyStatus,
        completionRequirements: {
          ...t.completionRequirements,
          manualConfirmationGranted: isGranted,
        },
        updatedAt: getCurrentIsoTimestamp(),
      }
    })
  }

  // Handle Notes change
  const handleNotesChange = (topicId: string, notes: string) => {
    handleUpdateTopic(topicId, t => ({
      ...t,
      notes,
      updatedAt: getCurrentIsoTimestamp(),
    }))
  }

  // Add Custom Topic submit
  const handleAddCustomTopic = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTopicTitle.trim()) return

    const newTopic: SyllabusTopic = {
      id: generateStableId('topic'),
      unit: newTopicUnit,
      chapter: newTopicChapter.trim() || 'Custom',
      title: newTopicTitle.trim(),
      description: newTopicDescription.trim(),
      classification: newTopicClassification,
      priority: newTopicPriority,
      studyStatus: 'NOT_STARTED',
      confidence: 1,
      implementationStatus: 'NOT_STARTED',
      revisionStatus: 'NOT_DUE',
      completionRequirements: { manualConfirmationRequired: true },
      linkedTaskIds: [],
      linkedAdtIds: [],
      linkedAlgorithmIds: [],
      linkedCpProblemIds: [],
      notes: '',
      isCustom: true,
      createdAt: getCurrentIsoTimestamp(),
      updatedAt: getCurrentIsoTimestamp(),
    }

    updateAppState(prev => ({
      ...prev,
      data: {
        ...prev.data,
        topics: [...prev.data.topics, newTopic],
      },
    }))

    setIsAddModalOpen(false)
    setNewTopicTitle('')
    setNewTopicDescription('')
  }

  // Delete Custom Topic
  const handleDeleteCustomTopic = (topicId: string) => {
    if (window.confirm('Are you sure you want to delete this custom topic?')) {
      updateAppState(prev => ({
        ...prev,
        data: {
          ...prev.data,
          topics: prev.data.topics.filter(t => t.id !== topicId),
        },
      }))
    }
  }

  // Filtered & Sorted topics
  const filteredTopics = useMemo(() => {
    return topics.filter(t => {
      // Unit filter
      if (selectedUnit !== 'ALL' && t.unit !== selectedUnit) return false
      // Status filter
      if (selectedStatus !== 'ALL' && t.studyStatus !== selectedStatus) return false
      // Priority filter
      if (selectedPriority !== 'ALL' && t.priority !== selectedPriority) return false
      // Classification filter
      if (selectedClassification !== 'ALL' && t.classification !== selectedClassification) return false
      // Search
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase()
        const matchesTitle = t.title.toLowerCase().includes(query)
        const matchesDesc = t.description.toLowerCase().includes(query)
        const matchesChapter = t.chapter.toLowerCase().includes(query)
        const matchesNotes = t.notes.toLowerCase().includes(query)
        if (!matchesTitle && !matchesDesc && !matchesChapter && !matchesNotes) return false
      }
      return true
    }).sort((a, b) => {
      if (sortBy === 'PRIORITY') {
        const pOrder: Record<TopicPriority, number> = { HIGH: 3, MEDIUM: 2, LOW: 1 }
        return pOrder[b.priority] - pOrder[a.priority]
      }
      if (sortBy === 'CONFIDENCE_ASC') return a.confidence - b.confidence
      if (sortBy === 'CONFIDENCE_DESC') return b.confidence - a.confidence
      if (sortBy === 'TITLE') return a.title.localeCompare(b.title)
      return 0 // default order in seed
    })
  }, [topics, selectedUnit, selectedStatus, selectedPriority, selectedClassification, searchQuery, sortBy])

  return (
    <div className="syllabus-container" role="region" aria-labelledby="syllabus-title">
      <div className="section-header">
        <div className="section-header-top">
          <div>
            <h2 id="syllabus-title" className="section-title">Syllabus Master Tracker</h2>
            <p className="section-subtitle">
              Complete curriculum tracking across Units I, II, and III with completion semantics and confidence ratings
            </p>
          </div>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setIsAddModalOpen(true)}
          >
            + Add Custom Topic
          </button>
        </div>
      </div>

      {/* Progress Summary Cards */}
      <div className="card" style={{ marginBottom: 'var(--space-4)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-2)' }}>
          <div>
            <strong style={{ fontSize: 'var(--font-size-base)' }}>Required Syllabus Coverage: {progress.percentageRequired}%</strong>
            <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', marginLeft: 'var(--space-2)' }}>
              ({progress.completedRequired} of {progress.totalRequired} required topics complete)
            </span>
          </div>
          <span className="badge badge-neutral">
            {progress.totalOptional} Optional Extension Topics Excluded
          </span>
        </div>

        <div className="progress-bar-container" style={{ marginBottom: 'var(--space-3)' }}>
          <div className="progress-bar-track">
            <div
              className={`progress-bar-fill ${progress.percentageRequired === 100 ? 'success' : ''}`}
              style={{ width: `${progress.percentageRequired}%` }}
              role="progressbar"
              aria-valuenow={progress.percentageRequired}
              aria-valuemin={0}
              aria-valuemax={100}
            />
          </div>
        </div>

        {/* Unit Breakdown */}
        <div className="grid-3" style={{ marginTop: 'var(--space-2)' }}>
          <div style={{ padding: 'var(--space-2) var(--space-3)', backgroundColor: 'var(--color-bg-app)', borderRadius: 'var(--radius-md)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--font-size-xs)' }}>
              <span><strong>Unit I:</strong> Foundations &amp; Linear</span>
              <span>{progress.byUnit.UNIT_I.completedRequired}/{progress.byUnit.UNIT_I.totalRequired} ({progress.byUnit.UNIT_I.percentage}%)</span>
            </div>
          </div>
          <div style={{ padding: 'var(--space-2) var(--space-3)', backgroundColor: 'var(--color-bg-app)', borderRadius: 'var(--radius-md)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--font-size-xs)' }}>
              <span><strong>Unit II:</strong> Trees, Heaps &amp; Maps</span>
              <span>{progress.byUnit.UNIT_II.completedRequired}/{progress.byUnit.UNIT_II.totalRequired} ({progress.byUnit.UNIT_II.percentage}%)</span>
            </div>
          </div>
          <div style={{ padding: 'var(--space-2) var(--space-3)', backgroundColor: 'var(--color-bg-app)', borderRadius: 'var(--radius-md)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--font-size-xs)' }}>
              <span><strong>Unit III:</strong> BST, AVL, Ext &amp; Graphs</span>
              <span>{progress.byUnit.UNIT_III.completedRequired}/{progress.byUnit.UNIT_III.totalRequired} ({progress.byUnit.UNIT_III.percentage}%)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="filter-bar">
        <div className="filter-group">
          <input
            type="search"
            className="search-input"
            placeholder="Search syllabus topics by title, chapter, notes..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            aria-label="Search syllabus topics"
          />

          <select
            className="filter-select"
            value={selectedUnit}
            onChange={e => setSelectedUnit(e.target.value)}
            aria-label="Filter by unit"
          >
            <option value="ALL">All Units</option>
            <option value="UNIT_I">Unit I</option>
            <option value="UNIT_II">Unit II</option>
            <option value="UNIT_III">Unit III</option>
          </select>

          <select
            className="filter-select"
            value={selectedStatus}
            onChange={e => setSelectedStatus(e.target.value)}
            aria-label="Filter by study status"
          >
            <option value="ALL">All Statuses</option>
            <option value="NOT_STARTED">Not Started</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="COMPLETED">Completed</option>
          </select>

          <select
            className="filter-select"
            value={selectedPriority}
            onChange={e => setSelectedPriority(e.target.value)}
            aria-label="Filter by priority"
          >
            <option value="ALL">All Priorities</option>
            <option value="HIGH">High Priority</option>
            <option value="MEDIUM">Medium Priority</option>
            <option value="LOW">Low Priority</option>
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

        <div className="filter-group">
          <label htmlFor="sort-select" style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>Sort:</label>
          <select
            id="sort-select"
            className="filter-select"
            value={sortBy}
            onChange={e => setSortBy(e.target.value)}
          >
            <option value="DEFAULT">Syllabus Sequence</option>
            <option value="PRIORITY">Priority (High &rarr; Low)</option>
            <option value="CONFIDENCE_ASC">Confidence (Low &rarr; High)</option>
            <option value="CONFIDENCE_DESC">Confidence (High &rarr; Low)</option>
            <option value="TITLE">Title (A &rarr; Z)</option>
          </select>
        </div>
      </div>

      {/* Topics List */}
      <div className="topics-list" role="feed" aria-label="Syllabus topics list">
        {filteredTopics.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: 'var(--space-8)' }}>
            <p className="card-description">No syllabus topics match the selected criteria.</p>
          </div>
        ) : (
          (() => {
            let currentUnit: SyllabusUnit | null = null
            return filteredTopics.map(topic => {
              const showUnitHeader = sortBy === 'DEFAULT' && topic.unit !== currentUnit
              if (showUnitHeader) {
                currentUnit = topic.unit
              }
              const isExpanded = expandedTopicIds.has(topic.id)
              const isCompleted = topic.studyStatus === 'COMPLETED'
              const isRequirementsMet = isTopicRequirementsSatisfied(topic, adts, algorithms)

              return (
                <React.Fragment key={topic.id}>
                  {showUnitHeader && (
                    <div className="unit-group-header-wrapper" style={{ margin: 'var(--space-4) 0 var(--space-2)' }}>
                      <h3
                        className="unit-group-title"
                        style={{
                          fontSize: 'var(--font-size-base)',
                          fontWeight: 'var(--font-weight-bold)',
                          color: 'var(--color-text-primary)',
                          borderBottom: '2px solid var(--color-border-default)',
                          paddingBottom: '4px',
                        }}
                      >
                        {UNIT_GROUP_HEADINGS[topic.unit]}
                      </h3>
                    </div>
                  )}
                  <div className="record-card">
                    <div
                      className="record-card-header"
                      onClick={() => toggleExpand(topic.id)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') toggleExpand(topic.id) }}
                      aria-expanded={isExpanded}
                    >
                  <div className="record-title-area">
                    <span className="badge badge-neutral">{topic.unit.replace('_', ' ')}</span>
                    <span className={`badge ${topic.classification === 'REQUIRED' ? 'badge-accent' : 'badge-neutral'}`}>
                      {topic.classification}
                    </span>
                    <span className={`badge ${topic.priority === 'HIGH' ? 'badge-warning' : 'badge-neutral'}`}>
                      {topic.priority}
                    </span>
                    <span className="record-title">{topic.title}</span>
                  </div>

                  <div className="record-meta-area">
                    <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', fontFamily: 'var(--font-family-mono)' }}>
                      Conf: {topic.confidence}/5
                    </span>
                    <span className={`badge ${isCompleted ? 'badge-neutral' : 'badge-neutral'}`} style={{ backgroundColor: isCompleted ? 'var(--color-success-bg)' : undefined, color: isCompleted ? 'var(--color-success-text)' : undefined }}>
                      {topic.studyStatus.replace('_', ' ')}
                    </span>
                    <span style={{ fontSize: 'var(--font-size-xs)' }}>{isExpanded ? '▲' : '▼'}</span>
                  </div>
                </div>

                {isExpanded && (
                  <div className="record-details">
                    <div>
                      <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>Chapter: {topic.chapter}</span>
                      <p style={{ marginTop: '4px', fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
                        {topic.description}
                      </p>
                    </div>

                    {/* Interactive Controls Row */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-4)', alignItems: 'center' }}>
                      {/* Study Status */}
                      <div className="form-group">
                        <label className="form-label">Study Status:</label>
                        <select
                          className="filter-select"
                          value={topic.studyStatus}
                          onChange={e => handleStatusChange(topic.id, e.target.value as TopicStudyStatus)}
                        >
                          <option value="NOT_STARTED">Not Started</option>
                          <option value="IN_PROGRESS">In Progress</option>
                          <option value="COMPLETED">Completed</option>
                        </select>
                      </div>

                      {/* Implementation Status */}
                      {topic.implementationStatus !== 'NOT_APPLICABLE' && (
                        <div className="form-group">
                          <label className="form-label">Implementation Status:</label>
                          <select
                            className="filter-select"
                            value={topic.implementationStatus || 'NOT_STARTED'}
                            onChange={e => handleImplementationStatusChange(topic.id, e.target.value as TopicImplementationStatus)}
                          >
                            <option value="NOT_STARTED">Not Started</option>
                            <option value="IN_PROGRESS">In Progress</option>
                            <option value="IMPLEMENTED">Implemented</option>
                            <option value="TESTED">Tested</option>
                            <option value="MASTERED">Mastered</option>
                          </select>
                        </div>
                      )}

                      {/* Confidence Rating (1-5) */}
                      <div className="form-group">
                        <label className="form-label">Self-Assessed Confidence (1–5):</label>
                        <div className="confidence-selector">
                          {([1, 2, 3, 4, 5] as TopicConfidenceLevel[]).map(num => (
                            <button
                              key={num}
                              type="button"
                              className={`confidence-btn ${topic.confidence === num ? 'active' : ''}`}
                              onClick={() => handleConfidenceChange(topic.id, num)}
                              title={
                                num === 1 ? '1: Completely unfamiliar' :
                                num === 2 ? '2: Understand with help' :
                                num === 3 ? '3: Can implement with reference' :
                                num === 4 ? '4: Can implement independently' :
                                '5: Can explain, trace and solve variations'
                              }
                            >
                              {num}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Completion Requirements Box */}
                    <div style={{ padding: 'var(--space-3)', backgroundColor: 'var(--color-bg-surface)', border: '1px solid var(--color-border-default)', borderRadius: 'var(--radius-md)' }}>
                      <strong style={{ fontSize: 'var(--font-size-xs)', display: 'block', marginBottom: '6px' }}>Completion Requirements &amp; Evidence:</strong>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
                        {topic.completionRequirements.manualConfirmationRequired && (
                          <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: 'var(--font-size-sm)', cursor: 'pointer' }}>
                            <input
                              type="checkbox"
                              checked={!!topic.completionRequirements.manualConfirmationGranted}
                              onChange={() => handleManualConfirmationToggle(topic.id)}
                            />
                            <span>Manual Completion Confirmed</span>
                          </label>
                        )}

                        {topic.completionRequirements.requiredAdtIds && topic.completionRequirements.requiredAdtIds.length > 0 && (
                          <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>
                            Requires ADT: <strong>{topic.completionRequirements.requiredAdtIds.join(', ')}</strong> (Tested)
                          </span>
                        )}

                        {topic.completionRequirements.requiredAlgorithmIds && topic.completionRequirements.requiredAlgorithmIds.length > 0 && (
                          <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>
                            Requires Algorithm: <strong>{topic.completionRequirements.requiredAlgorithmIds.join(', ')}</strong> (Tested)
                          </span>
                        )}

                        <span className={`badge ${isRequirementsMet ? 'badge-accent' : 'badge-neutral'}`} style={{ marginLeft: 'auto' }}>
                          {isRequirementsMet ? 'Requirements Satisfied' : 'Evidence Pending'}
                        </span>
                      </div>
                    </div>

                    {/* Notes Area */}
                    <div className="form-group">
                      <label className="form-label">Study Notes &amp; Formulas:</label>
                      <textarea
                        className="form-textarea"
                        placeholder="Add quick notes, key invariants, or exam reminders..."
                        value={topic.notes}
                        onChange={e => handleNotesChange(topic.id, e.target.value)}
                      />
                    </div>

                    {/* Custom Topic Delete Action */}
                    {topic.isCustom && (
                      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <button
                          type="button"
                          className="btn btn-sm btn-danger"
                          onClick={() => handleDeleteCustomTopic(topic.id)}
                        >
                          Delete Custom Topic
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </React.Fragment>
          )
        })
      })()
    )}
      </div>

      {/* Add Custom Topic Modal */}
      {isAddModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsAddModalOpen(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="add-modal-title">
            <div className="modal-header">
              <h3 id="add-modal-title" style={{ fontSize: 'var(--font-size-md)', fontWeight: 'var(--font-weight-bold)' }}>
                Add Custom Syllabus Topic
              </h3>
              <button type="button" className="btn btn-sm btn-secondary" onClick={() => setIsAddModalOpen(false)}>&times;</button>
            </div>

            <form onSubmit={handleAddCustomTopic}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Unit:</label>
                  <select className="form-select" value={newTopicUnit} onChange={e => setNewTopicUnit(e.target.value as SyllabusUnit)}>
                    <option value="UNIT_I">Unit I: Foundations &amp; Linear</option>
                    <option value="UNIT_II">Unit II: Trees, Heaps &amp; Maps</option>
                    <option value="UNIT_III">Unit III: Search Trees, Ext &amp; Graphs</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Chapter / Group:</label>
                  <input
                    type="text"
                    className="form-input"
                    value={newTopicChapter}
                    onChange={e => setNewTopicChapter(e.target.value)}
                    placeholder="e.g. Advanced Graph Structures"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Topic Title *:</label>
                  <input
                    type="text"
                    className="form-input"
                    value={newTopicTitle}
                    onChange={e => setNewTopicTitle(e.target.value)}
                    placeholder="e.g. Strongly Connected Components (Tarjan)"
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Description:</label>
                  <textarea
                    className="form-textarea"
                    value={newTopicDescription}
                    onChange={e => setNewTopicDescription(e.target.value)}
                    placeholder="Brief summary of syllabus scope and concepts..."
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
                  <div className="form-group">
                    <label className="form-label">Classification:</label>
                    <select className="form-select" value={newTopicClassification} onChange={e => setNewTopicClassification(e.target.value as SyllabusTopicClassification)}>
                      <option value="REQUIRED">Required</option>
                      <option value="OPTIONAL">Optional Extension</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Priority:</label>
                    <select className="form-select" value={newTopicPriority} onChange={e => setNewTopicPriority(e.target.value as TopicPriority)}>
                      <option value="HIGH">High</option>
                      <option value="MEDIUM">Medium</option>
                      <option value="LOW">Low</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsAddModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Create Topic</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

import React, { useState, useMemo } from 'react'
import { useApp } from '../../context/useApp'
import {
  CPProblem,
  CPPlatform,
  CPDifficulty,
  CPProblemStatus,
  EntityId,
} from '../../types/domain'
import { getCurrentIsoTimestamp, formatDateHuman } from '../../lib/date/dateUtils'
import { calculateCPProgress } from '../../lib/progress/taskAndCpCalculators'
import { isValidHttpUrl } from '../../lib/validation/validators'

const PLATFORM_LABELS: Record<CPPlatform, string> = {
  LEETCODE: 'LeetCode',
  HACKERRANK: 'HackerRank',
  CODECHEF: 'CodeChef',
  CODEFORCES: 'Codeforces',
  GFG: 'GeeksforGeeks',
  OTHER: 'Other',
}

const DIFFICULTY_LABELS: Record<CPDifficulty, string> = {
  EASY: 'Easy',
  MEDIUM: 'Medium',
  HARD: 'Hard',
}

const STATUS_LABELS: Record<CPProblemStatus, string> = {
  TO_DO: 'To Do',
  ATTEMPTED: 'Attempted',
  SOLVED_INDEPENDENTLY: 'Solved Independently',
  SOLVED_WITH_HINTS: 'Solved With Hints',
  EDITORIAL_STUDIED: 'Editorial / Solution Studied',
  NEEDS_REATTEMPT: 'Needs Reattempt',
  MASTERED: 'Mastered',
}

const PLATFORM_QUICK_LINKS = [
  { name: 'LeetCode', url: 'https://leetcode.com/problemset/all/' },
  { name: 'HackerRank', url: 'https://www.hackerrank.com/domains/data-structures' },
  { name: 'CodeChef', url: 'https://www.codechef.com/practice' },
]

export const CPPracticeSection: React.FC = () => {
  const { appState, updateAppState } = useApp()
  const cpProblems = useMemo(() => appState?.data.cpProblems || [], [appState?.data.cpProblems])
  const topics = useMemo(() => appState?.data.topics || [], [appState?.data.topics])
  const adts = useMemo(() => appState?.data.adts || [], [appState?.data.adts])
  const algorithms = useMemo(() => appState?.data.algorithms || [], [appState?.data.algorithms])

  const stats = useMemo(() => calculateCPProgress(cpProblems), [cpProblems])

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('')
  const [filterPlatform, setFilterPlatform] = useState<string>('ALL')
  const [filterDifficulty, setFilterDifficulty] = useState<string>('ALL')
  const [filterStatus, setFilterStatus] = useState<string>('ALL')
  const [filterNeedsReattemptOnly, setFilterNeedsReattemptOnly] = useState(false)
  const [sortBy, setSortBy] = useState<'createdAt' | 'difficulty' | 'revisitDate'>('createdAt')

  // Expanded problem cards
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingProblem, setEditingProblem] = useState<CPProblem | null>(null)
  const [modalTitle, setModalTitle] = useState('')
  const [modalPlatform, setModalPlatform] = useState<CPPlatform>('LEETCODE')
  const [modalUrl, setModalUrl] = useState('')
  const [modalTopic, setModalTopic] = useState('')
  const [modalDifficulty, setModalDifficulty] = useState<CPDifficulty>('MEDIUM')
  const [modalStatus, setModalStatus] = useState<CPProblemStatus>('TO_DO')
  const [modalAttemptCount, setModalAttemptCount] = useState<number>(1)
  const [modalTimeSpentMinutes, setModalTimeSpentMinutes] = useState<number>(30)
  const [modalIsIndependentlySolved, setModalIsIndependentlySolved] = useState<boolean>(false)
  const [modalHintUsed, setModalHintUsed] = useState<boolean>(false)
  const [modalSolutionViewed, setModalSolutionViewed] = useState<boolean>(false)
  const [modalTimeComplexity, setModalTimeComplexity] = useState('')
  const [modalSpaceComplexity, setModalSpaceComplexity] = useState('')
  const [modalMistakesNotes, setModalMistakesNotes] = useState('')
  const [modalKeyInsight, setModalKeyInsight] = useState('')
  const [modalRevisitDate, setModalRevisitDate] = useState('')
  const [modalGeneralNotes, setModalGeneralNotes] = useState('')
  const [modalLinkedTopicId, setModalLinkedTopicId] = useState<EntityId | ''>('')
  const [modalLinkedAdtId, setModalLinkedAdtId] = useState<EntityId | ''>('')
  const [modalLinkedAlgoId, setModalLinkedAlgoId] = useState<EntityId | ''>('')
  const [modalError, setModalError] = useState<string | null>(null)

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  // Filtered & Sorted problems
  const filteredProblems = useMemo(() => {
    return cpProblems.filter(problem => {
      if (filterNeedsReattemptOnly && problem.status !== 'NEEDS_REATTEMPT') {
        return false
      }

      if (filterPlatform !== 'ALL' && problem.platform !== filterPlatform) {
        return false
      }

      if (filterDifficulty !== 'ALL' && problem.difficulty !== filterDifficulty) {
        return false
      }

      if (filterStatus !== 'ALL' && problem.status !== filterStatus) {
        return false
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const matchesTitle = problem.title.toLowerCase().includes(q)
        const matchesTopic = (problem.topic || '').toLowerCase().includes(q)
        const matchesInsight = (problem.keyInsight || '').toLowerCase().includes(q)
        const matchesMistakes = (problem.mistakesNotes || '').toLowerCase().includes(q)
        if (!matchesTitle && !matchesTopic && !matchesInsight && !matchesMistakes) {
          return false
        }
      }

      return true
    }).sort((a, b) => {
      if (sortBy === 'difficulty') {
        const diffRank: Record<CPDifficulty, number> = { EASY: 1, MEDIUM: 2, HARD: 3 }
        return (diffRank[b.difficulty] || 0) - (diffRank[a.difficulty] || 0)
      }
      if (sortBy === 'revisitDate') {
        if (a.revisitDate && b.revisitDate) return a.revisitDate.localeCompare(b.revisitDate)
        if (a.revisitDate && !b.revisitDate) return -1
        if (!a.revisitDate && b.revisitDate) return 1
      }
      return b.createdAt.localeCompare(a.createdAt)
    })
  }, [cpProblems, filterNeedsReattemptOnly, filterPlatform, filterDifficulty, filterStatus, searchQuery, sortBy])

  // Open Modal helpers
  const openCreateModal = () => {
    setEditingProblem(null)
    setModalTitle('')
    setModalPlatform('LEETCODE')
    setModalUrl('')
    setModalTopic('')
    setModalDifficulty('MEDIUM')
    setModalStatus('TO_DO')
    setModalAttemptCount(1)
    setModalTimeSpentMinutes(30)
    setModalIsIndependentlySolved(false)
    setModalHintUsed(false)
    setModalSolutionViewed(false)
    setModalTimeComplexity('')
    setModalSpaceComplexity('')
    setModalMistakesNotes('')
    setModalKeyInsight('')
    setModalRevisitDate('')
    setModalGeneralNotes('')
    setModalLinkedTopicId('')
    setModalLinkedAdtId('')
    setModalLinkedAlgoId('')
    setModalError(null)
    setIsModalOpen(true)
  }

  const openEditModal = (problem: CPProblem) => {
    setEditingProblem(problem)
    setModalTitle(problem.title)
    setModalPlatform(problem.platform)
    setModalUrl(problem.url || '')
    setModalTopic(problem.topic || '')
    setModalDifficulty(problem.difficulty)
    setModalStatus(problem.status)
    setModalAttemptCount(problem.attemptCount || 1)
    setModalTimeSpentMinutes(problem.timeSpentMinutes || 0)
    setModalIsIndependentlySolved(!!problem.isIndependentlySolved)
    setModalHintUsed(!!problem.hintUsed)
    setModalSolutionViewed(!!problem.solutionViewed)
    setModalTimeComplexity(problem.timeComplexity || '')
    setModalSpaceComplexity(problem.spaceComplexity || '')
    setModalMistakesNotes(problem.mistakesNotes || '')
    setModalKeyInsight(problem.keyInsight || '')
    setModalRevisitDate(problem.revisitDate || '')
    setModalGeneralNotes(problem.generalNotes || problem.notes || '')
    setModalLinkedTopicId(problem.relatedSyllabusTopicIds?.[0] || '')
    setModalLinkedAdtId(problem.relatedAdtIds?.[0] || '')
    setModalLinkedAlgoId(problem.relatedAlgorithmIds?.[0] || '')
    setModalError(null)
    setIsModalOpen(true)
  }

  const handleDeleteProblem = async (problem: CPProblem) => {
    const confirmed = window.confirm(`Are you sure you want to delete "${problem.title}"? Linked syllabus topics will remain intact.`)
    if (!confirmed) return

    const now = getCurrentIsoTimestamp()
    await updateAppState(prev => ({
      ...prev,
      updatedAt: now,
      data: {
        ...prev.data,
        cpProblems: prev.data.cpProblems.filter(p => p.id !== problem.id),
      },
    }))
  }

  // Reversible toggle for Independent Solve
  const handleToggleIndependentSolve = async (problemId: string, forceVal?: boolean) => {
    const now = getCurrentIsoTimestamp()
    await updateAppState(prev => {
      const updated = prev.data.cpProblems.map(p => {
        if (p.id !== problemId) return p
        const nextVal = typeof forceVal === 'boolean' ? forceVal : !p.isIndependentlySolved
        return {
          ...p,
          isIndependentlySolved: nextVal,
          hintUsed: nextVal ? false : p.hintUsed,
          solutionViewed: nextVal ? false : p.solutionViewed,
          updatedAt: now,
        }
      })
      return {
        ...prev,
        updatedAt: now,
        data: {
          ...prev.data,
          cpProblems: updated,
        },
      }
    })
  }

  const handleSaveModal = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!modalTitle.trim()) {
      setModalError('Problem title is required.')
      return
    }

    if (modalUrl.trim() && !isValidHttpUrl(modalUrl.trim())) {
      setModalError('URL must be a valid web link starting with http:// or https://')
      return
    }

    // Strict validation: if hint used or solution viewed, independent solve cannot be true
    let finalIndependent = modalIsIndependentlySolved
    if (modalHintUsed || modalSolutionViewed) {
      finalIndependent = false
    }

    const now = getCurrentIsoTimestamp()
    const relatedTopicIds = modalLinkedTopicId ? [modalLinkedTopicId] : []
    const relatedAdtIds = modalLinkedAdtId ? [modalLinkedAdtId] : []
    const relatedAlgoIds = modalLinkedAlgoId ? [modalLinkedAlgoId] : []

    if (editingProblem) {
      // Update
      await updateAppState(prev => {
        const updated = prev.data.cpProblems.map(p => {
          if (p.id !== editingProblem.id) return p
          return {
            ...p,
            title: modalTitle.trim(),
            platform: modalPlatform,
            url: modalUrl.trim() || undefined,
            topic: modalTopic.trim() || 'General',
            difficulty: modalDifficulty,
            status: modalStatus,
            attemptCount: Number(modalAttemptCount) || 1,
            timeSpentMinutes: Number(modalTimeSpentMinutes) || 0,
            isIndependentlySolved: finalIndependent,
            hintUsed: modalHintUsed,
            solutionViewed: modalSolutionViewed,
            timeComplexity: modalTimeComplexity.trim() || undefined,
            spaceComplexity: modalSpaceComplexity.trim() || undefined,
            mistakesNotes: modalMistakesNotes.trim() || undefined,
            keyInsight: modalKeyInsight.trim() || undefined,
            revisitDate: modalRevisitDate || undefined,
            generalNotes: modalGeneralNotes.trim() || undefined,
            notes: modalGeneralNotes.trim() || undefined,
            relatedSyllabusTopicIds: relatedTopicIds,
            relatedAdtIds: relatedAdtIds,
            relatedAlgorithmIds: relatedAlgoIds,
            updatedAt: now,
          }
        })
        return {
          ...prev,
          updatedAt: now,
          data: { ...prev.data, cpProblems: updated },
        }
      })
    } else {
      // Create
      const newProblem: CPProblem = {
        id: `cp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        title: modalTitle.trim(),
        platform: modalPlatform,
        url: modalUrl.trim() || undefined,
        topic: modalTopic.trim() || 'General',
        difficulty: modalDifficulty,
        status: modalStatus,
        attemptCount: Number(modalAttemptCount) || 1,
        timeSpentMinutes: Number(modalTimeSpentMinutes) || 0,
        isIndependentlySolved: finalIndependent,
        hintUsed: modalHintUsed,
        solutionViewed: modalSolutionViewed,
        timeComplexity: modalTimeComplexity.trim() || undefined,
        spaceComplexity: modalSpaceComplexity.trim() || undefined,
        mistakesNotes: modalMistakesNotes.trim() || undefined,
        keyInsight: modalKeyInsight.trim() || undefined,
        revisitDate: modalRevisitDate || undefined,
        generalNotes: modalGeneralNotes.trim() || undefined,
        notes: modalGeneralNotes.trim() || undefined,
        relatedSyllabusTopicIds: relatedTopicIds,
        relatedAdtIds: relatedAdtIds,
        relatedAlgorithmIds: relatedAlgoIds,
        createdAt: now,
        updatedAt: now,
      }
      await updateAppState(prev => ({
        ...prev,
        updatedAt: now,
        data: {
          ...prev.data,
          cpProblems: [newProblem, ...prev.data.cpProblems],
        },
      }))
    }

    setIsModalOpen(false)
  }

  return (
    <div className="cp-container" role="region" aria-labelledby="cp-section-title">
      <div className="section-header">
        <div className="section-header-top">
          <div>
            <h2 id="cp-section-title" className="section-title">Competitive Programming Practice</h2>
            <p className="section-subtitle">
              Problem log with strict separation of independent vs assisted solves, difficulty metrics, insights and revisit dates.
            </p>
          </div>
          <button
            type="button"
            className="btn btn-primary"
            onClick={openCreateModal}
          >
            + Log Problem
          </button>
        </div>
      </div>

      {/* Metrics Summary Grid */}
      <div className="grid-3" style={{ marginBottom: 'var(--space-5)' }}>
        <div className="card">
          <div className="badge badge-neutral" style={{ marginBottom: 'var(--space-2)' }}>Independent Solves</div>
          <h4 className="card-title">{stats.independentlySolved} Solved Independently</h4>
          <p className="card-description">
            Solved strictly without hint or editorial assistance ({stats.total > 0 ? Math.round((stats.independentlySolved / stats.total) * 100) : 0}% of logged problems).
          </p>
        </div>

        <div className="card">
          <div className="badge badge-warning" style={{ marginBottom: 'var(--space-2)' }}>Assisted Solves</div>
          <h4 className="card-title">{stats.assistedSolved} Solved with Hints / Solution</h4>
          <p className="card-description">
            Required hints or editorial study. Counted separately from independent solves.
          </p>
        </div>

        <div className="card">
          <div className="badge badge-neutral" style={{ marginBottom: 'var(--space-2)' }}>Reattempt &amp; Mastered</div>
          <h4 className="card-title">{stats.needsReattempt} Reattempt &bull; {stats.mastered} Mastered</h4>
          <p className="card-description">
            Total practice time: <strong>{Math.round(stats.totalTimeSpentMinutes / 60 * 10) / 10}h</strong> across {stats.total} logged problems.
          </p>
        </div>
      </div>

      {/* Quick External Platform Links */}
      <div className="card" style={{ marginBottom: 'var(--space-4)', padding: 'var(--space-3) var(--space-4)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
          <span style={{ fontSize: 'var(--font-size-xs)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-text-secondary)' }}>
            Practice Platforms:
          </span>
          <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
            {PLATFORM_QUICK_LINKS.map(link => (
              <a
                key={link.name}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-secondary btn-sm"
              >
                {link.name} &nearr;
              </a>
            ))}
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="filter-bar">
        <div className="filter-group">
          <input
            type="search"
            className="search-input"
            placeholder="Search problems by title, topic, insight..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            aria-label="Search problems"
          />
          <select
            className="filter-select"
            value={filterPlatform}
            onChange={e => setFilterPlatform(e.target.value)}
            aria-label="Filter by platform"
          >
            <option value="ALL">All Platforms</option>
            {Object.entries(PLATFORM_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
          <select
            className="filter-select"
            value={filterDifficulty}
            onChange={e => setFilterDifficulty(e.target.value)}
            aria-label="Filter by difficulty"
          >
            <option value="ALL">All Difficulties</option>
            {Object.entries(DIFFICULTY_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
          <select
            className="filter-select"
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            aria-label="Filter by status"
          >
            <option value="ALL">All Statuses</option>
            {Object.entries(STATUS_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
          <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)', fontSize: 'var(--font-size-xs)', cursor: 'pointer', color: 'var(--color-text-secondary)' }}>
            <input
              type="checkbox"
              checked={filterNeedsReattemptOnly}
              onChange={e => setFilterNeedsReattemptOnly(e.target.checked)}
            />
            Needs Reattempt Only
          </label>
        </div>

        <div className="filter-group">
          <label htmlFor="cp-sort-select" style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
            Sort by:
          </label>
          <select
            id="cp-sort-select"
            className="filter-select"
            value={sortBy}
            onChange={e => setSortBy(e.target.value as 'createdAt' | 'difficulty' | 'revisitDate')}
            aria-label="Sort problems"
          >
            <option value="createdAt">Date Logged</option>
            <option value="difficulty">Difficulty</option>
            <option value="revisitDate">Revisit Date</option>
          </select>
        </div>
      </div>

      {/* Problems List */}
      <div className="problems-list" role="list" aria-label="Problems">
        {filteredProblems.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: 'var(--space-8)' }}>
            <p className="card-description">
              No problems logged yet matching your filters.
            </p>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              style={{ marginTop: 'var(--space-3)' }}
              onClick={openCreateModal}
            >
              + Log your first problem
            </button>
          </div>
        ) : (
          filteredProblems.map(problem => {
            const isExpanded = expandedIds.has(problem.id)
            const isIndependent = problem.isIndependentlySolved && !problem.hintUsed && !problem.solutionViewed

            return (
              <div
                key={problem.id}
                className="record-card"
                role="listitem"
              >
                <div
                  className="record-card-header"
                  onClick={() => toggleExpand(problem.id)}
                  aria-expanded={isExpanded}
                >
                  <div className="record-title-area">
                    <span className="record-title">{problem.title}</span>
                    <span className="badge badge-neutral">{PLATFORM_LABELS[problem.platform]}</span>
                    <span className={`badge ${problem.difficulty === 'HARD' ? 'badge-warning' :
                        problem.difficulty === 'MEDIUM' ? 'badge-neutral' : 'badge-neutral'
                      }`}>
                      {DIFFICULTY_LABELS[problem.difficulty]}
                    </span>
                    <span className="badge badge-neutral">
                      {STATUS_LABELS[problem.status]}
                    </span>
                    {isIndependent ? (
                      <span className="badge badge-accent" title="Solved independently without hints or solution">
                        Independent Solve
                      </span>
                    ) : (problem.hintUsed || problem.solutionViewed) ? (
                      <span className="badge badge-warning" title="Assisted solve (hint used or solution studied)">
                        Assisted Solve
                      </span>
                    ) : null}
                    {problem.revisitDate && (
                      <span className="badge badge-neutral">
                        Revisit: {formatDateHuman(problem.revisitDate)}
                      </span>
                    )}
                  </div>

                  <div className="record-meta-area" onClick={e => e.stopPropagation()}>
                    {problem.url && isValidHttpUrl(problem.url) && (
                      <a
                        href={problem.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-secondary btn-sm"
                        aria-label={`Open external problem link for ${problem.title}`}
                      >
                        Open Problem &nearr;
                      </a>
                    )}
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => openEditModal(problem)}
                      aria-label={`Edit problem "${problem.title}"`}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="btn btn-danger btn-sm"
                      onClick={() => handleDeleteProblem(problem)}
                      aria-label={`Delete problem "${problem.title}"`}
                    >
                      Delete
                    </button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="record-details">
                    <div className="grid-2">
                      <div>
                        <strong>Topic:</strong> {problem.topic || 'General'}
                        <div style={{ marginTop: 'var(--space-1)' }}>
                          <strong>Complexity:</strong> Time: {problem.timeComplexity || 'Not specified'} | Space: {problem.spaceComplexity || 'Not specified'}
                        </div>
                        <div style={{ marginTop: 'var(--space-1)' }}>
                          <strong>Attempts:</strong> {problem.attemptCount} &bull; <strong>Time Spent:</strong> {problem.timeSpentMinutes} min
                        </div>
                      </div>
                      <div>
                        <strong>Assistance:</strong>
                        <div style={{ fontSize: 'var(--font-size-xs)', marginTop: 'var(--space-1)' }}>
                          <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: 'pointer', margin: '2px 0' }}>
                            <input
                              type="checkbox"
                              checked={!!problem.isIndependentlySolved && !problem.hintUsed && !problem.solutionViewed}
                              onChange={e => handleToggleIndependentSolve(problem.id, e.target.checked)}
                            />
                            <span>Independently Solved: <strong>{problem.isIndependentlySolved ? 'Yes' : 'No'}</strong></span>
                          </label>
                          <br />
                          &bull; Hint Used: <strong>{problem.hintUsed ? 'Yes' : 'No'}</strong><br />
                          &bull; Solution Viewed: <strong>{problem.solutionViewed ? 'Yes' : 'No'}</strong>
                        </div>
                      </div>
                    </div>

                    {problem.keyInsight && (
                      <div>
                        <strong>Key Insight:</strong>
                        <p className="card-description" style={{ marginTop: 'var(--space-1)' }}>
                          {problem.keyInsight}
                        </p>
                      </div>
                    )}

                    {problem.mistakesNotes && (
                      <div>
                        <strong>Mistakes / Traps Identified:</strong>
                        <p className="card-description" style={{ marginTop: 'var(--space-1)' }}>
                          {problem.mistakesNotes}
                        </p>
                      </div>
                    )}

                    {problem.generalNotes && (
                      <div>
                        <strong>Notes:</strong>
                        <p className="card-description" style={{ marginTop: 'var(--space-1)' }}>
                          {problem.generalNotes}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      {/* Add / Edit Problem Modal */}
      {isModalOpen && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="cp-modal-title">
          <div className="modal-content">
            <div className="modal-header">
              <h3 id="cp-modal-title" className="card-title">
                {editingProblem ? 'Edit Problem Entry' : 'Log Problem Entry'}
              </h3>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setIsModalOpen(false)}
                aria-label="Close modal"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSaveModal} noValidate>
              <div className="modal-body">
                {modalError && (
                  <div className="alert-banner error" role="alert">
                    {modalError}
                  </div>
                )}

                <div className="form-group">
                  <label htmlFor="cp-title-input" className="form-label">
                    Problem Title *
                  </label>
                  <input
                    id="cp-title-input"
                    type="text"
                    className="form-input"
                    value={modalTitle}
                    onChange={e => setModalTitle(e.target.value)}
                    required
                    placeholder="e.g. Course Schedule (Topological Sort)"
                  />
                </div>

                <div className="grid-2">
                  <div className="form-group">
                    <label htmlFor="cp-platform-select" className="form-label">
                      Platform
                    </label>
                    <select
                      id="cp-platform-select"
                      className="form-select"
                      value={modalPlatform}
                      onChange={e => setModalPlatform(e.target.value as CPPlatform)}
                    >
                      {Object.entries(PLATFORM_LABELS).map(([k, v]) => (
                        <option key={k} value={k}>{v}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label htmlFor="cp-difficulty-select" className="form-label">
                      Difficulty
                    </label>
                    <select
                      id="cp-difficulty-select"
                      className="form-select"
                      value={modalDifficulty}
                      onChange={e => setModalDifficulty(e.target.value as CPDifficulty)}
                    >
                      {Object.entries(DIFFICULTY_LABELS).map(([k, v]) => (
                        <option key={k} value={k}>{v}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="cp-url-input" className="form-label">
                    Problem URL (Optional)
                  </label>
                  <input
                    id="cp-url-input"
                    type="url"
                    className="form-input"
                    value={modalUrl}
                    onChange={e => setModalUrl(e.target.value)}
                    placeholder="https://leetcode.com/problems/..."
                  />
                </div>

                <div className="grid-2">
                  <div className="form-group">
                    <label htmlFor="cp-topic-input" className="form-label">
                      Topic / Algorithm Tags
                    </label>
                    <input
                      id="cp-topic-input"
                      type="text"
                      className="form-input"
                      value={modalTopic}
                      onChange={e => setModalTopic(e.target.value)}
                      placeholder="e.g. Graph, BFS, Topological Sort"
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="cp-status-select" className="form-label">
                      Status
                    </label>
                    <select
                      id="cp-status-select"
                      className="form-select"
                      value={modalStatus}
                      onChange={e => setModalStatus(e.target.value as CPProblemStatus)}
                    >
                      {Object.entries(STATUS_LABELS).map(([k, v]) => (
                        <option key={k} value={k}>{v}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid-2">
                  <div className="form-group">
                    <label htmlFor="cp-attempts-input" className="form-label">
                      Attempt Count
                    </label>
                    <input
                      id="cp-attempts-input"
                      type="number"
                      min="1"
                      className="form-input"
                      value={modalAttemptCount}
                      onChange={e => setModalAttemptCount(parseInt(e.target.value, 10) || 1)}
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="cp-time-input" className="form-label">
                      Time Spent (minutes)
                    </label>
                    <input
                      id="cp-time-input"
                      type="number"
                      min="0"
                      className="form-input"
                      value={modalTimeSpentMinutes}
                      onChange={e => setModalTimeSpentMinutes(parseInt(e.target.value, 10) || 0)}
                    />
                  </div>
                </div>

                {/* Assistance Checkboxes */}
                <div className="form-group" style={{ backgroundColor: 'var(--color-bg-elevated)', padding: 'var(--space-3)', borderRadius: 'var(--radius-md)' }}>
                  <label className="form-label" style={{ marginBottom: 'var(--space-2)' }}>
                    Solution Assistance Tracking (Strict Separation)
                  </label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={modalIsIndependentlySolved}
                        onChange={e => {
                          const val = e.target.checked
                          setModalIsIndependentlySolved(val)
                          if (val) {
                            setModalHintUsed(false)
                            setModalSolutionViewed(false)
                          }
                        }}
                      />
                      <span style={{ fontSize: 'var(--font-size-xs)' }}>
                        <strong>Independently Solved</strong> (Solved without reading hints or viewing editorial)
                      </span>
                    </label>

                    <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={modalHintUsed}
                        onChange={e => {
                          const val = e.target.checked
                          setModalHintUsed(val)
                          if (val) setModalIsIndependentlySolved(false)
                        }}
                      />
                      <span style={{ fontSize: 'var(--font-size-xs)' }}>
                        Hint Used during solve
                      </span>
                    </label>

                    <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={modalSolutionViewed}
                        onChange={e => {
                          const val = e.target.checked
                          setModalSolutionViewed(val)
                          if (val) setModalIsIndependentlySolved(false)
                        }}
                      />
                      <span style={{ fontSize: 'var(--font-size-xs)' }}>
                        Editorial / Solution Viewed
                      </span>
                    </label>
                  </div>
                </div>

                <div className="grid-2">
                  <div className="form-group">
                    <label htmlFor="cp-time-comp-input" className="form-label">
                      Time Complexity
                    </label>
                    <input
                      id="cp-time-comp-input"
                      type="text"
                      className="form-input"
                      value={modalTimeComplexity}
                      onChange={e => setModalTimeComplexity(e.target.value)}
                      placeholder="e.g. O(V + E)"
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="cp-space-comp-input" className="form-label">
                      Space Complexity
                    </label>
                    <input
                      id="cp-space-comp-input"
                      type="text"
                      className="form-input"
                      value={modalSpaceComplexity}
                      onChange={e => setModalSpaceComplexity(e.target.value)}
                      placeholder="e.g. O(V)"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="cp-insight-input" className="form-label">
                    Key Insight / Core Pattern
                  </label>
                  <textarea
                    id="cp-insight-input"
                    className="form-textarea"
                    value={modalKeyInsight}
                    onChange={e => setModalKeyInsight(e.target.value)}
                    placeholder="What was the 'aha!' moment or critical reduction?"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="cp-mistakes-input" className="form-label">
                    Mistakes / Bugs Encounted
                  </label>
                  <textarea
                    id="cp-mistakes-input"
                    className="form-textarea"
                    value={modalMistakesNotes}
                    onChange={e => setModalMistakesNotes(e.target.value)}
                    placeholder="Edge cases missed, infinite loops, off-by-one errors..."
                  />
                </div>

                <div className="grid-2">
                  <div className="form-group">
                    <label htmlFor="cp-revisit-input" className="form-label">
                      Revisit Date
                    </label>
                    <input
                      id="cp-revisit-input"
                      type="date"
                      className="form-input"
                      value={modalRevisitDate}
                      onChange={e => setModalRevisitDate(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="cp-link-topic" className="form-label">
                      Link Syllabus Topic
                    </label>
                    <select
                      id="cp-link-topic"
                      className="form-select"
                      value={modalLinkedTopicId}
                      onChange={e => setModalLinkedTopicId(e.target.value)}
                    >
                      <option value="">None</option>
                      {topics.map(t => (
                        <option key={t.id} value={t.id}>[{t.unit}] {t.title}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid-2">
                  <div className="form-group">
                    <label htmlFor="cp-link-adt" className="form-label">
                      Link Related ADT (Optional)
                    </label>
                    <select
                      id="cp-link-adt"
                      className="form-select"
                      value={modalLinkedAdtId}
                      onChange={e => setModalLinkedAdtId(e.target.value)}
                    >
                      <option value="">None</option>
                      {adts.map(a => (
                        <option key={a.id} value={a.id}>{a.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label htmlFor="cp-link-algo" className="form-label">
                      Link Related Algorithm (Optional)
                    </label>
                    <select
                      id="cp-link-algo"
                      className="form-select"
                      value={modalLinkedAlgoId}
                      onChange={e => setModalLinkedAlgoId(e.target.value)}
                    >
                      <option value="">None</option>
                      {algorithms.map(al => (
                        <option key={al.id} value={al.id}>{al.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setIsModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                >
                  {editingProblem ? 'Save Changes' : 'Log Problem'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
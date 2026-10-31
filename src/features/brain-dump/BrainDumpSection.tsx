import React, { useState, useMemo } from 'react'
import { useApp } from '../../context/useApp'
import {
  BrainDumpNote,
  BrainDumpNoteType,
  EntityId,
  Task,
} from '../../types/domain'
import { getCurrentIsoTimestamp, formatDateHuman } from '../../lib/date/dateUtils'
import { getBrainDumpStats } from '../../lib/progress/taskAndCpCalculators'

const NOTE_TYPE_LABELS: Record<BrainDumpNoteType, string> = {
  IDEA: 'Idea',
  DOUBT: 'Doubt / Question',
  MISTAKE: 'Mistake',
  CONCEPT_EXPLANATION: 'Concept Explanation',
  IMPORTANT_INSIGHT: 'Important Insight',
  EXAM_TIP: 'Exam Tip',
  PENDING_RESEARCH: 'Pending Research',
}

export const BrainDumpSection: React.FC = () => {
  const { appState, updateAppState, saveStatus } = useApp()
  const notes = useMemo(() => appState?.data.brainDumpNotes || [], [appState?.data.brainDumpNotes])
  const topics = useMemo(() => appState?.data.topics || [], [appState?.data.topics])
  const adts = useMemo(() => appState?.data.adts || [], [appState?.data.adts])
  const algorithms = useMemo(() => appState?.data.algorithms || [], [appState?.data.algorithms])

  const stats = useMemo(() => getBrainDumpStats(notes), [notes])

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState<string>('ALL')
  const [filterTag, setFilterTag] = useState<string>('ALL')
  const [filterResolved, setFilterResolved] = useState<'ALL' | 'UNRESOLVED_DOUBTS' | 'RESOLVED'>('ALL')
  const [filterPinnedOnly, setFilterPinnedOnly] = useState(false)

  // Quick Capture State
  const [captureBody, setCaptureBody] = useState('')
  const [captureTitle, setCaptureTitle] = useState('')
  const [captureType, setCaptureType] = useState<BrainDumpNoteType>('DOUBT')
  const [captureTagsInput, setCaptureTagsInput] = useState('')
  const [captureLinkedTopicId, setCaptureLinkedTopicId] = useState<EntityId | ''>('')
  const [captureLinkedAdtId, setCaptureLinkedAdtId] = useState<EntityId | ''>('')
  const [captureLinkedAlgoId, setCaptureLinkedAlgoId] = useState<EntityId | ''>('')
  const [captureSuccessMsg, setCaptureSuccessMsg] = useState<string | null>(null)

  // Resolve Doubt Modal / State
  const [resolvingNote, setResolvingNote] = useState<BrainDumpNote | null>(null)
  const [resolutionNotes, setResolutionNotes] = useState('')

  // Convert to Task Feedback
  const [convertedNotice, setConvertedNotice] = useState<string | null>(null)

  // Editing Note State
  const [editingNote, setEditingNote] = useState<BrainDumpNote | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editBody, setEditBody] = useState('')
  const [editType, setEditType] = useState<BrainDumpNoteType>('IDEA')
  const [editTagsInput, setEditTagsInput] = useState('')

  // Unique tags list for filter dropdown
  const allTags = useMemo(() => {
    const tagSet = new Set<string>()
    notes.forEach(n => n.tags.forEach(t => tagSet.add(t)))
    return Array.from(tagSet).sort()
  }, [notes])

  // Topic & ADT & Algo name map
  const topicMap = useMemo(() => new Map(topics.map(t => [t.id, t.title])), [topics])
  const adtMap = useMemo(() => new Map(adts.map(a => [a.id, a.name])), [adts])
  const algoMap = useMemo(() => new Map(algorithms.map(a => [a.id, a.name])), [algorithms])

  // Filtered & Sorted notes
  const filteredNotes = useMemo(() => {
    return notes.filter(n => {
      if (filterPinnedOnly && !n.isPinned) return false

      if (filterType !== 'ALL' && n.type !== filterType) return false

      if (filterTag !== 'ALL' && !n.tags.includes(filterTag)) return false

      if (filterResolved === 'UNRESOLVED_DOUBTS') {
        if (n.type !== 'DOUBT' || n.isResolved) return false
      } else if (filterResolved === 'RESOLVED') {
        if (!n.isResolved) return false
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const matchesTitle = (n.title || '').toLowerCase().includes(q)
        const matchesBody = n.body.toLowerCase().includes(q)
        const matchesTags = n.tags.some(t => t.toLowerCase().includes(q))
        const matchesResolution = (n.resolutionNotes || '').toLowerCase().includes(q)
        if (!matchesTitle && !matchesBody && !matchesTags && !matchesResolution) {
          return false
        }
      }

      return true
    }).sort((a, b) => {
      // Pinned notes always surface first
      if (a.isPinned && !b.isPinned) return -1
      if (!a.isPinned && b.isPinned) return 1
      return b.createdAt.localeCompare(a.createdAt)
    })
  }, [notes, filterPinnedOnly, filterType, filterTag, filterResolved, searchQuery])

  // Handle Quick Capture Save
  const handleQuickCapture = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!captureBody.trim()) return

    const now = getCurrentIsoTimestamp()
    const parsedTags = captureTagsInput
      .split(',')
      .map(t => t.trim())
      .filter(t => t.length > 0)

    const newNote: BrainDumpNote = {
      id: `note-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      title: captureTitle.trim() || undefined,
      body: captureBody.trim(),
      type: captureType,
      tags: parsedTags,
      isPinned: false,
      isResolved: false,
      linkedSyllabusTopicId: captureLinkedTopicId || undefined,
      linkedAdtId: captureLinkedAdtId || undefined,
      linkedAlgorithmId: captureLinkedAlgoId || undefined,
      createdAt: now,
      updatedAt: now,
    }

    await updateAppState(prev => ({
      ...prev,
      updatedAt: now,
      data: {
        ...prev.data,
        brainDumpNotes: [newNote, ...prev.data.brainDumpNotes],
      },
    }))

    setCaptureBody('')
    setCaptureTitle('')
    setCaptureTagsInput('')
    setCaptureLinkedTopicId('')
    setCaptureLinkedAdtId('')
    setCaptureLinkedAlgoId('')
    setCaptureSuccessMsg('Note saved successfully!')
    setTimeout(() => setCaptureSuccessMsg(null), 3000)
  }

  // Toggle Pin
  const handleTogglePin = async (noteId: string) => {
    const now = getCurrentIsoTimestamp()
    await updateAppState(prev => {
      const updated = prev.data.brainDumpNotes.map(n => {
        if (n.id !== noteId) return n
        return { ...n, isPinned: !n.isPinned, updatedAt: now }
      })
      return {
        ...prev,
        updatedAt: now,
        data: { ...prev.data, brainDumpNotes: updated },
      }
    })
  }

  // Delete Note
  const handleDeleteNote = async (note: BrainDumpNote) => {
    const title = note.title || note.body.slice(0, 30)
    const confirmed = window.confirm(`Are you sure you want to delete note "${title}"?`)
    if (!confirmed) return

    const now = getCurrentIsoTimestamp()
    await updateAppState(prev => ({
      ...prev,
      updatedAt: now,
      data: {
        ...prev.data,
        brainDumpNotes: prev.data.brainDumpNotes.filter(n => n.id !== note.id),
      },
    }))
  }

  // Open Resolve Doubt
  const handleOpenResolve = (note: BrainDumpNote) => {
    setResolvingNote(note)
    setResolutionNotes(note.resolutionNotes || '')
  }

  // Confirm Resolve Doubt
  const handleConfirmResolve = async () => {
    if (!resolvingNote) return
    const now = getCurrentIsoTimestamp()

    await updateAppState(prev => {
      const updated = prev.data.brainDumpNotes.map(n => {
        if (n.id !== resolvingNote.id) return n
        return {
          ...n,
          isResolved: true,
          resolvedAt: now,
          resolutionNotes: resolutionNotes.trim() || undefined,
          updatedAt: now,
        }
      })
      return {
        ...prev,
        updatedAt: now,
        data: { ...prev.data, brainDumpNotes: updated },
      }
    })

    setResolvingNote(null)
    setResolutionNotes('')
  }

  // Re-open Doubt
  const handleReopenDoubt = async (noteId: string) => {
    const now = getCurrentIsoTimestamp()
    await updateAppState(prev => {
      const updated = prev.data.brainDumpNotes.map(n => {
        if (n.id !== noteId) return n
        return {
          ...n,
          isResolved: false,
          resolvedAt: undefined,
          updatedAt: now,
        }
      })
      return {
        ...prev,
        updatedAt: now,
        data: { ...prev.data, brainDumpNotes: updated },
      }
    })
  }

  // Convert Note/Doubt into a Task
  // GUARANTEE: Preserves original note without deleting it!
  const handleConvertToTask = async (note: BrainDumpNote) => {
    const now = getCurrentIsoTimestamp()
    const taskTitle = note.title
      ? `Follow-up: ${note.title}`
      : `Resolve Doubt: ${note.body.slice(0, 45)}${note.body.length > 45 ? '...' : ''}`

    const newTask: Task = {
      id: `task-from-note-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      title: taskTitle,
      description: `Originating Brain Dump Note (${NOTE_TYPE_LABELS[note.type]}):\n\n${note.body}`,
      category: note.type === 'DOUBT' ? 'LEARN' : note.type === 'MISTAKE' ? 'REVISE' : 'LEARN',
      priority: note.type === 'DOUBT' || note.type === 'MISTAKE' ? 'HIGH' : 'MEDIUM',
      status: 'TO_DO',
      estimatedDurationMinutes: 45,
      actualDurationMinutes: 0,
      subtasks: [],
      linkedSyllabusTopicId: note.linkedSyllabusTopicId,
      linkedAdtId: note.linkedAdtId,
      linkedAlgorithmId: note.linkedAlgorithmId,
      createdAt: now,
      updatedAt: now,
    }

    await updateAppState(prev => {
      // 1. Add new task
      const newTasks = [newTask, ...prev.data.tasks]
      // 2. Link taskId in the brain dump note
      const updatedNotes = prev.data.brainDumpNotes.map(n => {
        if (n.id !== note.id) return n
        return { ...n, linkedTaskId: newTask.id, updatedAt: now }
      })

      return {
        ...prev,
        updatedAt: now,
        data: {
          ...prev.data,
          tasks: newTasks,
          brainDumpNotes: updatedNotes,
        },
      }
    })

    setConvertedNotice(`Converted to task "${taskTitle}"! View it in Tasks & Plan.`)
    setTimeout(() => setConvertedNotice(null), 4000)
  }

  // Edit Note helpers
  const handleOpenEdit = (note: BrainDumpNote) => {
    setEditingNote(note)
    setEditTitle(note.title || '')
    setEditBody(note.body)
    setEditType(note.type)
    setEditTagsInput(note.tags.join(', '))
  }

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingNote || !editBody.trim()) return

    const now = getCurrentIsoTimestamp()
    const parsedTags = editTagsInput
      .split(',')
      .map(t => t.trim())
      .filter(t => t.length > 0)

    await updateAppState(prev => {
      const updated = prev.data.brainDumpNotes.map(n => {
        if (n.id !== editingNote.id) return n
        return {
          ...n,
          title: editTitle.trim() || undefined,
          body: editBody.trim(),
          type: editType,
          tags: parsedTags,
          updatedAt: now,
        }
      })
      return {
        ...prev,
        updatedAt: now,
        data: { ...prev.data, brainDumpNotes: updated },
      }
    })

    setEditingNote(null)
  }

  return (
    <div className="brain-dump-container" role="region" aria-labelledby="brain-dump-title">
      <div className="section-header">
        <div className="section-header-top">
          <div>
            <h2 id="brain-dump-title" className="section-title">Brain Dump &amp; Doubt Workspace</h2>
            <p className="section-subtitle">
              Instant mental capture for ideas, unresolved doubts, mistakes, exam tips, and concept explanations with task conversion.
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <span className={`save-indicator ${saveStatus.toLowerCase()}`} title={`Persistence status: ${saveStatus}`}>
              <span className="save-indicator-dot" />
              {saveStatus === 'SAVING' ? 'Autosaving...' : saveStatus === 'SAVED' ? 'Saved' : saveStatus}
            </span>
          </div>
        </div>
      </div>

      {/* Global Notice */}
      {convertedNotice && (
        <div className="alert-banner info" role="status" style={{ marginBottom: 'var(--space-4)' }}>
          {convertedNotice}
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid-3" style={{ marginBottom: 'var(--space-5)' }}>
        <div className="card">
          <div className="badge badge-warning" style={{ marginBottom: 'var(--space-2)' }}>Active Doubts</div>
          <h4 className="card-title">{stats.unresolvedDoubts} Unresolved Doubts</h4>
          <p className="card-description">
            Questions needing research, clarification, or mentor review ({stats.doubts} total recorded).
          </p>
        </div>

        <div className="card">
          <div className="badge badge-neutral" style={{ marginBottom: 'var(--space-2)' }}>Mistakes &amp; Traps</div>
          <h4 className="card-title">{stats.mistakes} Documented Mistakes</h4>
          <p className="card-description">
            Algorithmic traps, off-by-one errors, and recurrence relation pitfalls.
          </p>
        </div>

        <div className="card">
          <div className="badge badge-neutral" style={{ marginBottom: 'var(--space-2)' }}>Workspace Total</div>
          <h4 className="card-title">{stats.total} Total Notes &bull; {stats.pinned} Pinned</h4>
          <p className="card-description">
            Autosaved locally in typed storage. Pinned notes always surface first.
          </p>
        </div>
      </div>

      {/* Instant Capture Card */}
      <div className="card" style={{ marginBottom: 'var(--space-5)' }}>
        <h3 className="card-title">Instant Capture</h3>
        <p className="card-description" style={{ marginBottom: 'var(--space-3)' }}>
          Capture thoughts instantly without friction. Notes can be saved with just a body.
        </p>

        {captureSuccessMsg && (
          <div className="alert-banner info" style={{ padding: '4px 10px', fontSize: 'var(--font-size-xs)' }}>
            {captureSuccessMsg}
          </div>
        )}

        <form onSubmit={handleQuickCapture}>
          <div className="form-group" style={{ marginBottom: 'var(--space-2)' }}>
            <textarea
              className="form-textarea"
              placeholder="Dump your doubt, mistake, exam tip, or concept explanation here... (Required)"
              value={captureBody}
              onChange={e => setCaptureBody(e.target.value)}
              required
              style={{ minHeight: '90px' }}
              aria-label="Note content body"
            />
          </div>

          <div className="grid-2" style={{ marginBottom: 'var(--space-2)' }}>
            <input
              type="text"
              className="form-input"
              placeholder="Optional title (e.g. Invariant for Dijkstra)"
              value={captureTitle}
              onChange={e => setCaptureTitle(e.target.value)}
              aria-label="Note title"
            />
            <select
              className="form-select"
              value={captureType}
              onChange={e => setCaptureType(e.target.value as BrainDumpNoteType)}
              aria-label="Note type"
            >
              {Object.entries(NOTE_TYPE_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>

          <div className="grid-2" style={{ marginBottom: 'var(--space-3)' }}>
            <input
              type="text"
              className="form-input"
              placeholder="Tags (comma separated, e.g. graph, unit-2, trap)"
              value={captureTagsInput}
              onChange={e => setCaptureTagsInput(e.target.value)}
              aria-label="Note tags"
            />
            <select
              className="form-select"
              value={captureLinkedTopicId}
              onChange={e => setCaptureLinkedTopicId(e.target.value)}
              aria-label="Link syllabus topic"
            >
              <option value="">Link Syllabus Topic (Optional)</option>
              {topics.map(t => (
                <option key={t.id} value={t.id}>[{t.unit}] {t.title}</option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)' }}>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={!captureBody.trim()}
            >
              + Save to Brain Dump
            </button>
          </div>
        </form>
      </div>

      {/* Filter and Search Bar */}
      <div className="filter-bar">
        <div className="filter-group">
          <input
            type="search"
            className="search-input"
            placeholder="Search notes by body, title, tags, resolution..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            aria-label="Search brain dump notes"
          />
          <select
            className="filter-select"
            value={filterType}
            onChange={e => setFilterType(e.target.value)}
            aria-label="Filter by note type"
          >
            <option value="ALL">All Note Types</option>
            {Object.entries(NOTE_TYPE_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
          {allTags.length > 0 && (
            <select
              className="filter-select"
              value={filterTag}
              onChange={e => setFilterTag(e.target.value)}
              aria-label="Filter by tag"
            >
              <option value="ALL">All Tags</option>
              {allTags.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          )}
          <select
            className="filter-select"
            value={filterResolved}
            onChange={e => setFilterResolved(e.target.value as 'ALL' | 'UNRESOLVED_DOUBTS' | 'RESOLVED')}
            aria-label="Filter by resolution status"
          >
            <option value="ALL">All States</option>
            <option value="UNRESOLVED_DOUBTS">Unresolved Doubts Only</option>
            <option value="RESOLVED">Resolved Notes Only</option>
          </select>
          <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)', fontSize: 'var(--font-size-xs)', cursor: 'pointer', color: 'var(--color-text-secondary)' }}>
            <input
              type="checkbox"
              checked={filterPinnedOnly}
              onChange={e => setFilterPinnedOnly(e.target.checked)}
            />
            Pinned Only
          </label>
        </div>
      </div>

      {/* Notes Grid */}
      <div className="notes-grid" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }} role="list" aria-label="Brain Dump Notes">
        {filteredNotes.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: 'var(--space-8)' }}>
            <p className="card-description">
              No notes found matching your search and filter criteria.
            </p>
          </div>
        ) : (
          filteredNotes.map(note => {
            const isDoubt = note.type === 'DOUBT'
            const typeBadgeClass =
              note.type === 'DOUBT' ? 'badge-warning' :
              note.type === 'MISTAKE' ? 'badge-warning' :
              note.type === 'IMPORTANT_INSIGHT' ? 'badge-accent' :
              note.type === 'EXAM_TIP' ? 'badge-accent' : 'badge-neutral'

            return (
              <div
                key={note.id}
                className={`note-card ${note.isPinned ? 'pinned' : ''}`}
                role="listitem"
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 'var(--space-3)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
                    <span className={`badge ${typeBadgeClass}`}>
                      {NOTE_TYPE_LABELS[note.type]}
                    </span>
                    {note.isPinned && (
                      <span className="badge badge-accent">Pinned</span>
                    )}
                    {note.isResolved && (
                      <span className="badge badge-neutral" style={{ color: 'var(--color-success-text)', borderColor: 'var(--color-success-border)' }}>
                        Resolved
                      </span>
                    )}
                    <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
                      {formatDateHuman(note.createdAt)}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                    <button
                      type="button"
                      className={`pin-btn ${note.isPinned ? 'pinned' : ''}`}
                      onClick={() => handleTogglePin(note.id)}
                      title={note.isPinned ? 'Unpin note' : 'Pin note to top'}
                      aria-label={note.isPinned ? 'Unpin note' : 'Pin note to top'}
                    >
                      {note.isPinned ? '★ Pinned' : '☆ Pin'}
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => handleOpenEdit(note)}
                      aria-label="Edit note"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="btn btn-danger btn-sm"
                      onClick={() => handleDeleteNote(note)}
                      aria-label="Delete note"
                    >
                      Delete
                    </button>
                  </div>
                </div>

                {note.title && (
                  <h4 style={{ fontSize: 'var(--font-size-base)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-text-primary)', margin: 0 }}>
                    {note.title}
                  </h4>
                )}

                <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', lineHeight: 'var(--line-height-relaxed)', margin: 0, whiteSpace: 'pre-wrap' }}>
                  {note.body}
                </p>

                {/* Resolution Notes for Resolved Doubts */}
                {note.isResolved && (
                  <div style={{ backgroundColor: 'var(--color-bg-elevated)', padding: 'var(--space-2) var(--space-3)', borderRadius: 'var(--radius-md)', borderLeft: '3px solid var(--color-success-dot)' }}>
                    <strong style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-primary)' }}>
                      Resolution Notes {note.resolvedAt ? `(${formatDateHuman(note.resolvedAt)})` : ''}:
                    </strong>
                    <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', margin: '4px 0 0', whiteSpace: 'pre-wrap' }}>
                      {note.resolutionNotes || 'Marked as understood and resolved.'}
                    </p>
                  </div>
                )}

                {/* Tags & Links Footer */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--space-2)', marginTop: 'var(--space-1)' }}>
                  <div style={{ display: 'flex', gap: 'var(--space-1)', flexWrap: 'wrap' }}>
                    {note.tags.map(tag => (
                      <span key={tag} className="tag-pill">#{tag}</span>
                    ))}
                    {note.linkedSyllabusTopicId && topicMap.has(note.linkedSyllabusTopicId) && (
                      <span className="tag-pill" title="Linked Topic">
                        Topic: {topicMap.get(note.linkedSyllabusTopicId)}
                      </span>
                    )}
                    {note.linkedAdtId && adtMap.has(note.linkedAdtId) && (
                      <span className="tag-pill" title="Linked ADT">
                        ADT: {adtMap.get(note.linkedAdtId)}
                      </span>
                    )}
                    {note.linkedAlgorithmId && algoMap.has(note.linkedAlgorithmId) && (
                      <span className="tag-pill" title="Linked Algorithm">
                        Algo: {algoMap.get(note.linkedAlgorithmId)}
                      </span>
                    )}
                    {note.linkedTaskId && (
                      <span className="badge badge-neutral" title="Converted to study task">
                        Linked Task Exists
                      </span>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                    {isDoubt && !note.isResolved && (
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => handleOpenResolve(note)}
                      >
                        ✓ Mark Resolved
                      </button>
                    )}
                    {isDoubt && note.isResolved && (
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => handleReopenDoubt(note.id)}
                      >
                        ↺ Re-open Doubt
                      </button>
                    )}
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => handleConvertToTask(note)}
                      title="Convert note into a task in Study Plan without deleting note"
                    >
                      &rarr; Convert to Task
                    </button>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Resolve Doubt Modal */}
      {resolvingNote && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="resolve-modal-title">
          <div className="modal-content">
            <div className="modal-header">
              <h3 id="resolve-modal-title" className="card-title">
                Resolve Doubt
              </h3>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setResolvingNote(null)}
                aria-label="Close modal"
              >
                &times;
              </button>
            </div>

            <div className="modal-body">
              <p className="card-description">
                Resolving doubt: <strong>{resolvingNote.title || resolvingNote.body.slice(0, 50)}</strong>
              </p>
              <div className="form-group">
                <label htmlFor="resolution-notes-input" className="form-label">
                  Resolution Explanation / Key Insight
                </label>
                <textarea
                  id="resolution-notes-input"
                  className="form-textarea"
                  value={resolutionNotes}
                  onChange={e => setResolutionNotes(e.target.value)}
                  placeholder="How was this doubt resolved? What is the correct understanding?"
                  style={{ minHeight: '100px' }}
                />
              </div>
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setResolvingNote(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleConfirmResolve}
              >
                Confirm Resolution
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Note Modal */}
      {editingNote && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="edit-note-modal-title">
          <div className="modal-content">
            <div className="modal-header">
              <h3 id="edit-note-modal-title" className="card-title">
                Edit Note
              </h3>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setEditingNote(null)}
                aria-label="Close modal"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSaveEdit}>
              <div className="modal-body">
                <div className="form-group">
                  <label htmlFor="edit-note-title" className="form-label">
                    Title (Optional)
                  </label>
                  <input
                    id="edit-note-title"
                    type="text"
                    className="form-input"
                    value={editTitle}
                    onChange={e => setEditTitle(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="edit-note-body" className="form-label">
                    Body *
                  </label>
                  <textarea
                    id="edit-note-body"
                    className="form-textarea"
                    value={editBody}
                    onChange={e => setEditBody(e.target.value)}
                    required
                    style={{ minHeight: '110px' }}
                  />
                </div>

                <div className="grid-2">
                  <div className="form-group">
                    <label htmlFor="edit-note-type" className="form-label">
                      Type
                    </label>
                    <select
                      id="edit-note-type"
                      className="form-select"
                      value={editType}
                      onChange={e => setEditType(e.target.value as BrainDumpNoteType)}
                    >
                      {Object.entries(NOTE_TYPE_LABELS).map(([k, v]) => (
                        <option key={k} value={k}>{v}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label htmlFor="edit-note-tags" className="form-label">
                      Tags (comma separated)
                    </label>
                    <input
                      id="edit-note-tags"
                      type="text"
                      className="form-input"
                      value={editTagsInput}
                      onChange={e => setEditTagsInput(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setEditingNote(null)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={!editBody.trim()}
                >
                  Save Note
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}


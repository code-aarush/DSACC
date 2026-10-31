import React, { useState, useMemo } from 'react'
import { useApp } from '../../context/useApp'
import {
  Task,
  TaskCategory,
  TaskPriority,
  TaskStatus,
  Subtask,
  EntityId,
} from '../../types/domain'
import { getCurrentIsoTimestamp, formatDateHuman, isTaskOverdue, isTaskDueToday, isTaskUpcoming } from '../../lib/date/dateUtils'
import { getTaskStats } from '../../lib/progress/taskAndCpCalculators'

type TaskViewTab = 'ALL' | 'TODAY' | 'UPCOMING' | 'OVERDUE' | 'COMPLETED' | 'DAILY_FOCUS'

const CATEGORY_LABELS: Record<TaskCategory, string> = {
  LEARN: 'Learn',
  IMPLEMENT: 'Implement',
  TEST: 'Test',
  REVISE: 'Revise',
  CP_PRACTICE: 'CP Practice',
  MOCK_EXAM: 'Mock Exam',
  ADMIN: 'Admin',
}

const PRIORITY_LABELS: Record<TaskPriority, string> = {
  CRITICAL: 'Critical',
  HIGH: 'High',
  MEDIUM: 'Medium',
  LOW: 'Low',
}

const STATUS_LABELS: Record<TaskStatus, string> = {
  TO_DO: 'To Do',
  IN_PROGRESS: 'In Progress',
  BLOCKED: 'Blocked',
  DONE: 'Done',
}

const PRIORITY_WEIGHTS: Record<TaskPriority, number> = {
  CRITICAL: 4,
  HIGH: 3,
  MEDIUM: 2,
  LOW: 1,
}

export const TasksSection: React.FC = () => {
  const { appState, updateAppState } = useApp()
  const tasks = useMemo(() => appState?.data.tasks || [], [appState?.data.tasks])
  const topics = useMemo(() => appState?.data.topics || [], [appState?.data.topics])
  const adts = useMemo(() => appState?.data.adts || [], [appState?.data.adts])
  const algorithms = useMemo(() => appState?.data.algorithms || [], [appState?.data.algorithms])
  const cpProblems = useMemo(() => appState?.data.cpProblems || [], [appState?.data.cpProblems])

  const stats = useMemo(() => getTaskStats(tasks), [tasks])

  // View & Filter states
  const [activeTab, setActiveTab] = useState<TaskViewTab>('TODAY')
  const [searchQuery, setSearchQuery] = useState('')
  const [filterCategory, setFilterCategory] = useState<string>('ALL')
  const [filterPriority, setFilterPriority] = useState<string>('ALL')
  const [filterStatus, setFilterStatus] = useState<string>('ALL')
  const [sortBy, setSortBy] = useState<'dueDate' | 'priority' | 'createdAt'>('dueDate')

  // Quick-Add state
  const [quickTitle, setQuickTitle] = useState('')
  const [quickCategory, setQuickCategory] = useState<TaskCategory>('LEARN')
  const [quickPriority, setQuickPriority] = useState<TaskPriority>('MEDIUM')
  const [quickDueDate, setQuickDueDate] = useState('')
  const [isSubmittingQuick, setIsSubmittingQuick] = useState(false)

  // Edit / Add Modal state
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [modalTitle, setModalTitle] = useState('')
  const [modalDescription, setModalDescription] = useState('')
  const [modalCategory, setModalCategory] = useState<TaskCategory>('LEARN')
  const [modalPriority, setModalPriority] = useState<TaskPriority>('MEDIUM')
  const [modalStatus, setModalStatus] = useState<TaskStatus>('TO_DO')
  const [modalDueDate, setModalDueDate] = useState('')
  const [modalEstMinutes, setModalEstMinutes] = useState<number>(30)
  const [modalActMinutes, setModalActMinutes] = useState<number>(0)
  const [modalIsDailyFocus, setModalIsDailyFocus] = useState(false)
  const [modalSubtasks, setModalSubtasks] = useState<Subtask[]>([])
  const [modalNewSubtaskTitle, setModalNewSubtaskTitle] = useState('')
  const [modalLinkedTopicId, setModalLinkedTopicId] = useState<EntityId | ''>('')
  const [modalLinkedAdtId, setModalLinkedAdtId] = useState<EntityId | ''>('')
  const [modalLinkedAlgoId, setModalLinkedAlgoId] = useState<EntityId | ''>('')
  const [modalLinkedCpId, setModalLinkedCpId] = useState<EntityId | ''>('')
  const [modalNotes, setModalNotes] = useState('')
  const [modalError, setModalError] = useState<string | null>(null)

  // Map entities for rapid name lookups
  const topicMap = useMemo(() => new Map(topics.map(t => [t.id, t.title])), [topics])
  const adtMap = useMemo(() => new Map(adts.map(a => [a.id, a.name])), [adts])
  const algoMap = useMemo(() => new Map(algorithms.map(a => [a.id, a.name])), [algorithms])
  const cpMap = useMemo(() => new Map(cpProblems.map(c => [c.id, c.title])), [cpProblems])

  // Filter tasks based on activeTab, search, and dropdown filters
  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      // 1. Tab filter
      if (activeTab === 'TODAY') {
        const isToday = task.dueDate ? isTaskDueToday(task.dueDate) : false
        if (task.status === 'DONE' || (!isToday && !task.isDailyFocus)) return false
      } else if (activeTab === 'UPCOMING') {
        const isUpcoming = task.dueDate ? isTaskUpcoming(task.dueDate) : false
        if (task.status === 'DONE' || !isUpcoming) return false
      } else if (activeTab === 'OVERDUE') {
        const isOverdue = task.dueDate ? isTaskOverdue(task.dueDate) : false
        if (task.status === 'DONE' || !isOverdue) return false
      } else if (activeTab === 'COMPLETED') {
        if (task.status !== 'DONE') return false
      } else if (activeTab === 'DAILY_FOCUS') {
        if (!task.isDailyFocus || task.status === 'DONE') return false
      }

      // 2. Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const matchesTitle = task.title.toLowerCase().includes(q)
        const matchesDesc = (task.description || '').toLowerCase().includes(q)
        const matchesNotes = (task.notes || '').toLowerCase().includes(q)
        if (!matchesTitle && !matchesDesc && !matchesNotes) return false
      }

      // 3. Category filter
      if (filterCategory !== 'ALL' && task.category !== filterCategory) return false

      // 4. Priority filter
      if (filterPriority !== 'ALL' && task.priority !== filterPriority) return false

      // 5. Status filter
      if (filterStatus !== 'ALL' && task.status !== filterStatus) return false

      return true
    }).sort((a, b) => {
      if (sortBy === 'dueDate') {
        if (a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate)
        if (a.dueDate && !b.dueDate) return -1
        if (!a.dueDate && b.dueDate) return 1
      } else if (sortBy === 'priority') {
        const pA = PRIORITY_WEIGHTS[a.priority] || 0
        const pB = PRIORITY_WEIGHTS[b.priority] || 0
        if (pA !== pB) return pB - pA
      }
      return b.createdAt.localeCompare(a.createdAt)
    })
  }, [tasks, activeTab, searchQuery, filterCategory, filterPriority, filterStatus, sortBy])

  // Quick-Add handler
  const handleQuickAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!quickTitle.trim() || isSubmittingQuick) return

    setIsSubmittingQuick(true)
    const now = getCurrentIsoTimestamp()
    const newTask: Task = {
      id: `task-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      title: quickTitle.trim(),
      category: quickCategory,
      priority: quickPriority,
      status: 'TO_DO',
      dueDate: quickDueDate ? quickDueDate : undefined,
      estimatedDurationMinutes: 30,
      actualDurationMinutes: 0,
      subtasks: [],
      isDailyFocus: activeTab === 'DAILY_FOCUS',
      createdAt: now,
      updatedAt: now,
    }

    await updateAppState(prev => ({
      ...prev,
      updatedAt: now,
      data: {
        ...prev.data,
        tasks: [newTask, ...prev.data.tasks],
      },
    }))

    setQuickTitle('')
    setIsSubmittingQuick(false)
  }

  // Toggle Task Completion
  // GUARANTEE: Completing a task does NOT automatically complete any linked syllabus topic!
  // REVERSIBLE: Reopening restores task to open lists and recalculates overdue/due today metrics.
  const handleToggleTaskStatus = async (taskId: string, forceDone?: boolean) => {
    const now = getCurrentIsoTimestamp()
    await updateAppState(prev => {
      const updatedTasks = prev.data.tasks.map(t => {
        if (t.id !== taskId) return t
        const isCurrentlyDone = t.status === 'DONE'
        const nextDone = typeof forceDone === 'boolean' ? forceDone : !isCurrentlyDone
        const nextStatus: TaskStatus = nextDone ? 'DONE' : 'TO_DO'
        return {
          ...t,
          status: nextStatus,
          updatedAt: now,
        }
      })
      return {
        ...prev,
        updatedAt: now,
        data: {
          ...prev.data,
          tasks: updatedTasks,
        },
      }
    })
  }

  // Toggle Daily Focus
  const handleToggleDailyFocus = async (taskId: string) => {
    const now = getCurrentIsoTimestamp()
    await updateAppState(prev => {
      const updatedTasks = prev.data.tasks.map(t => {
        if (t.id !== taskId) return t
        return {
          ...t,
          isDailyFocus: !t.isDailyFocus,
          updatedAt: now,
        }
      })
      return {
        ...prev,
        updatedAt: now,
        data: {
          ...prev.data,
          tasks: updatedTasks,
        },
      }
    })
  }

  // Delete Task
  // GUARANTEE: Deleting a task does NOT delete any linked academic records!
  const handleDeleteTask = async (task: Task) => {
    const confirmed = window.confirm(`Are you sure you want to delete task "${task.title}"? Linked syllabus topics and library records will remain unaffected.`)
    if (!confirmed) return

    const now = getCurrentIsoTimestamp()
    await updateAppState(prev => ({
      ...prev,
      updatedAt: now,
      data: {
        ...prev.data,
        tasks: prev.data.tasks.filter(t => t.id !== task.id),
      },
    }))
  }

  // Toggle Subtask
  const handleToggleSubtask = async (taskId: string, subtaskId: string, forceCompleted?: boolean) => {
    const now = getCurrentIsoTimestamp()
    await updateAppState(prev => {
      const updatedTasks = prev.data.tasks.map(t => {
        if (t.id !== taskId) return t
        const updatedSubtasks = t.subtasks.map(st => {
          if (st.id !== subtaskId) return st
          const nextCompleted = typeof forceCompleted === 'boolean' ? forceCompleted : !st.isCompleted
          return { ...st, isCompleted: nextCompleted }
        })
        return {
          ...t,
          subtasks: updatedSubtasks,
          updatedAt: now,
        }
      })
      return {
        ...prev,
        updatedAt: now,
        data: {
          ...prev.data,
          tasks: updatedTasks,
        },
      }
    })
  }

  // Modal open helpers
  const openCreateModal = () => {
    setEditingTask(null)
    setModalTitle('')
    setModalDescription('')
    setModalCategory('LEARN')
    setModalPriority('MEDIUM')
    setModalStatus('TO_DO')
    setModalDueDate('')
    setModalEstMinutes(30)
    setModalActMinutes(0)
    setModalIsDailyFocus(activeTab === 'DAILY_FOCUS')
    setModalSubtasks([])
    setModalNewSubtaskTitle('')
    setModalLinkedTopicId('')
    setModalLinkedAdtId('')
    setModalLinkedAlgoId('')
    setModalLinkedCpId('')
    setModalNotes('')
    setModalError(null)
    setIsModalOpen(true)
  }

  const openEditModal = (task: Task) => {
    setEditingTask(task)
    setModalTitle(task.title)
    setModalDescription(task.description || '')
    setModalCategory(task.category)
    setModalPriority(task.priority)
    setModalStatus(task.status)
    setModalDueDate(task.dueDate || '')
    setModalEstMinutes(task.estimatedDurationMinutes || 0)
    setModalActMinutes(task.actualDurationMinutes || 0)
    setModalIsDailyFocus(!!task.isDailyFocus)
    setModalSubtasks([...task.subtasks])
    setModalNewSubtaskTitle('')
    setModalLinkedTopicId(task.linkedSyllabusTopicId || (task.linkedSyllabusTopicIds?.[0] || ''))
    setModalLinkedAdtId(task.linkedAdtId || (task.linkedAdtIds?.[0] || ''))
    setModalLinkedAlgoId(task.linkedAlgorithmId || (task.linkedAlgorithmIds?.[0] || ''))
    setModalLinkedCpId(task.linkedCpProblemId || (task.linkedCpProblemIds?.[0] || ''))
    setModalNotes(task.notes || '')
    setModalError(null)
    setIsModalOpen(true)
  }

  const handleAddModalSubtask = () => {
    if (!modalNewSubtaskTitle.trim()) return
    const newSt: Subtask = {
      id: `st-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      title: modalNewSubtaskTitle.trim(),
      isCompleted: false,
    }
    setModalSubtasks(prev => [...prev, newSt])
    setModalNewSubtaskTitle('')
  }

  const handleRemoveModalSubtask = (stId: string) => {
    setModalSubtasks(prev => prev.filter(st => st.id !== stId))
  }

  const handleSaveModal = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!modalTitle.trim()) {
      setModalError('Task title is required.')
      return
    }

    const now = getCurrentIsoTimestamp()
    if (editingTask) {
      // Update
      await updateAppState(prev => {
        const updated = prev.data.tasks.map(t => {
          if (t.id !== editingTask.id) return t
          return {
            ...t,
            title: modalTitle.trim(),
            description: modalDescription.trim() || undefined,
            category: modalCategory,
            priority: modalPriority,
            status: modalStatus,
            dueDate: modalDueDate || undefined,
            estimatedDurationMinutes: Number(modalEstMinutes) || 0,
            actualDurationMinutes: Number(modalActMinutes) || 0,
            isDailyFocus: modalIsDailyFocus,
            subtasks: modalSubtasks,
            linkedSyllabusTopicId: modalLinkedTopicId || undefined,
            linkedAdtId: modalLinkedAdtId || undefined,
            linkedAlgorithmId: modalLinkedAlgoId || undefined,
            linkedCpProblemId: modalLinkedCpId || undefined,
            notes: modalNotes.trim() || undefined,
            updatedAt: now,
          }
        })
        return {
          ...prev,
          updatedAt: now,
          data: { ...prev.data, tasks: updated },
        }
      })
    } else {
      // Create
      const newTask: Task = {
        id: `task-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        title: modalTitle.trim(),
        description: modalDescription.trim() || undefined,
        category: modalCategory,
        priority: modalPriority,
        status: modalStatus,
        dueDate: modalDueDate || undefined,
        estimatedDurationMinutes: Number(modalEstMinutes) || 0,
        actualDurationMinutes: Number(modalActMinutes) || 0,
        isDailyFocus: modalIsDailyFocus,
        subtasks: modalSubtasks,
        linkedSyllabusTopicId: modalLinkedTopicId || undefined,
        linkedAdtId: modalLinkedAdtId || undefined,
        linkedAlgorithmId: modalLinkedAlgoId || undefined,
        linkedCpProblemId: modalLinkedCpId || undefined,
        notes: modalNotes.trim() || undefined,
        createdAt: now,
        updatedAt: now,
      }
      await updateAppState(prev => ({
        ...prev,
        updatedAt: now,
        data: {
          ...prev.data,
          tasks: [newTask, ...prev.data.tasks],
        },
      }))
    }

    setIsModalOpen(false)
  }

  return (
    <div className="tasks-container" role="region" aria-labelledby="tasks-section-title">
      <div className="section-header">
        <div className="section-header-top">
          <div>
            <h2 id="tasks-section-title" className="section-title">Tasks and Daily Study Plan</h2>
            <p className="section-subtitle">
              Prioritized study execution, daily focus planning, estimate tracking and academic cross-linking.
            </p>
          </div>
          <button
            type="button"
            className="btn btn-primary"
            onClick={openCreateModal}
          >
            + Create Detailed Task
          </button>
        </div>
      </div>

      {/* Summary Stats Cards */}
      <div className="grid-3" style={{ marginBottom: 'var(--space-5)' }}>
        <div className="card">
          <div className="badge badge-neutral" style={{ marginBottom: 'var(--space-2)' }}>Focus &amp; Today</div>
          <h4 className="card-title">{stats.dueToday} Due Today &bull; {stats.dailyFocus} Focus</h4>
          <p className="card-description">
            Incomplete tasks requiring attention today or highlighted on your focus list.
          </p>
        </div>

        <div className="card">
          <div className="badge badge-warning" style={{ marginBottom: 'var(--space-2)' }}>Overdue Tasks</div>
          <h4 className="card-title">{stats.overdue} Overdue</h4>
          <p className="card-description">
            Incomplete tasks whose local calendar due date has passed.
          </p>
        </div>

        <div className="card">
          <div className="badge badge-neutral" style={{ marginBottom: 'var(--space-2)' }}>Completion &amp; Time</div>
          <h4 className="card-title">{stats.done} of {stats.total} Done</h4>
          <p className="card-description">
            Actual time spent: <strong>{Math.round(stats.totalActualMinutes / 60 * 10) / 10}h</strong> (Est: {Math.round(stats.totalEstimatedMinutes / 60 * 10) / 10}h).
          </p>
        </div>
      </div>

      {/* Quick Add Form */}
      <form onSubmit={handleQuickAdd} className="quick-add-bar" aria-label="Quick Add Task Form">
        <input
          type="text"
          className="form-input"
          placeholder="Quick add a new task..."
          value={quickTitle}
          onChange={e => setQuickTitle(e.target.value)}
          style={{ flex: 1, minWidth: '220px' }}
          aria-label="Quick task title"
        />
        <select
          className="form-select"
          value={quickCategory}
          onChange={e => setQuickCategory(e.target.value as TaskCategory)}
          aria-label="Quick task category"
        >
          {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <select
          className="form-select"
          value={quickPriority}
          onChange={e => setQuickPriority(e.target.value as TaskPriority)}
          aria-label="Quick task priority"
        >
          {Object.entries(PRIORITY_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <input
          type="date"
          className="form-input"
          value={quickDueDate}
          onChange={e => setQuickDueDate(e.target.value)}
          aria-label="Quick task due date"
          title="Due date"
        />
        <button
          type="submit"
          className="btn btn-secondary"
          disabled={!quickTitle.trim() || isSubmittingQuick}
        >
          {isSubmittingQuick ? 'Adding...' : 'Add Task'}
        </button>
      </form>

      {/* Navigation Tabs */}
      <div className="tab-group" role="tablist" aria-label="Task views">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'TODAY'}
          className={`tab-btn ${activeTab === 'TODAY' ? 'active' : ''}`}
          onClick={() => setActiveTab('TODAY')}
        >
          Today
          <span className="tab-badge">{stats.dueToday}</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'DAILY_FOCUS'}
          className={`tab-btn ${activeTab === 'DAILY_FOCUS' ? 'active' : ''}`}
          onClick={() => setActiveTab('DAILY_FOCUS')}
        >
          Daily Focus
          <span className="tab-badge">{stats.dailyFocus}</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'UPCOMING'}
          className={`tab-btn ${activeTab === 'UPCOMING' ? 'active' : ''}`}
          onClick={() => setActiveTab('UPCOMING')}
        >
          Upcoming
          <span className="tab-badge">{stats.upcoming}</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'OVERDUE'}
          className={`tab-btn ${activeTab === 'OVERDUE' ? 'active' : ''}`}
          onClick={() => setActiveTab('OVERDUE')}
        >
          Overdue
          <span className="tab-badge" style={stats.overdue > 0 ? { backgroundColor: 'var(--color-danger-bg)', color: 'var(--color-danger-text)' } : {}}>
            {stats.overdue}
          </span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'ALL'}
          className={`tab-btn ${activeTab === 'ALL' ? 'active' : ''}`}
          onClick={() => setActiveTab('ALL')}
        >
          All Tasks
          <span className="tab-badge">{tasks.length}</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'COMPLETED'}
          className={`tab-btn ${activeTab === 'COMPLETED' ? 'active' : ''}`}
          onClick={() => setActiveTab('COMPLETED')}
        >
          Completed
          <span className="tab-badge">{stats.done}</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="filter-bar">
        <div className="filter-group">
          <input
            type="search"
            className="search-input"
            placeholder="Search tasks by title, description, notes..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            aria-label="Search tasks"
          />
          <select
            className="filter-select"
            value={filterCategory}
            onChange={e => setFilterCategory(e.target.value)}
            aria-label="Filter by category"
          >
            <option value="ALL">All Categories</option>
            {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
          <select
            className="filter-select"
            value={filterPriority}
            onChange={e => setFilterPriority(e.target.value)}
            aria-label="Filter by priority"
          >
            <option value="ALL">All Priorities</option>
            {Object.entries(PRIORITY_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
          {activeTab === 'ALL' && (
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
          )}
        </div>

        <div className="filter-group">
          <label htmlFor="tasks-sort-select" style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
            Sort by:
          </label>
          <select
            id="tasks-sort-select"
            className="filter-select"
            value={sortBy}
            onChange={e => setSortBy(e.target.value as 'dueDate' | 'priority' | 'createdAt')}
            aria-label="Sort tasks"
          >
            <option value="dueDate">Due Date</option>
            <option value="priority">Priority</option>
            <option value="createdAt">Created Time</option>
          </select>
        </div>
      </div>

      {/* Task List */}
      <div className="task-list" role="list" aria-label="Tasks">
        {filteredTasks.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: 'var(--space-8)' }}>
            <p className="card-description">
              No tasks found in <strong>{activeTab.replace('_', ' ')}</strong> view matching your criteria.
            </p>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              style={{ marginTop: 'var(--space-3)' }}
              onClick={openCreateModal}
            >
              + Add a new task
            </button>
          </div>
        ) : (
          filteredTasks.map(task => {
            const isDone = task.status === 'DONE'
            const isOverdue = task.dueDate ? isTaskOverdue(task.dueDate) : false
            const isToday = task.dueDate ? isTaskDueToday(task.dueDate) : false
            const completedSubtasksCount = task.subtasks.filter(st => st.isCompleted).length

            return (
              <div
                key={task.id}
                className={`task-card ${isDone ? 'done' : ''}`}
                role="listitem"
              >
                <div className="task-header">
                  <div className="task-title-area">
                    <input
                      type="checkbox"
                      className="checklist-checkbox"
                      checked={isDone}
                      onChange={e => handleToggleTaskStatus(task.id, e.target.checked)}
                      aria-label={`Mark task "${task.title}" as ${isDone ? 'incomplete' : 'done'}`}
                      style={{ marginTop: '3px' }}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
                        <span className={`task-title ${isDone ? 'done' : ''}`}>
                          {task.title}
                        </span>
                        {task.isDailyFocus && (
                          <span className="badge badge-accent" title="Daily Focus">Focus</span>
                        )}
                        <span className={`badge ${task.priority === 'CRITICAL' ? 'badge-warning' :
                            task.priority === 'HIGH' ? 'badge-warning' : 'badge-neutral'
                          }`}>
                          {PRIORITY_LABELS[task.priority]}
                        </span>
                        <span className="badge badge-neutral">
                          {CATEGORY_LABELS[task.category]}
                        </span>
                        {task.dueDate && (
                          <span
                            className="badge badge-neutral"
                            style={isOverdue && !isDone ? { color: 'var(--color-danger-text)', borderColor: 'var(--color-danger-border)' } : isToday ? { color: 'var(--color-accent)' } : {}}
                          >
                            {isOverdue && !isDone ? 'Overdue: ' : isToday ? 'Today: ' : 'Due: '}
                            {formatDateHuman(task.dueDate)}
                          </span>
                        )}
                        {(task.estimatedDurationMinutes || task.actualDurationMinutes) ? (
                          <span className="badge badge-neutral" style={{ fontFamily: 'var(--font-family-mono)' }}>
                            {task.actualDurationMinutes ? `${task.actualDurationMinutes}m / ` : ''}
                            {task.estimatedDurationMinutes || 0}m
                          </span>
                        ) : null}
                      </div>

                      {task.description && (
                        <p className="card-description" style={{ marginTop: 'var(--space-1)', whiteSpace: 'pre-wrap' }}>
                          {task.description}
                        </p>
                      )}

                      {/* Linked Academic Entities */}
                      {(task.linkedSyllabusTopicId || task.linkedAdtId || task.linkedAlgorithmId || task.linkedCpProblemId) && (
                        <div style={{ display: 'flex', gap: 'var(--space-2)', marginTop: 'var(--space-2)', flexWrap: 'wrap' }}>
                          {task.linkedSyllabusTopicId && topicMap.has(task.linkedSyllabusTopicId) && (
                            <span className="tag-pill" title="Linked Syllabus Topic">
                              Topic: {topicMap.get(task.linkedSyllabusTopicId)}
                            </span>
                          )}
                          {task.linkedAdtId && adtMap.has(task.linkedAdtId) && (
                            <span className="tag-pill" title="Linked ADT">
                              ADT: {adtMap.get(task.linkedAdtId)}
                            </span>
                          )}
                          {task.linkedAlgorithmId && algoMap.has(task.linkedAlgorithmId) && (
                            <span className="tag-pill" title="Linked Algorithm">
                              Algo: {algoMap.get(task.linkedAlgorithmId)}
                            </span>
                          )}
                          {task.linkedCpProblemId && cpMap.has(task.linkedCpProblemId) && (
                            <span className="tag-pill" title="Linked CP Problem">
                              CP: {cpMap.get(task.linkedCpProblemId)}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Subtasks */}
                      {task.subtasks.length > 0 && (
                        <div className="subtask-list">
                          <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
                            Subtasks ({completedSubtasksCount}/{task.subtasks.length}):
                          </span>
                          {task.subtasks.map(st => (
                            <label key={st.id} className={`subtask-row ${st.isCompleted ? 'done' : ''}`}>
                              <input
                                type="checkbox"
                                checked={st.isCompleted}
                                onChange={e => handleToggleSubtask(task.id, st.id, e.target.checked)}
                                aria-label={`Subtask: ${st.title}`}
                              />
                              <span>{st.title}</span>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                    <button
                      type="button"
                      className={`btn btn-secondary btn-sm ${task.isDailyFocus ? 'active' : ''}`}
                      onClick={() => handleToggleDailyFocus(task.id)}
                      title={task.isDailyFocus ? 'Remove from Daily Focus' : 'Add to Daily Focus'}
                      aria-label={task.isDailyFocus ? 'Remove from Daily Focus' : 'Add to Daily Focus'}
                    >
                      {task.isDailyFocus ? '★ Focus' : '☆ Focus'}
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => openEditModal(task)}
                      aria-label={`Edit task "${task.title}"`}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="btn btn-danger btn-sm"
                      onClick={() => handleDeleteTask(task)}
                      aria-label={`Delete task "${task.title}"`}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Add / Edit Task Modal */}
      {isModalOpen && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="task-modal-title">
          <div className="modal-content">
            <div className="modal-header">
              <h3 id="task-modal-title" className="card-title">
                {editingTask ? 'Edit Task' : 'Create Task'}
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

            <form onSubmit={handleSaveModal}>
              <div className="modal-body">
                {modalError && (
                  <div className="alert-banner error" role="alert">
                    {modalError}
                  </div>
                )}

                <div className="form-group">
                  <label htmlFor="task-title-input" className="form-label">
                    Title *
                  </label>
                  <input
                    id="task-title-input"
                    type="text"
                    className="form-input"
                    value={modalTitle}
                    onChange={e => setModalTitle(e.target.value)}
                    required
                    placeholder="e.g. Implement Dijkstra with Min-Heap"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="task-desc-input" className="form-label">
                    Description
                  </label>
                  <textarea
                    id="task-desc-input"
                    className="form-textarea"
                    value={modalDescription}
                    onChange={e => setModalDescription(e.target.value)}
                    placeholder="Objective, details, edge cases to consider..."
                  />
                </div>

                <div className="grid-2">
                  <div className="form-group">
                    <label htmlFor="task-cat-select" className="form-label">
                      Category
                    </label>
                    <select
                      id="task-cat-select"
                      className="form-select"
                      value={modalCategory}
                      onChange={e => setModalCategory(e.target.value as TaskCategory)}
                    >
                      {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                        <option key={k} value={k}>{v}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label htmlFor="task-priority-select" className="form-label">
                      Priority
                    </label>
                    <select
                      id="task-priority-select"
                      className="form-select"
                      value={modalPriority}
                      onChange={e => setModalPriority(e.target.value as TaskPriority)}
                    >
                      {Object.entries(PRIORITY_LABELS).map(([k, v]) => (
                        <option key={k} value={k}>{v}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid-2">
                  <div className="form-group">
                    <label htmlFor="task-status-select" className="form-label">
                      Status
                    </label>
                    <select
                      id="task-status-select"
                      className="form-select"
                      value={modalStatus}
                      onChange={e => setModalStatus(e.target.value as TaskStatus)}
                    >
                      {Object.entries(STATUS_LABELS).map(([k, v]) => (
                        <option key={k} value={k}>{v}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label htmlFor="task-due-date-input" className="form-label">
                      Due Date
                    </label>
                    <input
                      id="task-due-date-input"
                      type="date"
                      className="form-input"
                      value={modalDueDate}
                      onChange={e => setModalDueDate(e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid-2">
                  <div className="form-group">
                    <label htmlFor="task-est-min" className="form-label">
                      Estimated Duration (minutes)
                    </label>
                    <input
                      id="task-est-min"
                      type="number"
                      min="0"
                      step="5"
                      className="form-input"
                      value={modalEstMinutes}
                      onChange={e => setModalEstMinutes(parseInt(e.target.value, 10) || 0)}
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="task-act-min" className="form-label">
                      Actual Duration (minutes)
                    </label>
                    <input
                      id="task-act-min"
                      type="number"
                      min="0"
                      step="5"
                      className="form-input"
                      value={modalActMinutes}
                      onChange={e => setModalActMinutes(parseInt(e.target.value, 10) || 0)}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={modalIsDailyFocus}
                      onChange={e => setModalIsDailyFocus(e.target.checked)}
                    />
                    <span className="form-label" style={{ marginBottom: 0 }}>Add to Daily Focus list</span>
                  </label>
                </div>

                {/* Subtasks Builder */}
                <div className="form-group">
                  <label className="form-label">Subtasks</label>
                  <div style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-2)' }}>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Add subtask step..."
                      value={modalNewSubtaskTitle}
                      onChange={e => setModalNewSubtaskTitle(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          handleAddModalSubtask()
                        }
                      }}
                      style={{ flex: 1 }}
                    />
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={handleAddModalSubtask}
                    >
                      + Add Subtask
                    </button>
                  </div>
                  {modalSubtasks.map(st => (
                    <div key={st.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 8px', background: 'var(--color-bg-elevated)', borderRadius: 'var(--radius-sm)', marginBottom: '4px' }}>
                      <span style={{ fontSize: 'var(--font-size-xs)' }}>{st.title}</span>
                      <button
                        type="button"
                        className="btn btn-danger btn-sm"
                        style={{ padding: '1px 6px', fontSize: '10px' }}
                        onClick={() => handleRemoveModalSubtask(st.id)}
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>

                {/* Academic Entity Cross-Linking */}
                <div className="grid-2">
                  <div className="form-group">
                    <label htmlFor="task-link-topic" className="form-label">
                      Link Syllabus Topic
                    </label>
                    <select
                      id="task-link-topic"
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

                  <div className="form-group">
                    <label htmlFor="task-link-adt" className="form-label">
                      Link ADT
                    </label>
                    <select
                      id="task-link-adt"
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
                </div>

                <div className="grid-2">
                  <div className="form-group">
                    <label htmlFor="task-link-algo" className="form-label">
                      Link Algorithm
                    </label>
                    <select
                      id="task-link-algo"
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

                  <div className="form-group">
                    <label htmlFor="task-link-cp" className="form-label">
                      Link CP Problem
                    </label>
                    <select
                      id="task-link-cp"
                      className="form-select"
                      value={modalLinkedCpId}
                      onChange={e => setModalLinkedCpId(e.target.value)}
                    >
                      <option value="">None</option>
                      {cpProblems.map(cp => (
                        <option key={cp.id} value={cp.id}>[{cp.platform}] {cp.title}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="task-notes-input" className="form-label">
                    Notes
                  </label>
                  <textarea
                    id="task-notes-input"
                    className="form-textarea"
                    value={modalNotes}
                    onChange={e => setModalNotes(e.target.value)}
                    placeholder="Reflections, references, follow-up thoughts..."
                  />
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
                  {editingTask ? 'Save Changes' : 'Create Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
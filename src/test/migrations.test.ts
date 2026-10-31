import { describe, it, expect } from 'vitest'
import { migrateState } from '../lib/storage/migrations'
import { CURRENT_SCHEMA_VERSION } from '../types/domain'
import { createInitialApplicationState } from '../lib/storage/storageService'

describe('Schema Migration Pipeline Tests', () => {
  it('passes through current schema version without mutation', () => {
    const state = createInitialApplicationState()
    const result = migrateState(state)

    expect(result.migrated).toBe(false)
    expect(result.fromVersion).toBe(CURRENT_SCHEMA_VERSION)
    expect(result.toVersion).toBe(CURRENT_SCHEMA_VERSION)
    expect(result.state).toBe(state)
  })

  it('migrates unversioned legacy (v0) payload to current schema while preserving records', () => {
    const legacyPayload = {
      topics: [
        {
          id: 'topic-legacy-01',
          unit: 'UNIT_I',
          chapter: 'Recursion',
          title: 'Linear Recursion',
          description: 'Single self-call structure',
          classification: 'REQUIRED',
          priority: 'HIGH',
          studyStatus: 'COMPLETED',
          confidence: 4,
          revisionStatus: 'NOT_DUE',
          completionRequirements: { manualConfirmationRequired: true },
          linkedTaskIds: [],
          linkedAdtIds: [],
          linkedAlgorithmIds: [],
          linkedCpProblemIds: [],
          notes: '',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
      examDate: '2026-11-03',
      examTitle: 'Legacy Exam Title',
    }

    const result = migrateState(legacyPayload)

    expect(result.migrated).toBe(true)
    expect(result.fromVersion).toBe(0)
    expect(result.toVersion).toBe(CURRENT_SCHEMA_VERSION)
    expect(result.state.schemaVersion).toBe(CURRENT_SCHEMA_VERSION)
    expect(result.state.data.topics.some(t => t.id === 'topic-legacy-01')).toBe(true)
    expect(result.state.data.topics.length).toBeGreaterThanOrEqual(72)
    expect(result.state.data.settings.examTitle).toBe('Legacy Exam Title')
    expect(result.state.data.revisions).toEqual([])
  })

  it('migrates v1 schema to v2 schema while preserving all existing tasks, CP problems, and notes', () => {
    const v1State = {
      schemaVersion: 1,
      appVersion: '0.1.0',
      updatedAt: new Date().toISOString(),
      data: {
        topics: [],
        adts: [],
        algorithms: [],
        cpProblems: [
          {
            id: 'cp-01',
            title: 'Two Sum',
            platform: 'LEETCODE',
            topic: 'Array',
            difficulty: 'EASY',
            relatedSyllabusTopicIds: [],
            relatedAdtIds: [],
            relatedAlgorithmIds: [],
            status: 'SOLVED_INDEPENDENTLY',
            attemptCount: 1,
            timeSpentMinutes: 15,
            isIndependentlySolved: true,
            hintUsed: false,
            solutionViewed: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ],
        tasks: [
          {
            id: 'task-01',
            title: 'Revise Graph Algorithms',
            category: 'REVISE',
            priority: 'HIGH',
            status: 'TO_DO',
            subtasks: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ],
        brainDumpNotes: [
          {
            id: 'note-01',
            body: 'Check edge relaxation invariant',
            type: 'DOUBT',
            tags: ['graph'],
            isPinned: true,
            isResolved: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ],
        studySessions: [],
        settings: {
          examDate: '2026-11-03',
          examTitle: 'DSA End-Semester Examination',
          targetDailyStudyMinutes: 180,
          theme: 'light',
          spacedRepetitionIntervalsDays: [1, 3, 7, 14],
          initialisedAt: new Date().toISOString(),
          academicDataSeededAt: new Date().toISOString(),
        },
      },
    }

    const result = migrateState(v1State)

    expect(result.migrated).toBe(true)
    expect(result.fromVersion).toBe(1)
    expect(result.toVersion).toBe(2)
    expect(result.state.schemaVersion).toBe(2)
    expect(result.state.data.revisions).toEqual([])
    expect(result.state.data.tasks.length).toBe(1)
    expect(result.state.data.tasks[0].id).toBe('task-01')
    expect(result.state.data.cpProblems[0].id).toBe('cp-01')
    expect(result.state.data.brainDumpNotes[0].id).toBe('note-01')
    expect(result.state.data.settings.spacedRepetitionIntervalsDays).toEqual([1, 3, 7, 14])
  })

  it('throws typed VERSION_MISMATCH if state schema is newer than supported', () => {
    const futureState = {
      schemaVersion: 10,
      appVersion: '10.0.0',
      updatedAt: new Date().toISOString(),
      data: {},
    }

    expect(() => migrateState(futureState)).toThrowError(/newer than supported version/)
  })

  it('throws typed MALFORMED_DATA if rawState is null or invalid', () => {
    expect(() => migrateState(null)).toThrowError(/Cannot migrate invalid or null state/)
    expect(() => migrateState('not-an-object')).toThrowError(/Cannot migrate invalid or null state/)
  })
})

/**
 * Focused Storage Recovery, Corruption Quarantine & Data Loss Prevention Test Harness
 * 
 * Verifies non-negotiable data-integrity requirements:
 * 1. Malformed JSON is rejected, quarantined, and never silently overwritten.
 * 2. Invalid schema / entity validation failures trigger persistent quarantine copies.
 * 3. Incompatible future schema versions are quarantined and protected from modification.
 * 4. Partial invalidities (missing array containers/settings) are safely sanitized without discarding records.
 * 5. Recovery mode blocks routine saves from overwriting stored user data with seed defaults.
 * 6. QuotaExceededError is handled gracefully without leaving partially written state.
 * 7. Pre-restore emergency safety snapshots support deterministic verification and rollback.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  LocalStorageAdapter,
  PRIMARY_STORAGE_KEY,
  CORRUPTED_BACKUP_KEY,
} from '../lib/storage/localStorageAdapter'
import {
  initializeStorage,
  createInitialApplicationState,
} from '../lib/storage/storageService'
import {
  createSafetyBackupSnapshot,
  loadSafetyBackupSnapshot,
} from '../lib/backup/backupService'
import { VersionedApplicationState } from '../types/domain'
import { sanitizePartialApplicationState, migrateState } from '../lib/storage/migrations'

describe('Storage Recovery & Data Loss Prevention Harness', () => {
  let adapter: LocalStorageAdapter

  beforeEach(() => {
    window.localStorage.clear()
    adapter = new LocalStorageAdapter()
  })

  // ==========================================================================
  // 1. Corrupted JSON Handling
  // ==========================================================================
  describe('1. Malformed JSON Handling', () => {
    it('quarantines malformed JSON with timestamp and leaves original storage key intact', async () => {
      const corruptedJson = '{"schemaVersion": 2, "data": { "topics": [ broken json...'
      window.localStorage.setItem(PRIMARY_STORAGE_KEY, corruptedJson)

      const loadResult = await adapter.load()
      expect(loadResult.success).toBe(false)
      expect(loadResult.error?.code).toBe('MALFORMED_DATA')

      // Quarantine copy must exist
      const keys = Object.keys(window.localStorage)
      const quarantineKey = keys.find(k => k.startsWith(CORRUPTED_BACKUP_KEY))
      expect(quarantineKey).toBeDefined()
      expect(window.localStorage.getItem(quarantineKey!)).toBe(corruptedJson)

      // Original key must NOT have been wiped or overwritten
      expect(window.localStorage.getItem(PRIMARY_STORAGE_KEY)).toBe(corruptedJson)

      // Initialization must NOT write default seed data over the corrupted key
      const initResult = await initializeStorage(adapter)
      expect(initResult.error).toBeDefined()
      expect(initResult.error?.code).toBe('MALFORMED_DATA')
      expect(window.localStorage.getItem(PRIMARY_STORAGE_KEY)).toBe(corruptedJson)
    })
  })

  // ==========================================================================
  // 2. Validation Failure & Quarantine
  // ==========================================================================
  describe('2. Validation Failure Handling', () => {
    it('quarantines valid JSON that fails schema validation and preserves user payload', async () => {
      const invalidPayload = {
        schemaVersion: 2,
        appVersion: '0.1.0',
        updatedAt: '2026-10-29T10:00:00.000Z',
        data: {
          topics: [
            {
              // Missing required fields like id, title, unit
              description: 'Malformed topic missing critical properties',
            },
          ],
          adts: [],
          algorithms: [],
          cpProblems: [],
          tasks: [],
          brainDumpNotes: [],
          studySessions: [],
          revisions: [],
          settings: {
            examDate: '2026-11-03',
            examTitle: 'DSA Exam',
            targetDailyStudyMinutes: 180,
            theme: 'light',
            spacedRepetitionIntervalsDays: [1, 3, 7],
          },
        },
      }
      const rawString = JSON.stringify(invalidPayload)
      window.localStorage.setItem(PRIMARY_STORAGE_KEY, rawString)

      const loadResult = await adapter.load()
      expect(loadResult.success).toBe(false)
      expect(loadResult.error?.code).toBe('VALIDATION_FAILED')

      // Quarantine copy must be created even for validation failures
      const keys = Object.keys(window.localStorage)
      const quarantineKey = keys.find(k => k.startsWith(CORRUPTED_BACKUP_KEY))
      expect(quarantineKey).toBeDefined()
      expect(window.localStorage.getItem(quarantineKey!)).toBe(rawString)

      // Primary storage key remains unmolested
      expect(window.localStorage.getItem(PRIMARY_STORAGE_KEY)).toBe(rawString)
    })
  })

  // ==========================================================================
  // 3. Incompatible Future Schema Version
  // ==========================================================================
  describe('3. Version Mismatch Handling', () => {
    it('quarantines unsupported future schema version and refuses to overwrite it', async () => {
      const futurePayload = {
        schemaVersion: 99,
        appVersion: '99.0.0',
        updatedAt: '2028-01-01T00:00:00.000Z',
        data: {
          customFutureField: 'Future valuable user data',
        },
      }
      const rawString = JSON.stringify(futurePayload)
      window.localStorage.setItem(PRIMARY_STORAGE_KEY, rawString)

      const loadResult = await adapter.load()
      expect(loadResult.success).toBe(false)
      expect(loadResult.error?.code).toBe('VERSION_MISMATCH')

      // Quarantine created
      const keys = Object.keys(window.localStorage)
      const quarantineKey = keys.find(k => k.startsWith(CORRUPTED_BACKUP_KEY))
      expect(quarantineKey).toBeDefined()
      expect(window.localStorage.getItem(quarantineKey!)).toBe(rawString)
      expect(window.localStorage.getItem(PRIMARY_STORAGE_KEY)).toBe(rawString)
    })
  })

  // ==========================================================================
  // 4. Partial Invalidity Safe Sanitization
  // ==========================================================================
  describe('4. Partial Invalidity Sanitization', () => {
    it('sanitizes missing container arrays without discarding user records', () => {
      const partialState = {
        schemaVersion: 2,
        appVersion: '0.1.0',
        updatedAt: '2026-10-29T10:00:00.000Z',
        data: {
          topics: [
            {
              id: 'topic-custom-1',
              title: 'Custom Graph Theory',
              unit: 'UNIT_III',
              classification: 'REQUIRED',
              priority: 'HIGH',
              studyStatus: 'IN_PROGRESS',
              confidence: 3,
              linkedTaskIds: [],
              linkedAdtIds: [],
              linkedAlgorithmIds: [],
              linkedCpProblemIds: [],
              notes: 'Valuable user research notes',
              createdAt: '2026-10-29T10:00:00.000Z',
              updatedAt: '2026-10-29T10:00:00.000Z',
            },
          ],
          adts: [],
          algorithms: [],
          tasks: [
            {
              id: 'task-100',
              title: 'Review Warshall algorithm',
              category: 'REVISE',
              priority: 'HIGH',
              status: 'TO_DO',
              createdAt: '2026-10-29T10:00:00.000Z',
              updatedAt: '2026-10-29T10:00:00.000Z',
            },
          ],
          // Omitted revisions, studySessions, cpProblems, brainDumpNotes, settings
        },
      }

      const sanitized = sanitizePartialApplicationState(partialState) as VersionedApplicationState
      expect(sanitized.data.topics).toHaveLength(1)
      expect(sanitized.data.topics[0].id).toBe('topic-custom-1')
      expect(sanitized.data.tasks).toHaveLength(1)
      expect(sanitized.data.tasks[0].id).toBe('task-100')
      expect(sanitized.data.revisions).toEqual([])
      expect(sanitized.data.studySessions).toEqual([])
      expect(sanitized.data.cpProblems).toEqual([])
      expect(sanitized.data.brainDumpNotes).toEqual([])
      expect(sanitized.data.settings.examDate).toBe('2026-11-03')

      // Must pass migration pipeline cleanly
      const migrationResult = migrateState(partialState)
      expect(migrationResult.state.data.topics[0].title).toBe('Custom Graph Theory')
      expect(migrationResult.state.data.tasks[0].title).toBe('Review Warshall algorithm')
    })
  })

  // ==========================================================================
  // 5. Pre-Save Quarantine Defense
  // ==========================================================================
  describe('5. Pre-Save Quarantine Defense', () => {
    it('quarantines unverified/corrupted storage data before committing a new save', async () => {
      const corruptedData = '{"broken": true}'
      window.localStorage.setItem(PRIMARY_STORAGE_KEY, corruptedData)

      // Saving a valid state
      const freshState = createInitialApplicationState()
      const saveResult = await adapter.save(freshState)
      expect(saveResult.success).toBe(true)

      // Pre-save quarantine must exist so the corrupted data was not silently destroyed
      const keys = Object.keys(window.localStorage)
      const presaveQuarantine = keys.find(k => k.includes('presave'))
      expect(presaveQuarantine).toBeDefined()
      expect(window.localStorage.getItem(presaveQuarantine!)).toBe(corruptedData)
    })
  })

  // ==========================================================================
  // 6. Storage Quota Error Resilience
  // ==========================================================================
  describe('6. Storage Quota Exceeded Resilience', () => {
    it('catches QuotaExceededError and propagates typed QUOTA_EXCEEDED error without throwing uncaught exceptions', async () => {
      const state = createInitialApplicationState()
      state.data.settings.examTitle = 'Initial Valid Title'
      await adapter.save(state)

      // Mock quota exceeded specifically on primary state save
      const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation((key: string) => {
        if (key === PRIMARY_STORAGE_KEY) {
          const quotaError = new DOMException('Storage quota exceeded', 'QuotaExceededError')
          throw quotaError
        }
      })

      try {
        const nextState: VersionedApplicationState = {
          ...state,
          data: {
            ...state.data,
            settings: {
              ...state.data.settings,
              examTitle: 'New Title That Exceeds Quota',
            },
          },
        }

        const result = await adapter.save(nextState)
        expect(result.success).toBe(false)
        expect(result.error?.code).toBe('QUOTA_EXCEEDED')
        expect(result.error?.message).toContain('Browser storage quota exceeded')
      } finally {
        setItemSpy.mockRestore()
      }

      // Ensure storage was not left in corrupt state
      const reloaded = await adapter.load()
      expect(reloaded.success).toBe(true)
      expect(reloaded.data?.data.settings.examTitle).toBe('Initial Valid Title')
    })
  })

  // ==========================================================================
  // 7. Pre-Restore Safety Snapshot & Rollback
  // ==========================================================================
  describe('7. Emergency Pre-Restore Snapshot & Rollback', () => {
    it('creates pre-restore safety snapshot and supports complete lossless rollback', () => {
      const originalState = createInitialApplicationState()
      originalState.data.tasks.push({
        id: 'task-user-critical',
        title: 'Master AVL rotations',
        category: 'IMPLEMENT',
        priority: 'CRITICAL',
        status: 'IN_PROGRESS',
        subtasks: [],
        createdAt: '2026-10-29T10:00:00.000Z',
        updatedAt: '2026-10-29T10:00:00.000Z',
      })

      // 1. Take safety snapshot before restore
      const snapshotOk = createSafetyBackupSnapshot(originalState)
      expect(snapshotOk).toBe(true)

      // 2. Simulate destructive replace with incoming backup
      const incomingState = createInitialApplicationState()
      incomingState.data.tasks = [] // zero tasks

      // 3. Rollback from safety snapshot
      const restoredSnapshot = loadSafetyBackupSnapshot()
      expect(restoredSnapshot).not.toBeNull()
      expect(restoredSnapshot?.data.tasks).toHaveLength(1)
      expect(restoredSnapshot?.data.tasks[0].id).toBe('task-user-critical')
      expect(restoredSnapshot?.data.tasks[0].title).toBe('Master AVL rotations')
    })
  })
})

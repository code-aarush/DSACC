/**
 * Data Backup, Export, Import, Merge and Restore Engine Tests
 * 
 * Verifies:
 * 1. Valid export round-trip containing all 9 stores.
 * 2. Pre-import validation and malicious/corrupted payload rejection.
 * 3. Deterministic timestamp-based conflict resolution during merge without data loss.
 * 4. Pre-restore safety backup creation and rollback retrieval.
 * 5. Backup staleness, reminder statuses (NEVER_BACKED_UP, FRESH, STALE) and snooze logic.
 */

import { describe, it, expect, beforeEach } from 'vitest'
import {
  createBackupEnvelope,
  validateBackupFile,
  mergeBackupData,
  createSafetyBackupSnapshot,
  loadSafetyBackupSnapshot,
  getBackupStatus,
  generateBackupFilename,
  BACKUP_FORMAT_IDENTIFIER,
  SAFETY_BACKUP_STORAGE_KEY,
} from '../lib/backup/backupService'
import { createInitialApplicationState } from '../lib/storage/storageService'
import { VersionedApplicationState, ApplicationDataPayload } from '../types/domain'

describe('Data Backup, Export, Import, Merge and Restore Engine', () => {
  let sampleState: VersionedApplicationState

  beforeEach(() => {
    window.localStorage.clear()
    sampleState = createInitialApplicationState()
  })

  describe('Backup Export Envelope & Filename Generation', () => {
    it('creates a complete backup envelope including all 9 stores', () => {
      const envelope = createBackupEnvelope(sampleState)

      expect(envelope.format).toBe(BACKUP_FORMAT_IDENTIFIER)
      expect(envelope.backupVersion).toBe(1)
      expect(envelope.schemaVersion).toBe(sampleState.schemaVersion)
      expect(envelope.data.topics).toHaveLength(63)
      expect(envelope.data.adts).toHaveLength(29)
      expect(envelope.data.algorithms).toHaveLength(27)
      expect(Array.isArray(envelope.data.tasks)).toBe(true)
      expect(Array.isArray(envelope.data.cpProblems)).toBe(true)
      expect(Array.isArray(envelope.data.brainDumpNotes)).toBe(true)
      expect(Array.isArray(envelope.data.studySessions)).toBe(true)
      expect(Array.isArray(envelope.data.revisions)).toBe(true)
      expect(envelope.data.settings).toBeDefined()
    })

    it('generates a deterministic timestamped filename', () => {
      const filename = generateBackupFilename('2026-10-29T14:30:00.000Z')
      expect(filename).toMatch(/^dsacc-backup-\d{4}-\d{2}-\d{2}-\d{4}\.json$/)
    })
  })

  describe('validateBackupFile', () => {
    it('accepts a valid exported backup JSON string', () => {
      const envelope = createBackupEnvelope(sampleState)
      const jsonStr = JSON.stringify(envelope)

      const result = validateBackupFile(jsonStr, sampleState)
      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
      expect(result.preview?.topicCount).toBe(63)
    })

    it('rejects malformed non-JSON strings', () => {
      const result = validateBackupFile('{"invalidJson": ...}')
      expect(result.isValid).toBe(false)
      expect(result.errors[0]).toContain('Malformed JSON')
    })

    it('rejects backups with mismatched format identifier', () => {
      const fakeBackup = {
        format: 'wrong-app-backup',
        backupVersion: 1,
        exportedAt: '2026-10-29T10:00:00.000Z',
        data: sampleState.data,
      }
      const result = validateBackupFile(JSON.stringify(fakeBackup))
      expect(result.isValid).toBe(false)
      expect(result.errors.some(e => e.includes('Invalid backup format identifier'))).toBe(true)
    })

    it('identifies conflicting record IDs in preview against current state', () => {
      // Add a task to current state
      sampleState.data.tasks.push({
        id: 'task-conflict-1',
        title: 'Current Task',
        category: 'LEARN',
        priority: 'HIGH',
        status: 'TO_DO',
        subtasks: [],
        linkedSyllabusTopicIds: [],
        linkedAdtIds: [],
        linkedAlgorithmIds: [],
        linkedCpProblemIds: [],
        notes: '',
        createdAt: '2026-10-29T00:00:00.000Z',
        updatedAt: '2026-10-29T00:00:00.000Z',
      })

      const envelope = createBackupEnvelope(sampleState)
      // Modify incoming task title but keep same ID
      envelope.data.tasks[0].title = 'Incoming Task With Same ID'

      const result = validateBackupFile(JSON.stringify(envelope), sampleState)
      expect(result.isValid).toBe(true)
      expect(result.preview?.conflictingTaskIds).toContain('task-conflict-1')
    })
  })

  describe('mergeBackupData (Deterministic Resolution)', () => {
    it('merges new non-conflicting records and resolves collisions by newer timestamp', () => {
      const currentData: ApplicationDataPayload = {
        ...sampleState.data,
        tasks: [
          {
            id: 'task-1',
            title: 'Current older task version',
            category: 'LEARN',
            priority: 'LOW',
            status: 'TO_DO',
            subtasks: [],
            linkedSyllabusTopicIds: [],
            linkedAdtIds: [],
            linkedAlgorithmIds: [],
            linkedCpProblemIds: [],
            notes: '',
            createdAt: '2026-10-20T00:00:00.000Z',
            updatedAt: '2026-10-20T10:00:00.000Z', // older
          },
        ],
        brainDumpNotes: [
          {
            id: 'note-1',
            body: 'Current newer note version',
            type: 'IDEA',
            tags: [],
            isPinned: false,
            isResolved: false,
            createdAt: '2026-10-20T00:00:00.000Z',
            updatedAt: '2026-10-28T12:00:00.000Z', // newer
          },
        ],
      }

      const incomingData: ApplicationDataPayload = {
        ...sampleState.data,
        tasks: [
          {
            id: 'task-1',
            title: 'Incoming newer task version',
            category: 'LEARN',
            priority: 'CRITICAL',
            status: 'DONE',
            subtasks: [],
            linkedSyllabusTopicIds: [],
            linkedAdtIds: [],
            linkedAlgorithmIds: [],
            linkedCpProblemIds: [],
            notes: '',
            createdAt: '2026-10-20T00:00:00.000Z',
            updatedAt: '2026-10-25T10:00:00.000Z', // newer than current
          },
          {
            id: 'task-2',
            title: 'Brand new incoming task',
            category: 'CP_PRACTICE',
            priority: 'HIGH',
            status: 'TO_DO',
            subtasks: [],
            linkedSyllabusTopicIds: [],
            linkedAdtIds: [],
            linkedAlgorithmIds: [],
            linkedCpProblemIds: [],
            notes: '',
            createdAt: '2026-10-29T00:00:00.000Z',
            updatedAt: '2026-10-29T00:00:00.000Z',
          },
        ],
        brainDumpNotes: [
          {
            id: 'note-1',
            body: 'Incoming older note version',
            type: 'IDEA',
            tags: [],
            isPinned: false,
            isResolved: false,
            createdAt: '2026-10-20T00:00:00.000Z',
            updatedAt: '2026-10-21T00:00:00.000Z', // older than current
          },
        ],
      }

      const { mergedData, report } = mergeBackupData(currentData, incomingData)

      // Task 1 should have been updated with the incoming newer version
      const mergedTask1 = mergedData.tasks.find(t => t.id === 'task-1')
      expect(mergedTask1?.title).toBe('Incoming newer task version')
      expect(mergedTask1?.status).toBe('DONE')
      expect(report.tasksUpdated).toBe(1)

      // Task 2 should have been added
      const mergedTask2 = mergedData.tasks.find(t => t.id === 'task-2')
      expect(mergedTask2?.title).toBe('Brand new incoming task')
      expect(report.tasksAdded).toBe(1)

      // Note 1 should have preserved the current newer version
      const mergedNote1 = mergedData.brainDumpNotes.find(n => n.id === 'note-1')
      expect(mergedNote1?.body).toBe('Current newer note version')
    })

    it('merges revision histories without duplicate review log entries', () => {
      const currentData: ApplicationDataPayload = {
        ...sampleState.data,
        revisions: [
          {
            id: 'rev-topic-1',
            entityType: 'TOPIC',
            entityId: 't-1',
            currentIntervalDays: 3,
            nextReviewDate: '2026-10-31',
            revisionStatus: 'NOT_DUE',
            reviewHistory: [
              {
                id: 'log-1',
                reviewedAt: '2026-10-20T00:00:00.000Z',
                confidenceAfter: 2,
                outcome: 'WEAK',
                intervalDays: 1,
              },
            ],
            createdAt: '2026-10-19T00:00:00.000Z',
            updatedAt: '2026-10-20T00:00:00.000Z',
          },
        ],
      }

      const incomingData: ApplicationDataPayload = {
        ...sampleState.data,
        revisions: [
          {
            id: 'rev-topic-1',
            entityType: 'TOPIC',
            entityId: 't-1',
            currentIntervalDays: 7,
            nextReviewDate: '2026-11-05',
            revisionStatus: 'NOT_DUE',
            reviewHistory: [
              {
                id: 'log-1', // duplicate log
                reviewedAt: '2026-10-20T00:00:00.000Z',
                confidenceAfter: 2,
                outcome: 'WEAK',
                intervalDays: 1,
              },
              {
                id: 'log-2', // new incoming log
                reviewedAt: '2026-10-25T00:00:00.000Z',
                confidenceAfter: 4,
                outcome: 'STRONG',
                intervalDays: 7,
              },
            ],
            createdAt: '2026-10-19T00:00:00.000Z',
            updatedAt: '2026-10-25T00:00:00.000Z',
          },
        ],
      }

      const { mergedData } = mergeBackupData(currentData, incomingData)
      const mergedRev = mergedData.revisions.find(r => r.id === 'rev-topic-1')
      expect(mergedRev?.reviewHistory).toHaveLength(2)
      expect(mergedRev?.reviewHistory.map(l => l.id)).toEqual(['log-1', 'log-2'])
    })
  })

  describe('Safety Backup Snapshot & Rollback', () => {
    it('creates safety backup before destructive operations and retrieves it', () => {
      const saved = createSafetyBackupSnapshot(sampleState)
      expect(saved).toBe(true)

      const storedRaw = window.localStorage.getItem(SAFETY_BACKUP_STORAGE_KEY)
      expect(storedRaw).toBeDefined()
      expect(JSON.parse(storedRaw!).format).toBe(BACKUP_FORMAT_IDENTIFIER)

      const retrieved = loadSafetyBackupSnapshot()
      expect(retrieved).not.toBeNull()
      expect(retrieved?.data.topics).toHaveLength(63)
    })
  })

  describe('Backup Status & Reminder Logic', () => {
    const fixedNow = new Date('2026-10-29T12:00:00.000Z')

    it('reports NEVER_BACKED_UP when lastExportedAt is missing', () => {
      const status = getBackupStatus(sampleState.data.settings, fixedNow)
      expect(status.status).toBe('NEVER_BACKED_UP')
      expect(status.isDismissed).toBe(false)
    })

    it('reports FRESH when backup was made within 7 days', () => {
      const settings = {
        ...sampleState.data.settings,
        lastExportedAt: '2026-10-27T10:00:00.000Z', // 2 days ago
      }
      const status = getBackupStatus(settings, fixedNow)
      expect(status.status).toBe('FRESH')
      expect(status.daysSinceLastBackup).toBe(2)
    })

    it('reports STALE when backup is older than 7 days', () => {
      const settings = {
        ...sampleState.data.settings,
        lastExportedAt: '2026-10-15T10:00:00.000Z', // 14 days ago
      }
      const status = getBackupStatus(settings, fixedNow)
      expect(status.status).toBe('STALE')
      expect(status.daysSinceLastBackup).toBe(14)
    })

    it('respects backupReminderDismissedUntil snooze timestamp', () => {
      const settings = {
        ...sampleState.data.settings,
        lastExportedAt: '2026-10-10T10:00:00.000Z',
        backupReminderDismissedUntil: '2026-11-02T00:00:00.000Z', // dismissed for another 4 days
      }
      const status = getBackupStatus(settings, fixedNow)
      expect(status.status).toBe('STALE')
      expect(status.isDismissed).toBe(true)
    })
  })
})

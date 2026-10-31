import { describe, it, expect } from 'vitest'
import {
  validateStateEnvelope,
  validateSettings,
  validateTopic,
  validateCompleteApplicationState,
} from '../lib/validation/validators'
import { VersionedApplicationState, SyllabusTopic } from '../types/domain'

describe('Runtime Validation Tests', () => {
  const createValidState = (): VersionedApplicationState => ({
    schemaVersion: 1,
    appVersion: '0.1.0',
    updatedAt: new Date().toISOString(),
    data: {
      topics: [],
      adts: [],
      algorithms: [],
      cpProblems: [],
      tasks: [],
      brainDumpNotes: [],
      studySessions: [],
      settings: {
        examDate: '2026-11-03',
        examTitle: 'DSA End-Semester Examination',
        targetDailyStudyMinutes: 180,
        theme: 'light',
        spacedRepetitionIntervalsDays: [1, 3, 7, 14],
        initialisedAt: new Date().toISOString(),
      },
    },
  })

  describe('Envelope Validation', () => {
    it('accepts a fully valid state envelope', () => {
      const state = createValidState()
      const result = validateCompleteApplicationState(state)
      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('rejects envelope if schemaVersion is missing or invalid', () => {
      const invalid = { ...createValidState(), schemaVersion: 0 }
      const result = validateStateEnvelope(invalid)
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Missing or invalid "schemaVersion" (must be a positive integer)')
    })

    it('rejects envelope with invalid updatedAt date string', () => {
      const invalid = { ...createValidState(), updatedAt: 'not-a-valid-date' }
      const result = validateStateEnvelope(invalid)
      expect(result.isValid).toBe(false)
      expect(result.errors[0]).toMatch(/updatedAt/)
    })

    it('rejects envelope if data is not an object', () => {
      const invalid = { ...createValidState(), data: null }
      const result = validateStateEnvelope(invalid)
      expect(result.isValid).toBe(false)
    })
  })

  describe('Settings Validation', () => {
    it('accepts valid application settings', () => {
      const valid = createValidState().data.settings
      const result = validateSettings(valid)
      expect(result.isValid).toBe(true)
    })

    it('rejects invalid theme setting', () => {
      const invalid = { ...createValidState().data.settings, theme: 'neon-cyberpunk' as unknown }
      const result = validateSettings(invalid)
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Settings "theme" must be "light", "dark", or "system"')
    })

    it('rejects negative target study minutes', () => {
      const invalid = { ...createValidState().data.settings, targetDailyStudyMinutes: -30 }
      const result = validateSettings(invalid)
      expect(result.isValid).toBe(false)
    })
  })

  describe('Topic Validation & Integrity', () => {
    const validTopic: SyllabusTopic = {
      id: 'topic-arrays-01',
      unit: 'UNIT_I',
      chapter: 'Arrays',
      title: 'Array-Based List Implementation',
      description: 'Dynamic resizing, random access, amortized bounds',
      classification: 'REQUIRED',
      priority: 'HIGH',
      studyStatus: 'NOT_STARTED',
      confidence: 3,
      revisionStatus: 'NOT_DUE',
      completionRequirements: {
        manualConfirmationRequired: true,
      },
      linkedTaskIds: [],
      linkedAdtIds: [],
      linkedAlgorithmIds: [],
      linkedCpProblemIds: [],
      notes: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    it('accepts a valid topic', () => {
      const result = validateTopic(validTopic)
      expect(result.isValid).toBe(true)
    })

    it('rejects topic with confidence out of 1-5 bounds', () => {
      const invalid = { ...validTopic, confidence: 6 as unknown }
      const result = validateTopic(invalid)
      expect(result.isValid).toBe(false)
      expect(result.errors[0]).toContain('confidence must be an integer between 1 and 5')
    })

    it('rejects topic with invalid unit classification', () => {
      const invalid = { ...validTopic, unit: 'UNIT_IV' as unknown }
      const result = validateTopic(invalid)
      expect(result.isValid).toBe(false)
    })

    it('detects duplicate topic IDs in state payload', () => {
      const state = createValidState()
      state.data.topics = [validTopic, { ...validTopic, title: 'Duplicate Arrays' }]
      const result = validateCompleteApplicationState(state)
      expect(result.isValid).toBe(false)
      expect(result.errors.some(e => e.includes('Duplicate topic ID'))).toBe(true)
    })
  })
})

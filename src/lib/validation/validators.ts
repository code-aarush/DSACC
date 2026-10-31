/**
 * Runtime Validation for Persisted State and Domain Entities
 * 
 * Provides robust validation to reject malformed, corrupted, or incompatible
 * state before committing to or reading from localStorage.
 */

import {
  VersionedApplicationState,
  ApplicationDataPayload,
  SyllabusTopic,
  ADTImplementation,
  Algorithm,
  CPProblem,
  Task,
  BrainDumpNote,
  ApplicationSettings,
} from '../../types/domain'

export interface ValidationResult {
  isValid: boolean
  errors: string[]
}

export function isNonEmptyString(val: unknown): val is string {
  return typeof val === 'string' && val.trim().length > 0
}

export function isValidIsoDate(val: unknown): boolean {
  if (typeof val !== 'string') return false
  const time = Date.parse(val)
  return !isNaN(time)
}

export function isValidHttpUrl(candidate: unknown): boolean {
  if (!candidate || typeof candidate !== 'string') return false
  try {
    const url = new URL(candidate.trim())
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

/**
 * Validates the outer versioned state envelope.
 */
export function validateStateEnvelope(raw: unknown): ValidationResult {
  const errors: string[] = []

  if (!raw || typeof raw !== 'object') {
    return { isValid: false, errors: ['State envelope is null or not an object'] }
  }

  const candidate = raw as Record<string, unknown>

  if (typeof candidate.schemaVersion !== 'number' || candidate.schemaVersion < 1) {
    errors.push('Missing or invalid "schemaVersion" (must be a positive integer)')
  }

  if (typeof candidate.appVersion !== 'string') {
    errors.push('Missing or invalid "appVersion" (must be a string)')
  }

  if (!isValidIsoDate(candidate.updatedAt)) {
    errors.push('Missing or invalid "updatedAt" (must be a valid ISO 8601 date string)')
  }

  if (!candidate.data || typeof candidate.data !== 'object') {
    errors.push('Missing or invalid "data" payload (must be an object)')
  }

  return {
    isValid: errors.length === 0,
    errors,
  }
}

/**
 * Validates ApplicationSettings payload.
 */
export function validateSettings(settings: unknown): ValidationResult {
  const errors: string[] = []
  if (!settings || typeof settings !== 'object') {
    return { isValid: false, errors: ['Settings is missing or not an object'] }
  }

  const s = settings as Partial<ApplicationSettings>

  if (!isNonEmptyString(s.examDate) || isNaN(Date.parse(s.examDate))) {
    errors.push('Settings "examDate" must be a valid date string')
  }

  if (!isNonEmptyString(s.examTitle)) {
    errors.push('Settings "examTitle" must be a non-empty string')
  }

  if (!['light', 'dark', 'system'].includes(s.theme as string)) {
    errors.push('Settings "theme" must be "light", "dark", or "system"')
  }

  if (typeof s.targetDailyStudyMinutes !== 'number' || s.targetDailyStudyMinutes < 0) {
    errors.push('Settings "targetDailyStudyMinutes" must be a non-negative number')
  }

  return {
    isValid: errors.length === 0,
    errors,
  }
}

/**
 * Validates a SyllabusTopic record.
 */
export function validateTopic(topic: unknown): ValidationResult {
  const errors: string[] = []
  if (!topic || typeof topic !== 'object') {
    return { isValid: false, errors: ['Topic is not an object'] }
  }

  const t = topic as Partial<SyllabusTopic>

  if (!isNonEmptyString(t.id)) errors.push('Topic missing valid "id"')
  if (!isNonEmptyString(t.title)) errors.push(`Topic ${t.id ?? 'unknown'} missing "title"`)
  if (!['UNIT_I', 'UNIT_II', 'UNIT_III'].includes(t.unit as string)) {
    errors.push(`Topic ${t.id} has invalid unit: ${t.unit}`)
  }
  if (!['REQUIRED', 'OPTIONAL'].includes(t.classification as string)) {
    errors.push(`Topic ${t.id} has invalid classification: ${t.classification}`)
  }
  if (typeof t.confidence !== 'number' || t.confidence < 1 || t.confidence > 5) {
    errors.push(`Topic ${t.id} confidence must be an integer between 1 and 5`)
  }
  if (!['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED'].includes(t.studyStatus as string)) {
    errors.push(`Topic ${t.id} has invalid studyStatus: ${t.studyStatus}`)
  }

  if (t.implementationStatus && !['NOT_APPLICABLE', 'NOT_STARTED', 'IN_PROGRESS', 'IMPLEMENTED', 'TESTED', 'MASTERED'].includes(t.implementationStatus as string)) {
    errors.push(`Topic ${t.id} has invalid implementationStatus: ${t.implementationStatus}`)
  }

  // Circular dependency & safety check for completionRequirements
  if (t.completionRequirements) {
    const cr = t.completionRequirements
    if (cr.requiredTaskIds && !Array.isArray(cr.requiredTaskIds)) {
      errors.push(`Topic ${t.id} completionRequirements.requiredTaskIds must be an array`)
    }
    if (cr.requiredAdtIds && !Array.isArray(cr.requiredAdtIds)) {
      errors.push(`Topic ${t.id} completionRequirements.requiredAdtIds must be an array`)
    }
    if (cr.requiredAlgorithmIds && !Array.isArray(cr.requiredAlgorithmIds)) {
      errors.push(`Topic ${t.id} completionRequirements.requiredAlgorithmIds must be an array`)
    }
  }

  return { isValid: errors.length === 0, errors }
}

/**
 * Validates an ADTImplementation record.
 */
export function validateADT(adt: unknown): ValidationResult {
  const errors: string[] = []
  if (!adt || typeof adt !== 'object') {
    return { isValid: false, errors: ['ADT is not an object'] }
  }
  const a = adt as Partial<ADTImplementation>
  if (!isNonEmptyString(a.id)) errors.push('ADT missing valid "id"')
  if (!isNonEmptyString(a.name)) errors.push(`ADT ${a.id ?? 'unknown'} missing "name"`)
  if (!['NOT_STARTED', 'IN_PROGRESS', 'IMPLEMENTED', 'TESTED', 'MASTERED'].includes(a.status as string)) {
    errors.push(`ADT ${a.id} has invalid status: ${a.status}`)
  }
  if (!Array.isArray(a.essentialOperations)) {
    errors.push(`ADT ${a.id} essentialOperations must be an array`)
  }
  if (a.customOperations && !Array.isArray(a.customOperations)) {
    errors.push(`ADT ${a.id} customOperations must be an array`)
  }
  return { isValid: errors.length === 0, errors }
}

/**
 * Validates an Algorithm record.
 */
export function validateAlgorithm(algo: unknown): ValidationResult {
  const errors: string[] = []
  if (!algo || typeof algo !== 'object') {
    return { isValid: false, errors: ['Algorithm is not an object'] }
  }
  const al = algo as Partial<Algorithm>
  if (!isNonEmptyString(al.id)) errors.push('Algorithm missing valid "id"')
  if (!isNonEmptyString(al.name)) errors.push(`Algorithm ${al.id ?? 'unknown'} missing "name"`)
  if (!['NOT_STARTED', 'IN_PROGRESS', 'IMPLEMENTED', 'TESTED', 'MASTERED'].includes(al.status as string)) {
    errors.push(`Algorithm ${al.id} has invalid status: ${al.status}`)
  }
  if (!['REQUIRED', 'OPTIONAL'].includes(al.classification as string)) {
    errors.push(`Algorithm ${al.id} has invalid classification: ${al.classification}`)
  }
  return { isValid: errors.length === 0, errors }
}

/**
 * Validates a CPProblem record.
 */
export function validateCPProblem(cp: unknown): ValidationResult {
  const errors: string[] = []
  if (!cp || typeof cp !== 'object') {
    return { isValid: false, errors: ['CPProblem is not an object'] }
  }
  const c = cp as Partial<CPProblem>
  if (!isNonEmptyString(c.id)) errors.push('CPProblem missing valid "id"')
  if (!isNonEmptyString(c.title)) errors.push(`CPProblem ${c.id ?? 'unknown'} missing "title"`)
  if (typeof c.isIndependentlySolved !== 'boolean') {
    errors.push(`CPProblem ${c.id} missing boolean "isIndependentlySolved"`)
  }
  if (c.platform && !['LEETCODE', 'HACKERRANK', 'CODECHEF', 'CODEFORCES', 'GFG', 'OTHER'].includes(c.platform as string)) {
    errors.push(`CPProblem ${c.id} has invalid platform: ${c.platform}`)
  }
  if (c.difficulty && !['EASY', 'MEDIUM', 'HARD'].includes(c.difficulty as string)) {
    errors.push(`CPProblem ${c.id} has invalid difficulty: ${c.difficulty}`)
  }
  if (c.status && !['TO_DO', 'ATTEMPTED', 'SOLVED_INDEPENDENTLY', 'SOLVED_WITH_HINTS', 'EDITORIAL_STUDIED', 'NEEDS_REATTEMPT', 'MASTERED'].includes(c.status as string)) {
    errors.push(`CPProblem ${c.id} has invalid status: ${c.status}`)
  }
  if (c.url && typeof c.url === 'string' && c.url.trim().length > 0 && !isValidHttpUrl(c.url)) {
    errors.push(`CPProblem ${c.id} has invalid URL format: "${c.url}"`)
  }
  return { isValid: errors.length === 0, errors }
}

/**
 * Validates a Task record.
 */
export function validateTask(task: unknown): ValidationResult {
  const errors: string[] = []
  if (!task || typeof task !== 'object') {
    return { isValid: false, errors: ['Task is not an object'] }
  }
  const t = task as Partial<Task>
  if (!isNonEmptyString(t.id)) errors.push('Task missing valid "id"')
  if (!isNonEmptyString(t.title)) errors.push(`Task ${t.id ?? 'unknown'} missing "title"`)
  if (!['TO_DO', 'IN_PROGRESS', 'BLOCKED', 'DONE'].includes(t.status as string)) {
    errors.push(`Task ${t.id} has invalid status: ${t.status}`)
  }
  if (t.category && !['LEARN', 'IMPLEMENT', 'TEST', 'REVISE', 'CP_PRACTICE', 'MOCK_EXAM', 'ADMIN'].includes(t.category as string)) {
    errors.push(`Task ${t.id} has invalid category: ${t.category}`)
  }
  if (t.priority && !['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].includes(t.priority as string)) {
    errors.push(`Task ${t.id} has invalid priority: ${t.priority}`)
  }
  if (t.subtasks && !Array.isArray(t.subtasks)) {
    errors.push(`Task ${t.id} subtasks must be an array`)
  }
  return { isValid: errors.length === 0, errors }
}

/**
 * Validates a BrainDumpNote record.
 */
export function validateBrainDumpNote(note: unknown): ValidationResult {
  const errors: string[] = []
  if (!note || typeof note !== 'object') {
    return { isValid: false, errors: ['Note is not an object'] }
  }
  const n = note as Partial<BrainDumpNote>
  if (!isNonEmptyString(n.id)) errors.push('BrainDumpNote missing valid "id"')
  if (typeof n.body !== 'string') errors.push(`BrainDumpNote ${n.id ?? 'unknown'} missing "body"`)
  if (!['IDEA', 'DOUBT', 'MISTAKE', 'CONCEPT_EXPLANATION', 'IMPORTANT_INSIGHT', 'EXAM_TIP', 'PENDING_RESEARCH'].includes(n.type as string)) {
    errors.push(`BrainDumpNote ${n.id} has invalid type: ${n.type}`)
  }
  return { isValid: errors.length === 0, errors }
}

/**
 * Validates the full data payload inside the envelope.
 */
export function validateDataPayload(payload: unknown): ValidationResult {
  const errors: string[] = []

  if (!payload || typeof payload !== 'object') {
    return { isValid: false, errors: ['Data payload is null or not an object'] }
  }

  const candidate = payload as Partial<ApplicationDataPayload>

  // Required arrays
  const expectedArrays: (keyof ApplicationDataPayload)[] = [
    'topics',
    'adts',
    'algorithms',
    'cpProblems',
    'tasks',
    'brainDumpNotes',
    'studySessions',
  ]

  for (const field of expectedArrays) {
    if (!Array.isArray(candidate[field])) {
      errors.push(`Missing or invalid array for "${field}"`)
    }
  }

  // Validate settings
  const settingsResult = validateSettings(candidate.settings)
  if (!settingsResult.isValid) {
    errors.push(...settingsResult.errors)
  }

  // Check unique IDs and validate topics
  if (Array.isArray(candidate.topics)) {
    const seenIds = new Set<string>()
    for (const topic of candidate.topics) {
      const tr = validateTopic(topic)
      if (!tr.isValid) errors.push(...tr.errors)
      if (topic && typeof topic === 'object' && 'id' in topic) {
        const id = (topic as SyllabusTopic).id
        if (seenIds.has(id)) {
          errors.push(`Duplicate topic ID detected: "${id}"`)
        }
        seenIds.add(id)
      }
    }
  }

  // Validate ADTs if present
  if (Array.isArray(candidate.adts)) {
    const seenAdtIds = new Set<string>()
    for (const adt of candidate.adts) {
      const ar = validateADT(adt)
      if (!ar.isValid) errors.push(...ar.errors)
      if (adt && typeof adt === 'object' && 'id' in adt) {
        const id = (adt as ADTImplementation).id
        if (seenAdtIds.has(id)) {
          errors.push(`Duplicate ADT ID detected: "${id}"`)
        }
        seenAdtIds.add(id)
      }
    }
  }

  // Validate Algorithms if present
  if (Array.isArray(candidate.algorithms)) {
    const seenAlgoIds = new Set<string>()
    for (const algo of candidate.algorithms) {
      const alr = validateAlgorithm(algo)
      if (!alr.isValid) errors.push(...alr.errors)
      if (algo && typeof algo === 'object' && 'id' in algo) {
        const id = (algo as Algorithm).id
        if (seenAlgoIds.has(id)) {
          errors.push(`Duplicate algorithm ID detected: "${id}"`)
        }
        seenAlgoIds.add(id)
      }
    }
  }

  // Validate CP Problems if present
  if (Array.isArray(candidate.cpProblems)) {
    const seenCpIds = new Set<string>()
    for (const cp of candidate.cpProblems) {
      const cpr = validateCPProblem(cp)
      if (!cpr.isValid) errors.push(...cpr.errors)
      if (cp && typeof cp === 'object' && 'id' in cp) {
        const id = (cp as CPProblem).id
        if (seenCpIds.has(id)) {
          errors.push(`Duplicate CP Problem ID detected: "${id}"`)
        }
        seenCpIds.add(id)
      }
    }
  }

  // Validate Tasks if present
  if (Array.isArray(candidate.tasks)) {
    const seenTaskIds = new Set<string>()
    for (const task of candidate.tasks) {
      const tr = validateTask(task)
      if (!tr.isValid) errors.push(...tr.errors)
      if (task && typeof task === 'object' && 'id' in task) {
        const id = (task as Task).id
        if (seenTaskIds.has(id)) {
          errors.push(`Duplicate Task ID detected: "${id}"`)
        }
        seenTaskIds.add(id)
      }
    }
  }

  // Validate BrainDump notes if present
  if (Array.isArray(candidate.brainDumpNotes)) {
    const seenNoteIds = new Set<string>()
    for (const note of candidate.brainDumpNotes) {
      const nr = validateBrainDumpNote(note)
      if (!nr.isValid) errors.push(...nr.errors)
      if (note && typeof note === 'object' && 'id' in note) {
        const id = (note as BrainDumpNote).id
        if (seenNoteIds.has(id)) {
          errors.push(`Duplicate BrainDump note ID detected: "${id}"`)
        }
        seenNoteIds.add(id)
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  }
}

/**
 * Validates an entire VersionedApplicationState.
 */
export function validateCompleteApplicationState(state: unknown): ValidationResult {
  const envelopeResult = validateStateEnvelope(state)
  if (!envelopeResult.isValid) {
    return envelopeResult
  }

  const envelope = state as VersionedApplicationState
  const payloadResult = validateDataPayload(envelope.data)
  if (!payloadResult.isValid) {
    return {
      isValid: false,
      errors: payloadResult.errors,
    }
  }

  return {
    isValid: true,
    errors: [],
  }
}

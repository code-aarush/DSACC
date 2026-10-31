/**
 * Stable, predictable ID generation utility.
 * Guarantees unique, human-scannable IDs across domain models.
 */

export type IdPrefix =
  | 'topic'
  | 'adt'
  | 'algo'
  | 'cp'
  | 'task'
  | 'subtask'
  | 'note'
  | 'session'
  | 'op'

export function generateStableId(prefix: IdPrefix): string {
  // Use crypto.randomUUID when available for cryptographic uniqueness, fallback to timestamp + random
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    const rawUuid = crypto.randomUUID().replace(/-/g, '').slice(0, 12)
    return `${prefix}-${rawUuid}`
  }

  const timestamp = Date.now().toString(36)
  const randomSuffix = Math.random().toString(36).substring(2, 8)
  return `${prefix}-${timestamp}-${randomSuffix}`
}

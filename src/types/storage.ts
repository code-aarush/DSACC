/**
 * Storage and Persistence Architecture Contracts
 */

import { VersionedApplicationState } from './domain'

export type SaveStatus = 'IDLE' | 'SAVING' | 'SAVED' | 'ERROR'

export type StorageErrorCode =
  | 'QUOTA_EXCEEDED'
  | 'MALFORMED_DATA'
  | 'VERSION_MISMATCH'
  | 'WRITE_FAILED'
  | 'READ_FAILED'
  | 'VALIDATION_FAILED'
  | 'UNKNOWN'

export class StorageError extends Error {
  public readonly code: StorageErrorCode
  public readonly originalError?: unknown

  constructor(message: string, code: StorageErrorCode, originalError?: unknown) {
    super(message)
    this.name = 'StorageError'
    this.code = code
    this.originalError = originalError
    Object.setPrototypeOf(this, StorageError.prototype)
  }
}

export interface StorageResult<T> {
  success: boolean
  data?: T
  error?: StorageError
}

export interface StorageAdapter {
  /** Retrieve stored state envelope or null if empty */
  load(): Promise<StorageResult<VersionedApplicationState | null>>
  
  /** Commit state envelope with serialised write */
  save(state: VersionedApplicationState): Promise<StorageResult<void>>
  
  /** Reset or clear persistence (with safety backup) */
  clear(): Promise<StorageResult<void>>

  /** Direct raw string retrieval for backup/inspection without mutating */
  getRaw(): string | null
}

export interface MigrationStep {
  fromVersion: number
  toVersion: number
  migrate: (rawState: unknown) => unknown
}

export interface MigrationResult {
  migrated: boolean
  state: VersionedApplicationState
  fromVersion: number
  toVersion: number
}

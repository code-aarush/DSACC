/**
 * Typed LocalStorage Adapter
 * 
 * Implements safe, isolated persistence behind the StorageAdapter contract.
 * Features:
 * - Serialised writes via WriteQueue
 * - Quota exceeded detection
 * - Malformed data preservation (quarantine rather than silent deletion)
 * - Safe error propagation
 */

import { VersionedApplicationState } from '../../types/domain'
import { StorageAdapter, StorageResult, StorageError } from '../../types/storage'
import { WriteQueue } from './writeQueue'
import { migrateState } from './migrations'
import { validateCompleteApplicationState } from '../validation/validators'
import { getCurrentIsoTimestamp } from '../date/dateUtils'

export const PRIMARY_STORAGE_KEY = 'dsacc_application_state_v1'
export const SAFETY_BACKUP_KEY = 'dsacc_safety_backup'
export const CORRUPTED_BACKUP_KEY = 'dsacc_quarantine_corrupted'

export class LocalStorageAdapter implements StorageAdapter {
  private readonly storageKey: string
  private readonly writeQueue: WriteQueue

  constructor(storageKey: string = PRIMARY_STORAGE_KEY) {
    this.storageKey = storageKey
    this.writeQueue = new WriteQueue()
  }

  /**
   * Safe check for localStorage availability in browser environment.
   */
  private isStorageAvailable(): boolean {
    if (typeof window === 'undefined' || !window.localStorage) {
      return false
    }
    try {
      const testKey = '__dsacc_test__'
      window.localStorage.setItem(testKey, testKey)
      window.localStorage.removeItem(testKey)
      return true
    } catch {
      return false
    }
  }

  public getRaw(): string | null {
    if (!this.isStorageAvailable()) return null
    try {
      return window.localStorage.getItem(this.storageKey)
    } catch {
      return null
    }
  }

  /**
   * Loads state envelope from localStorage.
   * If data is malformed or invalid, quarantines the corrupted string
   * and returns a typed StorageError without overwriting it.
   */
  public async load(): Promise<StorageResult<VersionedApplicationState | null>> {
    if (!this.isStorageAvailable()) {
      return {
        success: false,
        error: new StorageError('localStorage is not available in this environment', 'READ_FAILED'),
      }
    }

    try {
      const raw = window.localStorage.getItem(this.storageKey)
      if (raw === null || raw.trim() === '') {
        return { success: true, data: null }
      }

      let parsed: unknown
      try {
        parsed = JSON.parse(raw)
      } catch (jsonErr) {
        // Quarantine corrupted data so user edits are not lost
        try {
          window.localStorage.setItem(
            `${CORRUPTED_BACKUP_KEY}_${Date.now()}`,
            raw
          )
        } catch {
          // ignore secondary failure
        }

        return {
          success: false,
          error: new StorageError(
            'Persisted data in localStorage contains malformed JSON and could not be parsed.',
            'MALFORMED_DATA',
            jsonErr
          ),
        }
      }

      // Run migration & validation pipeline
      const migrationResult = migrateState(parsed)

      // If migrated, persist the upgraded schema to storage
      if (migrationResult.migrated) {
        await this.save(migrationResult.state)
      }

      return {
        success: true,
        data: migrationResult.state,
      }
    } catch (err: unknown) {
      // Quarantine invalid, unmigratable, or corrupted data so user edits are not lost
      try {
        const raw = window.localStorage.getItem(this.storageKey)
        if (raw) {
          window.localStorage.setItem(
            `${CORRUPTED_BACKUP_KEY}_${Date.now()}`,
            raw
          )
        }
      } catch {
        // ignore secondary failure
      }

      if (err instanceof StorageError) {
        return { success: false, error: err }
      }
      return {
        success: false,
        error: new StorageError(
          `Unexpected error reading persisted state: ${String(err)}`,
          'READ_FAILED',
          err
        ),
      }
    }
  }

  /**
   * Commits state to localStorage safely within the serialized write queue.
   */
  public save(state: VersionedApplicationState): Promise<StorageResult<void>> {
    return this.writeQueue.enqueue(async () => {
      if (!this.isStorageAvailable()) {
        return {
          success: false,
          error: new StorageError('localStorage is not available in this environment', 'WRITE_FAILED'),
        }
      }

      // Pre-commit validation
      const validation = validateCompleteApplicationState(state)
      if (!validation.isValid) {
        return {
          success: false,
          error: new StorageError(
            `Cannot save invalid state: ${validation.errors.join('; ')}`,
            'VALIDATION_FAILED'
          ),
        }
      }

      try {
        // Safety check: if current data in localStorage cannot be validated,
        // quarantine it before overwriting so existing progress is never destroyed
        const currentRaw = window.localStorage.getItem(this.storageKey)
        if (currentRaw) {
          try {
            const parsed = JSON.parse(currentRaw)
            const check = validateCompleteApplicationState(parsed)
            if (!check.isValid) {
              window.localStorage.setItem(
                `${CORRUPTED_BACKUP_KEY}_presave_${Date.now()}`,
                currentRaw
              )
            }
          } catch {
            window.localStorage.setItem(
              `${CORRUPTED_BACKUP_KEY}_presave_${Date.now()}`,
              currentRaw
            )
          }
        }

        // Stamp update time
        const stateToSave: VersionedApplicationState = {
          ...state,
          updatedAt: getCurrentIsoTimestamp(),
        }

        const serialized = JSON.stringify(stateToSave)
        window.localStorage.setItem(this.storageKey, serialized)

        return { success: true }
      } catch (err: unknown) {
        // Detect quota exceeded error
        const errObj = err && typeof err === 'object' ? (err as Record<string, unknown>) : {}
        const isQuota =
          err instanceof DOMException ||
          errObj.name === 'QuotaExceededError' ||
          errObj.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
          errObj.code === 22

        const errorCode = isQuota ? 'QUOTA_EXCEEDED' : 'WRITE_FAILED'
        const message = isQuota
          ? 'Browser storage quota exceeded. Please export your backup and clear older data.'
          : `Failed to write to localStorage: ${String(err)}`

        return {
          success: false,
          error: new StorageError(message, errorCode, err),
        }
      }
    })
  }

  /**
   * Clears stored data with an automatic safety backup.
   */
  public async clear(): Promise<StorageResult<void>> {
    if (!this.isStorageAvailable()) {
      return {
        success: false,
        error: new StorageError('localStorage is not available', 'WRITE_FAILED'),
      }
    }

    try {
      const currentRaw = window.localStorage.getItem(this.storageKey)
      if (currentRaw) {
        // Save safety backup before deletion
        window.localStorage.setItem(
          `${SAFETY_BACKUP_KEY}_${Date.now()}`,
          currentRaw
        )
      }
      window.localStorage.removeItem(this.storageKey)
      return { success: true }
    } catch (err) {
      return {
        success: false,
        error: new StorageError('Failed to clear persistence', 'WRITE_FAILED', err),
      }
    }
  }
}

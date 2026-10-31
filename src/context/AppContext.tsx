/**
 * Application State and Navigation Provider
 * 
 * Bridges domain models, storage adapter, navigation, and persistence status.
 */

import React, { useEffect, useState, useCallback, useMemo } from 'react'
import { VersionedApplicationState } from '../types/domain'
import { SaveStatus, StorageError, StorageAdapter } from '../types/storage'
import { LocalStorageAdapter } from '../lib/storage/localStorageAdapter'
import { initializeStorage, createInitialApplicationState } from '../lib/storage/storageService'
import { NavSectionId } from './navigationSections'
import { AppContext } from './AppContextDefinition'

export interface AppProviderProps {
  children: React.ReactNode
  adapter?: StorageAdapter
}

export const AppProvider: React.FC<AppProviderProps> = ({ children, adapter }) => {
  const storageAdapter = useMemo(() => adapter || new LocalStorageAdapter(), [adapter])

  const [activeSection, setActiveSection] = useState<NavSectionId>('overview')
  const [appState, setAppState] = useState<VersionedApplicationState | null>(null)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('IDLE')
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null)
  const [storageError, setStorageError] = useState<StorageError | null>(null)
  const [isInitialized, setIsInitialized] = useState<boolean>(false)
  const [isMobileNavOpen, setIsMobileNavOpen] = useState<boolean>(false)

  // Initialize storage on mount
  const runInitialization = useCallback(async () => {
    try {
      const initResult = await initializeStorage(storageAdapter)
      setAppState(initResult.state)
      if (initResult.error) {
        setStorageError(initResult.error)
        setSaveStatus('ERROR')
      } else {
        setStorageError(null)
        setSaveStatus('SAVED')
        setLastSavedAt(initResult.state.updatedAt)
      }
      setIsInitialized(true)
    } catch (err) {
      const wrappedError = err instanceof StorageError ? err : new StorageError(String(err), 'UNKNOWN', err)
      setStorageError(wrappedError)
      setSaveStatus('ERROR')
      setAppState(createInitialApplicationState())
      setIsInitialized(true)
    }
  }, [storageAdapter])

  useEffect(() => {
    runInitialization()
  }, [runInitialization])

  const toggleMobileNav = useCallback(() => {
    setIsMobileNavOpen(prev => !prev)
  }, [])

  // State update and persistence coordinator
  const updateAppState = useCallback(
    async (updater: (prev: VersionedApplicationState) => VersionedApplicationState): Promise<boolean> => {
      if (!appState) return false

      const nextState = updater(appState)
      setAppState(nextState)
      setSaveStatus('SAVING')

      const saveResult = await storageAdapter.save(nextState)

      if (saveResult.success) {
        setSaveStatus('SAVED')
        setLastSavedAt(new Date().toISOString())
        setStorageError(null)
        return true
      } else {
        setSaveStatus('ERROR')
        setStorageError(saveResult.error || new StorageError('Save failed', 'WRITE_FAILED'))
        return false
      }
    },
    [appState, storageAdapter]
  )

  const value = useMemo(
    () => ({
      activeSection,
      setActiveSection,
      appState,
      saveStatus,
      lastSavedAt,
      storageError,
      isInitialized,
      isMobileNavOpen,
      setIsMobileNavOpen,
      toggleMobileNav,
      updateAppState,
      retryStorageInit: runInitialization,
    }),
    [
      activeSection,
      appState,
      saveStatus,
      lastSavedAt,
      storageError,
      isInitialized,
      isMobileNavOpen,
      toggleMobileNav,
      updateAppState,
      runInitialization,
    ]
  )

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

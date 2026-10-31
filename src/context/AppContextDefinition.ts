import { createContext } from 'react'
import { VersionedApplicationState } from '../types/domain'
import { SaveStatus, StorageError } from '../types/storage'
import { NavSectionId } from './navigationSections'

export interface AppContextValue {
  activeSection: NavSectionId
  setActiveSection: (section: NavSectionId) => void
  appState: VersionedApplicationState | null
  saveStatus: SaveStatus
  lastSavedAt: string | null
  storageError: StorageError | null
  isInitialized: boolean
  isMobileNavOpen: boolean
  setIsMobileNavOpen: (open: boolean) => void
  toggleMobileNav: () => void
  updateAppState: (updater: (prev: VersionedApplicationState) => VersionedApplicationState) => Promise<boolean>
  retryStorageInit: () => Promise<void>
}

export const AppContext = createContext<AppContextValue | undefined>(undefined)

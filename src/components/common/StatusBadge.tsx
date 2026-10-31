import React from 'react'
import { useApp } from '../../context/useApp'

export const StatusBadge: React.FC = () => {
  const { saveStatus, storageError, lastSavedAt } = useApp()

  let statusClass = 'saved'
  let label = 'Saved'
  let title = lastSavedAt ? `Last saved at ${new Date(lastSavedAt).toLocaleTimeString()}` : 'Data persisted locally'

  if (saveStatus === 'SAVING') {
    statusClass = 'saving'
    label = 'Saving...'
    title = 'Persisting changes to localStorage...'
  } else if (saveStatus === 'ERROR') {
    statusClass = 'error'
    label = 'Save Error'
    title = storageError ? storageError.message : 'Error writing to storage'
  }

  return (
    <div
      className={`save-indicator ${statusClass}`}
      title={title}
      aria-live="polite"
      aria-label={`Storage status: ${label}`}
    >
      <span className="save-indicator-dot" aria-hidden="true" />
      <span>{label}</span>
    </div>
  )
}

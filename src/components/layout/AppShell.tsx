import React from 'react'
import { useApp } from '../../context/useApp'
import { SECTIONS } from '../../context/navigationSections'
import { AppHeader } from './AppHeader'
import { AppSidebar } from './AppSidebar'
import { MobileNav } from './MobileNav'
import { OverviewSection } from '../../features/overview/OverviewSection'
import { SyllabusSection } from '../../features/syllabus/SyllabusSection'
import { ADTSection } from '../../features/adt-library/ADTSection'
import { AlgorithmSection } from '../../features/algorithm-library/AlgorithmSection'
import { TasksSection } from '../../features/tasks/TasksSection'
import { CPPracticeSection } from '../../features/cp-practice/CPPracticeSection'
import { BrainDumpSection } from '../../features/brain-dump/BrainDumpSection'
import { PlaceholderSection } from '../common/PlaceholderSection'

export const AppShell: React.FC = () => {
  const { activeSection, storageError, isInitialized } = useApp()

  const currentSectionMeta = SECTIONS.find(s => s.id === activeSection) || SECTIONS[0]

  const renderContent = () => {
    switch (activeSection) {
      case 'overview':
        return <OverviewSection />

      case 'syllabus':
        return <SyllabusSection />

      case 'adt-library':
        return <ADTSection />

      case 'algorithm-library':
        return <AlgorithmSection />

      case 'cp-practice':
        return <CPPracticeSection />

      case 'tasks':
        return <TasksSection />

      case 'brain-dump':
        return <BrainDumpSection />

      case 'analytics':
        return (
          <PlaceholderSection
            section={currentSectionMeta}
            description="Actionable revision intelligence, weak-topic identification based on confidence ratings, and data recovery."
            deliverables={[
              'Required syllabus coverage by unit excluding optional topics',
              'Low-confidence weak topic identification (1-5 scale)',
              'JSON export and validated restore workflows',
              'Merge and replace recovery modes with pre-restore safety backups',
            ]}
          />
        )

      default:
        return <OverviewSection />
    }
  }

  return (
    <div className="app-container">
      <AppHeader />
      
      {storageError && (
        <div className="alert-banner error" role="alert" style={{ margin: 'var(--space-2) var(--space-4) 0' }}>
          <strong>Storage Notice:</strong> {storageError.message}
          <span> (Edits are preserved in memory to prevent data loss).</span>
        </div>
      )}

      <div className="app-body">
        <AppSidebar />
        <main className="app-content" id="main-content" tabIndex={-1}>
          {!isInitialized ? (
            <div className="card" style={{ textAlign: 'center', padding: 'var(--space-8)' }}>
              <p className="card-description">Initializing workspace persistence boundary...</p>
            </div>
          ) : (
            renderContent()
          )}
        </main>
      </div>

      <MobileNav />
    </div>
  )
}

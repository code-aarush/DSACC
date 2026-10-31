import React, { useMemo } from 'react'
import { useApp } from '../../context/useApp'
import { calculateExamCountdown } from '../../lib/date/dateUtils'

export const CountdownBadge: React.FC = () => {
  const { appState } = useApp()
  const examDate = appState?.data.settings.examDate || '2026-11-03'

  const countdown = useMemo(() => {
    return calculateExamCountdown(examDate)
  }, [examDate])

  return (
    <div
      className={`countdown-badge ${countdown.isPassed ? 'passed' : ''}`}
      title={`Target: ${examDate} (${appState?.data.settings.examTitle || 'Exam'})`}
      aria-label={`Exam countdown: ${countdown.formattedLabel}`}
    >
      <svg
        className="countdown-icon"
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
      <span>{countdown.formattedLabel}</span>
    </div>
  )
}

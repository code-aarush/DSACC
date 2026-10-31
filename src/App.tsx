import React from 'react'
import { ThemeProvider } from './context/ThemeContext'
import { AppProvider } from './context/AppContext'
import { AppShell } from './components/layout/AppShell'

export const App: React.FC = () => {
  return (
    <ThemeProvider>
      <AppProvider>
        <AppShell />
      </AppProvider>
    </ThemeProvider>
  )
}

export default App

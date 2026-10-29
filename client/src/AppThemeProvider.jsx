
import { useSelector } from 'react-redux'
import { useEffect } from 'react'


import { ThemeProvider, CssBaseline } from '@mui/material'

import { lightTheme, darkTheme } from './theme.js'

export default function AppThemeProvider({ children }) {
  const mode = useSelector((state) => state.theme.mode)


  useEffect(() => {
    localStorage.setItem('2valid-theme-mode' , mode) 
  }, [mode])

  const theme = mode === 'dark' ? darkTheme : lightTheme

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {children}
    </ThemeProvider>
  )
}

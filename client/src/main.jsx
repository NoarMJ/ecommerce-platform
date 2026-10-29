import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Provider } from 'react-redux'
import { BrowserRouter } from 'react-router-dom'
// import { ThemeProvider , CssBaseline } from '@mui/material'

import { store } from './app/store.js'
// import { lightTheme } from './theme.js'
// import { darkTheme } from './theme.js'
import AppThemeProvider from './AppThemeProvider.jsx'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Provider store={store}>
    {/* <ThemeProvider theme= {lightTheme}> */}
    <AppThemeProvider>
       <BrowserRouter>
          <App />
       </BrowserRouter>
     </AppThemeProvider>
    {/* </ThemeProvider> */}
    </Provider>
  </StrictMode>,
)

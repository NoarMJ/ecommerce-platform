
import { createTheme } from '@mui/material/styles'

const sharedSettings = {
  shape: {
    borderRadius: 10,
  },

  typography: {
    fontFamily: '"Inter", "Roboto", "Arial", sans-serif',

    button: {
      textTransform: 'none',
      fontWeight: 600,
    },
  },
}

// Light theme
export const lightTheme = createTheme({
  ...sharedSettings,

  palette: {
    mode: 'light',

    primary: {
      main: '#101A30',
      contrastText: '#FFFFFF',
    },

    secondary: {
      main: '#702B40',
      contrastText: '#FFFFFF',
    },

    background: {
      default: '#F7F7F5',
      paper: '#FFFFFF',
    },

    text: {
      primary: '#172033',
      secondary: '#667085',
    },

    divider: '#E5E7EB',

    gold: {
      main: '#A78342',
    },
  },
})

// Dark theme
export const darkTheme = createTheme({
  ...sharedSettings,

  palette: {
    mode: 'dark',

    primary: {
      main: '#C3A46A',
      contrastText: '#101A30',
    },

    secondary: {
      main: '#A24B65',
      contrastText: '#FFFFFF',
    },

    background: {
      default: '#0B101B',
      paper: '#151E2E',
    },

    text: {
      primary: '#F5F7FA',
      secondary: '#B5BECE',
    },

    divider: '#293449',

    gold: {
      main: '#D5B878',
    },
  },
})

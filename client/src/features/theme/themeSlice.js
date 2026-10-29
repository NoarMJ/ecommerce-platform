
import { createSlice } from '@reduxjs/toolkit'

const savedMode = localStorage.getItem('2valid-theme-mode')

const initialState = {
  mode: savedMode === 'dark' ? 'dark' : 'light',
}

const themeSlice = createSlice({
  name: 'theme',
  initialState,

  reducers: {
    toggleTheme(state) {
      state.mode = state.mode === 'light' ? 'dark' : 'light'
    },

    setThemeMode(state, action) {
      state.mode = action.payload
    },
  },
})

export const { toggleTheme, setThemeMode } = themeSlice.actions

export default themeSlice.reducer

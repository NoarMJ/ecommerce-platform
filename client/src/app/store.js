
import { configureStore } from '@reduxjs/toolkit'
import { api } from '../services/api.js'

import themeReducer from '../features/theme/themeSlice.js'

export const store = configureStore({
  reducer: {
    theme: themeReducer,
    [api.reducerPath]: api.reducer,
  },

  middleware: (getDefaultMiddleware) => 
    getDefaultMiddleware().concat(api.middleware),
})

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { CssBaseline, ThemeProvider, createTheme } from '@mui/material'
import './index.css'
import App from './App.tsx'

const theme = createTheme({
  palette: {
    mode: 'dark',
    background: {
      default: '#11110f',
      paper: '#1b1b18',
    },
    primary: {
      main: '#d6d785',
    },
    success: {
      main: '#8fc45a',
    },
    warning: {
      main: '#f6a23d',
    },
    error: {
      main: '#ef4e3c',
    },
    text: {
      primary: '#f2eee1',
      secondary: '#aaa793',
    },
  },
  typography: {
    fontFamily:
      '"Roboto Mono", "SFMono-Regular", "Consolas", "Liberation Mono", monospace',
    button: {
      textTransform: 'none',
      letterSpacing: 0,
    },
  },
  shape: {
    borderRadius: 6,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 5,
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
      },
    },
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <App />
    </ThemeProvider>
  </StrictMode>,
)

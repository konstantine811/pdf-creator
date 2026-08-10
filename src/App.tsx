import { Navigate, Route, Routes } from 'react-router-dom'
import AppLayout from './components/layout/AppLayout'
import { PagesProvider } from './context/PagesContext'
import EditorPage from './pages/EditorPage'
import ScannerPage from './pages/ScannerPage'

export default function App() {
  return (
    <PagesProvider>
      <Routes>
        <Route element={<AppLayout />}>
          <Route index element={<EditorPage />} />
          <Route path="scanner" element={<ScannerPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </PagesProvider>
  )
}

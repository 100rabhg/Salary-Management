import { Navigate, Route, Routes } from 'react-router'
import { AppLayout } from './components/AppLayout'
import { NotFound } from './components/NotFound'
import { EmployeeDirectoryPage } from './features/employees/EmployeeDirectoryPage'

export function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<Navigate to="/employees" replace />} />
        <Route path="employees" element={<EmployeeDirectoryPage />} />
        <Route
          path="*"
          element={<NotFound title="Page not found" description="This page doesn't exist. It may have moved." />}
        />
      </Route>
    </Routes>
  )
}

import { Route, Routes } from 'react-router'
import { AppLayout } from './components/AppLayout'
import { NotFound } from './components/NotFound'
import { DashboardPage } from './features/dashboard/DashboardPage'
import { EmployeeDirectoryPage } from './features/employees/EmployeeDirectoryPage'
import { InsightsPage } from './features/insights/InsightsPage'
import { EmployeeProfilePage } from './features/profile/EmployeeProfilePage'

export function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<DashboardPage />} />
        <Route path="insights" element={<InsightsPage />} />
        <Route path="employees" element={<EmployeeDirectoryPage />} />
        <Route path="employees/:id" element={<EmployeeProfilePage />} />
        <Route
          path="*"
          element={<NotFound title="Page not found" description="This page doesn't exist. It may have moved." />}
        />
      </Route>
    </Routes>
  )
}

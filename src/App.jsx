import { Routes, Route } from 'react-router-dom'
import AppShell from './layouts/AppShell'
import DashboardPage from './pages/DashboardPage'
import AppsPage from './pages/AppsPage'
import AppDetailPage from './pages/AppDetailPage'
import ResultsEntryPage from './pages/ResultsEntryPage'
import QueriesPage from './pages/QueriesPage'
import QueryDetailPage from './pages/QueryDetailPage'
import ComparePage from './pages/ComparePage'
import GoldenPage from './pages/GoldenPage'
import NotFoundPage from './pages/NotFoundPage'

export default function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<DashboardPage />} />
        <Route path="apps" element={<AppsPage />} />
        <Route path="apps/:id" element={<AppDetailPage />} />
        <Route path="apps/:id/results" element={<ResultsEntryPage />} />
        <Route path="queries" element={<QueriesPage />} />
        <Route path="queries/:id" element={<QueryDetailPage />} />
        <Route path="compare" element={<ComparePage />} />
        <Route path="golden" element={<GoldenPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}

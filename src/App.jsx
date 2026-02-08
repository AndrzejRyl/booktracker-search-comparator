import { lazy } from 'react'
import { Routes, Route } from 'react-router-dom'
import AppShell from './layouts/AppShell'

const DashboardPage = lazy(() => import('./pages/DashboardPage'))
const AppsPage = lazy(() => import('./pages/AppsPage'))
const AppDetailPage = lazy(() => import('./pages/AppDetailPage'))
const ResultsEntryPage = lazy(() => import('./pages/ResultsEntryPage'))
const QueriesPage = lazy(() => import('./pages/QueriesPage'))
const QueryDetailPage = lazy(() => import('./pages/QueryDetailPage'))
const ComparePage = lazy(() => import('./pages/ComparePage'))
const GoldenPage = lazy(() => import('./pages/GoldenPage'))
const LeaderboardPage = lazy(() => import('./pages/LeaderboardPage'))
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'))

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
        <Route path="leaderboard" element={<LeaderboardPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}

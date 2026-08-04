import { Navigate, Route, Routes } from 'react-router-dom'

import { AppLayout } from './components/AppLayout'
import { ConsensusReportPage } from './pages/ConsensusReportPage'
import { DashboardPage } from './pages/DashboardPage'
import { SubmissionPage } from './pages/SubmissionPage'
import { SubmissionProgressPage } from './pages/SubmissionProgressPage'
import { UploadPage } from './pages/UploadPage'

export default function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<DashboardPage />} />
        <Route path="upload" element={<UploadPage />} />
        <Route path="submissions/:submissionId" element={<SubmissionPage />} />
        <Route path="submissions/progress/:transactionHash" element={<SubmissionProgressPage />} />
        <Route path="consensus" element={<ConsensusReportPage />} />
        <Route path="consensus/:consensusResultId" element={<ConsensusReportPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}

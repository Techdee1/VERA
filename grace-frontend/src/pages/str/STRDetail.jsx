import { useParams, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { useQueries, useQueryClient } from '@tanstack/react-query'
import { PageHeader } from '@/components/layout/PageHeader'
import { STREditor } from '@/components/str/STREditor'
import { STRPreview } from '@/components/str/STRPreview'
import { AuditTrail } from '@/components/str/AuditTrail'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { useSTR } from '@/hooks/useSTR'
import { useAlert } from '@/hooks/useAlerts'
import { entitiesApi } from '@/api/entities'
import { strApi } from '@/api/str'
import { generateSTRPdf } from '@/utils/generateSTRPdf'
import { toast } from '@/store/toastStore'
import { Spinner } from '@/components/ui/Spinner'
import { Download } from 'lucide-react'

export default function STRDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { data: str, isLoading } = useSTR(id)
  const { data: alert } = useAlert(str?.alertId)
  const [approveModal, setApproveModal] = useState(false)
  const [rejectModal, setRejectModal] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [decisionLoading, setDecisionLoading] = useState(false)

  const entityIds = alert?.entityIds ?? []
  const entityQueries = useQueries({
    queries: entityIds.map((entityId) => ({
      queryKey: ['entity-pdf', entityId],
      queryFn: () => entitiesApi.getById(entityId),
      staleTime: 60_000,
      enabled: Boolean(entityId),
    })),
  })
  const entities = entityQueries.map((query) => query.data).filter(Boolean)

  if (isLoading) return <div className="flex justify-center py-16"><Spinner size="lg" /></div>
  if (!str) return <div className="text-center py-16 text-[#4B5563]">STR not found</div>

  const isPending = str.decision === 'pending'

  const handleDownloadPDF = () => {
    try {
      const filename = generateSTRPdf({ str, alert, entities })
      toast.success(`Downloaded ${filename}`)
    } catch {
      toast.error('Failed to generate PDF — please try again')
    }
  }

  const handleApprove = async () => {
    setDecisionLoading(true)
    try {
      await strApi.updateDecision(str.id, 'approved')
      await queryClient.invalidateQueries({ queryKey: ['str', id] })
      setApproveModal(false)
      toast.success(`${str.id} filed successfully with NFIU`)
    } catch {
      toast.error('Failed to approve STR — please try again')
    } finally {
      setDecisionLoading(false)
    }
  }

  const handleReject = async () => {
    setDecisionLoading(true)
    try {
      await strApi.updateDecision(str.id, 'rejected')
      await queryClient.invalidateQueries({ queryKey: ['str', id] })
      setRejectModal(false)
      toast.error(`${str.id} rejected`)
      navigate('/str')
    } catch {
      toast.error('Failed to reject STR — please try again')
    } finally {
      setDecisionLoading(false)
    }
  }

  return (
    <div>
      <PageHeader backTo="/str" title={`STR ${str.id}`} subtitle={`Alert: ${str.alertId}`} />

      <div className="grid lg:grid-cols-3 gap-4 mb-4">
        <div className="space-y-4">
          <STRPreview str={str} />
          <AuditTrail strId={str.id} />
        </div>
        <div className="lg:col-span-2">
          <STREditor content={str.draftContent} readOnly={!isPending} />
        </div>
      </div>

      {isPending ? (
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" onClick={handleDownloadPDF} disabled={decisionLoading}>
            <Download size={16} />
            Download PDF
          </Button>
          <Button variant="primary" onClick={() => setApproveModal(true)} disabled={decisionLoading}>Approve & File</Button>
          <Button variant="secondary" onClick={() => toast.info('Changes requested — awaiting revision')} disabled={decisionLoading}>Request Changes</Button>
          <Button variant="danger" onClick={() => setRejectModal(true)} disabled={decisionLoading}>Reject</Button>
        </div>
      ) : str.decision === 'approved' ? (
        <div className="flex items-center gap-3 p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
          <span className="text-green-400 text-sm font-medium">✓ STR filed successfully with NFIU</span>
          <Button variant="outline" size="sm" onClick={handleDownloadPDF}>
            <Download size={14} />
            Download PDF
          </Button>
          <button onClick={() => navigate('/str')} className="ml-auto text-xs text-[#94A3B8] hover:text-[#F7F9FC]">Back to STRs →</button>
        </div>
      ) : (
        <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
          <span className="text-red-400 text-sm font-medium">✗ STR rejected</span>
          <Button variant="outline" size="sm" onClick={handleDownloadPDF}>
            <Download size={14} />
            Download PDF
          </Button>
          <button onClick={() => navigate('/str')} className="ml-auto text-xs text-[#94A3B8] hover:text-[#F7F9FC]">Back to STRs →</button>
        </div>
      )}

      <Modal open={approveModal} onClose={() => setApproveModal(false)} title="Approve & File STR">
        <p className="text-sm text-[#94A3B8] mb-4">
          You are about to file <strong className="text-[#F7F9FC]">{str.id}</strong> with the NFIU. This action is irreversible and will be recorded in the audit trail.
        </p>
        <div className="bg-[#1C2333] border border-[#2D3748] rounded-md p-3 mb-4">
          <p className="text-[10px] text-[#4B5563] font-mono break-all">Payload Hash: {str.payloadHash}</p>
        </div>
        <div className="flex gap-2 justify-end">
          <Button variant="ghost" onClick={() => setApproveModal(false)} disabled={decisionLoading}>Cancel</Button>
          <Button variant="primary" onClick={handleApprove} disabled={decisionLoading}>
            {decisionLoading ? 'Filing…' : 'Confirm & File'}
          </Button>
        </div>
      </Modal>

      <Modal open={rejectModal} onClose={() => setRejectModal(false)} title="Reject STR">
        <p className="text-sm text-[#94A3B8] mb-4">Provide a reason for rejecting this STR draft.</p>
        <textarea
          rows={3}
          value={rejectReason}
          onChange={(e) => setRejectReason(e.target.value)}
          placeholder="Rejection reason..."
          className="w-full bg-[#1C2333] border border-[#2D3748] rounded-md p-3 text-sm text-[#F7F9FC] placeholder:text-[#4B5563] focus:outline-none resize-none mb-4"
        />
        <div className="flex gap-2 justify-end">
          <Button variant="ghost" onClick={() => setRejectModal(false)} disabled={decisionLoading}>Cancel</Button>
          <Button variant="danger" onClick={handleReject} disabled={decisionLoading}>
            {decisionLoading ? 'Rejecting…' : 'Reject STR'}
          </Button>
        </div>
      </Modal>
    </div>
  )
}

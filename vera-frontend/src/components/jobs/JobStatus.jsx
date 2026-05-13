import { useJob } from '../../hooks/useJobs'
import { Spinner } from '../ui/Spinner'
import { Badge } from '../ui/Badge'
import { CheckCircle, XCircle, Clock } from 'lucide-react'

export function JobStatus({ jobId }) {
  const { data: job, isLoading } = useJob(jobId)

  if (isLoading || !job) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-600">
        <Spinner className="w-4 h-4" />
        <span>Loading job status...</span>
      </div>
    )
  }

  const statusConfig = {
    queued: {
      icon: Clock,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
      label: 'Queued',
    },
    processing: {
      icon: Spinner,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      label: 'Processing',
    },
    completed: {
      icon: CheckCircle,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      label: 'Completed',
    },
    failed: {
      icon: XCircle,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      label: 'Failed',
    },
  }

  const config = statusConfig[job.status] || statusConfig.queued
  const Icon = config.icon

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Icon className={`w-5 h-5 ${config.color}`} />
        <Badge variant="secondary" className={config.bgColor}>
          {config.label}
        </Badge>
      </div>

      {job.total_records > 0 && (
        <div className="text-sm text-gray-600">
          <span className="font-medium">{job.processed_records}</span> / {job.total_records} records processed
        </div>
      )}

      {job.status === 'processing' && job.total_records > 0 && (
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all"
            style={{ width: `${(job.processed_records / job.total_records) * 100}%` }}
          />
        </div>
      )}

      {job.error_message && (
        <p className="text-sm text-red-600">{job.error_message}</p>
      )}
    </div>
  )
}

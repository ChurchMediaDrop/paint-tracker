import { JobStatus } from "@/lib/types";
import { formatJobStatus } from "@/lib/format";

interface StatusBadgeProps {
  status: JobStatus;
}

const STATUS_STYLES: Record<JobStatus, string> = {
  [JobStatus.Lead]: "bg-gray-500/20 text-gray-300 border-gray-500/30",
  [JobStatus.Quoted]: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  [JobStatus.Scheduled]: "bg-amber-500/20 text-amber-300 border-amber-500/30",
  [JobStatus.InProgress]: "bg-orange-500/20 text-orange-300 border-orange-500/30",
  [JobStatus.Complete]: "bg-green-500/20 text-green-300 border-green-500/30",
  [JobStatus.Paid]: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
};

export default function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center text-[11px] font-semibold px-2 py-0.5 rounded-full border ${STATUS_STYLES[status]}`}
    >
      {formatJobStatus(status)}
    </span>
  );
}

import { DataTable } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import type { JobCard } from "@/types/operations.types";

interface JobCardTableProps {
  rows: JobCard[];
}

export function JobCardTable({ rows }: JobCardTableProps) {
  return (
    <DataTable
      rows={rows}
      rowKey={(row) => row.id}
      columns={[
        { key: "job", header: "Job #", render: (row) => <span className="mono">{row.job_number}</span> },
        { key: "status", header: "Status", render: (row) => <Badge status={row.status} /> },
        { key: "eta", header: "ETA (min)", render: (row) => row.total_estimated_duration_minutes },
        { key: "score", header: "QScore", render: (row) => row.quality_score ?? "-" },
      ]}
    />
  );
}

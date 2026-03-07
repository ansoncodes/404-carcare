import { DataTable } from "@/components/ui/table";
import { currencyINR } from "@/lib/formatters";
import type { RankedAirport } from "@/types/analytics.types";

interface AirportRevenueTableProps {
  rows: RankedAirport[];
}

export function AirportRevenueTable({ rows }: AirportRevenueTableProps) {
  return (
    <DataTable
      rows={rows}
      rowKey={(row) => row.airport_id}
      columns={[
        { key: "rank", header: "Rank", render: (row) => row.rank },
        { key: "airport", header: "Airport", render: (row) => `${row.airport_name} (${row.airport_code})` },
        { key: "bookings", header: "Bookings", render: (row) => row.total_bookings },
        { key: "revenue", header: "Revenue", render: (row) => currencyINR(row.total_revenue) },
      ]}
    />
  );
}

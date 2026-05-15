import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import type { AiReport } from "@/lib/types"

interface ReportListProps {
  reports: AiReport[]
}

const dateFormatter = new Intl.DateTimeFormat("fr-FR", {
  dateStyle: "long",
  timeStyle: "short",
})

/** Renders the user's past AI portfolio analyses. */
export function ReportList({ reports }: ReportListProps) {
  if (reports.length === 0) {
    return (
      <p className="text-muted-foreground rounded-lg border border-dashed p-8 text-center text-sm">
        Aucune analyse pour le moment. Générez-en une pour commencer.
      </p>
    )
  }

  return (
    <div className="grid gap-4">
      {reports.map((report) => (
        <Card key={report.id}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              {dateFormatter.format(new Date(report.created_at))}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm leading-relaxed whitespace-pre-line">
            {report.content}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

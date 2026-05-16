import { ExternalLink } from "lucide-react"

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import type { NewsItem } from "@/lib/market-data"

interface PositionNewsProps {
  news: NewsItem[]
}

const dateFormatter = new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" })

/** Recent news articles about the position's symbol. */
export function PositionNews({ news }: PositionNewsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Actualités</CardTitle>
      </CardHeader>
      <CardContent>
        {news.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            Aucune actualité récente pour ce titre.
          </p>
        ) : (
          <ul className="divide-y">
            {news.map((item) => (
              <li key={item.id} className="py-3 first:pt-0 last:pb-0">
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-start gap-3"
                >
                  <div className="flex-1">
                    <p className="text-sm font-medium group-hover:underline">
                      {item.title}
                    </p>
                    <p className="text-muted-foreground mt-0.5 text-xs">
                      {item.publisher}
                      {item.publishedAt
                        ? ` · ${dateFormatter.format(new Date(item.publishedAt))}`
                        : ""}
                    </p>
                  </div>
                  <ExternalLink className="text-muted-foreground mt-0.5 size-4 shrink-0" />
                </a>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}

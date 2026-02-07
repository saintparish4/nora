import { IconTrendingDown, IconTrendingUp } from "@tabler/icons-react"

import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

type TrendDirection = "up" | "down"

type CardItem = {
  description: string
  value: string
  trendLabel?: string
  trendDirection?: TrendDirection
  subtext?: string
}

export function SectionCards({
  cards,
}: {
  cards?: CardItem[]
}) {
  const items: CardItem[] = cards && cards.length > 0 ? cards : [
    {
      description: "Total Revenue",
      value: "$1,250.00",
      trendLabel: "+12.5%",
      trendDirection: "up",
      subtext: "Visitors for the last 6 months",
    },
    {
      description: "New Customers",
      value: "1,234",
      trendLabel: "-20%",
      trendDirection: "down",
      subtext: "Acquisition needs attention",
    },
    {
      description: "Active Accounts",
      value: "45,678",
      trendLabel: "+12.5%",
      trendDirection: "up",
      subtext: "Engagement exceed targets",
    },
    {
      description: "Growth Rate",
      value: "4.5%",
      trendLabel: "+4.5%",
      trendDirection: "up",
      subtext: "Meets growth projections",
    },
  ]

  return (
    <div className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-1 gap-4 px-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
      {items.map((item, idx) => (
        <Card key={idx} className="@container/card">
          <CardHeader>
            <CardDescription>{item.description}</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
              {item.value}
            </CardTitle>
            {item.trendLabel && (
              <CardAction>
                <Badge variant="outline">
                  {item.trendDirection === "down" ? (
                    <IconTrendingDown />
                  ) : (
                    <IconTrendingUp />
                  )}
                  {item.trendLabel}
                </Badge>
              </CardAction>
            )}
          </CardHeader>
          <CardFooter className="flex-col items-start gap-1.5 text-sm">
            {item.trendLabel && (
              <div className="line-clamp-1 flex gap-2 font-medium">
                {item.trendDirection === "down" ? (
                  <>
                    Down {item.trendLabel} this period <IconTrendingDown className="size-4" />
                  </>
                ) : (
                  <>
                    Trending up {item.trendLabel} <IconTrendingUp className="size-4" />
                  </>
                )}
              </div>
            )}
            {item.subtext && (
              <div className="text-muted-foreground">{item.subtext}</div>
            )}
          </CardFooter>
        </Card>
      ))}
    </div>
  )
}

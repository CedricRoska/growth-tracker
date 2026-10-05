"use client";

import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { formatCompact, formatDate } from "@/lib/format";
import type { SeriesPoint } from "@/lib/periods";

const config = {
  views: { label: "Vues", color: "var(--chart-1)" },
  likes: { label: "Likes", color: "var(--chart-2)" },
} satisfies ChartConfig;

export function ViewsChart({ data, metric = "views" }: { data: SeriesPoint[]; metric?: "views" | "likes" }) {
  return (
    <ChartContainer config={config} className="h-[260px] w-full">
      <AreaChart data={data} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
        <defs>
          <linearGradient id={`fill-${metric}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={`var(--color-${metric})`} stopOpacity={0.35} />
            <stop offset="95%" stopColor={`var(--color-${metric})`} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis
          dataKey="date"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          minTickGap={28}
          tickFormatter={(v: string) => formatDate(v)}
        />
        <YAxis tickLine={false} axisLine={false} width={44} tickFormatter={(v: number) => formatCompact(v)} />
        <ChartTooltip
          cursor={false}
          content={
            <ChartTooltipContent
              labelFormatter={(v) => formatDate(String(v), { weekday: "short", day: "2-digit", month: "long" })}
              formatter={(value, name) => (
                <div className="flex w-full items-center justify-between gap-4">
                  <span className="text-muted-foreground">{config[name as keyof typeof config]?.label ?? name}</span>
                  <span className="font-mono font-medium tabular-nums">{formatCompact(Number(value))}</span>
                </div>
              )}
            />
          }
        />
        <Area dataKey={metric} type="monotone" stroke={`var(--color-${metric})`} strokeWidth={2} fill={`url(#fill-${metric})`} />
      </AreaChart>
    </ChartContainer>
  );
}

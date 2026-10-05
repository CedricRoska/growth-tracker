import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCompact, formatDelta } from "@/lib/format";
import { cn } from "@/lib/utils";

type Props = {
  title: string;
  value: number;
  previous?: number;
  hint?: string;
  format?: (n: number) => string;
  className?: string;
};

export function KpiCard({ title, value, previous, hint, format = formatCompact, className }: Props) {
  const delta = previous != null ? formatDelta(value, previous) : null;
  const trend = previous == null || value === previous ? "flat" : value > previous ? "up" : "down";
  const Icon = trend === "up" ? ArrowUpRight : trend === "down" ? ArrowDownRight : Minus;

  return (
    <Card className={cn("gap-2", className)}>
      <CardHeader className="pb-0">
        <CardDescription>{title}</CardDescription>
        <CardTitle className="text-2xl font-semibold tabular-nums tracking-tight">{format(value)}</CardTitle>
      </CardHeader>
      <CardContent className="flex items-center gap-2 text-xs text-muted-foreground">
        {delta ? (
          <span
            className={cn(
              "inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 font-medium tabular-nums",
              trend === "up" && "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
              trend === "down" && "bg-red-500/10 text-red-600 dark:text-red-400",
              trend === "flat" && "bg-muted",
            )}
          >
            <Icon className="size-3" />
            {delta}
          </span>
        ) : null}
        {hint && <span>{hint}</span>}
      </CardContent>
    </Card>
  );
}

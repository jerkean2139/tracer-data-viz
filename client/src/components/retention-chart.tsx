import { MonthlyMetrics } from '@shared/schema';
import { formatMonthLabel } from '@/lib/analytics';
import { Card } from '@/components/ui/card';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine,
} from 'recharts';

interface RetentionChartProps {
  metrics: MonthlyMetrics[];
  title?: string;
}

export function RetentionChart({ metrics, title = 'Retention Rate' }: RetentionChartProps) {
  const data = metrics.map(m => ({
    month: formatMonthLabel(m.month),
    retention: m.retentionRate,
  }));

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">{title}</h3>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
          <XAxis
            dataKey="month"
            stroke="hsl(var(--muted-foreground))"
            fontSize={12}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            stroke="hsl(var(--muted-foreground))"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            domain={[0, 100]}
            tickFormatter={(value) => `${value}%`}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'hsl(var(--popover))',
              border: '1px solid hsl(var(--popover-border))',
              borderRadius: '6px',
              color: 'hsl(var(--popover-foreground))',
            }}
            formatter={(value: number) => [`${value.toFixed(1)}%`, 'Retention']}
          />
          <Legend />
          <ReferenceLine
            y={95}
            stroke="hsl(var(--muted-foreground))"
            strokeDasharray="3 3"
            label={{ value: '95% Benchmark', position: 'insideTopRight', fill: 'hsl(var(--muted-foreground))' }}
          />
          <Line
            type="monotone"
            dataKey="retention"
            stroke="hsl(var(--chart-2))"
            strokeWidth={2}
            dot={{ fill: 'hsl(var(--chart-2))', r: 4 }}
            activeDot={{ r: 6 }}
            name="Retention Rate"
          />
        </LineChart>
      </ResponsiveContainer>
    </Card>
  );
}

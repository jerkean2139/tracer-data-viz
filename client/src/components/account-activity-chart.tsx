import { MonthlyMetrics } from '@shared/schema';
import { formatMonthLabel } from '@/lib/analytics';
import { Card } from '@/components/ui/card';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

interface AccountActivityChartProps {
  metrics: MonthlyMetrics[];
  title?: string;
}

export function AccountActivityChart({ metrics, title = 'Account Activity' }: AccountActivityChartProps) {
  const data = metrics.map(m => ({
    month: formatMonthLabel(m.month),
    retained: m.retainedAccounts,
    new: m.newAccounts,
    lost: m.lostAccounts,
  }));

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">{title}</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
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
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'hsl(var(--popover))',
              border: '1px solid hsl(var(--popover-border))',
              borderRadius: '6px',
              color: 'hsl(var(--popover-foreground))',
            }}
          />
          <Legend />
          <Bar dataKey="retained" stackId="a" fill="hsl(var(--chart-2))" name="Retained" />
          <Bar dataKey="new" stackId="a" fill="hsl(var(--chart-1))" name="New" />
          <Bar dataKey="lost" stackId="a" fill="hsl(var(--chart-5))" name="Lost" />
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
}

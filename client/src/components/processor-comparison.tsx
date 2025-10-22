import { MonthlyMetrics } from '@shared/schema';
import { formatCurrency, formatPercent } from '@/lib/analytics';
import { Card } from '@/components/ui/card';
import { MetricCard } from '@/components/metric-card';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from 'recharts';

interface ProcessorComparisonProps {
  clearentMetrics: MonthlyMetrics[];
  mlMetrics: MonthlyMetrics[];
  shift4Metrics: MonthlyMetrics[];
}

const PROCESSOR_COLORS = {
  Clearent: 'hsl(var(--chart-1))',
  ML: 'hsl(var(--chart-2))',
  Shift4: 'hsl(var(--chart-3))',
};

export function ProcessorComparison({ clearentMetrics, mlMetrics, shift4Metrics }: ProcessorComparisonProps) {
  const getLatestMetrics = (metrics: MonthlyMetrics[]) => {
    return metrics.length > 0 ? metrics[metrics.length - 1] : null;
  };

  const clearent = getLatestMetrics(clearentMetrics);
  const ml = getLatestMetrics(mlMetrics);
  const shift4 = getLatestMetrics(shift4Metrics);

  const revenueData = [
    { name: 'Clearent', value: clearent?.totalRevenue || 0 },
    { name: 'ML', value: ml?.totalRevenue || 0 },
    { name: 'Shift4', value: shift4?.totalRevenue || 0 },
  ].filter(d => d.value > 0);

  const accountData = [
    { name: 'Clearent', value: clearent?.totalAccounts || 0 },
    { name: 'ML', value: ml?.totalAccounts || 0 },
    { name: 'Shift4', value: shift4?.totalAccounts || 0 },
  ].filter(d => d.value > 0);

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold mb-6">Processor Comparison</h2>
        
        <div className="grid gap-6 md:grid-cols-3">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Clearent</h3>
            {clearent ? (
              <>
                <MetricCard
                  title="Revenue"
                  value={formatCurrency(clearent.totalRevenue)}
                  change={clearent.momRevenueChangePercent}
                  className="bg-chart-1/5 border-chart-1/20"
                />
                <MetricCard
                  title="Active Accounts"
                  value={clearent.totalAccounts.toString()}
                  className="bg-chart-1/5 border-chart-1/20"
                />
                <MetricCard
                  title="Retention Rate"
                  value={formatPercent(clearent.retentionRate)}
                  className="bg-chart-1/5 border-chart-1/20"
                />
                <MetricCard
                  title="Avg Revenue/Account"
                  value={formatCurrency(clearent.revenuePerAccount)}
                  className="bg-chart-1/5 border-chart-1/20"
                />
              </>
            ) : (
              <Card className="p-6 text-center text-muted-foreground">
                No data available
              </Card>
            )}
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold">ML</h3>
            {ml ? (
              <>
                <MetricCard
                  title="Revenue"
                  value={formatCurrency(ml.totalRevenue)}
                  change={ml.momRevenueChangePercent}
                  className="bg-chart-2/5 border-chart-2/20"
                />
                <MetricCard
                  title="Active Accounts"
                  value={ml.totalAccounts.toString()}
                  className="bg-chart-2/5 border-chart-2/20"
                />
                <MetricCard
                  title="Retention Rate"
                  value={formatPercent(ml.retentionRate)}
                  className="bg-chart-2/5 border-chart-2/20"
                />
                <MetricCard
                  title="Avg Revenue/Account"
                  value={formatCurrency(ml.revenuePerAccount)}
                  className="bg-chart-2/5 border-chart-2/20"
                />
              </>
            ) : (
              <Card className="p-6 text-center text-muted-foreground">
                No data available
              </Card>
            )}
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Shift4</h3>
            {shift4 ? (
              <>
                <MetricCard
                  title="Revenue"
                  value={formatCurrency(shift4.totalRevenue)}
                  change={shift4.momRevenueChangePercent}
                  className="bg-chart-3/5 border-chart-3/20"
                />
                <MetricCard
                  title="Active Accounts"
                  value={shift4.totalAccounts.toString()}
                  className="bg-chart-3/5 border-chart-3/20"
                />
                <MetricCard
                  title="Retention Rate"
                  value={formatPercent(shift4.retentionRate)}
                  className="bg-chart-3/5 border-chart-3/20"
                />
                <MetricCard
                  title="Avg Revenue/Account"
                  value={formatCurrency(shift4.revenuePerAccount)}
                  className="bg-chart-3/5 border-chart-3/20"
                />
              </>
            ) : (
              <Card className="p-6 text-center text-muted-foreground">
                No data available
              </Card>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Revenue Distribution</h3>
          {revenueData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={revenueData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {revenueData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={PROCESSOR_COLORS[entry.name as keyof typeof PROCESSOR_COLORS]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--popover))',
                    border: '1px solid hsl(var(--popover-border))',
                    borderRadius: '6px',
                    color: 'hsl(var(--popover-foreground))',
                  }}
                  formatter={(value: number) => formatCurrency(value)}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">
              No revenue data available
            </div>
          )}
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Account Distribution</h3>
          {accountData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={accountData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {accountData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={PROCESSOR_COLORS[entry.name as keyof typeof PROCESSOR_COLORS]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--popover))',
                    border: '1px solid hsl(var(--popover-border))',
                    borderRadius: '6px',
                    color: 'hsl(var(--popover-foreground))',
                  }}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">
              No account data available
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

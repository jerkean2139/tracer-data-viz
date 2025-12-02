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
  tsysMetrics: MonthlyMetrics[];
  micampMetrics: MonthlyMetrics[];
  paybrightMetrics: MonthlyMetrics[];
  trxMetrics: MonthlyMetrics[];
  paymentAdvisorsMetrics: MonthlyMetrics[];
}

const PROCESSOR_COLORS = {
  Clearent: 'hsl(var(--chart-1))',
  ML: 'hsl(var(--chart-2))',
  Shift4: 'hsl(var(--chart-3))',
  TSYS: 'hsl(var(--chart-4))',
  Micamp: 'hsl(var(--chart-5))',
  PayBright: 'hsl(210 70% 50%)',
  TRX: 'hsl(280 65% 60%)',
  'Payment Advisors': 'hsl(160 60% 45%)',
};

export function ProcessorComparison({ 
  clearentMetrics, 
  mlMetrics, 
  shift4Metrics, 
  tsysMetrics, 
  micampMetrics, 
  paybrightMetrics, 
  trxMetrics,
  paymentAdvisorsMetrics
}: ProcessorComparisonProps) {
  const getLatestMetrics = (metrics: MonthlyMetrics[]) => {
    return metrics.length > 0 ? metrics[metrics.length - 1] : null;
  };

  const clearent = getLatestMetrics(clearentMetrics);
  const ml = getLatestMetrics(mlMetrics);
  const shift4 = getLatestMetrics(shift4Metrics);
  const tsys = getLatestMetrics(tsysMetrics);
  const micamp = getLatestMetrics(micampMetrics);
  const paybright = getLatestMetrics(paybrightMetrics);
  const trx = getLatestMetrics(trxMetrics);
  const paymentAdvisors = getLatestMetrics(paymentAdvisorsMetrics);

  const revenueData = [
    { name: 'Clearent', value: clearent?.totalRevenue || 0 },
    { name: 'ML', value: ml?.totalRevenue || 0 },
    { name: 'Shift4', value: shift4?.totalRevenue || 0 },
    { name: 'TSYS', value: tsys?.totalRevenue || 0 },
    { name: 'Micamp', value: micamp?.totalRevenue || 0 },
    { name: 'PayBright', value: paybright?.totalRevenue || 0 },
    { name: 'TRX', value: trx?.totalRevenue || 0 },
    { name: 'Payment Advisors', value: paymentAdvisors?.totalRevenue || 0 },
  ].filter(d => d.value > 0);

  const accountData = [
    { name: 'Clearent', value: clearent?.totalAccounts || 0 },
    { name: 'ML', value: ml?.totalAccounts || 0 },
    { name: 'Shift4', value: shift4?.totalAccounts || 0 },
    { name: 'TSYS', value: tsys?.totalAccounts || 0 },
    { name: 'Micamp', value: micamp?.totalAccounts || 0 },
    { name: 'PayBright', value: paybright?.totalAccounts || 0 },
    { name: 'TRX', value: trx?.totalAccounts || 0 },
    { name: 'Payment Advisors', value: paymentAdvisors?.totalAccounts || 0 },
  ].filter(d => d.value > 0);

  const renderProcessorColumn = (
    name: string, 
    metrics: MonthlyMetrics | null, 
    token: string
  ) => (
    <div className="space-y-4" key={name}>
      <h3 className="text-lg font-semibold">{name}</h3>
      {metrics ? (
        <>
          <MetricCard
            title="Revenue"
            value={formatCurrency(metrics.totalRevenue)}
            change={metrics.momRevenueChangePercent}
            className={`bg-${token}/5 border-${token}/20`}
          />
          <MetricCard
            title="Active Accounts"
            value={metrics.totalAccounts.toString()}
            className={`bg-${token}/5 border-${token}/20`}
          />
          <MetricCard
            title="Retention Rate"
            value={formatPercent(metrics.retentionRate)}
            className={`bg-${token}/5 border-${token}/20`}
          />
          <MetricCard
            title="Avg Revenue/Account"
            value={formatCurrency(metrics.revenuePerAccount)}
            className={`bg-${token}/5 border-${token}/20`}
          />
        </>
      ) : (
        <Card className="p-6 text-center text-muted-foreground">
          No data available
        </Card>
      )}
    </div>
  );

  const processors = [
    { name: 'Clearent', metrics: clearent, token: 'chart-1' },
    { name: 'ML', metrics: ml, token: 'chart-2' },
    { name: 'Shift4', metrics: shift4, token: 'chart-3' },
    { name: 'TSYS', metrics: tsys, token: 'chart-4' },
    { name: 'Micamp', metrics: micamp, token: 'chart-5' },
    { name: 'PayBright', metrics: paybright, token: 'primary' },
    { name: 'TRX', metrics: trx, token: 'secondary' },
    { name: 'Payment Advisors', metrics: paymentAdvisors, token: 'accent' },
  ].filter(p => p.metrics);

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold mb-6">Processor Comparison</h2>
        
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {processors.map(p => renderProcessorColumn(p.name, p.metrics, p.token))}
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

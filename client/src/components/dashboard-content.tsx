import { MonthlyMetrics, TopMerchant, Processor } from '@shared/schema';
import { formatCurrency, formatPercent } from '@/lib/analytics';
import { MetricCard } from '@/components/metric-card';
import { RevenueChart } from '@/components/revenue-chart';
import { AccountActivityChart } from '@/components/account-activity-chart';
import { RetentionChart } from '@/components/retention-chart';
import { TopMerchantsTable } from '@/components/top-merchants-table';
import { DollarSign, Users, TrendingUp, Target } from 'lucide-react';

interface DashboardContentProps {
  metrics: MonthlyMetrics[];
  topMerchants: TopMerchant[];
  processor: Processor;
}

export function DashboardContent({ metrics, topMerchants, processor }: DashboardContentProps) {
  const latestMetrics = metrics.length > 0 ? metrics[metrics.length - 1] : null;

  if (!latestMetrics) {
    return (
      <div className="flex items-center justify-center h-[400px] text-muted-foreground">
        <div className="text-center">
          <p className="text-lg font-medium mb-2">No data available</p>
          <p className="text-sm">Upload CSV files to see analytics for {processor}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Total Revenue"
          value={formatCurrency(latestMetrics.totalRevenue)}
          change={latestMetrics.momRevenueChangePercent}
          changeLabel="vs last month"
          icon={<DollarSign className="w-5 h-5" />}
        />
        <MetricCard
          title="Active Accounts"
          value={latestMetrics.totalAccounts.toString()}
          change={latestMetrics.netAccountGrowth > 0 ? (latestMetrics.netAccountGrowth / latestMetrics.totalAccounts) * 100 : undefined}
          changeLabel={`${latestMetrics.netAccountGrowth > 0 ? '+' : ''}${latestMetrics.netAccountGrowth} net`}
          icon={<Users className="w-5 h-5" />}
        />
        <MetricCard
          title="Retention Rate"
          value={formatPercent(latestMetrics.retentionRate)}
          icon={<Target className="w-5 h-5" />}
        />
        <MetricCard
          title="Revenue/Account"
          value={formatCurrency(latestMetrics.revenuePerAccount)}
          icon={<TrendingUp className="w-5 h-5" />}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <RevenueChart metrics={metrics} />
        <AccountActivityChart metrics={metrics} />
      </div>

      <RetentionChart metrics={metrics} />

      <TopMerchantsTable merchants={topMerchants} />
    </div>
  );
}

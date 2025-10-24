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
  currentMonth?: string | null;
}

export function DashboardContent({ metrics, topMerchants, processor, currentMonth }: DashboardContentProps) {
  // Calculate aggregated metrics across the entire filtered range
  const displayMetrics = metrics.length > 0 ? {
    month: currentMonth || metrics[metrics.length - 1]?.month || '',
    processor: metrics[0].processor,
    totalRevenue: metrics.reduce((sum, m) => sum + m.totalRevenue, 0),
    totalAccounts: metrics[metrics.length - 1]?.totalAccounts || 0, // Latest month's account count
    retainedAccounts: metrics.reduce((sum, m) => sum + m.retainedAccounts, 0),
    lostAccounts: metrics.reduce((sum, m) => sum + m.lostAccounts, 0),
    newAccounts: metrics.reduce((sum, m) => sum + m.newAccounts, 0),
    retentionRate: metrics.length > 0 
      ? metrics.reduce((sum, m) => sum + m.retentionRate, 0) / metrics.length 
      : 0,
    attritionRate: metrics.length > 0
      ? metrics.reduce((sum, m) => sum + m.attritionRate, 0) / metrics.length
      : 0,
    revenuePerAccount: metrics.length > 0
      ? metrics.reduce((sum, m) => sum + m.totalRevenue, 0) / (metrics[metrics.length - 1]?.totalAccounts || 1)
      : 0,
    momRevenueChange: metrics.length >= 2
      ? metrics[metrics.length - 1].totalRevenue - metrics[metrics.length - 2].totalRevenue
      : 0,
    momRevenueChangePercent: metrics.length >= 2 && metrics[metrics.length - 2].totalRevenue > 0
      ? ((metrics[metrics.length - 1].totalRevenue - metrics[metrics.length - 2].totalRevenue) / metrics[metrics.length - 2].totalRevenue) * 100
      : 0,
    netAccountGrowth: metrics.reduce((sum, m) => sum + m.netAccountGrowth, 0),
  } : null;

  if (!displayMetrics) {
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
          value={formatCurrency(displayMetrics.totalRevenue)}
          change={displayMetrics.momRevenueChangePercent}
          changeLabel="vs last month"
          icon={<DollarSign className="w-5 h-5" />}
        />
        <MetricCard
          title="Active Accounts"
          value={displayMetrics.totalAccounts.toString()}
          change={displayMetrics.netAccountGrowth > 0 ? (displayMetrics.netAccountGrowth / displayMetrics.totalAccounts) * 100 : undefined}
          changeLabel={`${displayMetrics.netAccountGrowth > 0 ? '+' : ''}${displayMetrics.netAccountGrowth} net`}
          icon={<Users className="w-5 h-5" />}
        />
        <MetricCard
          title="Retention Rate"
          value={formatPercent(displayMetrics.retentionRate)}
          icon={<Target className="w-5 h-5" />}
        />
        <MetricCard
          title="Revenue/Account"
          value={formatCurrency(displayMetrics.revenuePerAccount)}
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

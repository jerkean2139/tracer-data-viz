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
  // Show the latest month's metrics in cards (which is the end of the filtered range)
  const displayMetrics = currentMonth
    ? metrics.find(m => m.month === currentMonth)
    : metrics.length > 0 ? metrics[metrics.length - 1] : null;

  // Debug logging
  console.log(`[${processor}] Metrics months:`, metrics.map(m => m.month));
  console.log(`[${processor}] Current month:`, currentMonth);
  console.log(`[${processor}] Display metrics month:`, displayMetrics?.month);

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

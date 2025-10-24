import { MonthlyMetrics, TopMerchant, Processor, MerchantRecord } from '@shared/schema';
import { formatCurrency, formatPercent, getMerchantChanges, calculateRevenueConcentration } from '@/lib/analytics';
import { MetricCard } from '@/components/metric-card';
import { RevenueChart } from '@/components/revenue-chart';
import { AccountActivityChart } from '@/components/account-activity-chart';
import { RetentionChart } from '@/components/retention-chart';
import { TopMerchantsTable } from '@/components/top-merchants-table';
import { MerchantChangesPanel } from '@/components/merchant-changes-panel';
import { BranchPerformanceTable } from '@/components/branch-performance-table';
import { TrendingMerchants } from '@/components/trending-merchants';
import { AtRiskMerchants } from '@/components/at-risk-merchants';
import { RevenueForecast } from '@/components/revenue-forecast';
import { DollarSign, Users, TrendingUp, Target, AlertTriangle } from 'lucide-react';

interface DashboardContentProps {
  metrics: MonthlyMetrics[];
  topMerchants: TopMerchant[];
  processor: Processor;
  currentMonth?: string | null;
  filteredRecords: MerchantRecord[];
}

export function DashboardContent({ metrics, topMerchants, processor, currentMonth, filteredRecords }: DashboardContentProps) {
  // Debug: Log what months are in the metrics array
  console.log(`[${processor}] Received metrics for months:`, metrics.map(m => `${m.month}: $${m.totalRevenue}`));
  console.log(`[${processor}] Current month:`, currentMonth);
  
  // Calculate merchant changes
  const merchantChanges = getMerchantChanges(filteredRecords, processor);
  
  // Calculate revenue concentration
  const concentration = calculateRevenueConcentration(filteredRecords, currentMonth || undefined);
  
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
    totalAgentNet: metrics.reduce((sum, m) => sum + m.totalAgentNet, 0),
    agentNetPerAccount: metrics.length > 0
      ? metrics.reduce((sum, m) => sum + m.totalAgentNet, 0) / (metrics[metrics.length - 1]?.totalAccounts || 1)
      : 0,
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
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
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
          title="Top 10 Concentration"
          value={formatPercent(concentration.concentrationPercent, 0)}
          subtitle="Risk Level"
          subtitleValue={concentration.riskLevel.toUpperCase()}
          icon={<AlertTriangle className="w-5 h-5" />}
          className={
            concentration.riskLevel === 'high' ? 'border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/30' :
            concentration.riskLevel === 'medium' ? 'border-yellow-200 dark:border-yellow-900 bg-yellow-50 dark:bg-yellow-950/30' :
            'border-green-200 dark:border-green-900 bg-green-50 dark:bg-green-950/30'
          }
        />
        <MetricCard
          title="Agent Net Revenue"
          value={formatCurrency(displayMetrics.totalAgentNet)}
          icon={<TrendingUp className="w-5 h-5" />}
          subtitle="Avg per Account"
          subtitleValue={formatCurrency(displayMetrics.agentNetPerAccount)}
        />
      </div>

      <AtRiskMerchants records={filteredRecords} currentMonth={currentMonth} />

      <div className="grid gap-6 lg:grid-cols-2">
        <RevenueChart metrics={metrics} />
        <AccountActivityChart metrics={metrics} />
      </div>

      <RetentionChart metrics={metrics} />

      <RevenueForecast metrics={metrics} />

      <TrendingMerchants records={filteredRecords} currentMonth={currentMonth} />

      <BranchPerformanceTable records={filteredRecords} currentMonth={currentMonth} />

      <MerchantChangesPanel changes={merchantChanges} />

      <TopMerchantsTable merchants={topMerchants} />
    </div>
  );
}

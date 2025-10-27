import { MonthlyMetrics, Processor } from '@shared/schema';
import { formatCurrency, formatPercent, formatMonthLabel } from '@/lib/analytics';
import { TrendingUp, TrendingDown, Users, DollarSign, Activity, UserCheck } from 'lucide-react';
import c2LogoUrl from '@assets/C2 Financial Services ORIGINAL (1)_1761538780950.png';

interface ReportTemplateProps {
  metrics: MonthlyMetrics | undefined;
  processor: Processor;
  monthLabel: string;
  partnerName: string;
  partnerLogoUrl: string;
}

export function ReportTemplate({ metrics, processor, monthLabel, partnerName, partnerLogoUrl }: ReportTemplateProps) {
  if (!metrics) {
    return (
      <div className="w-[8.5in] h-[11in] bg-white p-12 flex items-center justify-center overflow-hidden">
        <p className="text-gray-500 text-xl">No data available for selected period</p>
      </div>
    );
  }

  const isPositive = (value: number) => value >= 0;

  return (
    <div id="pdf-report-template" className="w-[8.5in] h-[11in] bg-white p-4 font-sans overflow-hidden" data-testid="report-template">
      {/* Header Section with Partner Logo */}
      <div className="border-b-4 border-[#1A3A52] pb-4 mb-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            {partnerLogoUrl && (
              <div className="mb-4">
                <img 
                  src={partnerLogoUrl} 
                  alt="Partner logo" 
                  className="h-16 object-contain"
                  data-testid="img-partner-logo"
                />
              </div>
            )}
            {partnerName && (
              <h2 className="text-2xl font-semibold text-[#1A3A52] mb-2" data-testid="text-partner-name">
                {partnerName}
              </h2>
            )}
          </div>
          <div className="text-right">
            <img 
              src={c2LogoUrl} 
              alt="C2 Financial Services" 
              className="h-12 mb-2 object-contain"
              data-testid="img-tracer-logo"
            />
          </div>
        </div>
      </div>

      {/* Report Title */}
      <div className="mb-4">
        <h1 className="text-3xl font-bold text-[#1A3A52] mb-2" data-testid="heading-report-title">
          Merchant Analytics Report
        </h1>
        <div className="flex items-center gap-6 text-base text-gray-600">
          <span data-testid="text-reporting-period">
            <strong>Period:</strong> {monthLabel}
          </span>
          <span data-testid="text-processor">
            <strong>Processor:</strong> {processor}
          </span>
        </div>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {/* Total Revenue */}
        <div className="bg-gradient-to-br from-[#1A3A52] to-[#2a5a7a] text-white p-4 rounded-lg shadow-lg" data-testid="card-total-revenue">
          <div className="flex items-center gap-2 mb-2">
            <div className="bg-white/20 p-2 rounded-lg">
              <DollarSign className="w-5 h-5" />
            </div>
            <h3 className="text-xs font-medium opacity-90">Total Revenue</h3>
          </div>
          <div className="text-2xl font-bold" data-testid="value-total-revenue">
            {formatCurrency(metrics.totalRevenue)}
          </div>
        </div>

        {/* Active Accounts */}
        <div className="bg-gradient-to-br from-[#7FA848] to-[#9fc858] text-white p-4 rounded-lg shadow-lg" data-testid="card-total-accounts">
          <div className="flex items-center gap-2 mb-2">
            <div className="bg-white/20 p-2 rounded-lg">
              <Users className="w-5 h-5" />
            </div>
            <h3 className="text-xs font-medium opacity-90">Active Accounts</h3>
          </div>
          <div className="text-2xl font-bold" data-testid="value-total-accounts">
            {metrics.totalAccounts.toLocaleString()}
          </div>
        </div>

        {/* Retention Rate */}
        <div className="bg-gradient-to-br from-[#9F7AEA] to-[#b399f0] text-white p-4 rounded-lg shadow-lg" data-testid="card-retention-rate">
          <div className="flex items-center gap-2 mb-2">
            <div className="bg-white/20 p-2 rounded-lg">
              <UserCheck className="w-5 h-5" />
            </div>
            <h3 className="text-xs font-medium opacity-90">Retention Rate</h3>
          </div>
          <div className="text-2xl font-bold" data-testid="value-retention-rate">
            {formatPercent(metrics.retentionRate)}
          </div>
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="mb-6">
        <h2 className="text-xl font-bold text-[#1A3A52] mb-3 border-b-2 border-[#7FA848] pb-2">
          Performance Metrics
        </h2>
        <div className="grid grid-cols-2 gap-4">
          {/* Revenue per Account */}
          <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-xs font-semibold text-gray-700">Revenue per Account</h3>
              <Activity className="w-4 h-4 text-[#1A3A52]" />
            </div>
            <div className="text-xl font-bold text-[#1A3A52]" data-testid="value-revenue-per-account">
              {formatCurrency(metrics.revenuePerAccount)}
            </div>
          </div>

          {/* MoM Revenue Growth */}
          <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-xs font-semibold text-gray-700">MoM Revenue Growth</h3>
              {isPositive(metrics.momRevenueChange || 0) ? (
                <TrendingUp className="w-4 h-4 text-green-600" />
              ) : (
                <TrendingDown className="w-4 h-4 text-red-600" />
              )}
            </div>
            <div className={`text-xl font-bold ${isPositive(metrics.momRevenueChange || 0) ? 'text-green-600' : 'text-red-600'}`} data-testid="value-mom-revenue">
              {metrics.momRevenueChange ? formatCurrency(metrics.momRevenueChange) : 'N/A'}
            </div>
            {metrics.momRevenueChangePercent !== undefined && (
              <div className="text-xs text-gray-600 mt-1">
                {formatPercent(metrics.momRevenueChangePercent)}
              </div>
            )}
          </div>

          {/* Retained Accounts */}
          <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-xs font-semibold text-gray-700">Retained Accounts</h3>
              <UserCheck className="w-4 h-4 text-[#7FA848]" />
            </div>
            <div className="text-xl font-bold text-[#1A3A52]" data-testid="value-retained-accounts">
              {metrics.retainedAccounts.toLocaleString()}
            </div>
          </div>

          {/* New Accounts */}
          <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-xs font-semibold text-gray-700">New Accounts</h3>
              <Users className="w-4 h-4 text-[#7FA848]" />
            </div>
            <div className="text-xl font-bold text-[#1A3A52]" data-testid="value-new-accounts">
              {metrics.newAccounts.toLocaleString()}
            </div>
          </div>

          {/* Lost Accounts */}
          <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-xs font-semibold text-gray-700">Lost Accounts</h3>
              <Users className="w-4 h-4 text-red-600" />
            </div>
            <div className="text-xl font-bold text-red-600" data-testid="value-lost-accounts">
              {metrics.lostAccounts.toLocaleString()}
            </div>
          </div>

          {/* Net Account Growth */}
          <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-xs font-semibold text-gray-700">Net Account Growth</h3>
              {isPositive(metrics.netAccountGrowth) ? (
                <TrendingUp className="w-4 h-4 text-green-600" />
              ) : (
                <TrendingDown className="w-4 h-4 text-red-600" />
              )}
            </div>
            <div className={`text-xl font-bold ${isPositive(metrics.netAccountGrowth) ? 'text-green-600' : 'text-red-600'}`} data-testid="value-net-growth">
              {metrics.netAccountGrowth > 0 ? '+' : ''}{metrics.netAccountGrowth.toLocaleString()}
            </div>
          </div>
        </div>
      </div>

      {/* Attrition Analysis */}
      <div className="mb-6">
        <h2 className="text-xl font-bold text-[#1A3A52] mb-3 border-b-2 border-[#7FA848] pb-2">
          Attrition Analysis
        </h2>
        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h3 className="text-xs font-semibold text-gray-700 mb-2">Attrition Rate</h3>
              <div className="text-2xl font-bold text-red-600" data-testid="value-attrition-rate">
                {formatPercent(metrics.attritionRate)}
              </div>
            </div>
            <div>
              <h3 className="text-xs font-semibold text-gray-700 mb-2">Retention Rate</h3>
              <div className="text-2xl font-bold text-[#7FA848]" data-testid="value-retention-rate-summary">
                {formatPercent(metrics.retentionRate)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer with Powered By */}
      <div className="absolute bottom-4 left-4 right-4 pt-4 border-t border-gray-300">
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600">
            <p>Report generated on {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
          </div>
          <div>
            <img 
              src={c2LogoUrl} 
              alt="C2 Financial Services" 
              className="h-6 object-contain"
              data-testid="img-powered-by"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

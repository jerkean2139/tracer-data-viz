import { MonthlyMetrics, Processor } from '@shared/schema';
import { formatCurrency, formatPercent, formatMonthLabel } from '@/lib/analytics';
import { TrendingUp, TrendingDown, Users, DollarSign, Activity, UserCheck } from 'lucide-react';

interface ReportTemplateProps {
  metrics: MonthlyMetrics | undefined;
  processor: Processor;
  month: string;
  partnerName: string;
  partnerLogoUrl: string;
  hideRevenue?: boolean;
}

export function ReportTemplate({ metrics, processor, month, partnerName, partnerLogoUrl, hideRevenue = false }: ReportTemplateProps) {
  if (!metrics) {
    return (
      <div className="w-[210mm] min-h-[297mm] bg-white p-12 flex items-center justify-center">
        <p className="text-gray-500 text-xl">No data available for selected period</p>
      </div>
    );
  }

  const tracerLogoSvg = `data:image/svg+xml,${encodeURIComponent(`
    <svg width="200" height="60" xmlns="http://www.w3.org/2000/svg">
      <text x="10" y="35" font-family="Inter, sans-serif" font-size="28" font-weight="700" fill="#1A3A52">TRACER</text>
      <text x="130" y="35" font-family="Inter, sans-serif" font-size="28" font-weight="700" fill="#7FA848">C2</text>
      <text x="165" y="35" font-family="Inter, sans-serif" font-size="20" font-weight="400" fill="#1A3A52">FS</text>
    </svg>
  `)}`;

  const poweredByLogoSvg = `data:image/svg+xml,${encodeURIComponent(`
    <svg width="150" height="30" xmlns="http://www.w3.org/2000/svg">
      <text x="5" y="20" font-family="Inter, sans-serif" font-size="12" font-weight="400" fill="#666">Powered by</text>
      <text x="75" y="20" font-family="Inter, sans-serif" font-size="14" font-weight="600" fill="#1A3A52">TRACER C2</text>
    </svg>
  `)}`;

  const isPositive = (value: number) => value >= 0;

  return (
    <div id="pdf-report-template" className="w-[210mm] min-h-[297mm] bg-white p-12 font-sans" data-testid="report-template">
      {/* Header Section with Partner Logo */}
      <div className="border-b-4 border-[#1A3A52] pb-6 mb-8">
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
              src={tracerLogoSvg} 
              alt="TRACER C2 FS" 
              className="h-12 mb-2"
              data-testid="img-tracer-logo"
            />
          </div>
        </div>
      </div>

      {/* Report Title */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-[#1A3A52] mb-2" data-testid="heading-report-title">
          Merchant Analytics Report
        </h1>
        <div className="flex items-center gap-6 text-lg text-gray-600">
          <span data-testid="text-reporting-period">
            <strong>Period:</strong> {formatMonthLabel(month)}
          </span>
          <span data-testid="text-processor">
            <strong>Processor:</strong> {processor}
          </span>
        </div>
      </div>

      {/* Key Metrics Grid */}
      <div className={`grid gap-6 mb-10 ${hideRevenue ? 'grid-cols-2' : 'grid-cols-3'}`}>
        {/* Total Revenue - Hidden for non-admin users */}
        {!hideRevenue && (
          <div className="bg-gradient-to-br from-[#1A3A52] to-[#2a5a7a] text-white p-6 rounded-lg shadow-lg" data-testid="card-total-revenue">
            <div className="flex items-center gap-3 mb-3">
              <div className="bg-white/20 p-3 rounded-lg">
                <DollarSign className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-medium opacity-90">Total Revenue</h3>
            </div>
            <div className="text-3xl font-bold" data-testid="value-total-revenue">
              {formatCurrency(metrics.totalRevenue)}
            </div>
          </div>
        )}

        {/* Active Accounts */}
        <div className="bg-gradient-to-br from-[#7FA848] to-[#9fc858] text-white p-6 rounded-lg shadow-lg" data-testid="card-total-accounts">
          <div className="flex items-center gap-3 mb-3">
            <div className="bg-white/20 p-3 rounded-lg">
              <Users className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-medium opacity-90">Active Accounts</h3>
          </div>
          <div className="text-3xl font-bold" data-testid="value-total-accounts">
            {metrics.totalAccounts.toLocaleString()}
          </div>
        </div>

        {/* Retention Rate */}
        <div className="bg-gradient-to-br from-[#9F7AEA] to-[#b399f0] text-white p-6 rounded-lg shadow-lg" data-testid="card-retention-rate">
          <div className="flex items-center gap-3 mb-3">
            <div className="bg-white/20 p-3 rounded-lg">
              <UserCheck className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-medium opacity-90">Retention Rate</h3>
          </div>
          <div className="text-3xl font-bold" data-testid="value-retention-rate">
            {formatPercent(metrics.retentionRate)}
          </div>
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="mb-10">
        <h2 className="text-2xl font-bold text-[#1A3A52] mb-6 border-b-2 border-[#7FA848] pb-2">
          Performance Metrics
        </h2>
        <div className="grid grid-cols-2 gap-6">
          {/* Revenue per Account - Hidden for non-admin users */}
          {!hideRevenue && (
            <div className="bg-gray-50 p-5 rounded-lg border border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-gray-700">Revenue per Account</h3>
                <Activity className="w-5 h-5 text-[#1A3A52]" />
              </div>
              <div className="text-2xl font-bold text-[#1A3A52]" data-testid="value-revenue-per-account">
                {formatCurrency(metrics.revenuePerAccount)}
              </div>
            </div>
          )}

          {/* MoM Revenue Growth - Hidden for non-admin users */}
          {!hideRevenue && (
            <div className="bg-gray-50 p-5 rounded-lg border border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-gray-700">MoM Revenue Growth</h3>
                {isPositive(metrics.momRevenueChange || 0) ? (
                  <TrendingUp className="w-5 h-5 text-green-600" />
                ) : (
                  <TrendingDown className="w-5 h-5 text-red-600" />
                )}
              </div>
              <div className={`text-2xl font-bold ${isPositive(metrics.momRevenueChange || 0) ? 'text-green-600' : 'text-red-600'}`} data-testid="value-mom-revenue">
                {metrics.momRevenueChange ? formatCurrency(metrics.momRevenueChange) : 'N/A'}
              </div>
              {metrics.momRevenueChangePercent !== undefined && (
                <div className="text-sm text-gray-600 mt-1">
                  {formatPercent(metrics.momRevenueChangePercent)}
                </div>
              )}
            </div>
          )}

          {/* Retained Accounts */}
          <div className="bg-gray-50 p-5 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-gray-700">Retained Accounts</h3>
              <UserCheck className="w-5 h-5 text-[#7FA848]" />
            </div>
            <div className="text-2xl font-bold text-[#1A3A52]" data-testid="value-retained-accounts">
              {metrics.retainedAccounts.toLocaleString()}
            </div>
          </div>

          {/* New Accounts */}
          <div className="bg-gray-50 p-5 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-gray-700">New Accounts</h3>
              <Users className="w-5 h-5 text-[#7FA848]" />
            </div>
            <div className="text-2xl font-bold text-[#1A3A52]" data-testid="value-new-accounts">
              {metrics.newAccounts.toLocaleString()}
            </div>
          </div>

          {/* Lost Accounts */}
          <div className="bg-gray-50 p-5 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-gray-700">Lost Accounts</h3>
              <Users className="w-5 h-5 text-red-600" />
            </div>
            <div className="text-2xl font-bold text-red-600" data-testid="value-lost-accounts">
              {metrics.lostAccounts.toLocaleString()}
            </div>
          </div>

          {/* Net Account Growth */}
          <div className="bg-gray-50 p-5 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-gray-700">Net Account Growth</h3>
              {isPositive(metrics.netAccountGrowth) ? (
                <TrendingUp className="w-5 h-5 text-green-600" />
              ) : (
                <TrendingDown className="w-5 h-5 text-red-600" />
              )}
            </div>
            <div className={`text-2xl font-bold ${isPositive(metrics.netAccountGrowth) ? 'text-green-600' : 'text-red-600'}`} data-testid="value-net-growth">
              {metrics.netAccountGrowth > 0 ? '+' : ''}{metrics.netAccountGrowth.toLocaleString()}
            </div>
          </div>
        </div>
      </div>

      {/* Attrition Analysis */}
      <div className="mb-10">
        <h2 className="text-2xl font-bold text-[#1A3A52] mb-6 border-b-2 border-[#7FA848] pb-2">
          Attrition Analysis
        </h2>
        <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
          <div className="grid grid-cols-2 gap-8">
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Attrition Rate</h3>
              <div className="text-3xl font-bold text-red-600" data-testid="value-attrition-rate">
                {formatPercent(metrics.attritionRate)}
              </div>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Retention Rate</h3>
              <div className="text-3xl font-bold text-[#7FA848]" data-testid="value-retention-rate-summary">
                {formatPercent(metrics.retentionRate)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer with Powered By */}
      <div className="absolute bottom-12 left-12 right-12 pt-6 border-t border-gray-300">
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600">
            <p>Report generated on {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
          </div>
          <div>
            <img 
              src={poweredByLogoSvg} 
              alt="Powered by TRACER C2" 
              className="h-6"
              data-testid="img-powered-by"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

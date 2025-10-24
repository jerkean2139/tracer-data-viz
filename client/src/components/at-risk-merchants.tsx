import { MerchantRecord } from '@shared/schema';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { formatCurrency, formatPercent, getRevenue } from '@/lib/analytics';
import { AlertTriangle, TrendingDown, HelpCircle } from 'lucide-react';

interface AtRiskMerchant {
  merchantId: string;
  merchantName: string;
  currentRevenue: number;
  previousRevenue: number;
  declinePercent: number;
  consecutiveDeclines: number;
  riskLevel: 'critical' | 'high' | 'medium';
}

interface AtRiskMerchantsProps {
  records: MerchantRecord[];
  currentMonth?: string | null;
  limit?: number;
}

export function AtRiskMerchants({ records, currentMonth, limit = 10 }: AtRiskMerchantsProps) {
  const allMonths = Array.from(new Set(records.map(r => r.month))).sort();
  const monthIndex = currentMonth ? allMonths.indexOf(currentMonth) : allMonths.length - 1;
  
  if (monthIndex < 1) return null; // Need at least 2 months
  
  const month = allMonths[monthIndex];
  const prevMonth = allMonths[monthIndex - 1];
  const twoMonthsAgo = monthIndex >= 2 ? allMonths[monthIndex - 2] : null;
  
  // Get revenue by merchant for current and previous months
  const revenueByMonth = new Map<string, Map<string, { name: string; revenue: number }>>();
  
  [twoMonthsAgo, prevMonth, month].filter(Boolean).forEach(m => {
    const monthData = new Map<string, { name: string; revenue: number }>();
    records.filter(r => r.month === m).forEach(record => {
      const revenue = getRevenue(record);
      const existing = monthData.get(record.merchantId);
      if (existing) {
        existing.revenue += revenue;
      } else {
        monthData.set(record.merchantId, {
          name: record.merchantName,
          revenue
        });
      }
    });
    revenueByMonth.set(m!, monthData);
  });
  
  const currentData = revenueByMonth.get(month)!;
  const prevData = revenueByMonth.get(prevMonth)!;
  const twoMonthsAgoData = twoMonthsAgo ? revenueByMonth.get(twoMonthsAgo) : null;
  
  // Identify at-risk merchants
  // CRITICAL: Union current and previous month merchants to catch 100% churn (merchants who disappeared)
  const allMerchantIds = new Set([
    ...Array.from(currentData.keys()),
    ...Array.from(prevData.keys())
  ]);
  
  const atRisk: AtRiskMerchant[] = [];
  
  allMerchantIds.forEach(merchantId => {
    const prevRevenue = prevData.get(merchantId)?.revenue;
    if (!prevRevenue || prevRevenue === 0) return; // Skip if no baseline
    
    const currentRevenue = currentData.get(merchantId)?.revenue || 0; // Treat missing as $0 (churn)
    const merchantName = currentData.get(merchantId)?.name || prevData.get(merchantId)?.name || 'Unknown';
    
    const declinePercent = ((currentRevenue - prevRevenue) / prevRevenue) * 100;
    
    // Only flag if declining
    if (declinePercent >= -5) return;
    
    // Check for consecutive declines
    let consecutiveDeclines = 1;
    if (twoMonthsAgoData) {
      const twoMonthsAgoRevenue = twoMonthsAgoData.get(merchantId)?.revenue;
      if (twoMonthsAgoRevenue && prevRevenue < twoMonthsAgoRevenue) {
        consecutiveDeclines = 2;
      }
    }
    
    // Determine risk level
    let riskLevel: 'critical' | 'high' | 'medium';
    if (declinePercent <= -50 || (consecutiveDeclines >= 2 && declinePercent <= -20)) {
      riskLevel = 'critical';
    } else if (declinePercent <= -25 || consecutiveDeclines >= 2) {
      riskLevel = 'high';
    } else {
      riskLevel = 'medium';
    }
    
    atRisk.push({
      merchantId,
      merchantName,
      currentRevenue,
      previousRevenue: prevRevenue,
      declinePercent,
      consecutiveDeclines,
      riskLevel
    });
  });
  
  // Sort by risk level (critical first) then by decline percent
  const riskPriority = { critical: 0, high: 1, medium: 2 };
  atRisk.sort((a, b) => {
    if (a.riskLevel !== b.riskLevel) {
      return riskPriority[a.riskLevel] - riskPriority[b.riskLevel];
    }
    return a.declinePercent - b.declinePercent;
  });
  
  const topAtRisk = atRisk.slice(0, limit);
  
  if (topAtRisk.length === 0) {
    return null;
  }
  
  const criticalCount = atRisk.filter(m => m.riskLevel === 'critical').length;
  const highCount = atRisk.filter(m => m.riskLevel === 'high').length;

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            <h3 className="text-lg font-semibold">At-Risk Merchants</h3>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className="inline-flex"
                  data-testid="help-at-risk-merchants"
                  aria-label="Help: At-Risk Merchants"
                >
                  <HelpCircle className="w-4 h-4 text-muted-foreground/50 hover:text-muted-foreground cursor-help" />
                </button>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p>Merchants with declining revenue month-over-month. CRITICAL: {'>'}50% drop or 2+ consecutive months with {'>'}20% drop. HIGH: {'>'}25% drop or 2+ consecutive declines. MEDIUM: {'>'}5% drop. Includes merchants who churned completely (100% revenue loss).</p>
              </TooltipContent>
            </Tooltip>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {atRisk.length} merchant{atRisk.length !== 1 ? 's' : ''} with declining revenue
          </p>
        </div>
        <div className="flex gap-2">
          {criticalCount > 0 && (
            <Badge variant="destructive" data-testid="badge-critical-count">
              {criticalCount} Critical
            </Badge>
          )}
          {highCount > 0 && (
            <Badge variant="secondary" className="bg-orange-100 dark:bg-orange-950 text-orange-700 dark:text-orange-300" data-testid="badge-high-count">
              {highCount} High
            </Badge>
          )}
        </div>
      </div>

      {criticalCount > 0 && (
        <Alert variant="destructive" className="mb-4">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {criticalCount} merchant{criticalCount !== 1 ? 's' : ''} require{criticalCount === 1 ? 's' : ''} immediate attention due to severe revenue decline
          </AlertDescription>
        </Alert>
      )}

      <div className="space-y-3">
        {topAtRisk.map((merchant) => (
          <div
            key={merchant.merchantId}
            className={`flex items-start justify-between p-4 rounded-lg border ${
              merchant.riskLevel === 'critical' 
                ? 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-900'
                : merchant.riskLevel === 'high'
                ? 'bg-orange-50 dark:bg-orange-950/30 border-orange-200 dark:border-orange-900'
                : 'bg-yellow-50 dark:bg-yellow-950/30 border-yellow-200 dark:border-yellow-900'
            }`}
            data-testid={`at-risk-${merchant.merchantId}`}
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <p className="font-medium truncate">{merchant.merchantName}</p>
                <Badge 
                  variant={merchant.riskLevel === 'critical' ? 'destructive' : 'secondary'}
                  className={
                    merchant.riskLevel === 'high'
                      ? 'bg-orange-600 hover:bg-orange-700 text-white'
                      : merchant.riskLevel === 'medium'
                      ? 'bg-yellow-600 hover:bg-yellow-700 text-white'
                      : ''
                  }
                >
                  {merchant.riskLevel.toUpperCase()}
                </Badge>
                {merchant.consecutiveDeclines >= 2 && (
                  <Badge variant="outline" className="text-xs">
                    {merchant.consecutiveDeclines} months down
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                {formatCurrency(merchant.previousRevenue)} → {formatCurrency(merchant.currentRevenue)}
              </p>
            </div>
            <div className="flex items-center gap-2 ml-3">
              <div className="text-right">
                <div className="flex items-center gap-1 text-red-600 dark:text-red-400 font-semibold">
                  <TrendingDown className="w-4 h-4" />
                  {formatPercent(Math.abs(merchant.declinePercent), 0)}
                </div>
                <div className="text-xs text-muted-foreground">
                  {formatCurrency(Math.abs(merchant.currentRevenue - merchant.previousRevenue))} loss
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {atRisk.length > limit && (
        <p className="text-sm text-muted-foreground mt-4 text-center">
          + {atRisk.length - limit} more at-risk merchant{atRisk.length - limit !== 1 ? 's' : ''}
        </p>
      )}
    </Card>
  );
}

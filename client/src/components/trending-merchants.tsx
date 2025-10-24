import { MerchantRecord } from '@shared/schema';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { formatCurrency, formatPercent, getRevenue } from '@/lib/analytics';
import { TrendingUp, TrendingDown, Flame, Snowflake, HelpCircle } from 'lucide-react';

interface TrendingMerchant {
  merchantId: string;
  merchantName: string;
  currentRevenue: number;
  previousRevenue: number;
  changePercent: number;
  changeAmount: number;
}

interface TrendingMerchantsProps {
  records: MerchantRecord[];
  currentMonth?: string | null;
  limit?: number;
}

export function TrendingMerchants({ records, currentMonth, limit = 5 }: TrendingMerchantsProps) {
  const allMonths = Array.from(new Set(records.map(r => r.month))).sort();
  const monthIndex = currentMonth ? allMonths.indexOf(currentMonth) : allMonths.length - 1;
  const month = allMonths[monthIndex];
  const prevMonth = monthIndex > 0 ? allMonths[monthIndex - 1] : null;
  
  if (!month || !prevMonth) return null;

  // Get revenue by merchant for both months
  const currentMonthData = new Map<string, { name: string; revenue: number }>();
  const prevMonthData = new Map<string, number>();
  
  records.filter(r => r.month === month).forEach(record => {
    const revenue = getRevenue(record);
    const existing = currentMonthData.get(record.merchantId);
    if (existing) {
      existing.revenue += revenue;
    } else {
      currentMonthData.set(record.merchantId, {
        name: record.merchantName,
        revenue
      });
    }
  });
  
  records.filter(r => r.month === prevMonth).forEach(record => {
    const revenue = getRevenue(record);
    const existing = prevMonthData.get(record.merchantId) || 0;
    prevMonthData.set(record.merchantId, existing + revenue);
  });
  
  // Calculate changes for merchants that exist in both months
  const trending: TrendingMerchant[] = [];
  currentMonthData.forEach((data, merchantId) => {
    const previousRevenue = prevMonthData.get(merchantId);
    if (previousRevenue !== undefined && previousRevenue > 0) {
      const changeAmount = data.revenue - previousRevenue;
      const changePercent = (changeAmount / previousRevenue) * 100;
      
      trending.push({
        merchantId,
        merchantName: data.name,
        currentRevenue: data.revenue,
        previousRevenue,
        changePercent,
        changeAmount
      });
    }
  });
  
  // Sort by absolute change percent and take top gainers/losers
  const topGainers = trending
    .filter(m => m.changePercent > 0)
    .sort((a, b) => b.changePercent - a.changePercent)
    .slice(0, limit);
    
  const topLosers = trending
    .filter(m => m.changePercent < 0)
    .sort((a, b) => a.changePercent - b.changePercent)
    .slice(0, limit);
  
  if (topGainers.length === 0 && topLosers.length === 0) {
    return null;
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {topGainers.length > 0 && (
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Flame className="w-5 h-5 text-orange-500" />
            <h3 className="text-lg font-semibold">Top Gainers</h3>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className="inline-flex"
                  data-testid="help-top-gainers"
                  aria-label="Help: Top Gainers"
                >
                  <HelpCircle className="w-4 h-4 text-muted-foreground/50 hover:text-muted-foreground cursor-help" />
                </button>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p>Merchants with the highest revenue growth this month compared to last month. Identify successful accounts for case studies and best practices to replicate across your merchant base.</p>
              </TooltipContent>
            </Tooltip>
          </div>
          <div className="space-y-3">
            {topGainers.map((merchant) => (
              <div
                key={merchant.merchantId}
                className="flex items-start justify-between p-3 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900"
                data-testid={`gainer-${merchant.merchantId}`}
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{merchant.merchantName}</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {formatCurrency(merchant.previousRevenue)} → {formatCurrency(merchant.currentRevenue)}
                  </p>
                </div>
                <div className="flex items-center gap-2 ml-3">
                  <Badge variant="default" className="bg-green-600 hover:bg-green-700">
                    <TrendingUp className="w-3 h-3 mr-1" />
                    +{formatPercent(merchant.changePercent, 0)}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
      
      {topLosers.length > 0 && (
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Snowflake className="w-5 h-5 text-blue-500" />
            <h3 className="text-lg font-semibold">Top Decliners</h3>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className="inline-flex"
                  data-testid="help-top-decliners"
                  aria-label="Help: Top Decliners"
                >
                  <HelpCircle className="w-4 h-4 text-muted-foreground/50 hover:text-muted-foreground cursor-help" />
                </button>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p>Merchants with the largest revenue decline this month. These accounts may need intervention but haven't reached at-risk thresholds yet. Proactive outreach can prevent further deterioration.</p>
              </TooltipContent>
            </Tooltip>
          </div>
          <div className="space-y-3">
            {topLosers.map((merchant) => (
              <div
                key={merchant.merchantId}
                className="flex items-start justify-between p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900"
                data-testid={`decliner-${merchant.merchantId}`}
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{merchant.merchantName}</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {formatCurrency(merchant.previousRevenue)} → {formatCurrency(merchant.currentRevenue)}
                  </p>
                </div>
                <div className="flex items-center gap-2 ml-3">
                  <Badge variant="destructive">
                    <TrendingDown className="w-3 h-3 mr-1" />
                    {formatPercent(merchant.changePercent, 0)}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

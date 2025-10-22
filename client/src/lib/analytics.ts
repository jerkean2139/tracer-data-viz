import { MerchantRecord, MonthlyMetrics, TopMerchant, Processor } from '@shared/schema';
import { format, parse, compareAsc } from 'date-fns';

export function calculateMonthlyMetrics(
  records: MerchantRecord[],
  processor: Processor = 'All'
): MonthlyMetrics[] {
  const filteredRecords = processor === 'All'
    ? records
    : records.filter(r => r.processor === processor);

  const recordsByMonth = new Map<string, MerchantRecord[]>();
  filteredRecords.forEach(record => {
    if (!recordsByMonth.has(record.month)) {
      recordsByMonth.set(record.month, []);
    }
    recordsByMonth.get(record.month)!.push(record);
  });

  const sortedMonths = Array.from(recordsByMonth.keys()).sort((a, b) => {
    const dateA = parse(a, 'yyyy-MM', new Date());
    const dateB = parse(b, 'yyyy-MM', new Date());
    return compareAsc(dateA, dateB);
  });

  const metrics: MonthlyMetrics[] = [];
  let previousMonthMerchantIds: Set<string> | null = null;

  sortedMonths.forEach((month, index) => {
    const monthRecords = recordsByMonth.get(month)!;
    const currentMerchantIds = new Set(monthRecords.map(r => r.merchantId));

    const totalRevenue = monthRecords.reduce((sum, r) => sum + r.salesAmount, 0);
    const totalAccounts = currentMerchantIds.size;

    let retainedAccounts = 0;
    let lostAccounts = 0;
    let newAccounts = 0;

    if (previousMonthMerchantIds) {
      previousMonthMerchantIds.forEach(prevId => {
        if (currentMerchantIds.has(prevId)) {
          retainedAccounts++;
        } else {
          lostAccounts++;
        }
      });

      currentMerchantIds.forEach(currId => {
        if (!previousMonthMerchantIds!.has(currId)) {
          newAccounts++;
        }
      });
    } else {
      newAccounts = totalAccounts;
    }

    const retentionRate = previousMonthMerchantIds && previousMonthMerchantIds.size > 0
      ? (retainedAccounts / previousMonthMerchantIds.size) * 100
      : 100;

    const attritionRate = previousMonthMerchantIds && previousMonthMerchantIds.size > 0
      ? (lostAccounts / previousMonthMerchantIds.size) * 100
      : 0;

    const revenuePerAccount = totalAccounts > 0 ? totalRevenue / totalAccounts : 0;
    const netAccountGrowth = newAccounts - lostAccounts;

    let momRevenueChange: number | undefined;
    let momRevenueChangePercent: number | undefined;

    if (index > 0) {
      const previousMetrics = metrics[index - 1];
      momRevenueChange = totalRevenue - previousMetrics.totalRevenue;
      momRevenueChangePercent = previousMetrics.totalRevenue > 0
        ? (momRevenueChange / previousMetrics.totalRevenue) * 100
        : 0;
    }

    metrics.push({
      month,
      processor,
      totalRevenue,
      totalAccounts,
      retainedAccounts,
      lostAccounts,
      newAccounts,
      retentionRate,
      attritionRate,
      revenuePerAccount,
      momRevenueChange,
      momRevenueChangePercent,
      netAccountGrowth,
    });

    previousMonthMerchantIds = currentMerchantIds;
  });

  return metrics;
}

export function getTopMerchants(
  records: MerchantRecord[],
  month?: string,
  limit: number = 10
): TopMerchant[] {
  const filteredRecords = month
    ? records.filter(r => r.month === month)
    : records;

  const merchantRevenue = new Map<string, { name: string; revenue: number; processor: 'Clearent' | 'ML' | 'Shift4' }>();

  filteredRecords.forEach(record => {
    if (record.processor === 'All') return;
    
    const existing = merchantRevenue.get(record.merchantId);
    if (existing) {
      existing.revenue += record.salesAmount;
    } else {
      merchantRevenue.set(record.merchantId, {
        name: record.merchantName,
        revenue: record.salesAmount,
        processor: record.processor as 'Clearent' | 'ML' | 'Shift4',
      });
    }
  });

  const totalRevenue = Array.from(merchantRevenue.values()).reduce((sum, m) => sum + m.revenue, 0);

  const topMerchants = Array.from(merchantRevenue.entries())
    .map(([id, data]) => ({
      merchantId: id,
      merchantName: data.name,
      revenue: data.revenue,
      percentOfTotal: totalRevenue > 0 ? (data.revenue / totalRevenue) * 100 : 0,
      processor: data.processor,
    }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, limit);

  return topMerchants;
}

export function getLatestMonth(records: MerchantRecord[]): string | null {
  if (records.length === 0) return null;

  const months = Array.from(new Set(records.map(r => r.month))).sort((a, b) => {
    const dateA = parse(a, 'yyyy-MM', new Date());
    const dateB = parse(b, 'yyyy-MM', new Date());
    return compareAsc(dateA, dateB);
  });

  return months[months.length - 1] || null;
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatPercent(value: number, decimals: number = 1): string {
  return `${value.toFixed(decimals)}%`;
}

export function formatMonthLabel(month: string): string {
  try {
    const date = parse(month, 'yyyy-MM', new Date());
    return format(date, 'MMM yyyy');
  } catch {
    return month;
  }
}

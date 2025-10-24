import { MerchantRecord, MonthlyMetrics, TopMerchant, Processor, MerchantChange, MerchantChanges } from '@shared/schema';
import { format, parse, compareAsc } from 'date-fns';

// Helper function to get revenue for a record based on processor
export function getRevenue(record: MerchantRecord): number {
  // Clearent & ML: use 'net' (Tracer's revenue) - DO NOT fall back to salesAmount
  // If net is missing, it should have been flagged as an error during upload
  if (record.processor === 'Clearent' || record.processor === 'ML') {
    return record.net ?? 0;
  }
  if (record.processor === 'Shift4') {
    return record.payoutAmount ?? record.salesAmount ?? 0;
  }
  // For TSYS, Micamp, PayBright, TRX - use salesAmount or net if available
  return record.net ?? record.salesAmount ?? 0;
}

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

    const totalRevenue = monthRecords.reduce((sum, r) => sum + getRevenue(r), 0);
    const totalAccounts = currentMerchantIds.size;
    
    // Calculate agent net revenue (commission)
    const totalAgentNet = monthRecords.reduce((sum, r) => {
      // Agent net is only applicable to Clearent records
      if (r.processor === 'Clearent' && r.agentNet !== undefined) {
        return sum + r.agentNet;
      }
      return sum;
    }, 0);
    
    // Debug logging for Feb 2024
    if (month === '2024-02') {
      console.log(`[Analytics] Feb 2024 has ${monthRecords.length} records, ${totalAccounts} unique merchants`);
      console.log(`[Analytics] Feb 2024 total revenue: $${totalRevenue}`);
      console.log(`[Analytics] First 3 Feb records:`, monthRecords.slice(0, 3).map(r => ({
        merchantId: r.merchantId,
        merchantName: r.merchantName,
        revenue: getRevenue(r),
        processor: r.processor
      })));
    }

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
    const agentNetPerAccount = totalAccounts > 0 ? totalAgentNet / totalAccounts : 0;
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
      totalAgentNet,
      agentNetPerAccount,
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

  const merchantRevenue = new Map<string, { name: string; revenue: number; processor: Exclude<Processor, 'All'> }>();

  filteredRecords.forEach(record => {
    if (record.processor === 'All') return;
    
    const revenue = getRevenue(record);
    const existing = merchantRevenue.get(record.merchantId);
    if (existing) {
      existing.revenue += revenue;
    } else {
      merchantRevenue.set(record.merchantId, {
        name: record.merchantName,
        revenue,
        processor: record.processor as Exclude<Processor, 'All'>,
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

export function calculateRevenueConcentration(
  records: MerchantRecord[],
  month?: string,
  topN: number = 10
): { concentrationPercent: number; riskLevel: 'low' | 'medium' | 'high' } {
  const topMerchants = getTopMerchants(records, month, topN);
  const concentrationPercent = topMerchants.reduce((sum, m) => sum + m.percentOfTotal, 0);
  
  let riskLevel: 'low' | 'medium' | 'high';
  if (concentrationPercent < 25) {
    riskLevel = 'low';
  } else if (concentrationPercent < 40) {
    riskLevel = 'medium';
  } else {
    riskLevel = 'high';
  }
  
  return { concentrationPercent, riskLevel };
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
    return format(date, 'M/yy');
  } catch {
    return month;
  }
}

export function getMerchantChanges(
  records: MerchantRecord[],
  processor: Processor = 'All'
): MerchantChanges {
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

  if (sortedMonths.length < 2) {
    return { newMerchants: [], lostMerchants: [], retainedCount: 0 };
  }

  // Compare last two months in the range
  const previousMonth = sortedMonths[sortedMonths.length - 2];
  const currentMonth = sortedMonths[sortedMonths.length - 1];

  const previousRecords = recordsByMonth.get(previousMonth)!;
  const currentRecords = recordsByMonth.get(currentMonth)!;

  const previousMerchants = new Map(previousRecords.map(r => [r.merchantId, r]));
  const currentMerchants = new Map(currentRecords.map(r => [r.merchantId, r]));

  const newMerchants: MerchantChange[] = [];
  const lostMerchants: MerchantChange[] = [];
  let retainedCount = 0;

  // Find new merchants (in current but not in previous)
  currentMerchants.forEach((record, merchantId) => {
    if (!previousMerchants.has(merchantId)) {
      newMerchants.push({
        merchantId: record.merchantId,
        merchantName: record.merchantName,
        revenue: getRevenue(record),
        month: currentMonth,
        processor: record.processor
      });
    } else {
      retainedCount++;
    }
  });

  // Find lost merchants (in previous but not in current)
  previousMerchants.forEach((record, merchantId) => {
    if (!currentMerchants.has(merchantId)) {
      lostMerchants.push({
        merchantId: record.merchantId,
        merchantName: record.merchantName,
        revenue: getRevenue(record),
        month: previousMonth,
        processor: record.processor
      });
    }
  });

  // Sort by revenue (highest first)
  newMerchants.sort((a, b) => b.revenue - a.revenue);
  lostMerchants.sort((a, b) => b.revenue - a.revenue);

  return { newMerchants, lostMerchants, retainedCount };
}

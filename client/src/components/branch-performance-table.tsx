import { MerchantRecord } from '@shared/schema';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { formatCurrency, formatPercent, getRevenue } from '@/lib/analytics';
import { TrendingUp, TrendingDown, Medal, HelpCircle } from 'lucide-react';

interface BranchMetrics {
  branchId: string;
  totalRevenue: number;
  accountCount: number;
  revenuePerAccount: number;
  retentionRate: number;
  rank: number;
}

interface BranchPerformanceTableProps {
  records: MerchantRecord[];
  currentMonth?: string | null;
}

export function BranchPerformanceTable({ records, currentMonth }: BranchPerformanceTableProps) {
  // Get records for current and previous month
  const allMonths = Array.from(new Set(records.map(r => r.month))).sort();
  const monthIndex = currentMonth ? allMonths.indexOf(currentMonth) : allMonths.length - 1;
  const month = allMonths[monthIndex];
  const prevMonth = monthIndex > 0 ? allMonths[monthIndex - 1] : null;
  
  if (!month) return null;

  // Group records by branch for current month
  const branchData = new Map<string, { revenue: number; merchants: Set<string> }>();
  const prevBranchData = prevMonth ? new Map<string, Set<string>>() : null;
  
  records.filter(r => r.month === month && r.branchId).forEach(record => {
    const branch = record.branchId!;
    if (!branchData.has(branch)) {
      branchData.set(branch, { revenue: 0, merchants: new Set() });
    }
    const data = branchData.get(branch)!;
    data.revenue += getRevenue(record);
    data.merchants.add(record.merchantId);
  });
  
  // Get previous month merchant IDs by branch for retention calculation
  if (prevMonth && prevBranchData) {
    records.filter(r => r.month === prevMonth && r.branchId).forEach(record => {
      const branch = record.branchId!;
      if (!prevBranchData.has(branch)) {
        prevBranchData.set(branch, new Set());
      }
      prevBranchData.get(branch)!.add(record.merchantId);
    });
  }
  
  // Calculate metrics and retention for each branch
  const branchMetrics: BranchMetrics[] = Array.from(branchData.entries()).map(([branchId, data]) => {
    const accountCount = data.merchants.size;
    const revenuePerAccount = accountCount > 0 ? data.revenue / accountCount : 0;
    
    // Calculate retention rate
    let retentionRate = 100;
    if (prevBranchData && prevBranchData.has(branchId)) {
      const prevMerchants = prevBranchData.get(branchId)!;
      const retained = Array.from(data.merchants).filter(m => prevMerchants.has(m)).length;
      retentionRate = prevMerchants.size > 0 ? (retained / prevMerchants.size) * 100 : 100;
    }
    
    return {
      branchId,
      totalRevenue: data.revenue,
      accountCount,
      revenuePerAccount,
      retentionRate,
      rank: 0, // Will be calculated after sorting
    };
  });
  
  // Sort by revenue and assign ranks
  branchMetrics.sort((a, b) => b.totalRevenue - a.totalRevenue);
  branchMetrics.forEach((branch, index) => {
    branch.rank = index + 1;
  });
  
  if (branchMetrics.length === 0) {
    return null;
  }

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold">Branch Performance Leaderboard</h3>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className="inline-flex"
                  data-testid="help-branch-performance"
                  aria-label="Help: Branch Performance Leaderboard"
                >
                  <HelpCircle className="w-4 h-4 text-muted-foreground/50 hover:text-muted-foreground cursor-help" />
                </button>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p>Sales branch ranking by total revenue. Shows merchant account counts, average revenue per account, and retention rates. Top 3 branches receive medals. High retention ({'>'}90%) is excellent; medium (75-90%) needs attention; low ({' <'}75%) requires intervention.</p>
              </TooltipContent>
            </Tooltip>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Ranked by total revenue • {month}
          </p>
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[60px]">Rank</TableHead>
              <TableHead>Branch ID</TableHead>
              <TableHead className="text-right">Revenue</TableHead>
              <TableHead className="text-right">Accounts</TableHead>
              <TableHead className="text-right">Avg/Account</TableHead>
              <TableHead className="text-right">Retention</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {branchMetrics.map((branch) => (
              <TableRow key={branch.branchId} data-testid={`row-branch-${branch.branchId}`}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {branch.rank <= 3 && (
                      <Medal className={`w-4 h-4 ${
                        branch.rank === 1 ? 'text-yellow-500' :
                        branch.rank === 2 ? 'text-gray-400' :
                        'text-orange-600'
                      }`} />
                    )}
                    <span className="font-medium">#{branch.rank}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <span className="font-medium">Branch {branch.branchId}</span>
                </TableCell>
                <TableCell className="text-right font-mono">
                  {formatCurrency(branch.totalRevenue)}
                </TableCell>
                <TableCell className="text-right">{branch.accountCount}</TableCell>
                <TableCell className="text-right font-mono">
                  {formatCurrency(branch.revenuePerAccount)}
                </TableCell>
                <TableCell className="text-right">
                  <Badge 
                    variant={branch.retentionRate >= 90 ? 'default' : branch.retentionRate >= 75 ? 'secondary' : 'destructive'}
                    className="font-mono"
                  >
                    {formatPercent(branch.retentionRate, 0)}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
}

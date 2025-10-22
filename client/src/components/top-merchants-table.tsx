import { useState } from 'react';
import { TopMerchant } from '@shared/schema';
import { formatCurrency, formatPercent } from '@/lib/analytics';
import { Card } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ArrowUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface TopMerchantsTableProps {
  merchants: TopMerchant[];
  title?: string;
}

type SortField = 'merchantName' | 'revenue' | 'percentOfTotal';
type SortDirection = 'asc' | 'desc';

export function TopMerchantsTable({ merchants, title = 'Top 10 Merchants' }: TopMerchantsTableProps) {
  const [sortField, setSortField] = useState<SortField>('revenue');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const sortedMerchants = [...merchants].sort((a, b) => {
    const aValue = a[sortField];
    const bValue = b[sortField];

    if (typeof aValue === 'string' && typeof bValue === 'string') {
      return sortDirection === 'asc'
        ? aValue.localeCompare(bValue)
        : bValue.localeCompare(aValue);
    }

    if (typeof aValue === 'number' && typeof bValue === 'number') {
      return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
    }

    return 0;
  });

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">{title}</h3>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]">Rank</TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  onClick={() => handleSort('merchantName')}
                  className="h-8 px-2 hover-elevate"
                  data-testid="sort-merchant-name"
                >
                  Merchant Name
                  <ArrowUpDown className="ml-2 h-3 w-3" />
                </Button>
              </TableHead>
              <TableHead>
                <div className="font-mono text-xs text-muted-foreground">Merchant ID</div>
              </TableHead>
              <TableHead className="text-right">
                <Button
                  variant="ghost"
                  onClick={() => handleSort('revenue')}
                  className="h-8 px-2 hover-elevate"
                  data-testid="sort-revenue"
                >
                  Revenue
                  <ArrowUpDown className="ml-2 h-3 w-3" />
                </Button>
              </TableHead>
              <TableHead className="text-right">
                <Button
                  variant="ghost"
                  onClick={() => handleSort('percentOfTotal')}
                  className="h-8 px-2 hover-elevate"
                  data-testid="sort-percent"
                >
                  % of Total
                  <ArrowUpDown className="ml-2 h-3 w-3" />
                </Button>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedMerchants.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                  No merchant data available
                </TableCell>
              </TableRow>
            ) : (
              sortedMerchants.map((merchant, index) => (
                <TableRow key={merchant.merchantId} data-testid={`merchant-row-${index}`}>
                  <TableCell className="font-medium">{index + 1}</TableCell>
                  <TableCell className="font-medium">{merchant.merchantName}</TableCell>
                  <TableCell className="font-mono text-sm text-muted-foreground">
                    {merchant.merchantId}
                  </TableCell>
                  <TableCell className="text-right font-semibold tabular-nums">
                    {formatCurrency(merchant.revenue)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatPercent(merchant.percentOfTotal)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
}

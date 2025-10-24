import { MerchantRecord } from '@shared/schema';
import { Card } from '@/components/ui/card';
import { formatMonthLabel, formatCurrency } from '@/lib/analytics';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface DataValidationPanelProps {
  records: MerchantRecord[];
}

// Helper to get revenue for a record
function getRevenue(record: MerchantRecord): number {
  if (record.processor === 'Clearent' || record.processor === 'ML') {
    return record.net ?? record.salesAmount ?? 0;
  }
  if (record.processor === 'Shift4') {
    return record.payoutAmount ?? record.salesAmount ?? 0;
  }
  return record.net ?? record.salesAmount ?? 0;
}

export function DataValidationPanel({ records }: DataValidationPanelProps) {
  // Group by processor and month - track both count and revenue
  const dataByProcessorMonth = new Map<string, Map<string, { count: number; revenue: number }>>();
  
  records.forEach(record => {
    if (!dataByProcessorMonth.has(record.processor)) {
      dataByProcessorMonth.set(record.processor, new Map());
    }
    const monthMap = dataByProcessorMonth.get(record.processor)!;
    const existing = monthMap.get(record.month) || { count: 0, revenue: 0 };
    monthMap.set(record.month, {
      count: existing.count + 1,
      revenue: existing.revenue + getRevenue(record)
    });
  });

  const processors = Array.from(dataByProcessorMonth.keys()).sort();
  const allMonths = Array.from(new Set(records.map(r => r.month))).sort();

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Merchant Counts by Month</h3>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Processor</TableHead>
                {allMonths.map(month => (
                  <TableHead key={month} className="text-right">
                    {formatMonthLabel(month)}
                  </TableHead>
                ))}
                <TableHead className="text-right font-semibold">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {processors.map(processor => {
                const monthMap = dataByProcessorMonth.get(processor)!;
                const total = Array.from(monthMap.values()).reduce((sum, data) => sum + data.count, 0);
                
                return (
                  <TableRow key={processor}>
                    <TableCell className="font-medium">{processor}</TableCell>
                    {allMonths.map(month => {
                      const data = monthMap.get(month);
                      return (
                        <TableCell key={month} className="text-right" data-testid={`count-${processor}-${month}`}>
                          {data ? data.count : '-'}
                        </TableCell>
                      );
                    })}
                    <TableCell className="text-right font-semibold">{total}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Revenue (Net) Totals by Month</h3>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Processor</TableHead>
                {allMonths.map(month => (
                  <TableHead key={month} className="text-right">
                    {formatMonthLabel(month)}
                  </TableHead>
                ))}
                <TableHead className="text-right font-semibold">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {processors.map(processor => {
                const monthMap = dataByProcessorMonth.get(processor)!;
                const total = Array.from(monthMap.values()).reduce((sum, data) => sum + data.revenue, 0);
                
                return (
                  <TableRow key={processor}>
                    <TableCell className="font-medium">{processor}</TableCell>
                    {allMonths.map(month => {
                      const data = monthMap.get(month);
                      return (
                        <TableCell key={month} className="text-right" data-testid={`revenue-${processor}-${month}`}>
                          {data ? formatCurrency(data.revenue) : '-'}
                        </TableCell>
                      );
                    })}
                    <TableCell className="text-right font-semibold">{formatCurrency(total)}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
        <p className="text-sm text-muted-foreground mt-4">
          Total revenue across all processors and months: {formatCurrency(records.reduce((sum, r) => sum + getRevenue(r), 0))}
        </p>
      </Card>
    </div>
  );
}

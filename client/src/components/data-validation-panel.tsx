import { MerchantRecord } from '@shared/schema';
import { Card } from '@/components/ui/card';
import { formatMonthLabel } from '@/lib/analytics';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface DataValidationPanelProps {
  records: MerchantRecord[];
}

export function DataValidationPanel({ records }: DataValidationPanelProps) {
  // Group by processor and month
  const dataByProcessorMonth = new Map<string, Map<string, number>>();
  
  records.forEach(record => {
    if (!dataByProcessorMonth.has(record.processor)) {
      dataByProcessorMonth.set(record.processor, new Map());
    }
    const monthMap = dataByProcessorMonth.get(record.processor)!;
    monthMap.set(record.month, (monthMap.get(record.month) || 0) + 1);
  });

  const processors = Array.from(dataByProcessorMonth.keys()).sort();
  const allMonths = Array.from(new Set(records.map(r => r.month))).sort();

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">Data Validation - Merchant Counts by Month</h3>
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
              const total = Array.from(monthMap.values()).reduce((sum, count) => sum + count, 0);
              
              return (
                <TableRow key={processor}>
                  <TableCell className="font-medium">{processor}</TableCell>
                  {allMonths.map(month => (
                    <TableCell key={month} className="text-right" data-testid={`count-${processor}-${month}`}>
                      {monthMap.get(month) || '-'}
                    </TableCell>
                  ))}
                  <TableCell className="text-right font-semibold">{total}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
      <p className="text-sm text-muted-foreground mt-4">
        Total merchants across all processors: {records.length}
      </p>
    </Card>
  );
}

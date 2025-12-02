import { MerchantRecord, ValidationWarning, Processor } from '@shared/schema';
import { Card } from '@/components/ui/card';
import { formatMonthLabel, formatCurrency } from '@/lib/analytics';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface DataValidationPanelProps {
  records: MerchantRecord[];
  warnings: ValidationWarning[];
}

// Processor collection start dates (YYYY-MM format)
const PROCESSOR_START_DATES: Record<Processor, string> = {
  'Clearent': '2024-01',
  'ML': '2024-01',
  'Shift4': '2024-01',
  'TSYS': '2024-01',
  'Micamp': '2024-03',          // Started March 2024
  'PayBright': '2025-06',       // Started June 2025
  'TRX': '2024-05',             // Started May 2024
  'Payment Advisors': '2025-01', // Started January 2025
  'All': '2024-01',
};

// Helper to check if a month is before processor's start date
function isBeforeStartDate(processor: string, month: string): boolean {
  const startDate = PROCESSOR_START_DATES[processor as Processor];
  if (!startDate) return false;
  
  // Convert both to comparable format (YYYY-MM)
  const normalizedMonth = month.length === 7 ? month : month; // Already in YYYY-MM
  return normalizedMonth < startDate;
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

export function DataValidationPanel({ records, warnings }: DataValidationPanelProps) {
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

  // Group warnings by type
  const branchMismatches = warnings.filter(w => w.warningType === 'branch_mismatch');
  const processorMismatches = warnings.filter(w => w.warningType === 'processor_mismatch');

  return (
    <div className="space-y-6">
      {warnings.length > 0 && (
        <Card className="p-6 border-yellow-500/50 bg-yellow-500/5">
          <div className="flex items-start gap-3 mb-4">
            <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
            <div>
              <h3 className="text-lg font-semibold text-yellow-900 dark:text-yellow-100">
                Cross-Reference Warnings
              </h3>
              <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                Found {warnings.length} mismatch{warnings.length !== 1 ? 'es' : ''} between leads file and revenue reports
              </p>
            </div>
          </div>

          {branchMismatches.length > 0 && (
            <div className="mb-6">
              <h4 className="font-semibold mb-2 flex items-center gap-2">
                <Badge variant="outline" className="bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200">
                  {branchMismatches.length}
                </Badge>
                Branch Number Mismatches
              </h4>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Merchant ID</TableHead>
                      <TableHead>Merchant Name</TableHead>
                      <TableHead>Processor</TableHead>
                      <TableHead className="text-right">Expected Branch</TableHead>
                      <TableHead className="text-right">Actual Branch</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {branchMismatches.map((warning, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-mono text-xs">{warning.merchantId}</TableCell>
                        <TableCell>{warning.merchantName}</TableCell>
                        <TableCell>{warning.processor}</TableCell>
                        <TableCell className="text-right text-yellow-700 dark:text-yellow-300 font-medium">
                          {warning.expected}
                        </TableCell>
                        <TableCell className="text-right text-destructive font-medium">
                          {warning.actual}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {processorMismatches.length > 0 && (
            <div>
              <h4 className="font-semibold mb-2 flex items-center gap-2">
                <Badge variant="outline" className="bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200">
                  {processorMismatches.length}
                </Badge>
                Processor Mismatches
              </h4>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Merchant ID</TableHead>
                      <TableHead>Merchant Name</TableHead>
                      <TableHead className="text-right">Expected Processor</TableHead>
                      <TableHead className="text-right">Actual Processor</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {processorMismatches.map((warning, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-mono text-xs">{warning.merchantId}</TableCell>
                        <TableCell>{warning.merchantName}</TableCell>
                        <TableCell className="text-right text-yellow-700 dark:text-yellow-300 font-medium">
                          {warning.expected}
                        </TableCell>
                        <TableCell className="text-right text-destructive font-medium">
                          {warning.actual}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </Card>
      )}

      <Card className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold">Merchant Counts by Month</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Missing data highlighted with <AlertTriangle className="inline w-3 h-3 text-orange-600 dark:text-orange-400" /> icon
            </p>
          </div>
        </div>
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
                      const isBeforeStart = isBeforeStartDate(processor, month);
                      const isMissing = !data && !isBeforeStart;
                      return (
                        <TableCell 
                          key={month} 
                          className={`text-right ${isMissing ? 'bg-orange-500/10 dark:bg-orange-500/20' : ''}`}
                          data-testid={`count-${processor}-${month}`}
                        >
                          {data ? (
                            data.count
                          ) : isBeforeStart ? (
                            <span className="text-muted-foreground">-</span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-orange-600 dark:text-orange-400">
                              <AlertTriangle className="w-3 h-3" />
                              <span>-</span>
                            </span>
                          )}
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
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold">Revenue (Net) Totals by Month</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Missing data highlighted with <AlertTriangle className="inline w-3 h-3 text-orange-600 dark:text-orange-400" /> icon
            </p>
          </div>
        </div>
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
                      const isBeforeStart = isBeforeStartDate(processor, month);
                      const isMissing = !data && !isBeforeStart;
                      return (
                        <TableCell 
                          key={month} 
                          className={`text-right ${isMissing ? 'bg-orange-500/10 dark:bg-orange-500/20' : ''}`}
                          data-testid={`revenue-${processor}-${month}`}
                        >
                          {data ? (
                            formatCurrency(data.revenue)
                          ) : isBeforeStart ? (
                            <span className="text-muted-foreground">-</span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-orange-600 dark:text-orange-400">
                              <AlertTriangle className="w-3 h-3" />
                              <span>-</span>
                            </span>
                          )}
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

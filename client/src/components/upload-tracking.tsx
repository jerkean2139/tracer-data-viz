import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, AlertCircle, Minus } from "lucide-react";
import { MerchantRecord, UploadedFile, Processor } from "@shared/schema";
import { formatMonthLabel } from "@/lib/analytics";

interface UploadTrackingProps {
  records: MerchantRecord[];
  uploadedFiles: UploadedFile[];
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
  return month < startDate;
}

export function UploadTracking({ records, uploadedFiles }: UploadTrackingProps) {
  // Get all unique months from both records and uploaded files
  const monthsFromRecords = Array.from(new Set(records.map(r => r.month)));
  const monthsFromFiles = Array.from(new Set(uploadedFiles.map(f => f.month)));
  const allMonths = Array.from(new Set([...monthsFromRecords, ...monthsFromFiles])).sort();
  const recentMonths = allMonths.slice(-12); // Last 12 months

  // Derive processors from actual data (records + uploaded files)
  const processorsFromRecords = Array.from(new Set(records.map(r => r.processor as Processor)));
  const processorsFromFiles = Array.from(new Set(uploadedFiles.map(f => f.processor as Processor)));
  const PROCESSORS = Array.from(new Set([...processorsFromRecords, ...processorsFromFiles])).sort();

  // Check if a processor has data for a given month
  const hasData = (processor: Processor, month: string): 'uploaded' | 'missing' | 'partial' | 'before-start' => {
    // Check if month is before processor's start date
    if (isBeforeStartDate(processor, month)) {
      return 'before-start';
    }
    
    // Get records for this processor-month combination
    const monthRecords = records.filter(r => r.processor === processor && r.month === month);
    
    if (monthRecords.length === 0) {
      return 'missing';
    }
    
    // Check if records have valid sales data
    const hasSalesData = monthRecords.some(r => {
      const sales = r.salesAmount ?? 0;
      return sales > 0;
    });
    
    // If we have records with sales data, it's uploaded
    if (hasSalesData) return 'uploaded';
    
    // If we have records but no sales data (data quality issue), it's partial
    return 'partial';
  };

  // Calculate statistics based on actual data in recent months
  let expectedCount = 0;
  let uploadedCount = 0;
  let partialCount = 0;
  let missingCount = 0;
  
  recentMonths.forEach(month => {
    PROCESSORS.forEach(processor => {
      const status = hasData(processor, month);
      if (status !== 'before-start') {
        expectedCount++;
        if (status === 'uploaded') uploadedCount++;
        else if (status === 'partial') partialCount++;
        else if (status === 'missing') missingCount++;
      }
    });
  });

  const stats = {
    totalUploads: uploadedCount,
    expectedUploads: expectedCount,
    partialUploads: partialCount,
    missingUploads: missingCount,
    completionRate: expectedCount > 0 
      ? Math.round((uploadedCount / expectedCount) * 100) 
      : 0,
  };

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Complete Data</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-total-uploads">{stats.totalUploads}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Valid sales data
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Data Quality Issues</CardTitle>
            <AlertCircle className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-partial-uploads">{stats.partialUploads}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Records with $0 sales
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Missing Data</CardTitle>
            <XCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-missing-uploads">
              {stats.missingUploads}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              No data uploaded
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-completion-rate">{stats.completionRate}%</div>
            <p className="text-xs text-muted-foreground mt-1">
              Last 12 months
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Upload Tracking Grid */}
      <Card>
        <CardHeader>
          <CardTitle>Monthly Upload Status</CardTitle>
          <CardDescription>
            Track which processors have submitted revenue data each month
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-3 font-medium text-sm sticky left-0 bg-background">
                    Processor
                  </th>
                  {recentMonths.map((month) => (
                    <th key={month} className="text-center p-3 font-medium text-sm min-w-[100px]">
                      {formatMonthLabel(month)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {PROCESSORS.map((processor) => {
                  const processorUploads = recentMonths.filter(m => hasData(processor, m) === 'uploaded').length;
                  const uploadRate = recentMonths.length > 0 
                    ? Math.round((processorUploads / recentMonths.length) * 100) 
                    : 0;

                  return (
                    <tr key={processor} className="border-b hover-elevate" data-testid={`row-processor-${processor.toLowerCase()}`}>
                      <td className="p-3 font-medium sticky left-0 bg-background">
                        <div className="flex items-center justify-between gap-2">
                          <span>{processor}</span>
                          <Badge variant="outline" className="text-xs">
                            {uploadRate}%
                          </Badge>
                        </div>
                      </td>
                      {recentMonths.map((month) => {
                        const status = hasData(processor, month);
                        return (
                          <td key={month} className="text-center p-3">
                            {status === 'uploaded' ? (
                              <CheckCircle2 
                                className="h-5 w-5 text-green-600 mx-auto" 
                                data-testid={`status-${processor.toLowerCase()}-${month}-uploaded`}
                              />
                            ) : status === 'missing' ? (
                              <XCircle 
                                className="h-5 w-5 text-red-600 mx-auto" 
                                data-testid={`status-${processor.toLowerCase()}-${month}-missing`}
                              />
                            ) : status === 'before-start' ? (
                              <Minus 
                                className="h-5 w-5 text-muted-foreground mx-auto" 
                                data-testid={`status-${processor.toLowerCase()}-${month}-before-start`}
                              />
                            ) : (
                              <AlertCircle 
                                className="h-5 w-5 text-yellow-600 mx-auto" 
                                data-testid={`status-${processor.toLowerCase()}-${month}-partial`}
                              />
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap items-center gap-6 mt-6 pt-4 border-t text-sm">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <span className="text-muted-foreground">Complete (Has Sales Data)</span>
            </div>
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-yellow-600" />
              <span className="text-muted-foreground">Quality Issue (Records but $0 Sales)</span>
            </div>
            <div className="flex items-center gap-2">
              <XCircle className="h-4 w-4 text-red-600" />
              <span className="text-muted-foreground">Missing (No Records)</span>
            </div>
            <div className="flex items-center gap-2">
              <Minus className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Before Start Date</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

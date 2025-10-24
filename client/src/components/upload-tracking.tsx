import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { MerchantRecord, UploadedFile, Processor } from "@shared/schema";
import { formatMonthLabel } from "@/lib/analytics";

interface UploadTrackingProps {
  records: MerchantRecord[];
  uploadedFiles: UploadedFile[];
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
  const hasData = (processor: Processor, month: string): 'uploaded' | 'missing' | 'partial' => {
    const file = uploadedFiles.find(f => f.processor === processor && f.month === month);
    const recordsExist = records.some(r => r.processor === processor && r.month === month);
    
    // If there's an uploaded file, consider it uploaded (even without records yet)
    if (file) return 'uploaded';
    // If there are records but no upload tracking, it's partial
    if (recordsExist && !file) return 'partial';
    // If neither exists, it's missing
    return 'missing';
  };

  // Calculate expected uploads from actual processor-month pairs in the data
  // (not cartesian product which includes non-existent combinations)
  const actualPairs = new Set<string>();
  recentMonths.forEach(month => {
    PROCESSORS.forEach(processor => {
      const hasFile = uploadedFiles.some(f => f.processor === processor && f.month === month);
      const hasRecords = records.some(r => r.processor === processor && r.month === month);
      if (hasFile || hasRecords) {
        actualPairs.add(`${processor}-${month}`);
      }
    });
  });

  const stats = {
    totalUploads: uploadedFiles.length,
    expectedUploads: actualPairs.size,
    completionRate: 0,
  };
  
  const uploaded = recentMonths.reduce((count, month) => {
    return count + PROCESSORS.filter(p => hasData(p, month) === 'uploaded').length;
  }, 0);
  
  stats.completionRate = stats.expectedUploads > 0 
    ? Math.round((uploaded / stats.expectedUploads) * 100) 
    : 0;

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Files Uploaded</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-total-uploads">{stats.totalUploads}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Across all processors
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
            <AlertCircle className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-completion-rate">{stats.completionRate}%</div>
            <p className="text-xs text-muted-foreground mt-1">
              Last 12 months
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Missing Uploads</CardTitle>
            <XCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-missing-uploads">
              {stats.expectedUploads - uploaded}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Expected uploads
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
          <div className="flex items-center gap-6 mt-6 pt-4 border-t text-sm">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <span className="text-muted-foreground">Data Uploaded</span>
            </div>
            <div className="flex items-center gap-2">
              <XCircle className="h-4 w-4 text-red-600" />
              <span className="text-muted-foreground">No Data</span>
            </div>
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-yellow-600" />
              <span className="text-muted-foreground">Partial Data</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

import { useCallback, useState, useEffect } from 'react';
import { Upload, FileText, AlertCircle, CheckCircle2, X, Calendar } from 'lucide-react';
import { parseCSVFile, detectProcessor, getNextExpectedMonth } from '@/lib/csvParser';
import { storageService } from '@/lib/storage';
import { getLatestMonth, formatMonthLabel } from '@/lib/analytics';
import { Processor, UploadedFile } from '@shared/schema';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface FileUpload {
  file: File;
  processor: 'Clearent' | 'ML' | 'Shift4' | 'TSYS' | 'Micamp' | 'PayBright' | 'TRX' | 'Payment Advisors' | null;
  status: 'pending' | 'processing' | 'success' | 'error';
  recordCount?: number;
  errors?: string[];
  warnings?: string[];
}

interface CSVUploadProps {
  onUploadComplete: () => void;
}

export function CSVUpload({ onUploadComplete }: CSVUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploads, setUploads] = useState<FileUpload[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [latestMonth, setLatestMonth] = useState<string | null>(null);
  const { toast } = useToast();

  // Get next expected month from existing data
  useEffect(() => {
    async function loadLatestMonth() {
      const records = await storageService.getAllRecords();
      const latest = getLatestMonth(records);
      setLatestMonth(latest);
    }
    loadLatestMonth();
  }, []);

  const nextExpectedMonth = getNextExpectedMonth(latestMonth);
  const nextExpectedLabel = formatMonthLabel(nextExpectedMonth);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files).filter(f => 
      f.name.endsWith('.csv') || f.name.endsWith('.xlsx')
    );
    if (files.length === 0) {
      toast({
        title: 'Invalid files',
        description: 'Please upload CSV or Excel (.xlsx) files only',
        variant: 'destructive',
      });
      return;
    }

    const newUploads: FileUpload[] = files.map(file => ({
      file,
      processor: detectProcessor(file.name),
      status: 'pending' as const,
    }));

    setUploads(prev => [...prev, ...newUploads]);
  }, [toast]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []).filter(f => 
      f.name.endsWith('.csv') || f.name.endsWith('.xlsx')
    );
    if (files.length === 0) return;

    const newUploads: FileUpload[] = files.map(file => ({
      file,
      processor: detectProcessor(file.name),
      status: 'pending' as const,
    }));

    setUploads(prev => [...prev, ...newUploads]);
    e.target.value = '';
  }, []);

  const updateProcessor = useCallback((index: number, processor: 'Clearent' | 'ML' | 'Shift4' | 'TSYS' | 'Micamp' | 'PayBright' | 'TRX' | 'Payment Advisors') => {
    setUploads(prev => prev.map((upload, i) =>
      i === index ? { ...upload, processor } : upload
    ));
  }, []);

  const removeUpload = useCallback((index: number) => {
    setUploads(prev => prev.filter((_, i) => i !== index));
  }, []);

  const processUploads = useCallback(async () => {
    const pendingUploads = uploads.filter(u => u.status === 'pending' || u.status === 'error');
    if (pendingUploads.length === 0) return;

    const hasUnspecifiedProcessor = pendingUploads.some(u => !u.processor);
    if (hasUnspecifiedProcessor) {
      toast({
        title: 'Processor required',
        description: 'Please specify a processor for all files',
        variant: 'destructive',
      });
      return;
    }

    setIsProcessing(true);
    let successCount = 0;

    for (let i = 0; i < uploads.length; i++) {
      const upload = uploads[i];
      if (upload.status === 'success') {
        successCount++;
        continue;
      }

      setUploads(prev => prev.map((u, idx) =>
        idx === i ? { ...u, status: 'processing' as const } : u
      ));

      try {
        const result = await parseCSVFile(upload.file, upload.processor!);

        if (result.success && result.data) {
          // Validate uploaded month against expected month
          const uploadedMonth = result.data[0]?.month;
          if (uploadedMonth && uploadedMonth !== nextExpectedMonth && latestMonth) {
            // Warn if uploading a different month than expected
            const uploadedLabel = formatMonthLabel(uploadedMonth);
            toast({
              title: 'Unexpected Month Detected',
              description: `You're uploading ${uploadedLabel}, but the next expected month is ${nextExpectedLabel}. Please verify this is correct.`,
              variant: 'default',
            });
          }

          await storageService.addRecords(result.data);

          const uploadedFile: UploadedFile = {
            id: `${Date.now()}-${i}`,
            fileName: upload.file.name,
            processor: upload.processor!,
            month: result.data[0]?.month || 'Unknown',
            recordCount: result.data.length,
            uploadedAt: new Date().toISOString(),
            isValid: true,
            errors: result.errors,
          };

          await storageService.addUploadedFile(uploadedFile);

          setUploads(prev => prev.map((u, idx) =>
            idx === i ? {
              ...u,
              status: 'success' as const,
              recordCount: result.data!.length,
              warnings: result.warnings,
            } : u
          ));
          
          successCount++;
        } else {
          setUploads(prev => prev.map((u, idx) =>
            idx === i ? {
              ...u,
              status: 'error' as const,
              errors: result.errors,
            } : u
          ));
        }
      } catch (error) {
        setUploads(prev => prev.map((u, idx) =>
          idx === i ? {
            ...u,
            status: 'error' as const,
            errors: [`Failed to process file: ${error}`],
          } : u
        ));
      }
    }

    setIsProcessing(false);

    if (successCount > 0) {
      toast({
        title: 'Upload complete',
        description: `Successfully processed ${successCount} file(s)`,
      });
      onUploadComplete();
      setTimeout(() => setUploads([]), 2000);
    }
  }, [uploads, toast, onUploadComplete, nextExpectedMonth, nextExpectedLabel, latestMonth]);

  return (
    <div className="space-y-6">
      {/* Next Month Indicator */}
      <Alert className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800" data-testid="alert-next-month">
        <Calendar className="h-4 w-4 text-blue-600 dark:text-blue-400" />
        <AlertDescription className="text-blue-900 dark:text-blue-100">
          <span className="font-semibold">Next Month to Upload:</span> {nextExpectedLabel}
          {latestMonth && (
            <span className="text-blue-700 dark:text-blue-300 ml-2">
              (Latest uploaded: {formatMonthLabel(latestMonth)})
            </span>
          )}
        </AlertDescription>
      </Alert>

      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          relative border-2 border-dashed rounded-md transition-all
          ${isDragging ? 'border-primary bg-primary/5' : 'border-border'}
          ${uploads.length === 0 ? 'min-h-[300px]' : 'min-h-[200px]'}
        `}
      >
        <label className="flex flex-col items-center justify-center h-full cursor-pointer p-8">
          <input
            type="file"
            multiple
            accept=".csv,.xlsx"
            onChange={handleFileSelect}
            className="hidden"
            data-testid="input-csv-file"
          />
          <Upload className={`w-12 h-12 mb-4 ${isDragging ? 'text-primary' : 'text-muted-foreground'}`} />
          <h3 className="text-lg font-semibold mb-2">
            {uploads.length === 0 ? 'Upload CSV Files' : 'Add More Files'}
          </h3>
          <p className="text-sm text-muted-foreground text-center max-w-md">
            Drag and drop your merchant CSV or Excel files here, or click to browse
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            Supports .csv and .xlsx formats • Clearent, ML, and Shift4 processors
          </p>
        </label>
      </div>

      {uploads.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Files to Upload ({uploads.length})</h3>
            <Button
              onClick={processUploads}
              disabled={isProcessing || uploads.every(u => u.status === 'success')}
              data-testid="button-process-uploads"
            >
              {isProcessing ? 'Processing...' : 'Process Files'}
            </Button>
          </div>

          <div className="space-y-3">
            {uploads.map((upload, index) => (
              <Card key={index} className="p-4">
                <div className="flex items-start gap-3">
                  <FileText className="w-5 h-5 mt-0.5 text-muted-foreground flex-shrink-0" />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <p className="font-medium truncate">{upload.file.name}</p>
                      {upload.status === 'success' && (
                        <CheckCircle2 className="w-4 h-4 text-chart-2 flex-shrink-0" />
                      )}
                      {upload.status === 'error' && (
                        <AlertCircle className="w-4 h-4 text-destructive flex-shrink-0" />
                      )}
                    </div>

                    <div className="flex items-center gap-3 mb-2">
                      <Select
                        value={upload.processor || undefined}
                        onValueChange={(value) => updateProcessor(index, value as 'Clearent' | 'ML' | 'Shift4' | 'TSYS' | 'Micamp' | 'PayBright' | 'TRX')}
                        disabled={upload.status === 'processing' || upload.status === 'success'}
                      >
                        <SelectTrigger className="w-[180px]" data-testid={`select-processor-${index}`}>
                          <SelectValue placeholder="Select processor" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Clearent">Clearent</SelectItem>
                          <SelectItem value="ML">ML</SelectItem>
                          <SelectItem value="Shift4">Shift4</SelectItem>
                          <SelectItem value="TSYS">TSYS</SelectItem>
                          <SelectItem value="Micamp">Micamp</SelectItem>
                          <SelectItem value="PayBright">PayBright</SelectItem>
                          <SelectItem value="TRX">TRX</SelectItem>
                          <SelectItem value="Payment Advisors">Payment Advisors</SelectItem>
                        </SelectContent>
                      </Select>

                      {upload.recordCount !== undefined && (
                        <Badge variant="secondary">
                          {upload.recordCount} records
                        </Badge>
                      )}
                    </div>

                    {upload.status === 'processing' && (
                      <Progress value={undefined} className="h-1" />
                    )}

                    {upload.errors && upload.errors.length > 0 && (
                      <div className="text-sm text-destructive space-y-1 mt-2">
                        {upload.errors.map((error, i) => (
                          <p key={i}>• {error}</p>
                        ))}
                      </div>
                    )}

                    {upload.warnings && upload.warnings.length > 0 && (
                      <div className="text-xs text-muted-foreground mt-2">
                        {upload.warnings.length} warning(s)
                      </div>
                    )}
                  </div>

                  {upload.status !== 'processing' && upload.status !== 'success' && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeUpload(index)}
                      data-testid={`button-remove-${index}`}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

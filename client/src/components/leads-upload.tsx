import { useCallback, useState } from 'react';
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle2, X } from 'lucide-react';
import { parseLeadsFile } from '@/lib/leadsParser';
import { storageService } from '@/lib/storage';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';

interface LeadsUploadProps {
  onUploadComplete: () => void;
}

export function LeadsUpload({ onUploadComplete }: LeadsUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<{
    status: 'idle' | 'success' | 'error';
    recordCount?: number;
    errors?: string[];
    warnings?: string[];
  }>({ status: 'idle' });
  const { toast } = useToast();

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const processFile = async (file: File) => {
    setIsProcessing(true);
    setUploadStatus({ status: 'idle' });

    try {
      const result = await parseLeadsFile(file);

      if (!result.success || !result.data) {
        setUploadStatus({
          status: 'error',
          errors: result.errors,
          warnings: result.warnings,
        });
        toast({
          title: 'Upload failed',
          description: result.errors[0] || 'Failed to parse leads file',
          variant: 'destructive',
        });
        return;
      }

      // Save metadata to storage
      await storageService.addMetadata(result.data);

      // Track the upload in uploaded_files table
      const uploadRecord = {
        id: `leads-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        fileName: file.name,
        processor: 'Leads' as const,
        month: new Date().toISOString().substring(0, 7), // Current month in YYYY-MM format
        recordCount: result.data.length,
        uploadedAt: new Date().toISOString(),
        isValid: true,
        errors: result.warnings && result.warnings.length > 0 ? result.warnings : undefined,
      };

      await storageService.addUploadedFile(uploadRecord);

      setUploadStatus({
        status: 'success',
        recordCount: result.data.length,
        warnings: result.warnings,
      });

      toast({
        title: 'Leads uploaded successfully',
        description: `${result.data.length} merchant metadata records imported`,
      });

      onUploadComplete();

    } catch (error) {
      setUploadStatus({
        status: 'error',
        errors: ['Failed to process file'],
      });
      toast({
        title: 'Upload failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files).filter(f => 
      f.name.endsWith('.xlsx') || f.name.endsWith('.xls')
    );
    
    if (files.length === 0) {
      toast({
        title: 'Invalid file',
        description: 'Please upload an Excel (.xlsx) file',
        variant: 'destructive',
      });
      return;
    }

    processFile(files[0]);
  }, [toast]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      toast({
        title: 'Invalid file',
        description: 'Please upload an Excel (.xlsx) file',
        variant: 'destructive',
      });
      return;
    }

    processFile(file);
    e.target.value = '';
  }, [toast]);

  return (
    <div className="space-y-4">
      <Card
        className={`p-8 border-2 border-dashed transition-colors ${
          isDragging ? 'border-primary bg-primary/5' : 'border-border'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="flex flex-col items-center justify-center gap-4 text-center">
          <div className="p-4 bg-primary/10 rounded-full">
            <FileSpreadsheet className="w-8 h-8 text-primary" />
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-1">Upload Merchant Leads</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Upload MyLeads Excel file to cross-reference with revenue reports
            </p>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={() => document.getElementById('leads-file-input')?.click()}
              disabled={isProcessing}
              data-testid="button-upload-leads"
            >
              <Upload className="w-4 h-4 mr-2" />
              {isProcessing ? 'Processing...' : 'Select File'}
            </Button>
          </div>

          <p className="text-xs text-muted-foreground">
            or drag and drop Excel file here
          </p>

          <input
            id="leads-file-input"
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>
      </Card>

      {uploadStatus.status === 'success' && (
        <Card className="p-4 bg-chart-2/10 border-chart-2">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-chart-2 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-semibold text-chart-2 mb-1">Upload Successful</h4>
              <p className="text-sm">
                {uploadStatus.recordCount} merchant metadata records imported
              </p>
              {uploadStatus.warnings && uploadStatus.warnings.length > 0 && (
                <div className="mt-2 space-y-1">
                  {uploadStatus.warnings.map((warning, i) => (
                    <p key={i} className="text-xs text-muted-foreground">⚠️ {warning}</p>
                  ))}
                </div>
              )}
            </div>
          </div>
        </Card>
      )}

      {uploadStatus.status === 'error' && uploadStatus.errors && (
        <Card className="p-4 bg-destructive/10 border-destructive">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-destructive mt-0.5" />
            <div className="flex-1">
              <h4 className="font-semibold text-destructive mb-1">Upload Failed</h4>
              <div className="space-y-1">
                {uploadStatus.errors.map((error, i) => (
                  <p key={i} className="text-sm">{error}</p>
                ))}
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}

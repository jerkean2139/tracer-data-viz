import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { FileText, Download, Upload, Building2, Calendar } from 'lucide-react';
import { storageService } from '@/lib/storage';
import { MerchantRecord, Processor, PartnerLogo } from '@shared/schema';
import { calculateMonthlyMetrics, getLatestMonth, formatMonthLabel } from '@/lib/analytics';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { ReportTemplate } from '@/components/report-template';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { apiRequest, queryClient } from '@/lib/queryClient';

type DateRangeType = 'current' | '3months' | '6months' | '12months' | 'all' | 'custom';

export default function Reports() {
  const { toast } = useToast();
  const { isAdmin } = useAuth();
  const [selectedProcessor, setSelectedProcessor] = useState<Processor>('All');
  const [selectedBranch, setSelectedBranch] = useState<string>('all');
  const [dateRange, setDateRange] = useState<DateRangeType>('all');
  const [customStartMonth, setCustomStartMonth] = useState<string>('');
  const [customEndMonth, setCustomEndMonth] = useState<string>('');
  const [partnerName, setPartnerName] = useState('');
  const [selectedLogoId, setSelectedLogoId] = useState<number | null>(null);
  const [partnerLogoUrl, setPartnerLogoUrl] = useState('');
  const [uploadLogoDialogOpen, setUploadLogoDialogOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const { data: records = [] } = useQuery<MerchantRecord[]>({
    queryKey: ['/api/records'],
  });

  const { data: partnerLogos = [] } = useQuery<PartnerLogo[]>({
    queryKey: ['/api/partner-logos'],
  });

  const addLogoMutation = useMutation({
    mutationFn: async (logo: { partnerName: string; logoUrl: string }) => {
      return await apiRequest('POST', '/api/partner-logos', logo);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/partner-logos'] });
      toast({
        title: 'Logo saved',
        description: 'Partner logo has been saved successfully.',
      });
    },
  });

  const allBranches = Array.from(new Set(records.map(r => r.branchId).filter((b): b is string => !!b))).sort();

  // Apply branch filter first (before calculating allMonths)
  const branchFilteredRecords = selectedBranch === 'all' 
    ? records 
    : records.filter(r => r.branchId && r.branchId === selectedBranch);

  // Apply processor filter
  const processorAndBranchFilteredRecords = selectedProcessor === 'All'
    ? branchFilteredRecords
    : branchFilteredRecords.filter(r => r.processor === selectedProcessor);

  // Get all unique months sorted (from branch-filtered records)
  const allMonths = Array.from(new Set(processorAndBranchFilteredRecords.map(r => r.month))).sort();
  const latestMonth = getLatestMonth(processorAndBranchFilteredRecords);
  const currentMonth = latestMonth || '';

  // Initialize custom date range
  useEffect(() => {
    if (latestMonth && !customStartMonth && !customEndMonth) {
      setCustomStartMonth(latestMonth);
      setCustomEndMonth(latestMonth);
    }
  }, [latestMonth, customStartMonth, customEndMonth]);

  // Calculate date range filter (same logic as dashboard)
  const getFilteredMonths = (): string[] => {
    if (dateRange === 'all') return allMonths;
    if (dateRange === 'current') return latestMonth ? [latestMonth] : [];
    
    if (dateRange === 'custom') {
      if (!customStartMonth || !customEndMonth) return allMonths;
      const startIdx = allMonths.indexOf(customStartMonth);
      const endIdx = allMonths.indexOf(customEndMonth);
      if (startIdx === -1 || endIdx === -1) {
        return allMonths;
      }
      // Normalize indices to handle start > end
      return allMonths.slice(Math.min(startIdx, endIdx), Math.max(startIdx, endIdx) + 1);
    }
    
    // For preset ranges (3, 6, 12 months)
    const monthCount = dateRange === '3months' ? 3 : dateRange === '6months' ? 6 : 12;
    return allMonths.slice(-monthCount);
  };

  const filteredMonths = getFilteredMonths();
  const filteredRecords = processorAndBranchFilteredRecords.filter(r => filteredMonths.includes(r.month));

  // Get records for calculation including anchor month (month before filtered range)
  // This ensures accurate retention calculations for the first month in any filtered range
  const getRecordsForCalculation = (): MerchantRecord[] => {
    if (filteredMonths.length === 0 || dateRange === 'all') {
      return processorAndBranchFilteredRecords; // No date filtering needed for 'all'
    }
    
    const firstFilteredMonth = filteredMonths[0];
    const firstMonthIndex = allMonths.indexOf(firstFilteredMonth);
    
    // If there's a month before the filtered range, include it as anchor for retention baseline
    const anchorMonth = firstMonthIndex > 0 ? allMonths[firstMonthIndex - 1] : null;
    
    const monthsForCalculation = anchorMonth 
      ? [anchorMonth, ...filteredMonths]  // Include anchor month
      : filteredMonths;
      
    return processorAndBranchFilteredRecords.filter(r => monthsForCalculation.includes(r.month));
  };

  const recordsForCalculation = getRecordsForCalculation();

  // Calculate metrics with anchor month logic, then filter out anchor month from results
  const metricsWithAnchor = calculateMonthlyMetrics(recordsForCalculation, selectedProcessor);
  const metrics = metricsWithAnchor.filter(m => filteredMonths.includes(m.month));
  
  // Aggregate metrics across all months in the range
  const lastMetric = metrics.length > 0 ? metrics[metrics.length - 1] : null;
  const aggregateMetrics = lastMetric ? {
    ...lastMetric,
    totalRevenue: metrics.reduce((sum, m) => sum + m.totalRevenue, 0),
    totalAccounts: lastMetric.totalAccounts,
    retentionRate: metrics.reduce((sum, m) => sum + m.retentionRate, 0) / metrics.length,
    attritionRate: metrics.reduce((sum, m) => sum + m.attritionRate, 0) / metrics.length,
    month: filteredMonths.length > 1 ? `${formatMonthLabel(filteredMonths[0])} - ${formatMonthLabel(filteredMonths[filteredMonths.length - 1])}` : (filteredMonths[0] ? formatMonthLabel(filteredMonths[0]) : ''),
  } : null;

  const selectedMetrics = aggregateMetrics;

  const handleGeneratePDF = async () => {
    if (!selectedMetrics) {
      toast({
        title: 'No data available',
        description: 'Please select a month with available data.',
        variant: 'destructive',
      });
      return;
    }

    setIsGenerating(true);
    try {
      const reportElement = document.getElementById('pdf-report-template');
      if (!reportElement) {
        throw new Error('Report template not found');
      }

      const canvas = await html2canvas(reportElement, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
      const imgX = (pdfWidth - imgWidth * ratio) / 2;
      const imgY = 0;

      pdf.addImage(imgData, 'PNG', imgX, imgY, imgWidth * ratio, imgHeight * ratio);

      // Generate filename with safeguards for empty filteredMonths
      let dateRangeLabel = 'report';
      if (filteredMonths.length > 0) {
        if (dateRange === 'custom' || dateRange === 'all') {
          dateRangeLabel = filteredMonths.length > 1
            ? `${filteredMonths[0]}_to_${filteredMonths[filteredMonths.length - 1]}`
            : filteredMonths[0];
        } else {
          dateRangeLabel = dateRange.replace('months', 'mo');
        }
      }
      const fileName = `TRACER_C2_Report_${selectedProcessor}_${dateRangeLabel}.pdf`;
      pdf.save(fileName);

      toast({
        title: 'Report generated successfully',
        description: `${fileName} has been downloaded.`,
      });
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast({
        title: 'Error generating report',
        description: 'Failed to create PDF. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPartnerLogoUrl(reader.result as string);
        setSelectedLogoId(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveLogo = async () => {
    if (!partnerName || !partnerLogoUrl) {
      toast({
        title: 'Missing information',
        description: 'Please provide both partner name and logo.',
        variant: 'destructive',
      });
      return;
    }

    await addLogoMutation.mutateAsync({
      partnerName,
      logoUrl: partnerLogoUrl,
    });
    setUploadLogoDialogOpen(false);
  };

  const handleSelectLogo = (logoId: string) => {
    const id = parseInt(logoId);
    const logo = partnerLogos.find(l => l.id === id);
    if (logo) {
      setSelectedLogoId(id);
      setPartnerName(logo.partnerName);
      setPartnerLogoUrl(logo.logoUrl);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground" data-testid="heading-reports">Reports</h1>
          <p className="text-muted-foreground mt-2">Generate co-branded PDF reports for your partners</p>
        </div>
        <Badge variant="outline" className="text-base px-4 py-2">
          <Building2 className="w-4 h-4 mr-2" />
          TRACER C2
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle>Report Settings</CardTitle>
              <CardDescription>Configure your report parameters</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="processor">Processor</Label>
                <Select value={selectedProcessor} onValueChange={(value) => setSelectedProcessor(value as Processor)} data-testid="select-processor">
                  <SelectTrigger id="processor">
                    <SelectValue placeholder="Select processor" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All">All Processors</SelectItem>
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
              </div>

              {allBranches.length > 0 && (
                <div className="space-y-2">
                  <Label htmlFor="branch">Branch</Label>
                  <Select value={selectedBranch} onValueChange={setSelectedBranch} data-testid="select-branch">
                    <SelectTrigger id="branch">
                      <SelectValue placeholder="All Branches" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Branches</SelectItem>
                      {allBranches.map(branch => (
                        <SelectItem key={branch} value={branch}>
                          Branch {branch}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <Label htmlFor="dateRange">Date Range</Label>
                </div>
                <Select value={dateRange} onValueChange={(value: any) => setDateRange(value)} data-testid="select-date-range">
                  <SelectTrigger id="dateRange">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="current">Current Month</SelectItem>
                    <SelectItem value="3months">Last 3 Months</SelectItem>
                    <SelectItem value="6months">Last 6 Months</SelectItem>
                    <SelectItem value="12months">Last 12 Months</SelectItem>
                    <SelectItem value="all">All Time</SelectItem>
                    <SelectItem value="custom">Custom Range</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {dateRange === 'custom' && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="startMonth">From Month</Label>
                    <Select value={customStartMonth} onValueChange={setCustomStartMonth} data-testid="select-start-month">
                      <SelectTrigger id="startMonth">
                        <SelectValue placeholder="From" />
                      </SelectTrigger>
                      <SelectContent>
                        {allMonths.map(month => (
                          <SelectItem key={month} value={month}>
                            {formatMonthLabel(month)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="endMonth">To Month</Label>
                    <Select value={customEndMonth} onValueChange={setCustomEndMonth} data-testid="select-end-month">
                      <SelectTrigger id="endMonth">
                        <SelectValue placeholder="To" />
                      </SelectTrigger>
                      <SelectContent>
                        {allMonths.map(month => (
                          <SelectItem key={month} value={month}>
                            {formatMonthLabel(month)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}

              <div className="space-y-2">
                <Label htmlFor="partner-name">Partner Name</Label>
                <Input
                  id="partner-name"
                  placeholder="e.g., First National Bank"
                  value={partnerName}
                  onChange={(e) => setPartnerName(e.target.value)}
                  data-testid="input-partner-name"
                />
              </div>

              <div className="space-y-2">
                <Label>Partner Logo</Label>
                {partnerLogos.length > 0 && (
                  <Select value={selectedLogoId?.toString() || ''} onValueChange={handleSelectLogo} data-testid="select-existing-logo">
                    <SelectTrigger>
                      <SelectValue placeholder="Select existing partner" />
                    </SelectTrigger>
                    <SelectContent>
                      {partnerLogos.map(logo => (
                        <SelectItem key={logo.id} value={logo.id.toString()}>
                          {logo.partnerName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                <Dialog open={uploadLogoDialogOpen} onOpenChange={setUploadLogoDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="w-full" data-testid="button-upload-logo">
                      <Upload className="w-4 h-4 mr-2" />
                      {partnerLogoUrl ? 'Change Logo' : 'Upload New Logo'}
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Upload Partner Logo</DialogTitle>
                      <DialogDescription>
                        Upload your partner's logo for the report header
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="dialog-partner-name">Partner Name</Label>
                        <Input
                          id="dialog-partner-name"
                          placeholder="e.g., First National Bank"
                          value={partnerName}
                          onChange={(e) => setPartnerName(e.target.value)}
                          data-testid="input-dialog-partner-name"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Logo Image</Label>
                        <Input
                          type="file"
                          accept="image/*"
                          onChange={handleLogoUpload}
                          data-testid="input-logo-file"
                        />
                      </div>
                      {partnerLogoUrl && (
                        <div className="flex justify-center p-4 border rounded-md bg-muted/20">
                          <img 
                            src={partnerLogoUrl} 
                            alt="Partner logo preview" 
                            className="max-h-24 object-contain"
                            data-testid="img-logo-preview"
                          />
                        </div>
                      )}
                      <div className="flex gap-2">
                        <Button 
                          className="flex-1" 
                          onClick={handleSaveLogo}
                          disabled={addLogoMutation.isPending || !partnerName || !partnerLogoUrl}
                          data-testid="button-save-logo"
                        >
                          {addLogoMutation.isPending ? 'Saving...' : 'Save Logo'}
                        </Button>
                        <Button 
                          variant="outline"
                          className="flex-1" 
                          onClick={() => setUploadLogoDialogOpen(false)}
                          data-testid="button-cancel-logo"
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
                {partnerLogoUrl && (
                  <p className="text-xs text-muted-foreground">Logo ready for report generation</p>
                )}
              </div>

              <Button 
                className="w-full" 
                size="lg" 
                onClick={handleGeneratePDF}
                disabled={isGenerating || !selectedMetrics}
                data-testid="button-generate-pdf"
              >
                {isGenerating ? (
                  <>Generating...</>
                ) : (
                  <>
                    <Download className="w-4 h-4 mr-2" />
                    Generate PDF Report
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Report Preview
              </CardTitle>
              <CardDescription>
                Preview your report before generating PDF
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="border rounded-lg bg-muted/10 overflow-hidden">
                <div className="transform scale-[0.5] origin-top-left" style={{ width: '200%', height: '200%' }}>
                  {selectedMetrics && (
                    <ReportTemplate
                      metrics={selectedMetrics}
                      processor={selectedProcessor}
                      month={selectedMetrics.month}
                      partnerName={partnerName}
                      partnerLogoUrl={partnerLogoUrl}
                      hideRevenue={!isAdmin}
                    />
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
      </div>
    </div>
  );
}

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
import { apiRequest, queryClient } from '@/lib/queryClient';

type DateRangeType = 'current' | '3months' | '6months' | '12months' | 'all' | 'custom';

export default function Reports() {
  const { toast } = useToast();
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
      return await apiRequest('/api/partner-logos', {
        method: 'POST',
        body: JSON.stringify(logo),
        headers: {
          'Content-Type': 'application/json',
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/partner-logos'] });
      toast({
        title: 'Logo saved',
        description: 'Partner logo has been saved successfully.',
      });
    },
  });

  const allMonths = Array.from(new Set(records.map(r => r.month))).sort();
  const latestMonth = getLatestMonth(records);
  const allBranches = Array.from(new Set(records.map(r => r.branchId).filter((b): b is string => !!b))).sort();
  const currentMonth = latestMonth || '';

  // Initialize custom date range
  useEffect(() => {
    if (allMonths.length > 0 && !customStartMonth) {
      setCustomStartMonth(allMonths[0]);
      setCustomEndMonth(allMonths[allMonths.length - 1]);
    }
  }, [allMonths, customStartMonth]);

  // Calculate date range filter
  const getFilteredMonths = (): string[] => {
    if (dateRange === 'current') {
      return currentMonth ? [currentMonth] : [];
    } else if (dateRange === '3months') {
      return allMonths.slice(-3);
    } else if (dateRange === '6months') {
      return allMonths.slice(-6);
    } else if (dateRange === '12months') {
      return allMonths.slice(-12);
    } else if (dateRange === 'custom') {
      const startIdx = allMonths.indexOf(customStartMonth);
      const endIdx = allMonths.indexOf(customEndMonth);
      if (startIdx !== -1 && endIdx !== -1) {
        return allMonths.slice(startIdx, endIdx + 1);
      }
      return allMonths;
    }
    return allMonths; // 'all'
  };

  const filteredMonths = getFilteredMonths();

  // Apply filters
  const filteredRecords = records.filter(record => {
    const matchesProcessor = selectedProcessor === 'All' || record.processor === selectedProcessor;
    const matchesBranch = selectedBranch === 'all' || record.branchId === selectedBranch;
    const matchesMonth = filteredMonths.includes(record.month);
    return matchesProcessor && matchesBranch && matchesMonth;
  });

  // Calculate metrics for filtered records
  const metrics = calculateMonthlyMetrics(filteredRecords, selectedProcessor);
  
  // Aggregate metrics across all months in the range
  const aggregateMetrics = {
    totalRevenue: metrics.reduce((sum, m) => sum + m.totalRevenue, 0),
    totalAccounts: metrics.length > 0 ? metrics[metrics.length - 1]?.totalAccounts || 0 : 0,
    retentionRate: metrics.length > 0 ? metrics.reduce((sum, m) => sum + m.retentionRate, 0) / metrics.length : 0,
    attritionRate: metrics.length > 0 ? metrics.reduce((sum, m) => sum + m.attritionRate, 0) / metrics.length : 0,
    revenueGrowth: metrics.length > 1 ? metrics[metrics.length - 1]?.revenueGrowth || 0 : 0,
    month: filteredMonths.length > 1 ? `${formatMonthLabel(filteredMonths[0])} - ${formatMonthLabel(filteredMonths[filteredMonths.length - 1])}` : filteredMonths[0] || '',
  };

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

      const dateRangeLabel = dateRange === 'custom' || dateRange === 'all' 
        ? `${filteredMonths[0]}_to_${filteredMonths[filteredMonths.length - 1]}`
        : dateRange.replace('months', 'mo');
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
                  <ReportTemplate
                    metrics={selectedMetrics}
                    processor={selectedProcessor}
                    month={selectedMonth}
                    partnerName={partnerName}
                    partnerLogoUrl={partnerLogoUrl}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
      </div>
    </div>
  );
}

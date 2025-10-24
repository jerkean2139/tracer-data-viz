import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { FileText, Download, Upload, Building2 } from 'lucide-react';
import { storageService } from '@/lib/storage';
import { MerchantRecord, Processor } from '@shared/schema';
import { calculateMonthlyMetrics, getLatestMonth, formatMonthLabel } from '@/lib/analytics';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { ReportTemplate } from '@/components/report-template';
import { useToast } from '@/hooks/use-toast';

export default function Reports() {
  const { toast } = useToast();
  const [selectedProcessor, setSelectedProcessor] = useState<Processor>('All');
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [partnerName, setPartnerName] = useState('');
  const [partnerLogoUrl, setPartnerLogoUrl] = useState('');
  const [uploadLogoDialogOpen, setUploadLogoDialogOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const { data: records = [] } = useQuery<MerchantRecord[]>({
    queryKey: ['/api/records'],
  });

  const allMonths = Array.from(new Set(records.map(r => r.month))).sort();
  const latestMonth = getLatestMonth(records);

  if (!selectedMonth && latestMonth) {
    setSelectedMonth(latestMonth);
  }

  const processedRecords = selectedProcessor === 'All' 
    ? records 
    : records.filter(r => r.processor === selectedProcessor);
    
  const metrics = calculateMonthlyMetrics(processedRecords, selectedProcessor);
  const selectedMetrics = metrics.find(m => m.month === selectedMonth);

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

      const fileName = `TRACER_C2_Report_${selectedProcessor}_${selectedMonth}.pdf`;
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
      };
      reader.readAsDataURL(file);
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

              <div className="space-y-2">
                <Label htmlFor="month">Reporting Period</Label>
                <Select value={selectedMonth} onValueChange={setSelectedMonth} data-testid="select-month">
                  <SelectTrigger id="month">
                    <SelectValue placeholder="Select month" />
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
                <Dialog open={uploadLogoDialogOpen} onOpenChange={setUploadLogoDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="w-full" data-testid="button-upload-logo">
                      <Upload className="w-4 h-4 mr-2" />
                      {partnerLogoUrl ? 'Change Logo' : 'Upload Logo'}
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
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={handleLogoUpload}
                        data-testid="input-logo-file"
                      />
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
                      <Button 
                        className="w-full" 
                        onClick={() => setUploadLogoDialogOpen(false)}
                        data-testid="button-confirm-logo"
                      >
                        Confirm
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
                {partnerLogoUrl && (
                  <p className="text-xs text-muted-foreground">Logo uploaded successfully</p>
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

import { useState, useEffect } from 'react';
import { storageService } from '@/lib/storage';
import { calculateMonthlyMetrics, getTopMerchants, getLatestMonth } from '@/lib/analytics';
import { Processor } from '@shared/schema';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Upload } from 'lucide-react';
import { CSVUpload } from '@/components/csv-upload';
import { DashboardContent } from '@/components/dashboard-content';
import { ProcessorComparison } from '@/components/processor-comparison';
import { EmptyState } from '@/components/empty-state';
import { ThemeToggle } from '@/components/theme-toggle';

export default function Dashboard() {
  const [records, setRecords] = useState(storageService.getAllRecords());
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('overview');

  useEffect(() => {
    setRecords(storageService.getAllRecords());
  }, []);

  const handleUploadComplete = () => {
    setRecords(storageService.getAllRecords());
    setUploadDialogOpen(false);
  };

  const hasData = records.length > 0;

  const allMetrics = hasData ? calculateMonthlyMetrics(records, 'All') : [];
  const clearentMetrics = hasData ? calculateMonthlyMetrics(records, 'Clearent') : [];
  const mlMetrics = hasData ? calculateMonthlyMetrics(records, 'ML') : [];
  const shift4Metrics = hasData ? calculateMonthlyMetrics(records, 'Shift4') : [];

  const latestMonth = getLatestMonth(records);

  const allTopMerchants = latestMonth ? getTopMerchants(records, latestMonth) : [];
  const clearentTopMerchants = latestMonth ? getTopMerchants(records.filter(r => r.processor === 'Clearent'), latestMonth) : [];
  const mlTopMerchants = latestMonth ? getTopMerchants(records.filter(r => r.processor === 'ML'), latestMonth) : [];
  const shift4TopMerchants = latestMonth ? getTopMerchants(records.filter(r => r.processor === 'Shift4'), latestMonth) : [];

  if (!hasData) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b sticky top-0 bg-background z-50">
          <div className="container mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-primary">TRACER G2</h1>
                <p className="text-sm text-muted-foreground">Merchant Account Analytics</p>
              </div>
              <ThemeToggle />
            </div>
          </div>
        </header>

        <main className="container mx-auto px-6 py-8">
          <EmptyState onUploadClick={() => setUploadDialogOpen(true)} />
        </main>

        <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Upload CSV Files</DialogTitle>
            </DialogHeader>
            <CSVUpload onUploadComplete={handleUploadComplete} />
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b sticky top-0 bg-background z-50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-primary">TRACER G2</h1>
              <p className="text-sm text-muted-foreground">Merchant Account Analytics</p>
            </div>
            <div className="flex items-center gap-2">
              <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
                <DialogTrigger asChild>
                  <Button data-testid="button-upload-new">
                    <Upload className="w-4 h-4 mr-2" />
                    Upload New Month
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-3xl">
                  <DialogHeader>
                    <DialogTitle>Upload CSV Files</DialogTitle>
                  </DialogHeader>
                  <CSVUpload onUploadComplete={handleUploadComplete} />
                </DialogContent>
              </Dialog>
              <ThemeToggle />
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-8">
            <TabsTrigger value="overview" data-testid="tab-overview">Overview</TabsTrigger>
            <TabsTrigger value="clearent" data-testid="tab-clearent">Clearent</TabsTrigger>
            <TabsTrigger value="ml" data-testid="tab-ml">ML</TabsTrigger>
            <TabsTrigger value="shift4" data-testid="tab-shift4">Shift4</TabsTrigger>
            <TabsTrigger value="compare" data-testid="tab-compare">Compare</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <DashboardContent
              metrics={allMetrics}
              topMerchants={allTopMerchants}
              processor="All"
            />
          </TabsContent>

          <TabsContent value="clearent">
            <DashboardContent
              metrics={clearentMetrics}
              topMerchants={clearentTopMerchants}
              processor="Clearent"
            />
          </TabsContent>

          <TabsContent value="ml">
            <DashboardContent
              metrics={mlMetrics}
              topMerchants={mlTopMerchants}
              processor="ML"
            />
          </TabsContent>

          <TabsContent value="shift4">
            <DashboardContent
              metrics={shift4Metrics}
              topMerchants={shift4TopMerchants}
              processor="Shift4"
            />
          </TabsContent>

          <TabsContent value="compare">
            <ProcessorComparison
              clearentMetrics={clearentMetrics}
              mlMetrics={mlMetrics}
              shift4Metrics={shift4Metrics}
            />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

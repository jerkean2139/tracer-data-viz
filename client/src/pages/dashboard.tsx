import { useState, useEffect } from 'react';
import { storageService } from '@/lib/storage';
import { calculateMonthlyMetrics, getTopMerchants, getLatestMonth } from '@/lib/analytics';
import { Processor } from '@shared/schema';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload, Calendar } from 'lucide-react';
import { formatMonthLabel } from '@/lib/analytics';
import { CSVUpload } from '@/components/csv-upload';
import { DashboardContent } from '@/components/dashboard-content';
import { ProcessorComparison } from '@/components/processor-comparison';
import { EmptyState } from '@/components/empty-state';
import { ThemeToggle } from '@/components/theme-toggle';
import { DataValidationPanel } from '@/components/data-validation-panel';

export default function Dashboard() {
  const [records, setRecords] = useState(storageService.getAllRecords());
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [showDashboard, setShowDashboard] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<string>('all');

  useEffect(() => {
    setRecords(storageService.getAllRecords());
  }, []);

  const handleUploadComplete = () => {
    setRecords(storageService.getAllRecords());
    setUploadDialogOpen(false);
    setShowDashboard(true);
  };

  const hasData = records.length > 0;

  // Get all unique months sorted
  const allMonths = Array.from(new Set(records.map(r => r.month))).sort();
  const latestMonth = getLatestMonth(records);
  
  // Auto-select latest month on first load
  useEffect(() => {
    if (latestMonth && selectedMonth === 'all') {
      setSelectedMonth(latestMonth);
    }
  }, [latestMonth, selectedMonth]);

  // Calculate metrics for ALL months (for charts)
  const allMetrics = hasData ? calculateMonthlyMetrics(records, 'All') : [];
  const clearentMetrics = hasData ? calculateMonthlyMetrics(records, 'Clearent') : [];
  const mlMetrics = hasData ? calculateMonthlyMetrics(records, 'ML') : [];
  const shift4Metrics = hasData ? calculateMonthlyMetrics(records, 'Shift4') : [];
  const tsysMetrics = hasData ? calculateMonthlyMetrics(records, 'TSYS') : [];
  const micampMetrics = hasData ? calculateMonthlyMetrics(records, 'Micamp') : [];
  const paybrightMetrics = hasData ? calculateMonthlyMetrics(records, 'PayBright') : [];
  const trxMetrics = hasData ? calculateMonthlyMetrics(records, 'TRX') : [];

  const currentMonth = selectedMonth === 'all' ? latestMonth : selectedMonth;

  // Top merchants for selected month only
  const allTopMerchants = currentMonth ? getTopMerchants(records, currentMonth) : [];
  const clearentTopMerchants = currentMonth ? getTopMerchants(records.filter(r => r.processor === 'Clearent'), currentMonth) : [];
  const mlTopMerchants = currentMonth ? getTopMerchants(records.filter(r => r.processor === 'ML'), currentMonth) : [];
  const shift4TopMerchants = currentMonth ? getTopMerchants(records.filter(r => r.processor === 'Shift4'), currentMonth) : [];
  const tsysTopMerchants = currentMonth ? getTopMerchants(records.filter(r => r.processor === 'TSYS'), currentMonth) : [];
  const micampTopMerchants = currentMonth ? getTopMerchants(records.filter(r => r.processor === 'Micamp'), currentMonth) : [];
  const paybrightTopMerchants = currentMonth ? getTopMerchants(records.filter(r => r.processor === 'PayBright'), currentMonth) : [];
  const trxTopMerchants = currentMonth ? getTopMerchants(records.filter(r => r.processor === 'TRX'), currentMonth) : [];

  if (!hasData && !showDashboard) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b sticky top-0 bg-background z-50">
          <div className="container mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-primary">TRACER C2</h1>
                <p className="text-sm text-muted-foreground">Merchant Account Analytics</p>
              </div>
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => setShowDashboard(true)}
                  data-testid="button-view-dashboard"
                >
                  View Dashboard
                </Button>
                <ThemeToggle />
              </div>
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
              <h1 className="text-2xl font-bold text-primary">TRACER C2</h1>
              <p className="text-sm text-muted-foreground">Merchant Account Analytics</p>
            </div>
            <div className="flex items-center gap-3">
              {records.length > 0 && (
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                    <SelectTrigger className="w-[180px]" data-testid="select-month">
                      <SelectValue placeholder="Select month" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Months</SelectItem>
                      {allMonths.map(month => (
                        <SelectItem key={month} value={month}>
                          {formatMonthLabel(month)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
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
            <TabsTrigger value="tsys" data-testid="tab-tsys">TSYS</TabsTrigger>
            <TabsTrigger value="micamp" data-testid="tab-micamp">Micamp</TabsTrigger>
            <TabsTrigger value="paybright" data-testid="tab-paybright">PayBright</TabsTrigger>
            <TabsTrigger value="trx" data-testid="tab-trx">TRX</TabsTrigger>
            <TabsTrigger value="compare" data-testid="tab-compare">Compare</TabsTrigger>
            <TabsTrigger value="validation" data-testid="tab-validation">Data Validation</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <DashboardContent
              metrics={allMetrics}
              topMerchants={allTopMerchants}
              processor="All"
              selectedMonth={selectedMonth}
            />
          </TabsContent>

          <TabsContent value="clearent">
            <DashboardContent
              metrics={clearentMetrics}
              topMerchants={clearentTopMerchants}
              processor="Clearent"
              selectedMonth={selectedMonth}
            />
          </TabsContent>

          <TabsContent value="ml">
            <DashboardContent
              metrics={mlMetrics}
              topMerchants={mlTopMerchants}
              processor="ML"
              selectedMonth={selectedMonth}
            />
          </TabsContent>

          <TabsContent value="shift4">
            <DashboardContent
              metrics={shift4Metrics}
              topMerchants={shift4TopMerchants}
              processor="Shift4"
              selectedMonth={selectedMonth}
            />
          </TabsContent>

          <TabsContent value="tsys">
            <DashboardContent
              metrics={tsysMetrics}
              topMerchants={tsysTopMerchants}
              processor="TSYS"
              selectedMonth={selectedMonth}
            />
          </TabsContent>

          <TabsContent value="micamp">
            <DashboardContent
              metrics={micampMetrics}
              topMerchants={micampTopMerchants}
              processor="Micamp"
              selectedMonth={selectedMonth}
            />
          </TabsContent>

          <TabsContent value="paybright">
            <DashboardContent
              metrics={paybrightMetrics}
              topMerchants={paybrightTopMerchants}
              processor="PayBright"
              selectedMonth={selectedMonth}
            />
          </TabsContent>

          <TabsContent value="trx">
            <DashboardContent
              metrics={trxMetrics}
              topMerchants={trxTopMerchants}
              processor="TRX"
              selectedMonth={selectedMonth}
            />
          </TabsContent>

          <TabsContent value="compare">
            <ProcessorComparison
              clearentMetrics={clearentMetrics}
              mlMetrics={mlMetrics}
              shift4Metrics={shift4Metrics}
              tsysMetrics={tsysMetrics}
              micampMetrics={micampMetrics}
              paybrightMetrics={paybrightMetrics}
              trxMetrics={trxMetrics}
            />
          </TabsContent>

          <TabsContent value="validation">
            <DataValidationPanel records={records} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

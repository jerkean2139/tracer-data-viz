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
  const [dateRange, setDateRange] = useState<'current' | '3months' | '6months' | '12months' | 'all' | 'custom'>('current');
  const [customStartMonth, setCustomStartMonth] = useState<string>('');
  const [customEndMonth, setCustomEndMonth] = useState<string>('');

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
  
  // Auto-select custom range on first load
  useEffect(() => {
    if (latestMonth && !customStartMonth && !customEndMonth) {
      setCustomStartMonth(latestMonth);
      setCustomEndMonth(latestMonth);
    }
  }, [latestMonth, customStartMonth, customEndMonth]);

  // Calculate the filtered month range based on selection
  const getFilteredMonths = (): string[] => {
    if (dateRange === 'all') return allMonths;
    if (dateRange === 'current') return latestMonth ? [latestMonth] : [];
    
    if (dateRange === 'custom') {
      if (!customStartMonth || !customEndMonth) return allMonths;
      const startIdx = allMonths.indexOf(customStartMonth);
      const endIdx = allMonths.indexOf(customEndMonth);
      if (startIdx === -1 || endIdx === -1) return allMonths;
      return allMonths.slice(Math.min(startIdx, endIdx), Math.max(startIdx, endIdx) + 1);
    }
    
    // For preset ranges (3, 6, 12 months)
    const monthCount = dateRange === '3months' ? 3 : dateRange === '6months' ? 6 : 12;
    return allMonths.slice(-monthCount);
  };

  const filteredMonths = getFilteredMonths();
  const filteredRecords = records.filter(r => filteredMonths.includes(r.month));
  const currentMonth = filteredMonths.length > 0 ? filteredMonths[filteredMonths.length - 1] : latestMonth;

  // Calculate metrics for filtered date range (for charts)
  const allMetrics = hasData ? calculateMonthlyMetrics(filteredRecords, 'All') : [];
  const clearentMetrics = hasData ? calculateMonthlyMetrics(filteredRecords, 'Clearent') : [];
  const mlMetrics = hasData ? calculateMonthlyMetrics(filteredRecords, 'ML') : [];
  const shift4Metrics = hasData ? calculateMonthlyMetrics(filteredRecords, 'Shift4') : [];
  const tsysMetrics = hasData ? calculateMonthlyMetrics(filteredRecords, 'TSYS') : [];
  const micampMetrics = hasData ? calculateMonthlyMetrics(filteredRecords, 'Micamp') : [];
  const paybrightMetrics = hasData ? calculateMonthlyMetrics(filteredRecords, 'PayBright') : [];
  const trxMetrics = hasData ? calculateMonthlyMetrics(filteredRecords, 'TRX') : [];

  // Top merchants for latest month in the filtered range
  const allTopMerchants = currentMonth ? getTopMerchants(filteredRecords, currentMonth) : [];
  const clearentTopMerchants = currentMonth ? getTopMerchants(filteredRecords.filter(r => r.processor === 'Clearent'), currentMonth) : [];
  const mlTopMerchants = currentMonth ? getTopMerchants(filteredRecords.filter(r => r.processor === 'ML'), currentMonth) : [];
  const shift4TopMerchants = currentMonth ? getTopMerchants(filteredRecords.filter(r => r.processor === 'Shift4'), currentMonth) : [];
  const tsysTopMerchants = currentMonth ? getTopMerchants(filteredRecords.filter(r => r.processor === 'TSYS'), currentMonth) : [];
  const micampTopMerchants = currentMonth ? getTopMerchants(filteredRecords.filter(r => r.processor === 'Micamp'), currentMonth) : [];
  const paybrightTopMerchants = currentMonth ? getTopMerchants(filteredRecords.filter(r => r.processor === 'PayBright'), currentMonth) : [];
  const trxTopMerchants = currentMonth ? getTopMerchants(filteredRecords.filter(r => r.processor === 'TRX'), currentMonth) : [];

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
              <p className="text-sm text-muted-foreground">
                Merchant Account Analytics
                {filteredMonths.length > 0 && (
                  <span className="ml-2 font-medium text-primary">
                    • {filteredMonths.length === allMonths.length 
                      ? 'All Time' 
                      : filteredMonths.length === 1
                        ? formatMonthLabel(filteredMonths[0])
                        : `${formatMonthLabel(filteredMonths[0])} - ${formatMonthLabel(filteredMonths[filteredMonths.length - 1])}`
                    }
                  </span>
                )}
              </p>
            </div>
            <div className="flex items-center gap-3">
              {records.length > 0 && (
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <Select value={dateRange} onValueChange={(value: any) => setDateRange(value)}>
                    <SelectTrigger className="w-[160px]" data-testid="select-date-range">
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
                  
                  {dateRange === 'custom' && (
                    <>
                      <Select value={customStartMonth} onValueChange={setCustomStartMonth}>
                        <SelectTrigger className="w-[140px]" data-testid="select-start-month">
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
                      <span className="text-sm text-muted-foreground">to</span>
                      <Select value={customEndMonth} onValueChange={setCustomEndMonth}>
                        <SelectTrigger className="w-[140px]" data-testid="select-end-month">
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
                    </>
                  )}
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
              currentMonth={currentMonth}
            />
          </TabsContent>

          <TabsContent value="clearent">
            <DashboardContent
              metrics={clearentMetrics}
              topMerchants={clearentTopMerchants}
              processor="Clearent"
              currentMonth={currentMonth}
            />
          </TabsContent>

          <TabsContent value="ml">
            <DashboardContent
              metrics={mlMetrics}
              topMerchants={mlTopMerchants}
              processor="ML"
              currentMonth={currentMonth}
            />
          </TabsContent>

          <TabsContent value="shift4">
            <DashboardContent
              metrics={shift4Metrics}
              topMerchants={shift4TopMerchants}
              processor="Shift4"
              currentMonth={currentMonth}
            />
          </TabsContent>

          <TabsContent value="tsys">
            <DashboardContent
              metrics={tsysMetrics}
              topMerchants={tsysTopMerchants}
              processor="TSYS"
              currentMonth={currentMonth}
            />
          </TabsContent>

          <TabsContent value="micamp">
            <DashboardContent
              metrics={micampMetrics}
              topMerchants={micampTopMerchants}
              processor="Micamp"
              currentMonth={currentMonth}
            />
          </TabsContent>

          <TabsContent value="paybright">
            <DashboardContent
              metrics={paybrightMetrics}
              topMerchants={paybrightTopMerchants}
              processor="PayBright"
              currentMonth={currentMonth}
            />
          </TabsContent>

          <TabsContent value="trx">
            <DashboardContent
              metrics={trxMetrics}
              topMerchants={trxTopMerchants}
              processor="TRX"
              currentMonth={currentMonth}
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
            <DataValidationPanel records={filteredRecords} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

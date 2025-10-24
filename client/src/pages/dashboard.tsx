import { useState, useEffect } from 'react';
import { storageService } from '@/lib/storage';
import { calculateMonthlyMetrics, getTopMerchants, getLatestMonth, formatMonthLabel } from '@/lib/analytics';
import { getNextExpectedMonth } from '@/lib/csvParser';
import { Processor, MerchantRecord, ValidationWarning } from '@shared/schema';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload, Calendar, Info } from 'lucide-react';
import { CSVUpload } from '@/components/csv-upload';
import { LeadsUpload } from '@/components/leads-upload';
import { DashboardContent } from '@/components/dashboard-content';
import { ProcessorComparison } from '@/components/processor-comparison';
import { EmptyState } from '@/components/empty-state';
import { ThemeToggle } from '@/components/theme-toggle';
import { DataValidationPanel } from '@/components/data-validation-panel';

export default function Dashboard() {
  const [records, setRecords] = useState<MerchantRecord[]>([]);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [leadsDialogOpen, setLeadsDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [showDashboard, setShowDashboard] = useState(false);
  const [dateRange, setDateRange] = useState<'current' | '3months' | '6months' | '12months' | 'all' | 'custom'>('all');
  const [customStartMonth, setCustomStartMonth] = useState<string>('');
  const [customEndMonth, setCustomEndMonth] = useState<string>('');
  const [selectedBranch, setSelectedBranch] = useState<string>('all');
  const [validationWarnings, setValidationWarnings] = useState<ValidationWarning[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      const data = await storageService.getAllRecords();
      const warnings = await storageService.getValidationWarnings();
      setRecords(data);
      setValidationWarnings(warnings);
      setIsLoading(false);
    }
    loadData();
  }, []);

  const handleUploadComplete = async () => {
    const data = await storageService.getAllRecords();
    const warnings = await storageService.getValidationWarnings();
    setRecords(data);
    setValidationWarnings(warnings);
    setUploadDialogOpen(false);
    setShowDashboard(true);
  };

  const handleLeadsUploadComplete = async () => {
    const warnings = await storageService.getValidationWarnings();
    setValidationWarnings(warnings);
    setLeadsDialogOpen(false);
  };

  const hasData = records.length > 0;

  // Get all unique branch IDs sorted
  const allBranches = Array.from(new Set(
    records
      .map(r => r.branchId)
      .filter((b): b is string => !!b && b.trim() !== '')
  )).sort();

  // Apply branch filter first
  const branchFilteredRecords = selectedBranch === 'all' 
    ? records 
    : records.filter(r => r.branchId && r.branchId === selectedBranch);

  // Get all unique months sorted (from branch-filtered records)
  const allMonths = Array.from(new Set(branchFilteredRecords.map(r => r.month))).sort();
  const latestMonth = getLatestMonth(branchFilteredRecords);
  
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
  const filteredRecords = branchFilteredRecords.filter(r => filteredMonths.includes(r.month));
  const currentMonth = filteredMonths.length > 0 ? filteredMonths[filteredMonths.length - 1] : latestMonth;

  // Get records for calculation including anchor month (month before filtered range)
  // This ensures accurate retention calculations for the first month in any filtered range
  const getRecordsForCalculation = (): MerchantRecord[] => {
    if (filteredMonths.length === 0 || dateRange === 'all') {
      return branchFilteredRecords; // No date filtering needed for 'all'
    }
    
    const firstFilteredMonth = filteredMonths[0];
    const firstMonthIndex = allMonths.indexOf(firstFilteredMonth);
    
    // If there's a month before the filtered range, include it as anchor for retention baseline
    const anchorMonth = firstMonthIndex > 0 ? allMonths[firstMonthIndex - 1] : null;
    
    const monthsForCalculation = anchorMonth 
      ? [anchorMonth, ...filteredMonths]  // Include anchor month
      : filteredMonths;
      
    return branchFilteredRecords.filter(r => monthsForCalculation.includes(r.month));
  };

  const recordsForCalculation = getRecordsForCalculation();

  // Helper function to calculate metrics with anchor month and filter it out from display
  const calculateMetricsWithAnchor = (processor: Processor) => {
    if (!hasData) return [];
    const metricsWithAnchor = calculateMonthlyMetrics(recordsForCalculation, processor);
    // Remove anchor month from displayed metrics (only show filtered months)
    return metricsWithAnchor.filter(m => filteredMonths.includes(m.month));
  };

  // Calculate metrics for filtered date range (with anchor month for accurate retention)
  const allMetrics = calculateMetricsWithAnchor('All');
  const clearentMetrics = calculateMetricsWithAnchor('Clearent');
  const mlMetrics = calculateMetricsWithAnchor('ML');
  const shift4Metrics = calculateMetricsWithAnchor('Shift4');
  const tsysMetrics = calculateMetricsWithAnchor('TSYS');
  const micampMetrics = calculateMetricsWithAnchor('Micamp');
  const paybrightMetrics = calculateMetricsWithAnchor('PayBright');
  const trxMetrics = calculateMetricsWithAnchor('TRX');

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
                <>
                  <Select value={activeTab} onValueChange={setActiveTab}>
                    <SelectTrigger className="w-[180px]" data-testid="select-processor">
                      <SelectValue placeholder="Select View" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="overview">Overview</SelectItem>
                      <SelectItem value="clearent">Clearent</SelectItem>
                      <SelectItem value="ml">ML</SelectItem>
                      <SelectItem value="shift4">Shift4</SelectItem>
                      <SelectItem value="tsys">TSYS</SelectItem>
                      <SelectItem value="micamp">Micamp</SelectItem>
                      <SelectItem value="paybright">PayBright</SelectItem>
                      <SelectItem value="trx">TRX</SelectItem>
                      <SelectItem value="compare">Compare</SelectItem>
                      <SelectItem value="validation">Data Validation</SelectItem>
                    </SelectContent>
                  </Select>

                  {allBranches.length > 0 && (
                    <Select value={selectedBranch} onValueChange={setSelectedBranch}>
                      <SelectTrigger className="w-[140px]" data-testid="select-branch">
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
                  )}
                  
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

                  <Badge variant="outline" className="bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800" data-testid="badge-next-month">
                    <Info className="w-3 h-3 mr-1" />
                    Next: {formatMonthLabel(getNextExpectedMonth(currentMonth))}
                  </Badge>
                </>
              )}
              <Dialog open={leadsDialogOpen} onOpenChange={setLeadsDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" data-testid="button-upload-leads">
                    <Upload className="w-4 h-4 mr-2" />
                    Upload Leads
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Upload Merchant Leads</DialogTitle>
                  </DialogHeader>
                  <LeadsUpload onUploadComplete={handleLeadsUploadComplete} />
                </DialogContent>
              </Dialog>
              <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
                <DialogTrigger asChild>
                  <Button data-testid="button-upload-new">
                    <Upload className="w-4 h-4 mr-2" />
                    Upload Revenue
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-3xl">
                  <DialogHeader>
                    <DialogTitle>Upload Revenue CSV Files</DialogTitle>
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
          <TabsContent value="overview">
            <DashboardContent
              metrics={allMetrics}
              topMerchants={allTopMerchants}
              processor="All"
              currentMonth={currentMonth}
              filteredRecords={filteredRecords}
            />
          </TabsContent>

          <TabsContent value="clearent">
            <DashboardContent
              metrics={clearentMetrics}
              topMerchants={clearentTopMerchants}
              processor="Clearent"
              currentMonth={currentMonth}
              filteredRecords={filteredRecords}
            />
          </TabsContent>

          <TabsContent value="ml">
            <DashboardContent
              metrics={mlMetrics}
              topMerchants={mlTopMerchants}
              processor="ML"
              currentMonth={currentMonth}
              filteredRecords={filteredRecords}
            />
          </TabsContent>

          <TabsContent value="shift4">
            <DashboardContent
              metrics={shift4Metrics}
              topMerchants={shift4TopMerchants}
              processor="Shift4"
              currentMonth={currentMonth}
              filteredRecords={filteredRecords}
            />
          </TabsContent>

          <TabsContent value="tsys">
            <DashboardContent
              metrics={tsysMetrics}
              topMerchants={tsysTopMerchants}
              processor="TSYS"
              currentMonth={currentMonth}
              filteredRecords={filteredRecords}
            />
          </TabsContent>

          <TabsContent value="micamp">
            <DashboardContent
              metrics={micampMetrics}
              topMerchants={micampTopMerchants}
              processor="Micamp"
              currentMonth={currentMonth}
              filteredRecords={filteredRecords}
            />
          </TabsContent>

          <TabsContent value="paybright">
            <DashboardContent
              metrics={paybrightMetrics}
              topMerchants={paybrightTopMerchants}
              processor="PayBright"
              currentMonth={currentMonth}
              filteredRecords={filteredRecords}
            />
          </TabsContent>

          <TabsContent value="trx">
            <DashboardContent
              metrics={trxMetrics}
              topMerchants={trxTopMerchants}
              processor="TRX"
              currentMonth={currentMonth}
              filteredRecords={filteredRecords}
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
            <DataValidationPanel records={filteredRecords} warnings={validationWarnings} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

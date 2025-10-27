import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown, Users, DollarSign, Building2, AlertTriangle, Award, Target } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const COLORS = ['#1A3A52', '#7FA848', '#4A90E2', '#F39C12', '#E74C3C', '#9B59B6', '#1ABC9C', '#34495E'];

interface OwnerAnalyticsData {
  totalRevenue: number;
  totalAgentNet: number;
  totalMerchants: number;
  totalAccounts: number;
  byProcessor: Record<string, any>;
  byBranch: Record<string, any>;
  monthlyTrends: Record<string, any>;
  topBranches: Array<{
    branchId: string;
    revenue: number;
    agentNet: number;
    merchantCount: number;
    accountCount: number;
  }>;
  topMerchants: Array<{
    merchantId: string;
    name: string;
    revenue: number;
    processor: string;
  }>;
}

export default function OwnerAnalytics() {
  const { data: analytics, isLoading, error } = useQuery<OwnerAnalyticsData>({
    queryKey: ['/api/owner-analytics'],
    queryFn: async () => {
      const response = await fetch('/api/owner-analytics', {
        credentials: 'include', // Include session cookie
      });
      if (!response.ok) {
        throw new Error('Failed to fetch owner analytics');
      }
      return response.json();
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading owner analytics...</p>
        </div>
      </div>
    );
  }

  if (error || !analytics) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Failed to load owner analytics data. Please try again later.
        </AlertDescription>
      </Alert>
    );
  }

  // Prepare data for charts
  const processorData = Object.entries(analytics.byProcessor).map(([name, data]: [string, any]) => ({
    name,
    revenue: data.revenue,
    agentNet: data.agentNet,
    merchants: data.merchantCount,
  }));

  const monthlyData = Object.entries(analytics.monthlyTrends)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, data]: [string, any]) => ({
      month,
      revenue: data.revenue,
      agentNet: data.agentNet,
    }));

  const marketShareData = processorData.map(p => ({
    name: p.name,
    value: p.revenue,
  }));

  // Calculate key metrics
  const avgRevenuePerMerchant = analytics.totalRevenue / analytics.totalMerchants;
  const avgAgentNetPerMerchant = analytics.totalAgentNet / analytics.totalMerchants;
  const effectiveCommissionRate = (analytics.totalAgentNet / analytics.totalRevenue) * 100;

  // Calculate month-over-month growth
  const recentMonths = monthlyData.slice(-2);
  const momGrowth = recentMonths.length === 2
    ? ((recentMonths[1].revenue - recentMonths[0].revenue) / recentMonths[0].revenue) * 100
    : 0;

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Owner Analytics Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Comprehensive business intelligence and performance metrics
          </p>
        </div>
        <Badge variant="outline" className="h-8 px-4">
          <Target className="h-4 w-4 mr-2" />
          Executive View
        </Badge>
      </div>

      {/* Key Metrics Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card data-testid="card-total-revenue">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-1">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-revenue">
              ${analytics.totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {momGrowth >= 0 ? (
                <span className="text-green-600 flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" />
                  +{momGrowth.toFixed(1)}% from last month
                </span>
              ) : (
                <span className="text-red-600 flex items-center gap-1">
                  <TrendingDown className="h-3 w-3" />
                  {momGrowth.toFixed(1)}% from last month
                </span>
              )}
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-agent-net">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-1">
            <CardTitle className="text-sm font-medium">Total Agent Net</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-agent-net">
              ${analytics.totalAgentNet.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Effective rate: {effectiveCommissionRate.toFixed(2)}%
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-total-merchants">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-1">
            <CardTitle className="text-sm font-medium">Total Merchants</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-merchants">
              {analytics.totalMerchants.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              ${avgRevenuePerMerchant.toLocaleString('en-US', { maximumFractionDigits: 0 })} avg revenue per merchant
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-total-accounts">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-1">
            <CardTitle className="text-sm font-medium">Active Accounts</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-accounts">
              {analytics.totalAccounts.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Across {Object.keys(analytics.byProcessor).length} processors
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Trends */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card data-testid="card-revenue-trends">
          <CardHeader>
            <CardTitle>Revenue & Agent Net Trends</CardTitle>
            <CardDescription>Monthly performance over time</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip formatter={(value: number) => `$${value.toLocaleString('en-US', { minimumFractionDigits: 2 })}`} />
                <Legend />
                <Line type="monotone" dataKey="revenue" stroke="#1A3A52" strokeWidth={2} name="Revenue" />
                <Line type="monotone" dataKey="agentNet" stroke="#7FA848" strokeWidth={2} name="Agent Net" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card data-testid="card-market-share">
          <CardHeader>
            <CardTitle>Market Share by Processor</CardTitle>
            <CardDescription>Revenue distribution across processors</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={marketShareData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {marketShareData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => `$${value.toLocaleString('en-US', { minimumFractionDigits: 2 })}`} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Processor Performance */}
      <Card data-testid="card-processor-performance">
        <CardHeader>
          <CardTitle>Processor Performance Comparison</CardTitle>
          <CardDescription>Revenue and Agent Net by processor</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={processorData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip formatter={(value: number) => `$${value.toLocaleString('en-US', { minimumFractionDigits: 2 })}`} />
              <Legend />
              <Bar dataKey="revenue" fill="#1A3A52" name="Revenue" />
              <Bar dataKey="agentNet" fill="#7FA848" name="Agent Net" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Top Performers */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card data-testid="card-top-branches">
          <CardHeader>
            <CardTitle>Top 10 Branches by Revenue</CardTitle>
            <CardDescription>Highest performing branches</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analytics.topBranches.slice(0, 10).map((branch, index) => (
                <div key={branch.branchId} className="flex items-center gap-3" data-testid={`branch-item-${index}`}>
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold text-sm">
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">Branch {branch.branchId}</p>
                    <p className="text-sm text-muted-foreground">
                      {branch.merchantCount} merchants • {branch.accountCount} accounts
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-sm">${branch.revenue.toLocaleString('en-US', { maximumFractionDigits: 0 })}</p>
                    <p className="text-xs text-muted-foreground">
                      ${branch.agentNet.toLocaleString('en-US', { maximumFractionDigits: 0 })} net
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-top-merchants">
          <CardHeader>
            <CardTitle>Top 10 Merchants by Revenue</CardTitle>
            <CardDescription>Highest revenue generating merchants</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analytics.topMerchants.map((merchant, index) => (
                <div key={merchant.merchantId} className="flex items-center gap-3" data-testid={`merchant-item-${index}`}>
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold text-sm">
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{merchant.name}</p>
                    <p className="text-sm text-muted-foreground">
                      <Badge variant="outline" className="text-xs">{merchant.processor}</Badge>
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-sm">${merchant.revenue.toLocaleString('en-US', { maximumFractionDigits: 0 })}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Commission Analysis */}
      <Card data-testid="card-commission-analysis">
        <CardHeader>
          <CardTitle>Commission Analysis by Processor</CardTitle>
          <CardDescription>Agent Net earnings breakdown</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {processorData.map((processor) => {
              const commissionRate = (processor.agentNet / processor.revenue) * 100;
              return (
                <div key={processor.name} className="space-y-2" data-testid={`processor-commission-${processor.name.toLowerCase()}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{processor.name}</span>
                      <Badge variant="secondary" className="text-xs">
                        {commissionRate.toFixed(2)}% rate
                      </Badge>
                    </div>
                    <span className="text-sm font-bold">
                      ${processor.agentNet.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                    </span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all"
                      style={{ width: `${(processor.agentNet / analytics.totalAgentNet) * 100}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{processor.merchants} merchants</span>
                    <span>{((processor.agentNet / analytics.totalAgentNet) * 100).toFixed(1)}% of total</span>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

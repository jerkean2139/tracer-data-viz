import { MonthlyMetrics } from '@shared/schema';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { formatCurrency } from '@/lib/analytics';
import { TrendingUp, Calendar, BarChart3, HelpCircle } from 'lucide-react';
import { format, parse, addMonths } from 'date-fns';

interface ForecastMonth {
  month: string;
  forecastRevenue: number;
  confidence: 'high' | 'medium' | 'low';
}

interface RevenueForecastProps {
  metrics: MonthlyMetrics[];
}

export function RevenueForecast({ metrics }: RevenueForecastProps) {
  // Filter to only valid yyyy-MM formatted months
  const validMetrics = metrics.filter(m => {
    // Check if month matches yyyy-MM format (e.g., "2024-01")
    return /^\d{4}-\d{2}$/.test(m.month);
  });

  if (validMetrics.length < 3) {
    return null; // Need at least 3 months for forecasting
  }

  // Get last 6 months for trend analysis (or all if less than 6)
  const recentMetrics = validMetrics.slice(-6);
  
  // Calculate simple linear regression for trend
  const xValues = recentMetrics.map((_, i) => i);
  const yValues = recentMetrics.map(m => m.totalRevenue);
  
  const n = xValues.length;
  const sumX = xValues.reduce((a, b) => a + b, 0);
  const sumY = yValues.reduce((a, b) => a + b, 0);
  const sumXY = xValues.reduce((sum, x, i) => sum + x * yValues[i], 0);
  const sumX2 = xValues.reduce((sum, x) => sum + x * x, 0);
  
  // Linear regression: y = mx + b
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;
  
  // Calculate R² for confidence
  const yMean = sumY / n;
  const ssTotal = yValues.reduce((sum, y) => sum + Math.pow(y - yMean, 2), 0);
  const ssFit = yValues.map((y, i) => slope * xValues[i] + intercept);
  const ssResidual = yValues.reduce((sum, y, i) => sum + Math.pow(y - ssFit[i], 2), 0);
  // Guard against division by zero when revenue is flat (ssTotal = 0)
  const rSquared = ssTotal === 0 ? 1 : 1 - (ssResidual / ssTotal);
  
  // Generate 3-month forecast
  const lastMonth = validMetrics[validMetrics.length - 1].month;
  const lastMonthDate = parse(lastMonth, 'yyyy-MM', new Date());
  
  const forecasts: ForecastMonth[] = [];
  for (let i = 1; i <= 3; i++) {
    const futureMonth = format(addMonths(lastMonthDate, i), 'yyyy-MM');
    const forecastValue = slope * (n + i - 1) + intercept;
    
    // Determine confidence based on R² and how far into future
    let confidence: 'high' | 'medium' | 'low';
    if (rSquared > 0.7 && i === 1) {
      confidence = 'high';
    } else if (rSquared > 0.5 && i <= 2) {
      confidence = 'medium';
    } else {
      confidence = 'low';
    }
    
    forecasts.push({
      month: futureMonth,
      forecastRevenue: Math.max(0, forecastValue), // Ensure non-negative
      confidence
    });
  }
  
  // Calculate total forecast and growth rate
  const currentRevenue = recentMetrics[recentMetrics.length - 1].totalRevenue;
  const totalForecast = forecasts.reduce((sum, f) => sum + f.forecastRevenue, 0);
  const avgForecast = totalForecast / 3;
  const growthRate = currentRevenue > 0 ? ((avgForecast - currentRevenue) / currentRevenue) * 100 : 0;

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-semibold">Revenue Forecast</h3>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className="inline-flex"
                  data-testid="help-revenue-forecast"
                  aria-label="Help: Revenue Forecast"
                >
                  <HelpCircle className="w-4 h-4 text-muted-foreground/50 hover:text-muted-foreground cursor-help" />
                </button>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p>Statistical 3-month revenue projection using linear regression analysis of recent trends. Confidence levels indicate projection reliability based on historical data correlation (R²). Use as strategic planning guidance, not absolute predictions.</p>
              </TooltipContent>
            </Tooltip>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            3-month projection based on recent trends
          </p>
        </div>
        <Badge variant={growthRate > 0 ? 'default' : 'secondary'} className="text-sm">
          {growthRate > 0 ? '+' : ''}{growthRate.toFixed(1)}% trend
        </Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-3 mb-6">
        {forecasts.map((forecast, index) => (
          <div
            key={forecast.month}
            className="p-4 rounded-lg border bg-card"
            data-testid={`forecast-month-${index + 1}`}
          >
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <p className="text-sm font-medium">
                {format(parse(forecast.month, 'yyyy-MM', new Date()), 'MMM yyyy')}
              </p>
            </div>
            <p className="text-2xl font-bold mb-2" data-testid={`forecast-revenue-${index + 1}`}>
              {formatCurrency(forecast.forecastRevenue)}
            </p>
            <Badge
              variant="outline"
              className={
                forecast.confidence === 'high'
                  ? 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-900 text-green-700 dark:text-green-300'
                  : forecast.confidence === 'medium'
                  ? 'bg-yellow-50 dark:bg-yellow-950/30 border-yellow-200 dark:border-yellow-900 text-yellow-700 dark:text-yellow-300'
                  : 'bg-gray-50 dark:bg-gray-950/30 border-gray-200 dark:border-gray-900 text-gray-700 dark:text-gray-300'
              }
            >
              {forecast.confidence} confidence
            </Badge>
          </div>
        ))}
      </div>

      <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/50">
        <TrendingUp className="w-5 h-5 text-primary mt-0.5" />
        <div>
          <p className="font-medium">Forecast Methodology</p>
          <p className="text-sm text-muted-foreground mt-1">
            Based on linear trend analysis of the last {recentMetrics.length} months.
            {rSquared >= 0.7 
              ? ' High correlation indicates reliable projection.'
              : rSquared >= 0.5
              ? ' Moderate correlation suggests some variability.'
              : ' Low correlation - forecast should be used cautiously.'}
          </p>
        </div>
      </div>
    </Card>
  );
}

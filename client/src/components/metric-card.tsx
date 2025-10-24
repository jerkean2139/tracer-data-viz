import { Card } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MetricCardProps {
  title: string;
  value: string;
  change?: number;
  changeLabel?: string;
  icon?: React.ReactNode;
  className?: string;
  subtitle?: string;
  subtitleValue?: string;
}

export function MetricCard({ title, value, change, changeLabel, icon, className, subtitle, subtitleValue }: MetricCardProps) {
  const getTrendIcon = () => {
    if (change === undefined || change === null) return null;
    if (change > 0) return <TrendingUp className="w-4 h-4" />;
    if (change < 0) return <TrendingDown className="w-4 h-4" />;
    return <Minus className="w-4 h-4" />;
  };

  const getTrendColor = () => {
    if (change === undefined || change === null) return 'text-muted-foreground';
    if (change > 0) return 'text-chart-2';
    if (change < 0) return 'text-destructive';
    return 'text-muted-foreground';
  };

  return (
    <Card className={cn('p-6', className)}>
      <div className="flex items-start justify-between mb-4">
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
        {icon && <div className="text-muted-foreground">{icon}</div>}
      </div>

      <div className="space-y-2">
        <p className="text-3xl font-bold tabular-nums" data-testid={`metric-${title.toLowerCase().replace(/\s+/g, '-')}`}>
          {value}
        </p>

        {(change !== undefined && change !== null) && (
          <div className={cn('flex items-center gap-1 text-sm font-medium', getTrendColor())}>
            {getTrendIcon()}
            <span>
              {change > 0 && '+'}
              {change.toFixed(1)}%
            </span>
            {changeLabel && <span className="text-muted-foreground ml-1">{changeLabel}</span>}
          </div>
        )}

        {subtitle && subtitleValue && (
          <div className="text-sm text-muted-foreground pt-1 border-t border-border/50">
            <span className="font-medium">{subtitle}:</span>{' '}
            <span className="tabular-nums">{subtitleValue}</span>
          </div>
        )}
      </div>
    </Card>
  );
}

import { Card } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { TrendingUp, TrendingDown, Minus, HelpCircle } from 'lucide-react';
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
  tooltip?: string;
}

export function MetricCard({ title, value, change, changeLabel, icon, className, subtitle, subtitleValue, tooltip }: MetricCardProps) {
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
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          {tooltip && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className="inline-flex"
                  data-testid={`help-${title.toLowerCase().replace(/\s+/g, '-')}`}
                  aria-label={`Help: ${title}`}
                >
                  <HelpCircle className="w-4 h-4 text-muted-foreground/50 hover:text-muted-foreground cursor-help" />
                </button>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p>{tooltip}</p>
              </TooltipContent>
            </Tooltip>
          )}
        </div>
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

import { FileText, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface EmptyStateProps {
  onUploadClick: () => void;
}

export function EmptyState({ onUploadClick }: EmptyStateProps) {
  return (
    <div className="flex items-center justify-center min-h-[600px]">
      <Card className="max-w-2xl w-full p-12 text-center">
        <div className="flex justify-center mb-6">
          <div className="p-4 rounded-full bg-primary/10">
            <FileText className="w-12 h-12 text-primary" />
          </div>
        </div>

        <h2 className="text-2xl font-bold mb-3">Welcome to TRACER C2 Analytics</h2>
        <p className="text-muted-foreground mb-8 max-w-md mx-auto">
          Upload your merchant CSV files from Clearent, ML, and Shift4 to start tracking
          retention rates, revenue trends, and account growth.
        </p>

        <Button size="lg" onClick={onUploadClick} data-testid="button-upload-first">
          <Upload className="w-5 h-5 mr-2" />
          Upload Your First Month
        </Button>

        <div className="mt-12 pt-8 border-t">
          <h3 className="text-sm font-semibold mb-4">What you'll get:</h3>
          <div className="grid gap-4 text-sm text-left md:grid-cols-2">
            <div className="flex gap-3">
              <div className="w-2 h-2 rounded-full bg-chart-1 mt-1.5 flex-shrink-0" />
              <div>
                <p className="font-medium">Retention Analysis</p>
                <p className="text-muted-foreground text-xs">Track retained, lost, and new accounts</p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="w-2 h-2 rounded-full bg-chart-2 mt-1.5 flex-shrink-0" />
              <div>
                <p className="font-medium">Revenue Metrics</p>
                <p className="text-muted-foreground text-xs">Month-over-month growth and trends</p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="w-2 h-2 rounded-full bg-chart-3 mt-1.5 flex-shrink-0" />
              <div>
                <p className="font-medium">Interactive Charts</p>
                <p className="text-muted-foreground text-xs">Visual insights across all processors</p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="w-2 h-2 rounded-full bg-chart-4 mt-1.5 flex-shrink-0" />
              <div>
                <p className="font-medium">Top Performers</p>
                <p className="text-muted-foreground text-xs">Identify your highest revenue accounts</p>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

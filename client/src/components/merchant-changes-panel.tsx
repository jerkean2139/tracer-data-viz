import { MerchantChanges, MerchantChange } from '@shared/schema';
import { formatCurrency } from '@/lib/analytics';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TrendingUp, TrendingDown, Users } from 'lucide-react';

interface MerchantChangesPanelProps {
  changes: MerchantChanges;
}

export function MerchantChangesPanel({ changes }: MerchantChangesPanelProps) {
  const { newMerchants, lostMerchants, retainedCount } = changes;

  if (newMerchants.length === 0 && lostMerchants.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Merchant Changes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No merchant changes to display. Select a date range with at least 2 months to see new and lost merchants.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* New Merchants */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-600 dark:text-green-400">
            <TrendingUp className="w-5 h-5" />
            New Merchants ({newMerchants.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {newMerchants.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Merchant ID</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead className="text-right">Revenue</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {newMerchants.map((merchant: MerchantChange) => (
                    <TableRow key={merchant.merchantId}>
                      <TableCell className="font-mono text-xs">
                        {merchant.merchantId}
                      </TableCell>
                      <TableCell className="font-medium">
                        {merchant.merchantName}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(merchant.revenue)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No new merchants in this period.</p>
          )}
        </CardContent>
      </Card>

      {/* Lost Merchants */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
            <TrendingDown className="w-5 h-5" />
            Lost Merchants ({lostMerchants.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {lostMerchants.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Merchant ID</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead className="text-right">Last Revenue</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lostMerchants.map((merchant: MerchantChange) => (
                    <TableRow key={merchant.merchantId}>
                      <TableCell className="font-mono text-xs">
                        {merchant.merchantId}
                      </TableCell>
                      <TableCell className="font-medium">
                        {merchant.merchantName}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(merchant.revenue)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No lost merchants in this period.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

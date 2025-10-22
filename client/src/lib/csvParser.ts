import Papa from 'papaparse';
import { MerchantRecord, Processor } from '@shared/schema';
import { format, parse } from 'date-fns';

export interface CSVParseResult {
  success: boolean;
  data?: MerchantRecord[];
  errors: string[];
  warnings: string[];
}

export interface CSVColumn {
  original: string;
  normalized: string;
}

const COLUMN_MAPPINGS: Record<string, string[]> = {
  merchantId: ['merchant id', 'merchantid', 'mid', 'merchant_id', 'id'],
  merchantName: ['merchant name', 'merchantname', 'name', 'merchant_name', 'business name', 'businessname'],
  salesAmount: ['sales amount', 'salesamount', 'sales', 'amount', 'revenue', 'volume', 'net', 'sales_amount'],
  branchId: ['branch id', 'branchid', 'branch', 'branch_id', 'agent', 'agent id'],
  month: ['month', 'date', 'period', 'month/year'],
};

function normalizeColumnName(name: string): string {
  return name.toLowerCase().trim().replace(/\s+/g, ' ');
}

function findColumnMapping(headers: string[]): Map<string, string> {
  const mapping = new Map<string, string>();
  const normalizedHeaders = headers.map(h => normalizeColumnName(h));

  for (const [targetField, aliases] of Object.entries(COLUMN_MAPPINGS)) {
    const matchedHeader = normalizedHeaders.find(h => aliases.includes(h));
    if (matchedHeader) {
      const originalIndex = normalizedHeaders.indexOf(matchedHeader);
      mapping.set(targetField, headers[originalIndex]);
    }
  }

  return mapping;
}

function parseMonthString(monthStr: string): string {
  const formats = [
    'yyyy-MM',
    'MM/yyyy',
    'MM-yyyy',
    'MMMM yyyy',
    'MMM yyyy',
    'yyyy/MM',
  ];

  for (const formatStr of formats) {
    try {
      const parsed = parse(monthStr, formatStr, new Date());
      if (!isNaN(parsed.getTime())) {
        return format(parsed, 'yyyy-MM');
      }
    } catch (e) {
    }
  }

  return monthStr;
}

function extractMonthFromFilename(filename: string): string | null {
  const patterns = [
    /(\w+)_(\w+)(\d{4})/i,
    /(\d{4})-(\d{2})/,
    /(\d{2})-(\d{4})/,
  ];

  for (const pattern of patterns) {
    const match = filename.match(pattern);
    if (match) {
      if (match[2] && match[3]) {
        const monthNames = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
        const monthIndex = monthNames.findIndex(m => m.startsWith(match[2].toLowerCase()));
        if (monthIndex !== -1) {
          return `${match[3]}-${String(monthIndex + 1).padStart(2, '0')}`;
        }
      }
      if (match[1] && match[2]) {
        return `${match[1]}-${match[2]}`;
      }
    }
  }

  return null;
}

export function detectProcessor(filename: string): 'Clearent' | 'ML' | 'Shift4' | null {
  const lower = filename.toLowerCase();
  if (lower.includes('clearent')) return 'Clearent';
  if (lower.includes('ml')) return 'ML';
  if (lower.includes('shift4')) return 'Shift4';
  return null;
}

export async function parseCSVFile(
  file: File,
  processor?: 'Clearent' | 'ML' | 'Shift4'
): Promise<CSVParseResult> {
  return new Promise((resolve) => {
    const errors: string[] = [];
    const warnings: string[] = [];

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header: string) => header.trim(),
      complete: (results) => {
        try {
          if (!results.data || results.data.length === 0) {
            resolve({
              success: false,
              errors: ['CSV file is empty'],
              warnings,
            });
            return;
          }

          const headers = results.meta.fields || [];
          const columnMapping = findColumnMapping(headers);

          const requiredFields = ['merchantId', 'merchantName', 'salesAmount'];
          const missingFields = requiredFields.filter(f => !columnMapping.has(f));

          if (missingFields.length > 0) {
            resolve({
              success: false,
              errors: [`Missing required columns: ${missingFields.join(', ')}`],
              warnings,
            });
            return;
          }

          const detectedProcessor = processor || detectProcessor(file.name);
          if (!detectedProcessor) {
            errors.push('Could not detect processor from filename. Please specify manually.');
          }

          const monthFromFilename = extractMonthFromFilename(file.name);
          const records: MerchantRecord[] = [];
          const seenMerchantIds = new Map<string, number>();

          (results.data as any[]).forEach((row, index) => {
            try {
              const merchantId = row[columnMapping.get('merchantId')!]?.toString().trim();
              const merchantName = row[columnMapping.get('merchantName')!]?.toString().trim();
              const salesAmountStr = row[columnMapping.get('salesAmount')!]?.toString().trim();

              if (!merchantId || !merchantName || !salesAmountStr) {
                warnings.push(`Row ${index + 2}: Missing required data, skipped`);
                return;
              }

              const salesAmount = parseFloat(salesAmountStr.replace(/[$,]/g, ''));
              if (isNaN(salesAmount)) {
                warnings.push(`Row ${index + 2}: Invalid sales amount "${salesAmountStr}", skipped`);
                return;
              }

              let month = row[columnMapping.get('month')!]?.toString().trim();
              if (!month && monthFromFilename) {
                month = monthFromFilename;
              } else if (month) {
                month = parseMonthString(month);
              }

              if (!month) {
                warnings.push(`Row ${index + 2}: Could not determine month, skipped`);
                return;
              }

              const branchId = columnMapping.has('branchId')
                ? row[columnMapping.get('branchId')!]?.toString().trim()
                : undefined;

              if (seenMerchantIds.has(merchantId)) {
                const existingIndex = seenMerchantIds.get(merchantId)!;
                if (records[existingIndex].salesAmount < salesAmount) {
                  records[existingIndex] = {
                    merchantId,
                    merchantName,
                    salesAmount,
                    branchId,
                    month,
                    processor: detectedProcessor as Processor,
                  };
                  warnings.push(`Duplicate Merchant ID "${merchantId}" found, kept higher revenue entry`);
                }
              } else {
                seenMerchantIds.set(merchantId, records.length);
                records.push({
                  merchantId,
                  merchantName,
                  salesAmount,
                  branchId,
                  month,
                  processor: detectedProcessor as 'Clearent' | 'ML' | 'Shift4',
                });
              }
            } catch (e) {
              warnings.push(`Row ${index + 2}: Error processing row - ${e}`);
            }
          });

          if (records.length === 0) {
            resolve({
              success: false,
              errors: ['No valid records found in CSV'],
              warnings,
            });
            return;
          }

          resolve({
            success: true,
            data: records,
            errors,
            warnings,
          });
        } catch (error) {
          resolve({
            success: false,
            errors: [`Error parsing CSV: ${error}`],
            warnings,
          });
        }
      },
      error: (error) => {
        resolve({
          success: false,
          errors: [`CSV parse error: ${error.message}`],
          warnings,
        });
      },
    });
  });
}

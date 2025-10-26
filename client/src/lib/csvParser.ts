import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { MerchantRecord, Processor, MerchantMetadata } from '@shared/schema';
import { format, parse } from 'date-fns';

export interface CSVParseResult {
  success: boolean;
  data?: MerchantRecord[];
  errors: string[];
  warnings: string[];
}

export interface LeadsParseResult {
  success: boolean;
  data?: MerchantMetadata[];
  errors: string[];
  warnings: string[];
}

export function getNextExpectedMonth(latestMonth: string | null): string {
  if (!latestMonth) {
    const now = new Date();
    return format(now, 'yyyy-MM');
  }

  try {
    const date = parse(latestMonth, 'yyyy-MM', new Date());
    const nextMonth = new Date(date);
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    return format(nextMonth, 'yyyy-MM');
  } catch {
    const now = new Date();
    return format(now, 'yyyy-MM');
  }
}

export interface CSVColumn {
  original: string;
  normalized: string;
}

const COLUMN_MAPPINGS: Record<string, string[]> = {
  merchantId: ['merchant id', 'merchantid', 'mid', 'merchant_id', 'id', 'client'],
  merchantName: ['merchant name', 'merchantname', 'merchant', 'name', 'merchant_name', 'business name', 'businessname', 'dba'],
  branchId: ['branch id', 'branchid', 'branch', 'branch_id', 'agent', 'agent id', 'branch number'],
  month: ['month', 'date', 'period', 'month/year', 'processingdate', 'processing date'],
  
  // Clearent & PayBright fields
  transactions: ['transaction', 'transactions', 'swipes', 'trans'],
  salesAmount: ['sales amount', 'salesamount', 'sales', 'amount', 'revenue', 'sales_amount', 'sale amount'],
  net: ['net', 'tracer net', 'net amount'],
  commissionPercent: ['%', 'commission %', 'commission', 'commission percent', 'comm %', 'bps'],
  agentNet: ['agent net', 'agentnet', 'agent amount', 'bank payout', 'bankpayout'],
  
  // Shift4 fields
  payoutAmount: ['payout amount', 'payoutamount', 'payout'],
  volume: ['volume', 'vol'],
  sales: ['sales'],
  refunds: ['refunds', 'refund'],
  rejectAmount: ['reject amount', 'rejectamount', 'reject'],
  bankSplit: ['bank split', 'banksplit'],
  bankPayout: ['bank payout'],
  
  // ML fields
  income: ['income', 'inc'],
  expenses: ['expenses', 'expense', 'exp'],
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
    'MMM-yy',  // Jun-25
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
  // Try to parse common month-year formats first (like "January 2025", "Jan 2024")
  const result = parseMonthString(filename);
  if (result && result.match(/^\d{4}-\d{2}$/)) {
    return result;
  }

  // Fall back to regex patterns for filename-style formats
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

export function detectProcessor(filename: string): 'Clearent' | 'ML' | 'Shift4' | 'TSYS' | 'Micamp' | 'PayBright' | 'TRX' | null {
  const lower = filename.toLowerCase();
  if (lower.includes('clearent')) return 'Clearent';
  if (lower.includes('ml') && !lower.includes('micamp')) return 'ML';
  if (lower.includes('shift4')) return 'Shift4';
  if (lower.includes('global') || lower.includes('tsys')) return 'TSYS';
  if (lower.includes('micamp')) return 'Micamp';
  if (lower.includes('paybright') || lower.includes('pb_') || lower.includes('_pb_')) return 'PayBright';
  if (lower.includes('trx')) return 'TRX';
  return null;
}

async function convertXLSXToCSV(file: File): Promise<{csvString: string, sheetName: string}[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        
        const allSheets: {csvString: string, sheetName: string}[] = [];
        
        console.log('=== XLSX CONVERSION ===');
        console.log('File:', file.name);
        console.log('Total Sheets:', workbook.SheetNames.length);
        console.log('Sheet Names:', workbook.SheetNames.join(', '));
        
        // Process ALL sheets in the workbook
        for (const sheetName of workbook.SheetNames) {
          const worksheet = workbook.Sheets[sheetName];
          const csvString = XLSX.utils.sheet_to_csv(worksheet);
          
          // Debug: Log each sheet
          const firstRow = csvString.split('\n')[0];
          console.log(`\n  Sheet: ${sheetName}`);
          console.log(`  Headers: ${firstRow}`);
          console.log(`  Data Rows: ${csvString.split('\n').length - 1}`);
          
          allSheets.push({ csvString, sheetName });
        }
        
        console.log('=======================');
        
        resolve(allSheets);
      } catch (error) {
        reject(new Error(`Failed to convert XLSX to CSV: ${error}`));
      }
    };
    
    reader.onerror = () => reject(new Error('Failed to read XLSX file'));
    reader.readAsArrayBuffer(file);
  });
}

export async function parseCSVFile(
  file: File,
  processor?: 'Clearent' | 'ML' | 'Shift4' | 'TSYS' | 'Micamp' | 'PayBright' | 'TRX'
): Promise<CSVParseResult> {
  const isXLSX = file.name.toLowerCase().endsWith('.xlsx');
  
  if (isXLSX) {
    try {
      const allSheets = await convertXLSXToCSV(file);
      
      // Process each sheet separately and combine results
      const allRecords: MerchantRecord[] = [];
      const allErrors: string[] = [];
      const allWarnings: string[] = [];
      
      for (const { csvString, sheetName } of allSheets) {
        const csvBlob = new Blob([csvString], { type: 'text/csv' });
        const csvFile = new File([csvBlob], `${file.name}_${sheetName}.csv`, { type: 'text/csv' });
        const result = await parseCSVData(csvFile, processor, sheetName);
        
        if (result.success && result.data) {
          allRecords.push(...result.data);
        }
        allErrors.push(...result.errors);
        allWarnings.push(...result.warnings);
      }
      
      return {
        success: allRecords.length > 0,
        data: allRecords.length > 0 ? allRecords : undefined,
        errors: allErrors,
        warnings: allWarnings,
      };
    } catch (error) {
      return {
        success: false,
        errors: [`Failed to process XLSX file: ${error}`],
        warnings: [],
      };
    }
  }
  
  return parseCSVData(file, processor);
}

function parseCSVData(
  file: File,
  processor?: string,
  xlsxSheetName?: string,
  skipLines: number = 0
): Promise<CSVParseResult> {
  return new Promise(async (resolve) => {
    const errors: string[] = [];
    const warnings: string[] = [];

    // If we need to skip lines, read file as text and manually skip
    let fileToProcess = file;
    if (skipLines > 0) {
      const text = await file.text();
      const lines = text.split('\n');
      const skippedText = lines.slice(skipLines).join('\n');
      fileToProcess = new File([skippedText], file.name, { type: 'text/csv' });
    }

    Papa.parse(fileToProcess, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header: string) => header.trim(),
      complete: async (results) => {
        try {
          if (!results.data || results.data.length === 0) {
            resolve({
              success: false,
              errors: ['CSV file is empty'],
              warnings,
            });
            return;
          }

          let headers = results.meta.fields || [];
          
          // Check if first row looks like a title row (e.g., "Residuals - ...")
          // Only check on first parse attempt (skipLines === 0)
          if (skipLines === 0 && headers.length > 0) {
            const firstHeader = headers[0].toLowerCase();
            if (firstHeader.includes('residuals') || firstHeader.includes('report') || 
                (headers.length === 1 && !firstHeader.includes('merchant') && !firstHeader.includes('client'))) {
              // This looks like a title row, reparse skipping first line
              console.log('Detected title row, reparsing...');
              const result = await parseCSVData(file, processor, xlsxSheetName, 1);
              resolve(result);
              return;
            }
          }
          const columnMapping = findColumnMapping(headers);

          // Debug: Log parsing details
          console.log('=== CSV PARSING ===');
          console.log('File:', file.name);
          console.log('Headers found:', headers.join(', '));
          console.log('Column Mapping:', Object.fromEntries(columnMapping));
          console.log('Data rows:', results.data.length);
          console.log('===================');

          const requiredFields = ['merchantId', 'merchantName'];
          const missingFields = requiredFields.filter(f => !columnMapping.has(f));

          if (missingFields.length > 0) {
            resolve({
              success: false,
              errors: [
                `Missing required columns: ${missingFields.join(', ')}`,
                `Found headers: ${headers.join(', ')}`,
                `Looking for: Merchant ID/Name`
              ],
              warnings,
            });
            return;
          }

          const detectedProcessor = processor || detectProcessor(file.name);
          if (!detectedProcessor) {
            errors.push('Could not detect processor from filename. Please specify manually.');
          }

          // Try to extract month from filename, then from XLSX sheet name
          let monthFromFilename = extractMonthFromFilename(file.name);
          if (!monthFromFilename && xlsxSheetName) {
            monthFromFilename = extractMonthFromFilename(xlsxSheetName);
          }
          
          const records: MerchantRecord[] = [];
          const seenMerchantIds = new Map<string, number>();

          (results.data as any[]).forEach((row, index) => {
            try {
              const merchantId = row[columnMapping.get('merchantId')!]?.toString().trim();
              const merchantName = row[columnMapping.get('merchantName')!]?.toString().trim();

              if (!merchantId || !merchantName) {
                warnings.push(`Row ${index + 2}: Missing required data, skipped`);
                return;
              }

              // Helper function to safely parse numeric values
              const parseNumeric = (fieldName: string): number | undefined => {
                if (!columnMapping.has(fieldName)) return undefined;
                const value = row[columnMapping.get(fieldName)!]?.toString().trim();
                if (!value) return undefined;
                const numeric = parseFloat(value.replace(/[$,%]/g, ''));
                return isNaN(numeric) ? undefined : numeric;
              };

              // Extract all possible fields
              const salesAmount = parseNumeric('salesAmount');
              const transactions = parseNumeric('transactions');
              const net = parseNumeric('net');
              const commissionPercent = parseNumeric('commissionPercent');
              const agentNet = parseNumeric('agentNet');
              const payoutAmount = parseNumeric('payoutAmount');
              const volume = parseNumeric('volume');
              const sales = parseNumeric('sales');
              const refunds = parseNumeric('refunds');
              const rejectAmount = parseNumeric('rejectAmount');
              const bankSplit = parseNumeric('bankSplit');
              const bankPayout = parseNumeric('bankPayout');
              const income = parseNumeric('income');
              const expenses = parseNumeric('expenses');

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

              // Validation: Clearent & ML MUST have 'net' field populated
              if ((detectedProcessor === 'Clearent' || detectedProcessor === 'ML') && (net === undefined || net === null)) {
                errors.push(`Row ${index + 2} (${merchantName}): Missing required 'Net' field for ${detectedProcessor} processor. Please add the Net value and re-upload.`);
                return;
              }

              // For revenue comparison in deduplication, prioritize: net > salesAmount > payoutAmount > income
              const revenueForComparison = net ?? salesAmount ?? payoutAmount ?? income ?? 0;

              const record: MerchantRecord = {
                merchantId,
                merchantName,
                month,
                processor: detectedProcessor as Processor,
                branchId,
                salesAmount,
                transactions,
                net,
                commissionPercent,
                agentNet,
                payoutAmount,
                volume,
                sales,
                refunds,
                rejectAmount,
                bankSplit,
                bankPayout,
                income,
                expenses,
              };

              if (seenMerchantIds.has(merchantId)) {
                const existingIndex = seenMerchantIds.get(merchantId)!;
                const existingRevenue = records[existingIndex].net ?? records[existingIndex].salesAmount ?? records[existingIndex].payoutAmount ?? records[existingIndex].income ?? 0;
                if (existingRevenue < revenueForComparison) {
                  records[existingIndex] = record;
                  warnings.push(`Duplicate Merchant ID "${merchantId}" found, kept higher revenue entry`);
                }
              } else {
                seenMerchantIds.set(merchantId, records.length);
                records.push(record);
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

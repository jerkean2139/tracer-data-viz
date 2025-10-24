import XLSX from 'xlsx';
import { db } from './db';
import { merchantRecords, uploadedFiles } from '@shared/schema';
import { parse, format } from 'date-fns';

interface ProcessedRecord {
  merchantId: string;
  merchantName: string;
  salesAmount: number;
  net?: number;
  payoutAmount?: number;
  agentNet?: number;
  branchId?: string;
  month: string;
  processor: string;
}

// Parse month from various formats
function parseMonth(monthStr: string): string {
  const formats = ['yyyy-MM', 'MM/yyyy', 'MMMM yyyy', 'MMM yyyy', 'MMM-yy'];
  for (const fmt of formats) {
    try {
      const parsed = parse(monthStr, fmt, new Date());
      if (!isNaN(parsed.getTime())) {
        return format(parsed, 'yyyy-MM');
      }
    } catch (e) {}
  }
  return monthStr;
}

// Normalize column names for flexible matching
function normalizeColumn(name: string): string {
  return name.toLowerCase().trim().replace(/\s+/g, ' ');
}

// Extract records from a sheet
function extractRecords(sheet: XLSX.WorkSheet, processor: string, targetMonth: string): ProcessedRecord[] {
  const data = XLSX.utils.sheet_to_json(sheet, { defval: '' });
  const records: ProcessedRecord[] = [];
  
  for (const row of data as any[]) {
    // Get headers (keys of the row object)
    const headers = Object.keys(row);
    const normalized = headers.map(h => normalizeColumn(h));
    
    // Find columns
    const idCol = headers[normalized.findIndex(h => ['merchant id', 'merchantid', 'mid', 'client'].includes(h))] || '';
    const nameCol = headers[normalized.findIndex(h => ['merchant name', 'merchantname', 'dba', 'merchant'].includes(h))] || '';
    const monthCol = headers[normalized.findIndex(h => ['month', 'date', 'processing date', 'processingdate'].includes(h))] || '';
    const branchCol = headers[normalized.findIndex(h => ['branch id', 'branchid', 'branch', 'branch number'].includes(h))] || '';
    
    // Revenue columns (processor-specific)
    let netCol = '';
    let payoutCol = '';
    let salesCol = '';
    let agentNetCol = '';
    
    if (processor === 'TRX' || processor === 'Shift4') {
      payoutCol = headers[normalized.findIndex(h => ['payout amount', 'payoutamount', 'bank payout'].includes(h))] || '';
      salesCol = headers[normalized.findIndex(h => ['sales amount', 'salesamount', 'sales'].includes(h))] || '';
    } else {
      netCol = headers[normalized.findIndex(h => ['net', 'tracer net'].includes(h))] || '';
      salesCol = headers[normalized.findIndex(h => ['sales amount', 'salesamount', 'sales'].includes(h))] || '';
      if (processor === 'Clearent') {
        agentNetCol = headers[normalized.findIndex(h => ['agent net', 'agentnet'].includes(h))] || '';
      }
    }
    
    const merchantId = String(row[idCol] || '').trim();
    const merchantName = String(row[nameCol] || '').trim();
    let monthValue = String(row[monthCol] || '').trim();
    
    // Skip header rows or empty rows
    if (!merchantId || merchantId.toLowerCase().includes('merchant') || merchantId.toLowerCase().includes('total')) continue;
    if (!merchantName || merchantName.toLowerCase().includes('merchant') || merchantName.toLowerCase().includes('total')) continue;
    
    // Parse month if present in data
    if (monthValue) {
      monthValue = parseMonth(monthValue);
    } else {
      monthValue = targetMonth; // Use sheet name month
    }
    
    // Skip if not the target month
    if (monthValue !== targetMonth) continue;
    
    // Get revenue values
    const salesAmount = parseFloat(String(row[salesCol] || '0').replace(/[^0-9.-]/g, '')) || 0;
    const net = netCol ? (parseFloat(String(row[netCol] || '0').replace(/[^0-9.-]/g, '')) || undefined) : undefined;
    const payoutAmount = payoutCol ? (parseFloat(String(row[payoutCol] || '0').replace(/[^0-9.-]/g, '')) || undefined) : undefined;
    const agentNet = agentNetCol ? (parseFloat(String(row[agentNetCol] || '0').replace(/[^0-9.-]/g, '')) || undefined) : undefined;
    const branchId = branchCol ? String(row[branchCol] || '').trim() || undefined : undefined;
    
    records.push({
      merchantId,
      merchantName,
      salesAmount,
      net,
      payoutAmount,
      agentNet,
      branchId,
      month: monthValue,
      processor
    });
  }
  
  return records;
}

// Main processing function
async function uploadMissingMonths() {
  console.log('🚀 Starting upload of missing months...\n');
  
  const allRecords: ProcessedRecord[] = [];
  
  // Process TRX file for Jan-Apr 2024
  console.log('📄 Processing TRX file...');
  const trxFile = XLSX.readFile('attached_assets/TRX_1761333451755.xlsx');
  const trxNeeded = [
    { pattern: /jan(?:uary)?\s*2024/i, month: '2024-01' },
    { pattern: /feb(?:ruary)?\s*2024/i, month: '2024-02' },
    { pattern: /mar(?:ch)?\s*2024/i, month: '2024-03' },
    { pattern: /apr(?:il)?\s*2024/i, month: '2024-04' },
  ];
  
  for (const sheetName of trxFile.SheetNames) {
    for (const { pattern, month } of trxNeeded) {
      if (pattern.test(sheetName)) {
        console.log(`  ✅ Found ${sheetName} → ${month}`);
        const sheet = trxFile.Sheets[sheetName];
        const records = extractRecords(sheet, 'TRX', month);
        console.log(`     Extracted ${records.length} records`);
        allRecords.push(...records);
      }
    }
  }
  
  // Process Micamp file for Jan-Feb 2024
  console.log('\n📄 Processing Micamp file...');
  const micampFile = XLSX.readFile('attached_assets/MiCamp_1761333451755.xlsx');
  const micampNeeded = [
    { pattern: /jan(?:uary)?\s*2024/i, month: '2024-01' },
    { pattern: /feb(?:ruary)?\s*2024/i, month: '2024-02' },
  ];
  
  for (const sheetName of micampFile.SheetNames) {
    for (const { pattern, month } of micampNeeded) {
      if (pattern.test(sheetName)) {
        console.log(`  ✅ Found ${sheetName} → ${month}`);
        const sheet = micampFile.Sheets[sheetName];
        const records = extractRecords(sheet, 'Micamp', month);
        console.log(`     Extracted ${records.length} records`);
        allRecords.push(...records);
      }
    }
  }
  
  console.log(`\n📊 Total records to upload: ${allRecords.length}`);
  
  if (allRecords.length === 0) {
    console.log('❌ No records found to upload!');
    return;
  }
  
  // Insert records into database
  console.log('\n💾 Inserting records into database...');
  try {
    // Insert in batches (with upsert logic to keep highest revenue)
    const batchSize = 100;
    for (let i = 0; i < allRecords.length; i += batchSize) {
      const batch = allRecords.slice(i, i + batchSize);
      
      for (const record of batch) {
        await db.insert(merchantRecords)
          .values(record)
          .onConflictDoUpdate({
            target: [merchantRecords.merchantId, merchantRecords.month, merchantRecords.processor],
            set: {
              merchantName: record.merchantName,
              salesAmount: record.salesAmount,
              net: record.net,
              payoutAmount: record.payoutAmount,
              agentNet: record.agentNet,
              branchId: record.branchId,
            }
          });
      }
      
      console.log(`  Inserted batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(allRecords.length / batchSize)}`);
    }
    
    console.log('\n✅ Successfully uploaded all missing month data!');
    console.log('\nSummary by processor:');
    
    const byProcessor = allRecords.reduce((acc, r) => {
      const key = `${r.processor} ${r.month}`;
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    Object.entries(byProcessor).sort().forEach(([key, count]) => {
      console.log(`  ${key}: ${count} records`);
    });
    
  } catch (error) {
    console.error('\n❌ Error inserting records:', error);
    throw error;
  }
}

// Run the upload
uploadMissingMonths().catch(console.error);

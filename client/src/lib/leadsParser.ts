import * as XLSX from 'xlsx';
import { MerchantMetadata } from '@shared/schema';

export interface LeadsParseResult {
  success: boolean;
  data?: MerchantMetadata[];
  errors: string[];
  warnings: string[];
}

function normalizeColumnName(name: string): string {
  return name.toLowerCase().trim().replace(/\s+/g, ' ');
}

// Parse Leads file (MyLeads Excel)
export async function parseLeadsFile(file: File): Promise<LeadsParseResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    // Read Excel file
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    
    // Get first sheet
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // Convert to JSON
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
    
    if (jsonData.length === 0) {
      errors.push('File is empty');
      return { success: false, errors, warnings };
    }

    const headers = jsonData[0] as string[];
    const rows = jsonData.slice(1);

    // Find column indices
    const getColumnIndex = (columnNames: string[]) => {
      return headers.findIndex(h => 
        columnNames.some(name => normalizeColumnName(h).includes(normalizeColumnName(name)))
      );
    };

    const midIndex = getColumnIndex(['Existing MID', 'MID']);
    const dbaIndex = getColumnIndex(['DBA']);
    const branchIndex = getColumnIndex(['Partner Branch Number', 'Branch Number']);
    const statusIndex = getColumnIndex(['Status']);
    const statusCategoryIndex = getColumnIndex(['Status Category']);
    const processorIndex = getColumnIndex(['Current Processor', 'Processor']);

    if (midIndex === -1 || dbaIndex === -1) {
      errors.push('Required columns not found: Existing MID and DBA are required');
      return { success: false, errors, warnings };
    }

    const metadata: MerchantMetadata[] = [];

    rows.forEach((row, index) => {
      const mid = row[midIndex]?.toString().trim();
      const dba = row[dbaIndex]?.toString().trim();

      if (!mid || !dba) {
        warnings.push(`Row ${index + 2}: Missing MID or DBA, skipping`);
        return;
      }

      metadata.push({
        merchantId: mid,
        dbaName: dba,
        partnerBranchNumber: branchIndex !== -1 ? row[branchIndex]?.toString().trim() : undefined,
        status: statusIndex !== -1 ? row[statusIndex]?.toString().trim() : undefined,
        statusCategory: statusCategoryIndex !== -1 ? row[statusCategoryIndex]?.toString().trim() : undefined,
        currentProcessor: processorIndex !== -1 ? row[processorIndex]?.toString().trim() : undefined,
      });
    });

    if (metadata.length === 0) {
      errors.push('No valid merchant metadata found in file');
      return { success: false, errors, warnings };
    }

    return { success: true, data: metadata, errors, warnings };

  } catch (error) {
    errors.push(`Failed to parse leads file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return { success: false, errors, warnings };
  }
}

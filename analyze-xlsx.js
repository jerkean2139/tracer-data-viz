import * as XLSX from 'xlsx';
import { readFileSync } from 'fs';

const files = [
  'attached_assets/TRX June 2025 - Raw_1761155038324.xlsx',
  'attached_assets/PayBright_Aug2025 - raw_1761155157615.xlsx'
];

files.forEach(filePath => {
  console.log('\n========================================');
  console.log('FILE:', filePath.split('/').pop());
  console.log('========================================');
  
  try {
    const fileBuffer = readFileSync(filePath);
    const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
    
    console.log('Total Sheets:', workbook.SheetNames.length);
    console.log('Sheet Names:', workbook.SheetNames.join(', '));
    
    // Examine first sheet
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    
    console.log('\n--- First Sheet:', firstSheetName, '---');
    console.log('Total Rows:', jsonData.length);
    console.log('\nFirst 5 rows:');
    jsonData.slice(0, 5).forEach((row, i) => {
      console.log(`Row ${i}:`, row.slice(0, 10).join(' | '));
    });
  } catch (error) {
    console.error('Error:', error.message);
  }
});

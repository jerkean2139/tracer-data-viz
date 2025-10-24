const XLSX = require('xlsx');

try {
  const filePath = './attached_assets/PB_1761337959849.xlsx';
  const workbook = XLSX.readFile(filePath);
  
  console.log('Sheet Names:', workbook.SheetNames);
  console.log('\n=== Sheet Details ===\n');
  
  workbook.SheetNames.forEach(sheetName => {
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
    
    console.log(`Sheet: "${sheetName}"`);
    console.log(`Total rows: ${data.length}`);
    
    // Show first 10 rows
    console.log('\nFirst 10 rows:');
    data.slice(0, 10).forEach((row, idx) => {
      console.log(`Row ${idx}:`, JSON.stringify(row));
    });
    
    // If there are headers, show them separately
    if (data.length > 0) {
      console.log('\nColumn headers (from first row):');
      data[0].forEach((col, idx) => {
        console.log(`  Column ${idx}: "${col}"`);
      });
    }
    
    console.log('\n' + '='.repeat(60) + '\n');
  });
} catch (error) {
  console.error('Error:', error.message);
  console.error(error.stack);
}

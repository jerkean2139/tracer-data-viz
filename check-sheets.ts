import XLSX from 'xlsx';

console.log('📄 TRX XLSX Sheets:');
const trxFile = XLSX.readFile('attached_assets/TRX_1761333451755.xlsx');
trxFile.SheetNames.forEach((name, i) => console.log(`  ${i + 1}. "${name}"`));

console.log('\n📄 Micamp XLSX Sheets:');
const micampFile = XLSX.readFile('attached_assets/MiCamp_1761333451755.xlsx');
micampFile.SheetNames.forEach((name, i) => console.log(`  ${i + 1}. "${name}"`));

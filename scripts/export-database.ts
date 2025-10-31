import { db } from "../server/db.js";
import { merchantRecords, merchantMetadata, uploadedFiles, partnerLogos } from "../shared/schema.js";
import * as fs from "fs";
import * as path from "path";

async function exportDatabase() {
  console.log("🔄 Starting database export...");
  
  const exportDir = path.join(process.cwd(), "database-exports");
  if (!fs.existsSync(exportDir)) {
    fs.mkdirSync(exportDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const exportFile = path.join(exportDir, `tracer-c2-backup-${timestamp}.sql`);
  
  let sqlContent = `-- TRACER C2 Database Export
-- Generated: ${new Date().toISOString()}
-- Environment: Development
-- 
-- IMPORTANT: Import this file into your PRODUCTION database
--
-- Instructions:
-- 1. Publish your Replit app (creates production database)
-- 2. Go to Tools > Database in the published deployment
-- 3. Open the SQL console
-- 4. Copy and paste this entire file
-- 5. Execute the SQL
--

-- Disable triggers and foreign key checks for faster import
SET session_replication_role = 'replica';

`;

  try {
    // Export merchant_records
    console.log("📊 Exporting merchant_records...");
    const records = await db.select().from(merchantRecords);
    
    if (records.length > 0) {
      sqlContent += `\n-- ==========================================\n`;
      sqlContent += `-- Merchant Records (${records.length} records)\n`;
      sqlContent += `-- ==========================================\n\n`;
      
      // Batch insert for better performance
      const batchSize = 100;
      for (let i = 0; i < records.length; i += batchSize) {
        const batch = records.slice(i, i + batchSize);
        sqlContent += `INSERT INTO merchant_records (merchant_id, merchant_name, month, processor, sales_amount, net, payout_amount, branch_id) VALUES\n`;
        
        const values = batch.map((r, idx) => {
          const salesAmount = r.salesAmount !== null ? r.salesAmount : 'NULL';
          const net = r.net !== null ? r.net : 'NULL';
          const payoutAmount = r.payoutAmount !== null ? r.payoutAmount : 'NULL';
          const branchId = r.branchId ? `'${r.branchId.replace(/'/g, "''")}'` : 'NULL';
          
          return `  ('${r.merchantId.replace(/'/g, "''")}', '${r.merchantName.replace(/'/g, "''")}', '${r.month}', '${r.processor}', ${salesAmount}, ${net}, ${payoutAmount}, ${branchId})`;
        }).join(',\n');
        
        sqlContent += values;
        sqlContent += `\nON CONFLICT (merchant_id, month, processor) DO UPDATE SET
  merchant_name = EXCLUDED.merchant_name,
  sales_amount = EXCLUDED.sales_amount,
  net = EXCLUDED.net,
  payout_amount = EXCLUDED.payout_amount,
  branch_id = EXCLUDED.branch_id;\n\n`;
      }
    }

    // Export merchant_metadata
    console.log("📋 Exporting merchant_metadata...");
    const metadata = await db.select().from(merchantMetadata);
    
    if (metadata.length > 0) {
      sqlContent += `\n-- ==========================================\n`;
      sqlContent += `-- Merchant Metadata (${metadata.length} records)\n`;
      sqlContent += `-- ==========================================\n\n`;
      
      const batchSize = 100;
      for (let i = 0; i < metadata.length; i += batchSize) {
        const batch = metadata.slice(i, i + batchSize);
        sqlContent += `INSERT INTO merchant_metadata (merchant_id, dba_name, partner_branch_number, status, status_category, current_processor) VALUES\n`;
        
        const values = batch.map((m) => {
          const branchNum = m.partnerBranchNumber ? `'${m.partnerBranchNumber.replace(/'/g, "''")}'` : 'NULL';
          const status = m.status ? `'${m.status.replace(/'/g, "''")}'` : 'NULL';
          const statusCat = m.statusCategory ? `'${m.statusCategory.replace(/'/g, "''")}'` : 'NULL';
          const processor = m.currentProcessor ? `'${m.currentProcessor.replace(/'/g, "''")}'` : 'NULL';
          
          return `  ('${m.merchantId.replace(/'/g, "''")}', '${m.dbaName.replace(/'/g, "''")}', ${branchNum}, ${status}, ${statusCat}, ${processor})`;
        }).join(',\n');
        
        sqlContent += values;
        sqlContent += `\nON CONFLICT (merchant_id) DO UPDATE SET
  dba_name = EXCLUDED.dba_name,
  partner_branch_number = EXCLUDED.partner_branch_number,
  status = EXCLUDED.status,
  status_category = EXCLUDED.status_category,
  current_processor = EXCLUDED.current_processor,
  updated_at = CURRENT_TIMESTAMP;\n\n`;
      }
    }

    // Export uploaded_files
    console.log("📁 Exporting uploaded_files...");
    const files = await db.select().from(uploadedFiles);
    
    if (files.length > 0) {
      sqlContent += `\n-- ==========================================\n`;
      sqlContent += `-- Uploaded Files (${files.length} records)\n`;
      sqlContent += `-- ==========================================\n\n`;
      
      sqlContent += `INSERT INTO uploaded_files (id, file_name, processor, month, record_count, uploaded_at, is_valid, errors) VALUES\n`;
      
      const values = files.map((f, idx) => {
        const errors = f.errors ? `'${JSON.stringify(f.errors).replace(/'/g, "''")}'` : 'NULL';
        return `  ('${f.id}', '${f.fileName.replace(/'/g, "''")}', '${f.processor}', '${f.month}', ${f.recordCount}, '${f.uploadedAt.toISOString()}', ${f.isValid}, ${errors})`;
      }).join(',\n');
      
      sqlContent += values;
      sqlContent += `\nON CONFLICT (id) DO NOTHING;\n\n`;
    }

    // Export partner_logos
    console.log("🖼️  Exporting partner_logos...");
    const logos = await db.select().from(partnerLogos);
    
    if (logos.length > 0) {
      sqlContent += `\n-- ==========================================\n`;
      sqlContent += `-- Partner Logos (${logos.length} records)\n`;
      sqlContent += `-- ==========================================\n\n`;
      
      sqlContent += `INSERT INTO partner_logos (id, branch_id, logo_url, created_at, updated_at) VALUES\n`;
      
      const values = logos.map((l) => {
        return `  (${l.id}, '${l.branchId}', '${l.logoUrl.replace(/'/g, "''")}', '${l.createdAt.toISOString()}', '${l.updatedAt.toISOString()}')`;
      }).join(',\n');
      
      sqlContent += values;
      sqlContent += `\nON CONFLICT (id) DO UPDATE SET
  branch_id = EXCLUDED.branch_id,
  logo_url = EXCLUDED.logo_url,
  updated_at = CURRENT_TIMESTAMP;\n\n`;
    }

    // Re-enable triggers
    sqlContent += `\n-- Re-enable triggers and foreign key checks\n`;
    sqlContent += `SET session_replication_role = 'origin';\n\n`;
    
    sqlContent += `-- Export complete!\n`;
    sqlContent += `-- Total records exported:\n`;
    sqlContent += `--   Merchant Records: ${records.length}\n`;
    sqlContent += `--   Merchant Metadata: ${metadata.length}\n`;
    sqlContent += `--   Uploaded Files: ${files.length}\n`;
    sqlContent += `--   Partner Logos: ${logos.length}\n`;

    // Write to file
    fs.writeFileSync(exportFile, sqlContent);

    console.log("\n✅ Database export completed successfully!");
    console.log(`📄 Export file: ${exportFile}`);
    console.log(`📊 Total records exported: ${records.length + metadata.length + files.length + logos.length}`);
    console.log("\n📋 Summary:");
    console.log(`   - Merchant Records: ${records.length}`);
    console.log(`   - Merchant Metadata: ${metadata.length}`);
    console.log(`   - Uploaded Files: ${files.length}`);
    console.log(`   - Partner Logos: ${logos.length}`);
    console.log("\n🚀 Next steps:");
    console.log("   1. Download the export file from the 'database-exports' folder");
    console.log("   2. Publish your Replit app (creates production database)");
    console.log("   3. Go to your published app's database console");
    console.log("   4. Paste and execute the SQL file content");
    
    return exportFile;
  } catch (error) {
    console.error("❌ Export failed:", error);
    throw error;
  }
}

// Run export
exportDatabase()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

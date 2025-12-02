# Production Database Migration Guide

## Overview
This guide helps you migrate data from the **Development** database to the **Production** database for the TRACER C2 dashboard.

## Data Summary
- **merchant_records**: 3,247 records (426 KB)
- **merchant_metadata**: 4,115 records (559 KB)  
- **uploaded_files**: 9 records (2.1 KB)

## Migration Files
Three CSV files have been created in your project root:
1. `migration_merchant_records.csv`
2. `migration_merchant_metadata.csv`
3. `migration_uploaded_files.csv`

---

## Option 1: Using Replit Database Pane (Recommended)

### Step 1: Access Production Database
1. Open the **Database** tool in Replit's left sidebar
2. Switch to **Production** environment (top-right selector)

### Step 2: Download CSV Files
Since the CSV files are in your development environment, you need to download them first:
1. In the Replit file explorer, find each `migration_*.csv` file
2. Right-click → **Download** each file to your computer

### Step 3: Import Using SQL
For each table, run the following SQL commands in the Production database console:

#### Import uploaded_files:
```sql
-- Option A: If you can upload the CSV file to production
\COPY uploaded_files(id, file_name, processor, month, record_count, uploaded_at, is_valid, errors, tenant_id) 
FROM 'migration_uploaded_files.csv' 
WITH (FORMAT csv, HEADER true);

-- Option B: Manual INSERT (if \COPY doesn't work)
-- Open migration_uploaded_files.csv and create INSERT statements
```

#### Import merchant_metadata:
```sql
\COPY merchant_metadata(id, merchant_id, dba_name, partner_branch_number, status, status_category, current_processor, created_at, updated_at, tenant_id) 
FROM 'migration_merchant_metadata.csv' 
WITH (FORMAT csv, HEADER true);
```

#### Import merchant_records:
```sql
\COPY merchant_records(id, merchant_id, merchant_name, month, processor, branch_id, sales_amount, transactions, net, commission_percent, partner_net, payout_amount, volume, sales, refunds, reject_amount, bank_split, bank_payout, income, expenses, memo, created_at, updated_at, tenant_id) 
FROM 'migration_merchant_records.csv' 
WITH (FORMAT csv, HEADER true);
```

### Step 4: Verify Import
```sql
SELECT COUNT(*) as uploaded_files_count FROM uploaded_files;
SELECT COUNT(*) as merchant_metadata_count FROM merchant_metadata;
SELECT COUNT(*) as merchant_records_count FROM merchant_records;
```

Expected counts:
- uploaded_files: 9
- merchant_metadata: 4,115
- merchant_records: 3,247

---

## Option 2: Using a Migration Script (Alternative)

If you have command-line access to your production database:

```bash
# Set production database URL
export PROD_DATABASE_URL="your_production_connection_string"

# Import each table
psql $PROD_DATABASE_URL -c "\COPY uploaded_files FROM 'migration_uploaded_files.csv' WITH (FORMAT csv, HEADER true)"
psql $PROD_DATABASE_URL -c "\COPY merchant_metadata FROM 'migration_merchant_metadata.csv' WITH (FORMAT csv, HEADER true)"
psql $PROD_DATABASE_URL -c "\COPY merchant_records FROM 'migration_merchant_records.csv' WITH (FORMAT csv, HEADER true)"

# Verify
psql $PROD_DATABASE_URL -c "SELECT COUNT(*) FROM uploaded_files;"
psql $PROD_DATABASE_URL -c "SELECT COUNT(*) FROM merchant_metadata;"
psql $PROD_DATABASE_URL -c "SELECT COUNT(*) FROM merchant_records;"
```

---

## Important Notes

### Before Migration:
- ⚠️ **Backup production** if it contains any existing data you want to keep
- The CSV files include all columns including timestamps and IDs
- If you have existing data in production, consider whether you want to:
  - Replace it (TRUNCATE tables first)
  - Merge it (may cause ID conflicts)
  - Keep both (handle ID conflicts manually)

### If Tables Already Have Data:
```sql
-- Clear existing data (CAUTION: This deletes all data!)
TRUNCATE TABLE uploaded_files CASCADE;
TRUNCATE TABLE merchant_metadata CASCADE;
TRUNCATE TABLE merchant_records CASCADE;
```

### Handling ID Conflicts:
If you get "duplicate key" errors during import:
1. merchant_records and merchant_metadata use serial IDs - you may need to adjust sequences
2. uploaded_files uses UUID-style IDs - should not conflict

---

## Troubleshooting

### Error: "COPY command not supported"
The Replit Database pane may not support `\COPY`. In this case:
1. Request a manual INSERT statement generation (ask the agent)
2. Or use a database client like pgAdmin or TablePlus
3. Or contact Replit support for CSV import capabilities

### Error: "Permission denied"
Ensure you're connected to the production database with appropriate permissions.

### Error: "Column does not exist"
The production schema must match development. Run migrations first if needed:
```bash
npm run db:push
```

---

## Questions?
If you encounter issues, provide the specific error message and I can help troubleshoot or generate alternative import methods.

-- Production Database Migration Script
-- Run this in the Replit Database pane (Production environment)
-- 
-- Tables: merchant_metadata, merchant_records, uploaded_files
-- Generated: $(date)

-- Clear existing data in production (optional - remove these if you want to keep existing data)
-- TRUNCATE TABLE uploaded_files CASCADE;
-- TRUNCATE TABLE merchant_metadata CASCADE;
-- TRUNCATE TABLE merchant_records CASCADE;


-- ============================================
-- Step 1: Import uploaded_files (9 records)
-- ============================================
\COPY uploaded_files FROM '/tmp/uploaded_files.csv' WITH (FORMAT csv, HEADER true);

-- ============================================
-- Step 2: Import merchant_metadata (4,115 records)
-- ============================================
\COPY merchant_metadata FROM '/tmp/merchant_metadata.csv' WITH (FORMAT csv, HEADER true);

-- ============================================
-- Step 3: Import merchant_records (3,247 records)
-- ============================================
\COPY merchant_records FROM '/tmp/merchant_records.csv' WITH (FORMAT csv, HEADER true);

-- ============================================
-- Verification Queries
-- ============================================
SELECT COUNT(*) as uploaded_files_count FROM uploaded_files;
SELECT COUNT(*) as merchant_metadata_count FROM merchant_metadata;
SELECT COUNT(*) as merchant_records_count FROM merchant_records;


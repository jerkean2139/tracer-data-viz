-- ============================================
-- Production Schema Sync Script
-- Generated for TRACER C2 Dashboard
-- Run this in Replit Database Pane (Production)
-- ============================================

-- WARNING: Review this script carefully before running in production
-- Backup your production database first if it contains important data

BEGIN;

-- ============================================
-- Table: sessions
-- ============================================
CREATE TABLE IF NOT EXISTS sessions (
  sid VARCHAR PRIMARY KEY,
  sess JSONB NOT NULL,
  expire TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON sessions(expire);

-- ============================================
-- Table: users
-- ============================================
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR UNIQUE,
  first_name VARCHAR,
  last_name VARCHAR,
  profile_image_url VARCHAR,
  username VARCHAR(100) UNIQUE,
  password_hash VARCHAR(255),
  auth_type VARCHAR(20) NOT NULL DEFAULT 'replit',
  role VARCHAR(20) NOT NULL DEFAULT 'agent',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Add missing columns if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='auth_type') THEN
    ALTER TABLE users ADD COLUMN auth_type VARCHAR(20) NOT NULL DEFAULT 'replit';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='username') THEN
    ALTER TABLE users ADD COLUMN username VARCHAR(100) UNIQUE;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='password_hash') THEN
    ALTER TABLE users ADD COLUMN password_hash VARCHAR(255);
  END IF;
END $$;

-- ============================================
-- Table: merchant_records
-- ============================================
CREATE TABLE IF NOT EXISTS merchant_records (
  id SERIAL PRIMARY KEY,
  merchant_id VARCHAR(255) NOT NULL,
  merchant_name TEXT NOT NULL,
  month VARCHAR(20) NOT NULL,
  processor VARCHAR(50) NOT NULL,
  branch_id VARCHAR(50),
  
  -- Revenue fields
  sales_amount REAL,
  
  -- Clearent-specific
  transactions REAL,
  net REAL,
  commission_percent REAL,
  partner_net REAL,
  
  -- Shift4-specific
  payout_amount REAL,
  volume REAL,
  sales REAL,
  refunds REAL,
  reject_amount REAL,
  bank_split REAL,
  bank_payout REAL,
  
  -- ML-specific
  income REAL,
  expenses REAL,
  
  -- Metadata (newer columns)
  partner_branch_number VARCHAR(50),
  status VARCHAR(100),
  status_category VARCHAR(100),
  expected_processor VARCHAR(50),
  
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Add newer columns if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='merchant_records' AND column_name='partner_branch_number') THEN
    ALTER TABLE merchant_records ADD COLUMN partner_branch_number VARCHAR(50);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='merchant_records' AND column_name='status') THEN
    ALTER TABLE merchant_records ADD COLUMN status VARCHAR(100);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='merchant_records' AND column_name='status_category') THEN
    ALTER TABLE merchant_records ADD COLUMN status_category VARCHAR(100);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='merchant_records' AND column_name='expected_processor') THEN
    ALTER TABLE merchant_records ADD COLUMN expected_processor VARCHAR(50);
  END IF;
END $$;

-- Create indexes
CREATE UNIQUE INDEX IF NOT EXISTS merchant_month_processor_idx 
  ON merchant_records(merchant_id, month, processor);

CREATE INDEX IF NOT EXISTS merchant_id_idx ON merchant_records(merchant_id);
CREATE INDEX IF NOT EXISTS month_idx ON merchant_records(month);
CREATE INDEX IF NOT EXISTS processor_idx ON merchant_records(processor);
CREATE INDEX IF NOT EXISTS branch_id_idx ON merchant_records(branch_id);

-- ============================================
-- Table: uploaded_files
-- ============================================
CREATE TABLE IF NOT EXISTS uploaded_files (
  id VARCHAR(255) PRIMARY KEY,
  file_name TEXT NOT NULL,
  processor VARCHAR(50) NOT NULL,
  month VARCHAR(20) NOT NULL,
  record_count REAL NOT NULL,
  uploaded_at TEXT NOT NULL,
  is_valid BOOLEAN NOT NULL,
  errors JSONB
);

-- Create index
CREATE INDEX IF NOT EXISTS file_processor_month_idx 
  ON uploaded_files(processor, month);

-- ============================================
-- Table: merchant_metadata
-- ============================================
CREATE TABLE IF NOT EXISTS merchant_metadata (
  id SERIAL PRIMARY KEY,
  merchant_id VARCHAR(255) NOT NULL UNIQUE,
  dba_name TEXT NOT NULL,
  partner_branch_number VARCHAR(50),
  status VARCHAR(100),
  status_category VARCHAR(100),
  current_processor VARCHAR(50),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ============================================
-- Table: partner_logos
-- ============================================
CREATE TABLE IF NOT EXISTS partner_logos (
  id SERIAL PRIMARY KEY,
  partner_name VARCHAR(255) NOT NULL UNIQUE,
  logo_url TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ============================================
-- Verification Queries
-- ============================================
SELECT 'Schema sync complete!' as message;

-- Check all tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- Verify column counts
SELECT 
  table_name,
  COUNT(*) as column_count
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('sessions', 'users', 'merchant_records', 'uploaded_files', 'merchant_metadata', 'partner_logos')
GROUP BY table_name
ORDER BY table_name;

COMMIT;

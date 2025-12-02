# Production Schema Sync Guide

This guide helps you sync your **production database schema** to match your **development database schema** for the TRACER C2 dashboard.

---

## 📋 Tables to Sync

Your application has **6 database tables**:

1. **sessions** - Session storage for authentication
2. **users** - User accounts with role-based access (admin/partner/agent)
3. **merchant_records** - Transaction data with indexes for performance
4. **uploaded_files** - File upload tracking
5. **merchant_metadata** - Merchant master data
6. **partner_logos** - Partner branding assets

---

## ⚙️ Method 1: Using Drizzle Kit (Recommended)

This is the **safest and fastest** method. Drizzle automatically detects schema differences and applies only necessary changes.

### Prerequisites
- Access to production database connection string
- Terminal/command line access

### Steps

1. **Get Production Database URL**
   - Open Replit Database pane
   - Switch to **Production** environment
   - Copy the connection string (looks like: `postgresql://user:pass@host/db`)

2. **Set Environment Variable**
   ```bash
   export DATABASE_URL="your_production_connection_string_here"
   ```

3. **Push Schema to Production**
   ```bash
   npm run db:push
   ```

4. **If Prompted, Confirm Changes**
   - Drizzle will show you what changes it will make
   - Review carefully, then confirm
   - If you need to force the push: `npm run db:push -- --force`

5. **Verify Success**
   ```bash
   # Schema push should complete with no errors
   # Your production database now matches development
   ```

---

## 📝 Method 2: Manual SQL Script

If you cannot use Drizzle Kit (no terminal access, etc.), use the pre-generated SQL script.

### Steps

1. **Open Production Database**
   - In Replit, open the **Database** tool
   - Switch to **Production** environment

2. **Run the SQL Script**
   - Open `sync_production_schema.sql` from your project
   - Copy the entire contents
   - Paste into the production database SQL console
   - Click **Run** or **Execute**

3. **Verify Results**
   The script will show:
   - "Schema sync complete!" message
   - List of all tables
   - Column count for each table

   **Expected column counts:**
   - sessions: 3 columns
   - users: 10 columns
   - merchant_records: ~25 columns
   - uploaded_files: 8 columns
   - merchant_metadata: 8 columns
   - partner_logos: 5 columns

---

## ⚠️ Important Notes

### Before Running:
1. **Backup production data** if it contains important information
2. The script uses `CREATE TABLE IF NOT EXISTS` - safe to run multiple times
3. New columns are added with `ALTER TABLE` if they don't exist
4. No data will be deleted (unless you uncomment TRUNCATE commands)

### What Gets Updated:
- ✅ Missing tables will be created
- ✅ Missing columns will be added
- ✅ Indexes will be created if missing
- ✅ Constraints and defaults will be applied
- ❌ Existing data will NOT be modified
- ❌ Existing columns will NOT be deleted (even if removed from dev schema)

### Schema Changes from Development:

**Users Table** - Now supports both authentication methods:
- Replit Auth (email-based)
- Username/Password (local auth)
- Role-based access control (admin, partner, agent)

**Merchant Records** - Enhanced metadata fields:
- `partner_branch_number`
- `status` and `status_category`
- `expected_processor`

**Indexes** - Performance optimizations:
- Unique constraint on merchant_records (merchant_id, month, processor)
- Indexes on commonly queried fields

---

## 🔍 Troubleshooting

### Error: "Column already exists"
This is safe to ignore. The script checks for existing columns before adding them.

### Error: "Duplicate key violation"
If you're importing data after schema sync, ensure:
1. Tables are empty, OR
2. You're not importing duplicate records

### Error: "Permission denied"
Ensure you're connected with admin/owner permissions to the production database.

### Indexes Not Created
Some database providers may have index name conflicts. If you get index errors:
1. Note the index name from the error
2. Drop the conflicting index: `DROP INDEX IF EXISTS index_name;`
3. Re-run the script

---

## ✅ Verification Checklist

After running the sync, verify:

- [ ] All 6 tables exist in production
- [ ] Users table has `auth_type`, `username`, `password_hash` columns
- [ ] Merchant_records has metadata columns (status, status_category, etc.)
- [ ] All indexes were created successfully
- [ ] No error messages in the console
- [ ] Run a test query: `SELECT COUNT(*) FROM users;`

---

## 🆘 Need Help?

If you encounter issues:

1. **Check the error message** - Most errors explain what went wrong
2. **Verify connection** - Ensure you're connected to the correct database (production)
3. **Check permissions** - You need CREATE TABLE and ALTER TABLE permissions
4. **Database logs** - Check Replit's database logs for detailed error info

Common fixes:
- For permission errors: Contact Replit support or database admin
- For duplicate index errors: Drop conflicting indexes first
- For type mismatch errors: The schema may have drifted too far - contact support

---

## 📊 After Schema Sync

Once the schema is synced, you can proceed with:
1. **Data migration** (if needed) - Use the data migration CSV files
2. **Test the application** - Point your app to production and verify functionality
3. **Monitor performance** - Check if indexes are being used effectively

Remember: Schema sync is **non-destructive** - it only adds missing structures, never removes existing data.

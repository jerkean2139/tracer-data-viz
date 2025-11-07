# 🚀 Production Setup Guide

## ⚠️ Critical: You MUST Create Admin User in Production

Your app uses **username/password authentication**. Production has a **separate, empty database** that needs the admin user created.

---

## 📋 Step-by-Step Instructions

### **Step 1: Publish Your App**

1. Go to **Deployments** in Replit
2. Click **"Publish"** or **"Update Deployment"**
3. Wait for deployment to complete
4. Note your deployment URL (e.g., `your-app.replit.app`)

---

### **Step 2: Import Database to Production**

Your production database is currently empty. You need to import your data:

1. Open **Database** pane (left sidebar)
2. Switch to **"Production"** database (toggle at top)
3. Click **"Import"** button
4. Select the SQL file from `database-exports/export-*.sql`
5. Confirm import
6. Wait for import to complete

This imports all 3,247 merchant records + 998 leads.

---

### **Step 3: Create Admin User in Production**

**Option A: Using Replit Shell (Recommended)**

1. Go to your **published deployment** page in Replit
2. Open the **Shell** tab (in deployment view)
3. Run this command:

```bash
npx tsx scripts/setup-production-admin.ts
```

4. You should see:
```
✅ Admin user created successfully!
   Username: Admin
   Role: admin
```

**Option B: Manual Database Entry**

1. Go to **Database** pane
2. Switch to **"Production"** database
3. Click **"My data"**
4. Toggle **"Edit"**
5. In the `users` table, click **"Add row"**
6. Enter:
   - `id`: (leave blank - auto-generated)
   - `username`: `Admin`
   - `password_hash`: Run this in Shell first:
     ```bash
     node -e "const bcrypt = require('bcryptjs'); bcrypt.hash('Admin@123', 10).then(console.log)"
     ```
   - `first_name`: `Admin`
   - `last_name`: `User`
   - `role`: `admin`
   - `auth_type`: `local`
   - `created_at`: (leave blank - auto-generated)

---

### **Step 4: Test Login**

1. Open your published app URL
2. You should see the **login form**
3. Enter:
   - **Username**: `Admin`
   - **Password**: `Admin@123`
4. Click **"Sign In"**
5. ✅ You should see the full dashboard!

---

## 🔑 Login Credentials

```
Username: Admin
Password: Admin@123
Role: admin (Full access to all revenue data)
```

---

## ⚠️ Troubleshooting

### "401 Unauthorized" Error

**Cause**: Admin user doesn't exist in production database

**Fix**: Follow Step 3 above to create the admin user

### "No data available"

**Cause**: Production database is empty

**Fix**: Follow Step 2 above to import the database

### Can't access Shell in deployment

**Alternative**: Use Option B (Manual Database Entry) in Step 3

---

## ✅ After Setup

Once you log in successfully:

1. **Create user accounts** for reps/partners via **User Management** page
2. **Test role-based access** (revenue hiding for partners/agents)
3. **Upload new revenue files** as needed
4. **Generate PDF reports**

---

## 🎯 Important Notes

- **Development and production databases are separate**
- Changes in development don't affect production
- You must create the admin user in BOTH databases
- The script `setup-production-admin.ts` is idempotent (safe to run multiple times)

---

## Need Help?

If you still can't log in after following these steps, check:

1. ✅ Database import completed successfully
2. ✅ Admin user exists in production database
3. ✅ You're using the correct credentials
4. ✅ Your deployment is set to "Public"

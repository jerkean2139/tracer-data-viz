#!/usr/bin/env node
/**
 * Production Admin User Setup Script
 * 
 * This script creates the Admin user in the database.
 * Run this in production AFTER publishing your app.
 * 
 * Usage:
 *   1. Publish your app to production
 *   2. Open Shell in production deployment
 *   3. Run: npx tsx scripts/setup-production-admin.ts
 */

import { neon } from '@neondatabase/serverless';
import bcrypt from 'bcryptjs';

async function setupProductionAdmin() {
  console.log('\n🔐 Setting up Production Admin User...\n');

  const DATABASE_URL = process.env.DATABASE_URL;
  
  if (!DATABASE_URL) {
    console.error('❌ DATABASE_URL not found in environment variables');
    process.exit(1);
  }

  const sql = neon(DATABASE_URL);

  // Credentials
  const username = 'Admin';
  const password = 'Admin@123';
  const firstName = 'Admin';
  const lastName = 'User';
  const role = 'admin';

  try {
    // Check if user already exists
    const existingUsers = await sql`
      SELECT id, username, role 
      FROM users 
      WHERE username = ${username}
    `;

    if (existingUsers.length > 0) {
      console.log('✅ Admin user already exists!');
      console.log(`   Username: ${existingUsers[0].username}`);
      console.log(`   Role: ${existingUsers[0].role}`);
      console.log('\nYou can log in with:');
      console.log(`   Username: ${username}`);
      console.log(`   Password: Admin@123\n`);
      process.exit(0);
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create admin user
    const result = await sql`
      INSERT INTO users (
        id,
        username,
        password_hash,
        first_name,
        last_name,
        role,
        auth_type,
        created_at
      ) VALUES (
        gen_random_uuid(),
        ${username},
        ${passwordHash},
        ${firstName},
        ${lastName},
        ${role},
        'local',
        NOW()
      )
      RETURNING id, username, role
    `;

    if (result.length > 0) {
      console.log('✅ Admin user created successfully!');
      console.log(`   Username: ${result[0].username}`);
      console.log(`   Role: ${result[0].role}`);
      console.log(`   User ID: ${result[0].id}`);
      console.log('\nYou can now log in with:');
      console.log(`   Username: ${username}`);
      console.log(`   Password: Admin@123\n`);
    }

    process.exit(0);
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    console.error('\nFull error:', error);
    process.exit(1);
  }
}

setupProductionAdmin();

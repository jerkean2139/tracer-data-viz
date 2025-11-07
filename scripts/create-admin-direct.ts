import { storage } from "../server/storage";
import bcrypt from "bcryptjs";

async function createAdmin() {
  console.log("\n🔐 Creating Admin User...\n");

  const username = "Admin";
  const password = "Admin@123";
  const firstName = "Admin";
  const lastName = "User";

  try {
    // Check if username already exists
    const existing = await storage.getUserByUsername(username);
    if (existing) {
      console.log(`✅ Username "${username}" already exists - you can log in now!`);
      process.exit(0);
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create admin user
    const admin = await storage.createLocalUser({
      username,
      passwordHash,
      firstName,
      lastName,
      role: "admin",
    });

    console.log("✅ Admin user created successfully!");
    console.log(`   Username: ${admin.username}`);
    console.log(`   Password: Admin@123`);
    console.log(`   Role: ${admin.role}`);
    console.log("\nYou can now log in at your app URL.\n");

    process.exit(0);
  } catch (error) {
    console.error("❌ Failed to create admin user:", error);
    process.exit(1);
  }
}

createAdmin();

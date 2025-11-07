import { storage } from "../server/storage";
import bcrypt from "bcryptjs";
import * as readline from "readline";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(prompt: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function createAdmin() {
  console.log("\n🔐 Create Initial Admin User\n");

  const username = await question("Username: ");
  const password = await question("Password: ");
  const firstName = await question("First Name (optional): ");
  const lastName = await question("Last Name (optional): ");

  if (!username || !password) {
    console.error("❌ Username and password are required");
    rl.close();
    process.exit(1);
  }

  try {
    // Check if username already exists
    const existing = await storage.getUserByUsername(username);
    if (existing) {
      console.error(`❌ Username "${username}" already exists`);
      rl.close();
      process.exit(1);
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create admin user
    const admin = await storage.createLocalUser({
      username,
      passwordHash,
      firstName: firstName || username,
      lastName: lastName || "",
      role: "admin",
    });

    console.log("\n✅ Admin user created successfully!");
    console.log(`   Username: ${admin.username}`);
    console.log(`   Role: ${admin.role}`);
    console.log("\nYou can now log in at your deployment URL.\n");

    rl.close();
    process.exit(0);
  } catch (error) {
    console.error("❌ Failed to create admin user:", error);
    rl.close();
    process.exit(1);
  }
}

createAdmin();

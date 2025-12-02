import type { Express, RequestHandler } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import {
  insertMerchantRecordSchema,
  insertUploadedFileSchema,
  insertMerchantMetadataSchema,
  insertPartnerLogoSchema,
  signupSchema,
  adminUserUpdateSchema,
} from "@shared/schema";
import { z } from "zod";
import { fromZodError } from "zod-validation-error";
import { verifyPassword } from "./auth-utils";

// Helper function to format error responses
function formatErrorResponse(error: unknown): {
  statusCode: number;
  error: string;
  details?: any;
} {
  // Zod validation errors
  if (error instanceof z.ZodError) {
    const validationError = fromZodError(error);
    return {
      statusCode: 400,
      error: "Validation error",
      details: {
        message: validationError.message,
        issues: error.errors.map((e) => ({
          path: e.path.join("."),
          message: e.message,
        })),
      },
    };
  }

  // Database errors
  if (error instanceof Error) {
    if (
      error.message.includes("duplicate key") ||
      error.message.includes("unique constraint")
    ) {
      return {
        statusCode: 409,
        error: "Duplicate record",
        details: "A record with the same identifier already exists",
      };
    }

    if (error.message.includes("foreign key")) {
      return {
        statusCode: 400,
        error: "Invalid reference",
        details: "Referenced record does not exist",
      };
    }

    // Generic error with message
    return {
      statusCode: 500,
      error: "Internal server error",
      details: error.message,
    };
  }

  // Unknown error
  return {
    statusCode: 500,
    error: "An unexpected error occurred",
    details: String(error),
  };
}

// Session-based authentication middleware
const requireAuth: RequestHandler = async (req, res, next) => {
  const session = req.session as any;
  if (!session.userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  next();
};

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth routes
  app.get("/api/auth/user", requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      // Don't send password hash to frontend
      const { passwordHash, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Update user role (admin only)
  app.put("/api/auth/role", requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const currentUser = await storage.getUser(userId);

      // Check if current user is admin
      if (!currentUser || currentUser.role !== "admin") {
        return res
          .status(403)
          .json({ message: "Forbidden: Only admins can change roles" });
      }

      const { role } = req.body;

      if (!["admin", "partner", "agent"].includes(role)) {
        return res.status(400).json({ message: "Invalid role" });
      }

      // Prevent admin from demoting themselves (no recovery path)
      if (currentUser.role === "admin" && role !== "admin") {
        return res
          .status(403)
          .json({
            message:
              "Forbidden: Admins cannot demote themselves to prevent loss of admin access",
          });
      }

      await storage.updateUserRole(userId, role);
      const updatedUser = await storage.getUser(userId);
      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating user role:", error);
      res.status(500).json({ message: "Failed to update user role" });
    }
  });

  // Username/Password Authentication
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { username, password } = req.body;

      if (!username || !password) {
        return res.status(400).json({ message: "Username and password are required" });
      }

      const user = await storage.getUserByUsername(username);

      if (!user || !user.passwordHash) {
        return res.status(401).json({ message: "Invalid username or password" });
      }

      // Use centralized password verification
      const isValidPassword = await verifyPassword(password, user.passwordHash);

      if (!isValidPassword) {
        return res.status(401).json({ message: "Invalid username or password" });
      }

      // Set session
      (req.session as any).userId = user.id;
      res.json({ 
        user: {
          id: user.id,
          username: user.username,
          role: user.role,
          firstName: user.firstName,
          lastName: user.lastName,
        }
      });
    } catch (error) {
      console.error("Error during login:", error);
      res.status(500).json({ message: "Failed to login" });
    }
  });

  app.post("/api/auth/logout", async (req, res) => {
    try {
      req.session.destroy((err) => {
        if (err) {
          return res.status(500).json({ message: "Failed to logout" });
        }
        res.json({ success: true });
      });
    } catch (error) {
      console.error("Error during logout:", error);
      res.status(500).json({ message: "Failed to logout" });
    }
  });

  // Check if any users exist (for initial setup)
  app.get("/api/auth/has-users", async (_req, res) => {
    try {
      const users = await storage.getAllUsers();
      // Check if there are any users with passwords (not just legacy OIDC users)
      // Filter out null, undefined, and empty/whitespace strings
      const usersWithPasswords = users.filter(u => u.passwordHash && u.passwordHash.trim().length > 0);
      res.json({ hasUsers: usersWithPasswords.length > 0 });
    } catch (error) {
      console.error("Error checking users:", error);
      res.status(500).json({ message: "Failed to check users" });
    }
  });

  // Seed initial admin user (only works if no password-based users exist)
  app.post("/api/auth/seed-admin", async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      // Filter out null, undefined, and empty/whitespace strings
      const usersWithPasswords = users.filter(u => u.passwordHash && u.passwordHash.trim().length > 0);
      if (usersWithPasswords.length > 0) {
        return res.status(400).json({ message: "Password-based users already exist. Cannot seed admin." });
      }

      const { username, password, firstName, lastName } = req.body;

      if (!username || !password) {
        return res.status(400).json({ message: "Username and password are required" });
      }

      // Password will be hashed in storage layer
      const user = await storage.createLocalUser({
        username,
        password,  // Plain password - hashed in storage
        role: "admin",
        firstName: firstName || "Admin",
        lastName: lastName || "User",
      });

      res.json({ success: true, userId: user.id });
    } catch (error) {
      console.error("Error seeding admin user:", error);
      res.status(500).json({ message: "Failed to seed admin user" });
    }
  });

  // Public signup endpoint
  app.post("/api/auth/signup", async (req, res) => {
    try {
      // Validate request body against schema
      const validatedData = signupSchema.parse(req.body);

      // Check if username already exists
      const existingUser = await storage.getUserByUsername(validatedData.username);
      if (existingUser) {
        return res.status(409).json({ message: "Username already exists" });
      }

      // Create user with 'agent' role by default (lowest privilege)
      // Password will be hashed in storage layer
      const user = await storage.createLocalUser({
        username: validatedData.username,
        password: validatedData.password,  // Plain password - hashed in storage
        firstName: validatedData.firstName,
        lastName: validatedData.lastName,
        role: "agent",      // Always 'agent' for public signups
      });

      res.json({ 
        success: true, 
        userId: user.id,
        message: "Account created successfully"
      });
    } catch (error) {
      console.error("Error creating user account:", error);
      const { statusCode, ...errorResponse } = formatErrorResponse(error);
      res.status(statusCode).json(errorResponse);
    }
  });

  // User Management (admin only)
  app.get("/api/users", requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const currentUser = await storage.getUser(userId);

      if (!currentUser || currentUser.role !== "admin") {
        return res.status(403).json({ message: "Forbidden: Only admins can view users" });
      }

      const users = await storage.getAllUsers();
      // Don't send password hashes to frontend
      const sanitizedUsers = users.map(u => ({
        id: u.id,
        username: u.username,
        email: u.email,
        firstName: u.firstName,
        lastName: u.lastName,
        role: u.role,
        authType: u.authType,
        createdAt: u.createdAt,
      }));
      res.json(sanitizedUsers);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.post("/api/users", requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const currentUser = await storage.getUser(userId);

      if (!currentUser || currentUser.role !== "admin") {
        return res.status(403).json({ message: "Forbidden: Only admins can create users" });
      }

      const { username, password, firstName, lastName, role } = req.body;

      if (!username || !password) {
        return res.status(400).json({ message: "Username and password are required" });
      }

      if (!["admin", "partner", "agent"].includes(role)) {
        return res.status(400).json({ message: "Invalid role" });
      }

      // Check if username already exists
      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        return res.status(409).json({ message: "Username already exists" });
      }

      // Password will be hashed in storage layer
      const newUser = await storage.createLocalUser({
        username,
        password,  // Plain password - hashed in storage
        firstName: firstName || username,
        lastName: lastName || '',
        role,
      });

      res.json({
        id: newUser.id,
        username: newUser.username,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        role: newUser.role,
      });
    } catch (error) {
      console.error("Error creating user:", error);
      res.status(500).json({ message: "Failed to create user" });
    }
  });

  app.put("/api/users/:id", requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const currentUser = await storage.getUser(userId);

      if (!currentUser || currentUser.role !== "admin") {
        return res.status(403).json({ message: "Forbidden: Only admins can update users" });
      }

      const { id } = req.params;
      
      // Validate request body - rejects passwordHash and any other invalid fields
      const validatedData = adminUserUpdateSchema.parse(req.body);
      const { firstName, lastName, role, password } = validatedData;

      // Update profile fields (non-credential)
      const updateData: any = {};
      if (firstName) updateData.firstName = firstName;
      if (lastName) updateData.lastName = lastName;
      if (role) updateData.role = role;

      if (Object.keys(updateData).length > 0) {
        await storage.updateUser(id, updateData);
      }

      // Update password separately using dedicated method (centralizes hashing)
      if (password) {
        await storage.updateUserPassword(id, password);
      }

      const updatedUser = await storage.getUser(id);

      res.json({
        id: updatedUser!.id,
        username: updatedUser!.username,
        firstName: updatedUser!.firstName,
        lastName: updatedUser!.lastName,
        role: updatedUser!.role,
      });
    } catch (error) {
      console.error("Error updating user:", error);
      // Use formatErrorResponse for consistent error handling (including Zod validation)
      const { statusCode, ...errorResponse } = formatErrorResponse(error);
      res.status(statusCode).json(errorResponse);
    }
  });

  app.delete("/api/users/:id", requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const currentUser = await storage.getUser(userId);

      if (!currentUser || currentUser.role !== "admin") {
        return res.status(403).json({ message: "Forbidden: Only admins can delete users" });
      }

      const { id } = req.params;

      // Prevent admin from deleting themselves
      if (id === userId) {
        return res.status(403).json({ message: "Cannot delete your own account" });
      }

      await storage.deleteUser(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting user:", error);
      res.status(500).json({ message: "Failed to delete user" });
    }
  });

  // Merchant Records Routes
  app.get("/api/records", requireAuth, async (req, res) => {
    try {
      const records = await storage.getAllRecords();
      res.json(records);
    } catch (error) {
      console.error("Error fetching records:", error);
      res.status(500).json({ error: "Failed to fetch records" });
    }
  });

  app.post("/api/records", requireAuth, async (req, res) => {
    try {
      const recordsSchema = z.array(insertMerchantRecordSchema);
      const validatedRecords = recordsSchema.parse(req.body);
      await storage.addRecords(validatedRecords);
      res.json({ success: true, count: validatedRecords.length });
    } catch (error) {
      console.error("Error adding records:", error);
      const { statusCode, ...errorResponse } = formatErrorResponse(error);
      res.status(statusCode).json(errorResponse);
    }
  });

  app.delete("/api/records/:month/:processor?", requireAuth, async (req, res) => {
    try {
      const { month, processor } = req.params;
      await storage.deleteRecordsByMonth(month, processor);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting records:", error);
      res.status(500).json({ error: "Failed to delete records" });
    }
  });

  app.delete("/api/records", requireAuth, async (req, res) => {
    try {
      await storage.clearAllRecords();
      res.json({ success: true });
    } catch (error) {
      console.error("Error clearing records:", error);
      res.status(500).json({ error: "Failed to clear records" });
    }
  });

  // Uploaded Files Routes
  app.get("/api/files", requireAuth, async (req, res) => {
    try {
      const files = await storage.getUploadedFiles();
      res.json(files);
    } catch (error) {
      console.error("Error fetching files:", error);
      res.status(500).json({ error: "Failed to fetch files" });
    }
  });

  app.post("/api/files", requireAuth, async (req, res) => {
    try {
      const validatedFile = insertUploadedFileSchema.parse(req.body);
      await storage.addUploadedFile(validatedFile);
      res.json({ success: true });
    } catch (error) {
      console.error("Error adding file:", error);
      const { statusCode, ...errorResponse } = formatErrorResponse(error);
      res.status(statusCode).json(errorResponse);
    }
  });

  app.delete("/api/files/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteUploadedFile(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting file:", error);
      res.status(500).json({ error: "Failed to delete file" });
    }
  });

  // Merchant Metadata Routes
  app.get("/api/metadata", requireAuth, async (req, res) => {
    try {
      const metadata = await storage.getAllMetadata();
      res.json(metadata);
    } catch (error) {
      console.error("Error fetching metadata:", error);
      res.status(500).json({ error: "Failed to fetch metadata" });
    }
  });

  app.post("/api/metadata", requireAuth, async (req, res) => {
    try {
      const metadataSchema = z.array(insertMerchantMetadataSchema);
      const validatedMetadata = metadataSchema.parse(req.body);
      await storage.addMetadata(validatedMetadata);
      res.json({ success: true, count: validatedMetadata.length });
    } catch (error) {
      console.error("Error adding metadata:", error);
      const { statusCode, ...errorResponse } = formatErrorResponse(error);
      res.status(statusCode).json(errorResponse);
    }
  });

  app.get("/api/metadata/:merchantId", requireAuth, async (req, res) => {
    try {
      const { merchantId } = req.params;
      const metadata = await storage.getMetadataByMID(merchantId);
      res.json(metadata || null);
    } catch (error) {
      console.error("Error fetching metadata:", error);
      res.status(500).json({ error: "Failed to fetch metadata" });
    }
  });

  app.delete("/api/metadata", requireAuth, async (req, res) => {
    try {
      await storage.clearAllMetadata();
      res.json({ success: true });
    } catch (error) {
      console.error("Error clearing metadata:", error);
      res.status(500).json({ error: "Failed to clear metadata" });
    }
  });

  // Partner Logos Routes
  app.get("/api/partner-logos", requireAuth, async (req, res) => {
    try {
      const logos = await storage.getAllPartnerLogos();
      res.json(logos);
    } catch (error) {
      console.error("Error fetching partner logos:", error);
      res.status(500).json({ error: "Failed to fetch partner logos" });
    }
  });

  app.post("/api/partner-logos", requireAuth, async (req, res) => {
    try {
      const validatedLogo = insertPartnerLogoSchema.parse(req.body);
      const newLogo = await storage.addPartnerLogo(validatedLogo);
      res.json(newLogo);
    } catch (error) {
      console.error("Error adding partner logo:", error);
      const { statusCode, ...errorResponse } = formatErrorResponse(error);
      res.status(statusCode).json(errorResponse);
    }
  });

  app.put("/api/partner-logos/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const { logoUrl } = req.body;
      await storage.updatePartnerLogo(parseInt(id), logoUrl);
      res.json({ success: true });
    } catch (error) {
      console.error("Error updating partner logo:", error);
      res.status(500).json({ error: "Failed to update partner logo" });
    }
  });

  app.delete("/api/partner-logos/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deletePartnerLogo(parseInt(id));
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting partner logo:", error);
      res.status(500).json({ error: "Failed to delete partner logo" });
    }
  });

  // Validation Warnings Route
  app.get("/api/validation-warnings", requireAuth, async (req, res) => {
    try {
      const warnings = await storage.getValidationWarnings();
      res.json(warnings);
    } catch (error) {
      console.error("Error fetching validation warnings:", error);
      res.status(500).json({ error: "Failed to fetch validation warnings" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}

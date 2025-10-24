import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertMerchantRecordSchema, insertUploadedFileSchema, insertMerchantMetadataSchema } from "@shared/schema";
import { z } from "zod";
import { fromZodError } from "zod-validation-error";

// Helper function to format error responses
function formatErrorResponse(error: unknown): { statusCode: number; error: string; details?: any } {
  // Zod validation errors
  if (error instanceof z.ZodError) {
    const validationError = fromZodError(error);
    return {
      statusCode: 400,
      error: "Validation error",
      details: {
        message: validationError.message,
        issues: error.errors.map(e => ({
          path: e.path.join('.'),
          message: e.message,
        }))
      }
    };
  }
  
  // Database errors
  if (error instanceof Error) {
    if (error.message.includes('duplicate key') || error.message.includes('unique constraint')) {
      return {
        statusCode: 409,
        error: "Duplicate record",
        details: "A record with the same identifier already exists"
      };
    }
    
    if (error.message.includes('foreign key')) {
      return {
        statusCode: 400,
        error: "Invalid reference",
        details: "Referenced record does not exist"
      };
    }
    
    // Generic error with message
    return {
      statusCode: 500,
      error: "Internal server error",
      details: error.message
    };
  }
  
  // Unknown error
  return {
    statusCode: 500,
    error: "An unexpected error occurred",
    details: String(error)
  };
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Merchant Records Routes
  app.get("/api/records", async (req, res) => {
    try {
      const records = await storage.getAllRecords();
      res.json(records);
    } catch (error) {
      console.error("Error fetching records:", error);
      res.status(500).json({ error: "Failed to fetch records" });
    }
  });

  app.post("/api/records", async (req, res) => {
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

  app.delete("/api/records/:month/:processor?", async (req, res) => {
    try {
      const { month, processor } = req.params;
      await storage.deleteRecordsByMonth(month, processor);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting records:", error);
      res.status(500).json({ error: "Failed to delete records" });
    }
  });

  app.delete("/api/records", async (req, res) => {
    try {
      await storage.clearAllRecords();
      res.json({ success: true });
    } catch (error) {
      console.error("Error clearing records:", error);
      res.status(500).json({ error: "Failed to clear records" });
    }
  });

  // Uploaded Files Routes
  app.get("/api/files", async (req, res) => {
    try {
      const files = await storage.getUploadedFiles();
      res.json(files);
    } catch (error) {
      console.error("Error fetching files:", error);
      res.status(500).json({ error: "Failed to fetch files" });
    }
  });

  app.post("/api/files", async (req, res) => {
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

  app.delete("/api/files/:id", async (req, res) => {
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
  app.get("/api/metadata", async (req, res) => {
    try {
      const metadata = await storage.getAllMetadata();
      res.json(metadata);
    } catch (error) {
      console.error("Error fetching metadata:", error);
      res.status(500).json({ error: "Failed to fetch metadata" });
    }
  });

  app.post("/api/metadata", async (req, res) => {
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

  app.get("/api/metadata/:merchantId", async (req, res) => {
    try {
      const { merchantId } = req.params;
      const metadata = await storage.getMetadataByMID(merchantId);
      res.json(metadata || null);
    } catch (error) {
      console.error("Error fetching metadata:", error);
      res.status(500).json({ error: "Failed to fetch metadata" });
    }
  });

  app.delete("/api/metadata", async (req, res) => {
    try {
      await storage.clearAllMetadata();
      res.json({ success: true });
    } catch (error) {
      console.error("Error clearing metadata:", error);
      res.status(500).json({ error: "Failed to clear metadata" });
    }
  });

  // Validation Warnings Route
  app.get("/api/validation-warnings", async (req, res) => {
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

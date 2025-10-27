import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertMerchantRecordSchema, insertUploadedFileSchema, insertMerchantMetadataSchema, insertPartnerLogoSchema, insertSavedReportSchema } from "@shared/schema";
import { z } from "zod";
import { fromZodError } from "zod-validation-error";
import crypto from "crypto";

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

  // Partner Logos Routes
  app.get("/api/partner-logos", async (req, res) => {
    try {
      const logos = await storage.getAllPartnerLogos();
      res.json(logos);
    } catch (error) {
      console.error("Error fetching partner logos:", error);
      res.status(500).json({ error: "Failed to fetch partner logos" });
    }
  });

  app.post("/api/partner-logos", async (req, res) => {
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

  app.put("/api/partner-logos/:id", async (req, res) => {
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

  app.delete("/api/partner-logos/:id", async (req, res) => {
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
  app.get("/api/validation-warnings", async (req, res) => {
    try {
      const warnings = await storage.getValidationWarnings();
      res.json(warnings);
    } catch (error) {
      console.error("Error fetching validation warnings:", error);
      res.status(500).json({ error: "Failed to fetch validation warnings" });
    }
  });

  // Saved Reports Routes
  app.get("/api/saved-reports", async (req, res) => {
    try {
      const reports = await storage.getAllSavedReports();
      res.json(reports);
    } catch (error) {
      console.error("Error fetching saved reports:", error);
      res.status(500).json({ error: "Failed to fetch saved reports" });
    }
  });

  app.post("/api/saved-reports", async (req, res) => {
    try {
      const validatedReport = insertSavedReportSchema.parse(req.body);
      const newReport = await storage.savePDFReport(validatedReport);
      res.json(newReport);
    } catch (error) {
      console.error("Error saving report:", error);
      const { statusCode, ...errorResponse } = formatErrorResponse(error);
      res.status(statusCode).json(errorResponse);
    }
  });

  app.get("/api/saved-reports/:id/download", async (req, res) => {
    try {
      const { id } = req.params;
      const report = await storage.getSavedReportById(parseInt(id));
      
      if (!report) {
        res.status(404).json({ error: "Report not found" });
        return;
      }

      // Convert base64 PDF data back to buffer
      const pdfBuffer = Buffer.from(report.pdfData, 'base64');
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${report.reportName}.pdf"`);
      res.setHeader('Content-Length', pdfBuffer.length);
      res.send(pdfBuffer);
    } catch (error) {
      console.error("Error downloading report:", error);
      res.status(500).json({ error: "Failed to download report" });
    }
  });

  app.delete("/api/saved-reports/:id", async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteSavedReport(parseInt(id));
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting saved report:", error);
      res.status(500).json({ error: "Failed to delete saved report" });
    }
  });

  // Admin Authentication Routes
  app.post("/api/admin/login", async (req, res) => {
    try {
      const { password } = req.body;
      const adminPassword = process.env.ADMIN_PASSWORD;

      if (!adminPassword) {
        res.status(500).json({ error: "Admin password not configured" });
        return;
      }

      if (password === adminPassword) {
        // Regenerate session to prevent fixation attacks
        req.session.regenerate((err) => {
          if (err) {
            console.error("Session regeneration error:", err);
            res.status(500).json({ error: "Login failed" });
            return;
          }
          // Set admin flag in new session (httpOnly cookie)
          (req.session as any).isAdmin = true;
          (req.session as any).loginTime = Date.now();
          
          // Save session to ensure new session ID is sent to browser
          req.session.save((saveErr) => {
            if (saveErr) {
              console.error("Session save error:", saveErr);
              res.status(500).json({ error: "Login failed" });
              return;
            }
            res.json({ success: true, isAdmin: true });
          });
        });
      } else {
        res.status(401).json({ error: "Invalid password" });
      }
    } catch (error) {
      console.error("Error during admin login:", error);
      res.status(500).json({ error: "Login failed" });
    }
  });

  app.post("/api/admin/verify", async (req, res) => {
    try {
      const session = req.session as any;
      if (session?.isAdmin && session?.loginTime) {
        // Check if session is still valid (24 hours)
        const sessionAge = Date.now() - session.loginTime;
        if (sessionAge < 24 * 60 * 60 * 1000) {
          res.json({ isAdmin: true });
        } else {
          session.isAdmin = false;
          res.json({ isAdmin: false });
        }
      } else {
        res.json({ isAdmin: false });
      }
    } catch (error) {
      res.json({ isAdmin: false });
    }
  });

  app.post("/api/admin/logout", async (req, res) => {
    try {
      // Destroy session completely to prevent cookie reuse
      req.session.destroy((err) => {
        if (err) {
          console.error("Session destroy error:", err);
          res.status(500).json({ error: "Logout failed" });
          return;
        }
        // Clear the session cookie from browser
        res.clearCookie('connect.sid', { path: '/' });
        res.json({ success: true });
      });
    } catch (error) {
      res.status(500).json({ error: "Logout failed" });
    }
  });

  // Middleware to verify admin session
  const verifyAdminToken = (req: any, res: any, next: any) => {
    const session = req.session as any;
    if (!session?.isAdmin || !session?.loginTime) {
      res.status(403).json({ error: "Unauthorized - Admin access required" });
      return;
    }
    // Check session age
    const sessionAge = Date.now() - session.loginTime;
    if (sessionAge >= 24 * 60 * 60 * 1000) {
      session.isAdmin = false;
      res.status(403).json({ error: "Session expired - Please login again" });
      return;
    }
    next();
  };

  // Owner Analytics Routes (Protected)
  app.get("/api/owner-analytics", verifyAdminToken, async (req, res) => {
    try {
      const records = await storage.getAllRecords();
      
      // Calculate comprehensive owner analytics
      const analytics: any = {
        // Overall company metrics
        totalRevenue: 0,
        totalAgentNet: 0,
        totalMerchants: new Set(),
        totalAccounts: records.length,
        
        // By processor
        byProcessor: {} as Record<string, any>,
        
        // By branch
        byBranch: {} as Record<string, any>,
        
        // Time series
        monthlyTrends: {} as Record<string, any>,
        
        // Top performers
        topBranches: [] as any[],
        topMerchants: [] as any[],
        
        // Risk indicators
        decliningRevenue: [] as any[],
        atRiskMerchants: [] as any[],
      };

      // Process all records
      records.forEach(record => {
        const revenue = record.salesAmount || record.income || record.volume || record.net || 0;
        const agentNet = record.agentNet || (revenue * (record.commissionPercent || 0) / 100);
        
        analytics.totalRevenue += revenue;
        analytics.totalAgentNet += agentNet;
        analytics.totalMerchants.add(record.merchantId);

        // By processor
        if (!analytics.byProcessor[record.processor]) {
          analytics.byProcessor[record.processor] = {
            revenue: 0,
            agentNet: 0,
            merchantCount: new Set(),
            accountCount: 0,
          };
        }
        analytics.byProcessor[record.processor].revenue += revenue;
        analytics.byProcessor[record.processor].agentNet += agentNet;
        analytics.byProcessor[record.processor].merchantCount.add(record.merchantId);
        analytics.byProcessor[record.processor].accountCount += 1;

        // By branch
        if (record.branchId) {
          if (!analytics.byBranch[record.branchId]) {
            analytics.byBranch[record.branchId] = {
              revenue: 0,
              agentNet: 0,
              merchantCount: new Set(),
              accountCount: 0,
            };
          }
          analytics.byBranch[record.branchId].revenue += revenue;
          analytics.byBranch[record.branchId].agentNet += agentNet;
          analytics.byBranch[record.branchId].merchantCount.add(record.merchantId);
          analytics.byBranch[record.branchId].accountCount += 1;
        }

        // Monthly trends
        if (!analytics.monthlyTrends[record.month]) {
          analytics.monthlyTrends[record.month] = {
            revenue: 0,
            agentNet: 0,
            accountCount: 0,
          };
        }
        analytics.monthlyTrends[record.month].revenue += revenue;
        analytics.monthlyTrends[record.month].agentNet += agentNet;
        analytics.monthlyTrends[record.month].accountCount += 1;
      });

      // Convert Sets to counts
      Object.keys(analytics.byProcessor).forEach(proc => {
        analytics.byProcessor[proc].merchantCount = analytics.byProcessor[proc].merchantCount.size;
      });
      Object.keys(analytics.byBranch).forEach(branch => {
        analytics.byBranch[branch].merchantCount = analytics.byBranch[branch].merchantCount.size;
      });
      
      // Calculate top branches
      analytics.topBranches = Object.entries(analytics.byBranch)
        .map(([branchId, data]: [string, any]) => ({
          branchId,
          ...data,
        }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 10);

      // Calculate top merchants by revenue
      const merchantRevenue = new Map<string, { name: string; revenue: number; processor: string }>();
      records.forEach(record => {
        const revenue = record.salesAmount || record.income || record.volume || record.net || 0;
        const existing = merchantRevenue.get(record.merchantId);
        if (!existing || existing.revenue < revenue) {
          merchantRevenue.set(record.merchantId, {
            name: record.merchantName,
            revenue,
            processor: record.processor,
          });
        }
      });
      
      analytics.topMerchants = Array.from(merchantRevenue.entries())
        .map(([merchantId, data]) => ({ merchantId, ...data }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 10);

      analytics.totalMerchants = analytics.totalMerchants.size;

      res.json(analytics);
    } catch (error) {
      console.error("Error calculating owner analytics:", error);
      res.status(500).json({ error: "Failed to calculate analytics" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}

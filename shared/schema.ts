import { z } from "zod";
import { pgTable, text, real, varchar, timestamp, serial, boolean, jsonb, index, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";

// Database Tables
export const merchantRecords = pgTable("merchant_records", {
  id: serial("id").primaryKey(),
  merchantId: varchar("merchant_id", { length: 255 }).notNull(),
  merchantName: text("merchant_name").notNull(),
  month: varchar("month", { length: 20 }).notNull(),
  processor: varchar("processor", { length: 50 }).notNull(),
  branchId: varchar("branch_id", { length: 50 }),
  
  // Revenue fields
  salesAmount: real("sales_amount"),
  
  // Clearent-specific
  transactions: real("transactions"),
  net: real("net"),
  commissionPercent: real("commission_percent"),
  agentNet: real("agent_net"),
  
  // Shift4-specific
  payoutAmount: real("payout_amount"),
  volume: real("volume"),
  sales: real("sales"),
  refunds: real("refunds"),
  rejectAmount: real("reject_amount"),
  bankSplit: real("bank_split"),
  bankPayout: real("bank_payout"),
  
  // ML-specific
  income: real("income"),
  expenses: real("expenses"),
  
  // Metadata
  partnerBranchNumber: varchar("partner_branch_number", { length: 50 }),
  status: varchar("status", { length: 100 }),
  statusCategory: varchar("status_category", { length: 100 }),
  expectedProcessor: varchar("expected_processor", { length: 50 }),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  // Unique constraint to prevent duplicate records
  merchantMonthProcessorIdx: uniqueIndex("merchant_month_processor_idx").on(table.merchantId, table.month, table.processor),
  // Index for faster queries
  merchantIdIdx: index("merchant_id_idx").on(table.merchantId),
  monthIdx: index("month_idx").on(table.month),
  processorIdx: index("processor_idx").on(table.processor),
  branchIdIdx: index("branch_id_idx").on(table.branchId),
}));

export const uploadedFiles = pgTable("uploaded_files", {
  id: varchar("id", { length: 255 }).primaryKey(),
  fileName: text("file_name").notNull(),
  processor: varchar("processor", { length: 50 }).notNull(),
  month: varchar("month", { length: 20 }).notNull(),
  recordCount: real("record_count").notNull(),
  uploadedAt: text("uploaded_at").notNull(),
  isValid: boolean("is_valid").notNull(),
  errors: jsonb("errors").$type<string[]>(),
}, (table) => ({
  // Index for faster file queries
  processorMonthIdx: index("file_processor_month_idx").on(table.processor, table.month),
}));

export const merchantMetadata = pgTable("merchant_metadata", {
  id: serial("id").primaryKey(),
  merchantId: varchar("merchant_id", { length: 255 }).notNull().unique(),
  dbaName: text("dba_name").notNull(),
  partnerBranchNumber: varchar("partner_branch_number", { length: 50 }),
  status: varchar("status", { length: 100 }),
  statusCategory: varchar("status_category", { length: 100 }),
  currentProcessor: varchar("current_processor", { length: 50 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const partnerLogos = pgTable("partner_logos", {
  id: serial("id").primaryKey(),
  partnerName: varchar("partner_name", { length: 255 }).notNull().unique(),
  logoUrl: text("logo_url").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const savedReports = pgTable("saved_reports", {
  id: serial("id").primaryKey(),
  reportName: varchar("report_name", { length: 255 }).notNull(),
  processor: varchar("processor", { length: 50 }).notNull(),
  dateRangeLabel: varchar("date_range_label", { length: 255 }).notNull(),
  partnerName: varchar("partner_name", { length: 255 }),
  partnerLogoUrl: text("partner_logo_url"),
  pdfData: text("pdf_data").notNull(),
  fileSize: real("file_size").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  createdAtIdx: index("saved_reports_created_at_idx").on(table.createdAt),
}));

// Insert schemas for API validation - will be defined after merchantRecordSchema
export const insertUploadedFileSchema = createInsertSchema(uploadedFiles);
export const insertMerchantMetadataSchema = createInsertSchema(merchantMetadata).omit({ id: true, createdAt: true, updatedAt: true });
export const insertPartnerLogoSchema = createInsertSchema(partnerLogos).omit({ id: true, createdAt: true, updatedAt: true });
export const insertSavedReportSchema = createInsertSchema(savedReports).omit({ id: true, createdAt: true });

// Type exports for database
export type DbMerchantRecord = typeof merchantRecords.$inferSelect;
export type InsertMerchantRecord = z.infer<typeof insertMerchantRecordSchema>;
export type DbUploadedFile = typeof uploadedFiles.$inferSelect;
export type InsertUploadedFile = z.infer<typeof insertUploadedFileSchema>;
export type DbMerchantMetadata = typeof merchantMetadata.$inferSelect;
export type InsertMerchantMetadata = z.infer<typeof insertMerchantMetadataSchema>;
export type DbPartnerLogo = typeof partnerLogos.$inferSelect;
export type InsertPartnerLogo = z.infer<typeof insertPartnerLogoSchema>;
export type SavedReport = typeof savedReports.$inferSelect;
export type InsertSavedReport = z.infer<typeof insertSavedReportSchema>;

// Legacy Zod schemas for frontend compatibility
export const merchantRecordSchema = z.object({
  merchantId: z.string(),
  merchantName: z.string(),
  month: z.string(),
  processor: z.enum(['Clearent', 'ML', 'Shift4', 'TSYS', 'Micamp', 'PayBright', 'TRX', 'All']),
  branchId: z.string().optional(),
  
  // Common fields
  salesAmount: z.number().optional(),
  
  // Clearent-specific fields
  transactions: z.number().optional(), // Number of swipes
  net: z.number().optional(), // Tracer's revenue
  commissionPercent: z.number().optional(), // Commission %
  agentNet: z.number().optional(), // Agent's cut
  
  // Shift4-specific fields
  payoutAmount: z.number().optional(),
  volume: z.number().optional(),
  sales: z.number().optional(),
  refunds: z.number().optional(),
  rejectAmount: z.number().optional(),
  bankSplit: z.number().optional(),
  bankPayout: z.number().optional(),
  
  // ML-specific fields
  income: z.number().optional(),
  expenses: z.number().optional(),
  
  // Metadata from Leads file (cross-reference)
  partnerBranchNumber: z.string().optional(),
  status: z.string().optional(),
  statusCategory: z.string().optional(),
  expectedProcessor: z.string().optional(), // Current Processor from leads file
});

// Insert schema for merchant records - use the same schema for API validation
export const insertMerchantRecordSchema = merchantRecordSchema;

export const uploadedFileSchema = z.object({
  id: z.string(),
  fileName: z.string(),
  processor: z.enum(['Clearent', 'ML', 'Shift4', 'TSYS', 'Micamp', 'PayBright', 'TRX']),
  month: z.string(),
  recordCount: z.number(),
  uploadedAt: z.string(),
  isValid: z.boolean(),
  errors: z.array(z.string()).optional(),
});

export const merchantMetadataSchema = z.object({
  merchantId: z.string(),
  dbaName: z.string(),
  partnerBranchNumber: z.string().optional(),
  status: z.string().optional(),
  statusCategory: z.string().optional(),
  currentProcessor: z.string().optional(),
});

export const validationWarningSchema = z.object({
  merchantId: z.string(),
  merchantName: z.string(),
  warningType: z.enum(['branch_mismatch', 'processor_mismatch']),
  expected: z.string(),
  actual: z.string(),
  processor: z.string(),
});

export const monthlyMetricsSchema = z.object({
  month: z.string(),
  processor: z.enum(['Clearent', 'ML', 'Shift4', 'TSYS', 'Micamp', 'PayBright', 'TRX', 'All']),
  totalRevenue: z.number(),
  totalAccounts: z.number(),
  retainedAccounts: z.number(),
  lostAccounts: z.number(),
  newAccounts: z.number(),
  retentionRate: z.number(),
  attritionRate: z.number(),
  revenuePerAccount: z.number(),
  momRevenueChange: z.number().optional(),
  momRevenueChangePercent: z.number().optional(),
  netAccountGrowth: z.number(),
  totalAgentNet: z.number(),
  agentNetPerAccount: z.number(),
});

export const topMerchantSchema = z.object({
  merchantId: z.string(),
  merchantName: z.string(),
  revenue: z.number(),
  percentOfTotal: z.number(),
  processor: z.enum(['Clearent', 'ML', 'Shift4', 'TSYS', 'Micamp', 'PayBright', 'TRX']),
  trend: z.enum(['up', 'down', 'stable']).optional(),
});

export const branchPerformanceSchema = z.object({
  branchId: z.string(),
  totalRevenue: z.number(),
  accountCount: z.number(),
  retentionRate: z.number(),
  averageAccountRevenue: z.number(),
});

export const dateRangeSchema = z.object({
  start: z.string(),
  end: z.string(),
  preset: z.enum(['3months', '6months', 'all', 'custom']).optional(),
});

export const merchantChangeSchema = z.object({
  merchantId: z.string(),
  merchantName: z.string(),
  revenue: z.number(),
  month: z.string(),
  processor: z.string(),
});

export const merchantChangesSchema = z.object({
  newMerchants: z.array(merchantChangeSchema),
  lostMerchants: z.array(merchantChangeSchema),
  retainedCount: z.number(),
});

export const partnerLogoSchema = z.object({
  id: z.number(),
  partnerName: z.string(),
  logoUrl: z.string(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

export type MerchantRecord = z.infer<typeof merchantRecordSchema>;
export type UploadedFile = z.infer<typeof uploadedFileSchema>;
export type MonthlyMetrics = z.infer<typeof monthlyMetricsSchema>;
export type TopMerchant = z.infer<typeof topMerchantSchema>;
export type BranchPerformance = z.infer<typeof branchPerformanceSchema>;
export type DateRange = z.infer<typeof dateRangeSchema>;
export type MerchantChange = z.infer<typeof merchantChangeSchema>;
export type MerchantChanges = z.infer<typeof merchantChangesSchema>;
export type MerchantMetadata = z.infer<typeof merchantMetadataSchema>;
export type ValidationWarning = z.infer<typeof validationWarningSchema>;
export type PartnerLogo = z.infer<typeof partnerLogoSchema>;
export type Processor = 'Clearent' | 'ML' | 'Shift4' | 'TSYS' | 'Micamp' | 'PayBright' | 'TRX' | 'All';

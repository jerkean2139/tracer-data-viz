import { z } from "zod";

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
export type Processor = 'Clearent' | 'ML' | 'Shift4' | 'TSYS' | 'Micamp' | 'PayBright' | 'TRX' | 'All';

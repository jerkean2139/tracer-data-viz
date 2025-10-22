import { z } from "zod";

export const merchantRecordSchema = z.object({
  merchantId: z.string(),
  merchantName: z.string(),
  salesAmount: z.number(),
  branchId: z.string().optional(),
  month: z.string(),
  processor: z.enum(['Clearent', 'ML', 'Shift4', 'All']),
});

export const uploadedFileSchema = z.object({
  id: z.string(),
  fileName: z.string(),
  processor: z.enum(['Clearent', 'ML', 'Shift4']),
  month: z.string(),
  recordCount: z.number(),
  uploadedAt: z.string(),
  isValid: z.boolean(),
  errors: z.array(z.string()).optional(),
});

export const monthlyMetricsSchema = z.object({
  month: z.string(),
  processor: z.enum(['Clearent', 'ML', 'Shift4', 'All']),
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
});

export const topMerchantSchema = z.object({
  merchantId: z.string(),
  merchantName: z.string(),
  revenue: z.number(),
  percentOfTotal: z.number(),
  processor: z.enum(['Clearent', 'ML', 'Shift4']),
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

export type MerchantRecord = z.infer<typeof merchantRecordSchema>;
export type UploadedFile = z.infer<typeof uploadedFileSchema>;
export type MonthlyMetrics = z.infer<typeof monthlyMetricsSchema>;
export type TopMerchant = z.infer<typeof topMerchantSchema>;
export type BranchPerformance = z.infer<typeof branchPerformanceSchema>;
export type DateRange = z.infer<typeof dateRangeSchema>;
export type Processor = 'Clearent' | 'ML' | 'Shift4' | 'All';

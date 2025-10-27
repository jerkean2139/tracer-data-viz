import { merchantRecords, merchantMetadata, uploadedFiles, partnerLogos, savedReports, type DbMerchantRecord, type InsertMerchantRecord, type DbMerchantMetadata, type InsertMerchantMetadata, type DbUploadedFile, type InsertUploadedFile, type DbPartnerLogo, type InsertPartnerLogo, type SavedReport, type InsertSavedReport, MerchantRecord, ValidationWarning, UploadedFile, MerchantMetadata, PartnerLogo } from "@shared/schema";
import { db } from "./db";
import { eq, and, sql, desc } from "drizzle-orm";

export interface IStorage {
  // Merchant Records
  getAllRecords(): Promise<MerchantRecord[]>;
  addRecords(records: InsertMerchantRecord[]): Promise<void>;
  deleteRecordsByMonth(month: string, processor?: string): Promise<void>;
  clearAllRecords(): Promise<void>;
  
  // Uploaded Files
  getUploadedFiles(): Promise<UploadedFile[]>;
  addUploadedFile(file: InsertUploadedFile): Promise<void>;
  deleteUploadedFile(fileId: string): Promise<void>;
  
  // Merchant Metadata
  getAllMetadata(): Promise<MerchantMetadata[]>;
  addMetadata(metadata: InsertMerchantMetadata[]): Promise<void>;
  getMetadataByMID(merchantId: string): Promise<MerchantMetadata | undefined>;
  clearAllMetadata(): Promise<void>;
  
  // Partner Logos
  getAllPartnerLogos(): Promise<PartnerLogo[]>;
  addPartnerLogo(logo: InsertPartnerLogo): Promise<PartnerLogo>;
  updatePartnerLogo(id: number, logoUrl: string): Promise<void>;
  deletePartnerLogo(id: number): Promise<void>;
  
  // Saved Reports
  getAllSavedReports(): Promise<SavedReport[]>;
  savePDFReport(report: InsertSavedReport): Promise<SavedReport>;
  getSavedReportById(id: number): Promise<SavedReport | undefined>;
  deleteSavedReport(id: number): Promise<void>;
  
  // Validation
  getValidationWarnings(): Promise<ValidationWarning[]>;
}

export class DatabaseStorage implements IStorage {
  async getAllRecords(): Promise<MerchantRecord[]> {
    const records = await db.select().from(merchantRecords);
    return records.map(this.dbRecordToMerchantRecord);
  }

  async addRecords(records: InsertMerchantRecord[]): Promise<void> {
    if (records.length === 0) return;

    // Helper to get revenue from a record
    const getRevenue = (rec: any): number => {
      if (rec.processor === 'Clearent' || rec.processor === 'ML') {
        return rec.net ?? rec.salesAmount ?? 0;
      }
      if (rec.processor === 'Shift4') {
        return rec.payoutAmount ?? rec.salesAmount ?? 0;
      }
      return rec.net ?? rec.salesAmount ?? 0;
    };

    // Use ON CONFLICT upsert for better performance
    // Only update if new record has higher revenue
    for (const record of records) {
      const newRevenue = getRevenue(record);
      
      await db
        .insert(merchantRecords)
        .values(record)
        .onConflictDoUpdate({
          target: [merchantRecords.merchantId, merchantRecords.month, merchantRecords.processor],
          set: record,
          where: sql`
            CASE 
              WHEN ${merchantRecords.processor} IN ('Clearent', 'ML') THEN
                COALESCE(${merchantRecords.net}, ${merchantRecords.salesAmount}, 0) < ${newRevenue}
              WHEN ${merchantRecords.processor} = 'Shift4' THEN
                COALESCE(${merchantRecords.payoutAmount}, ${merchantRecords.salesAmount}, 0) < ${newRevenue}
              ELSE
                COALESCE(${merchantRecords.net}, ${merchantRecords.salesAmount}, 0) < ${newRevenue}
            END
          `
        });
    }
  }

  async deleteRecordsByMonth(month: string, processor?: string): Promise<void> {
    if (processor) {
      await db
        .delete(merchantRecords)
        .where(
          and(
            eq(merchantRecords.month, month),
            eq(merchantRecords.processor, processor)
          )
        );
    } else {
      await db
        .delete(merchantRecords)
        .where(eq(merchantRecords.month, month));
    }
  }

  async clearAllRecords(): Promise<void> {
    await db.delete(merchantRecords);
    await db.delete(uploadedFiles);
  }

  async getUploadedFiles(): Promise<UploadedFile[]> {
    const files = await db.select().from(uploadedFiles);
    return files.map(f => ({
      id: f.id,
      fileName: f.fileName,
      processor: f.processor as any,
      month: f.month,
      recordCount: f.recordCount,
      uploadedAt: f.uploadedAt,
      isValid: f.isValid,
      errors: f.errors as string[] | undefined,
    }));
  }

  async addUploadedFile(file: InsertUploadedFile): Promise<void> {
    await db.insert(uploadedFiles).values({
      ...file,
      errors: file.errors || null,
    } as any);
  }

  async deleteUploadedFile(fileId: string): Promise<void> {
    await db.delete(uploadedFiles).where(eq(uploadedFiles.id, fileId));
  }

  async getAllMetadata(): Promise<MerchantMetadata[]> {
    const metadata = await db.select().from(merchantMetadata);
    return metadata.map(m => ({
      merchantId: m.merchantId,
      dbaName: m.dbaName,
      partnerBranchNumber: m.partnerBranchNumber ?? undefined,
      status: m.status ?? undefined,
      statusCategory: m.statusCategory ?? undefined,
      currentProcessor: m.currentProcessor ?? undefined,
    }));
  }

  async addMetadata(newMetadata: InsertMerchantMetadata[]): Promise<void> {
    for (const meta of newMetadata) {
      // Check if metadata exists
      const existing = await db
        .select()
        .from(merchantMetadata)
        .where(eq(merchantMetadata.merchantId, meta.merchantId))
        .limit(1);

      if (existing.length > 0) {
        // Update existing
        await db
          .update(merchantMetadata)
          .set({ ...meta, updatedAt: new Date() })
          .where(eq(merchantMetadata.merchantId, meta.merchantId));
      } else {
        // Insert new
        await db.insert(merchantMetadata).values(meta);
      }
    }
  }

  async getMetadataByMID(merchantId: string): Promise<MerchantMetadata | undefined> {
    const [meta] = await db
      .select()
      .from(merchantMetadata)
      .where(eq(merchantMetadata.merchantId, merchantId))
      .limit(1);

    if (!meta) return undefined;

    return {
      merchantId: meta.merchantId,
      dbaName: meta.dbaName,
      partnerBranchNumber: meta.partnerBranchNumber ?? undefined,
      status: meta.status ?? undefined,
      statusCategory: meta.statusCategory ?? undefined,
      currentProcessor: meta.currentProcessor ?? undefined,
    };
  }

  async clearAllMetadata(): Promise<void> {
    await db.delete(merchantMetadata);
  }

  async getValidationWarnings(): Promise<ValidationWarning[]> {
    const records = await this.getAllRecords();
    const metadata = await this.getAllMetadata();
    const warnings: ValidationWarning[] = [];

    if (metadata.length === 0) {
      return warnings;
    }

    const metadataMap = new Map<string, MerchantMetadata>();
    metadata.forEach(m => metadataMap.set(m.merchantId, m));

    records.forEach(record => {
      const meta = metadataMap.get(record.merchantId);
      if (!meta) return;

      if (meta.partnerBranchNumber && record.branchId && 
          meta.partnerBranchNumber !== record.branchId) {
        warnings.push({
          merchantId: record.merchantId,
          merchantName: record.merchantName,
          warningType: 'branch_mismatch',
          expected: meta.partnerBranchNumber,
          actual: record.branchId,
          processor: record.processor,
        });
      }

      if (meta.currentProcessor && 
          meta.currentProcessor.toLowerCase() !== record.processor.toLowerCase()) {
        warnings.push({
          merchantId: record.merchantId,
          merchantName: record.merchantName,
          warningType: 'processor_mismatch',
          expected: meta.currentProcessor,
          actual: record.processor,
          processor: record.processor,
        });
      }
    });

    return warnings;
  }

  async getAllPartnerLogos(): Promise<PartnerLogo[]> {
    const logos = await db.select().from(partnerLogos);
    return logos.map(l => ({
      id: l.id,
      partnerName: l.partnerName,
      logoUrl: l.logoUrl,
      createdAt: l.createdAt?.toISOString(),
      updatedAt: l.updatedAt?.toISOString(),
    }));
  }

  async addPartnerLogo(logo: InsertPartnerLogo): Promise<PartnerLogo> {
    const [newLogo] = await db
      .insert(partnerLogos)
      .values(logo)
      .returning();
    
    return {
      id: newLogo.id,
      partnerName: newLogo.partnerName,
      logoUrl: newLogo.logoUrl,
      createdAt: newLogo.createdAt?.toISOString(),
      updatedAt: newLogo.updatedAt?.toISOString(),
    };
  }

  async updatePartnerLogo(id: number, logoUrl: string): Promise<void> {
    await db
      .update(partnerLogos)
      .set({ logoUrl, updatedAt: new Date() })
      .where(eq(partnerLogos.id, id));
  }

  async deletePartnerLogo(id: number): Promise<void> {
    await db
      .delete(partnerLogos)
      .where(eq(partnerLogos.id, id));
  }

  async getAllSavedReports(): Promise<SavedReport[]> {
    const reports = await db
      .select()
      .from(savedReports)
      .orderBy(desc(savedReports.createdAt));
    
    return reports;
  }

  async savePDFReport(report: InsertSavedReport): Promise<SavedReport> {
    const [newReport] = await db
      .insert(savedReports)
      .values(report)
      .returning();
    
    return newReport;
  }

  async getSavedReportById(id: number): Promise<SavedReport | undefined> {
    const [report] = await db
      .select()
      .from(savedReports)
      .where(eq(savedReports.id, id));
    
    return report;
  }

  async deleteSavedReport(id: number): Promise<void> {
    await db
      .delete(savedReports)
      .where(eq(savedReports.id, id));
  }

  private dbRecordToMerchantRecord(dbRecord: DbMerchantRecord): MerchantRecord {
    return {
      merchantId: dbRecord.merchantId,
      merchantName: dbRecord.merchantName,
      month: dbRecord.month,
      processor: dbRecord.processor as any,
      branchId: dbRecord.branchId ?? undefined,
      salesAmount: dbRecord.salesAmount ?? undefined,
      transactions: dbRecord.transactions ?? undefined,
      net: dbRecord.net ?? undefined,
      commissionPercent: dbRecord.commissionPercent ?? undefined,
      agentNet: dbRecord.agentNet ?? undefined,
      payoutAmount: dbRecord.payoutAmount ?? undefined,
      volume: dbRecord.volume ?? undefined,
      sales: dbRecord.sales ?? undefined,
      refunds: dbRecord.refunds ?? undefined,
      rejectAmount: dbRecord.rejectAmount ?? undefined,
      bankSplit: dbRecord.bankSplit ?? undefined,
      bankPayout: dbRecord.bankPayout ?? undefined,
      income: dbRecord.income ?? undefined,
      expenses: dbRecord.expenses ?? undefined,
      partnerBranchNumber: dbRecord.partnerBranchNumber ?? undefined,
      status: dbRecord.status ?? undefined,
      statusCategory: dbRecord.statusCategory ?? undefined,
      expectedProcessor: dbRecord.expectedProcessor ?? undefined,
    };
  }
}

export const storage = new DatabaseStorage();

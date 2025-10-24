import { merchantRecords, merchantMetadata, uploadedFiles, type DbMerchantRecord, type InsertMerchantRecord, type DbMerchantMetadata, type InsertMerchantMetadata, type DbUploadedFile, type InsertUploadedFile, MerchantRecord, ValidationWarning, UploadedFile, MerchantMetadata } from "@shared/schema";
import { db } from "./db";
import { eq, and, sql } from "drizzle-orm";

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

    // Insert records in batches
    for (const record of records) {
      // Check if record already exists
      const existing = await db
        .select()
        .from(merchantRecords)
        .where(
          and(
            eq(merchantRecords.merchantId, record.merchantId),
            eq(merchantRecords.month, record.month),
            eq(merchantRecords.processor, record.processor)
          )
        )
        .limit(1);

      const getRevenue = (rec: any): number => {
        if (rec.processor === 'Clearent' || rec.processor === 'ML') {
          return rec.net ?? rec.salesAmount ?? 0;
        }
        if (rec.processor === 'Shift4') {
          return rec.payoutAmount ?? rec.salesAmount ?? 0;
        }
        return rec.net ?? rec.salesAmount ?? 0;
      };

      if (existing.length > 0) {
        // Update if new record has higher revenue
        const existingRevenue = getRevenue(existing[0]);
        const newRevenue = getRevenue(record);
        
        if (newRevenue > existingRevenue) {
          await db
            .update(merchantRecords)
            .set(record)
            .where(eq(merchantRecords.id, existing[0].id));
        }
      } else {
        // Insert new record
        await db.insert(merchantRecords).values(record);
      }
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
      isValid: f.isValid === 'true',
      errors: f.errors ? JSON.parse(f.errors) : undefined,
    }));
  }

  async addUploadedFile(file: InsertUploadedFile): Promise<void> {
    await db.insert(uploadedFiles).values({
      ...file,
      isValid: String(file.isValid),
      errors: file.errors ? JSON.stringify(file.errors) : undefined,
    });
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

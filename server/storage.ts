import { merchantRecords, merchantMetadata, uploadedFiles, partnerLogos, users, type DbMerchantRecord, type InsertMerchantRecord, type DbMerchantMetadata, type InsertMerchantMetadata, type DbUploadedFile, type InsertUploadedFile, type DbPartnerLogo, type InsertPartnerLogo, type User, type UpsertUser, type ReplitUpsertUser, MerchantRecord, ValidationWarning, UploadedFile, MerchantMetadata, PartnerLogo } from "@shared/schema";
import { db } from "./db";
import { eq, and, sql } from "drizzle-orm";
import { hashPassword } from "./auth-utils";

export interface IStorage {
  // User operations (required for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  // upsertUser restricted to Replit Auth only - excludes credential fields
  upsertUser(user: ReplitUpsertUser): Promise<User>;
  updateUserRole(id: string, role: string): Promise<void>;
  
  // User operations (username/password auth)
  getUserByUsername(username: string): Promise<User | undefined>;
  createLocalUser(data: { username: string; password: string; firstName: string; lastName: string; role: string }): Promise<User>;
  // updateUser only accepts non-credential fields to prevent bypassing password hashing
  updateUser(id: string, data: { firstName?: string; lastName?: string; role?: string }): Promise<void>;
  updateUserPassword(userId: string, newPassword: string): Promise<void>;
  deleteUser(id: string): Promise<void>;
  
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
  
  // Validation
  getValidationWarnings(): Promise<ValidationWarning[]>;
}

export class DatabaseStorage implements IStorage {
  // User operations (required for Replit Auth)
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users);
  }

  async upsertUser(userData: ReplitUpsertUser): Promise<User> {
    // Security guard: Ensure Replit Auth users never have password fields
    // Strip any passwordHash/authType if somehow provided (defense in depth)
    const safeData = {
      ...userData,
      authType: 'replit' as const,  // Always 'replit' for this path
      passwordHash: undefined,       // Never allow password bypass
    };

    const [user] = await db
      .insert(users)
      .values(safeData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...safeData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async updateUserRole(id: string, role: string): Promise<void> {
    await db
      .update(users)
      .set({ role, updatedAt: new Date() })
      .where(eq(users.id, id));
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createLocalUser(data: { username: string; password: string; firstName: string; lastName: string; role: string }): Promise<User> {
    // Hash password internally - this is the ONLY place passwords are hashed
    const passwordHash = await hashPassword(data.password);
    
    const [user] = await db
      .insert(users)
      .values({
        username: data.username,
        passwordHash,
        firstName: data.firstName,
        lastName: data.lastName,
        role: data.role,
        authType: 'local',
      })
      .returning();
    return user;
  }

  async updateUser(id: string, data: { firstName?: string; lastName?: string; role?: string }): Promise<void> {
    // Only accepts non-credential fields - prevents bypassing password hashing
    await db
      .update(users)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(users.id, id));
  }

  async updateUserPassword(userId: string, newPassword: string): Promise<void> {
    // Hash password internally - centralized password hashing
    const passwordHash = await hashPassword(newPassword);
    
    await db
      .update(users)
      .set({ 
        passwordHash,
        updatedAt: new Date()
      })
      .where(eq(users.id, userId));
  }

  async deleteUser(id: string): Promise<void> {
    await db.delete(users).where(eq(users.id, id));
  }

  async getAllRecords(): Promise<MerchantRecord[]> {
    const records = await db.select().from(merchantRecords);
    return records.map(this.dbRecordToMerchantRecord);
  }

  async addRecords(records: InsertMerchantRecord[]): Promise<void> {
    if (records.length === 0) return;

    // Helper to get revenue from a record (TRACER C2 commission only, NOT merchant sales)
    const getRevenue = (rec: any): number => {
      // Clearent & ML: use 'net' (TRACER's revenue)
      if (rec.processor === 'Clearent' || rec.processor === 'ML') {
        return rec.net ?? 0;
      }
      
      // Shift4 & TRX: use 'payoutAmount' (TRACER's revenue)
      if (rec.processor === 'Shift4' || rec.processor === 'TRX') {
        return rec.payoutAmount ?? 0;
      }
      
      // TSYS, Micamp, PayBright, Payment Advisors: use 'net' (TRACER's revenue)
      // DO NOT fall back to salesAmount - that's merchant sales volume, not TRACER revenue
      return rec.net ?? 0;
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
                COALESCE(${merchantRecords.net}, 0) < ${newRevenue}
              WHEN ${merchantRecords.processor} IN ('Shift4', 'TRX') THEN
                COALESCE(${merchantRecords.payoutAmount}, 0) < ${newRevenue}
              ELSE
                COALESCE(${merchantRecords.net}, 0) < ${newRevenue}
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
      partnerNet: dbRecord.partnerNet ?? undefined,
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

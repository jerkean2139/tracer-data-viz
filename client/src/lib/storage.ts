import { MerchantRecord, UploadedFile, MerchantMetadata, ValidationWarning } from '@shared/schema';

const STORAGE_KEYS = {
  RECORDS: 'merchant_records',
  FILES: 'uploaded_files',
  METADATA: 'merchant_metadata',
};

export const storageService = {
  getAllRecords(): MerchantRecord[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.RECORDS);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error loading records:', error);
      return [];
    }
  },

  saveRecords(records: MerchantRecord[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.RECORDS, JSON.stringify(records));
    } catch (error) {
      console.error('Error saving records:', error);
      throw new Error('Failed to save records to storage');
    }
  },

  addRecords(newRecords: MerchantRecord[]): void {
    const existing = this.getAllRecords();
    const recordMap = new Map<string, MerchantRecord>();

    // Helper to get revenue for comparison
    const getRevenue = (record: MerchantRecord): number => {
      if (record.processor === 'Clearent' || record.processor === 'ML') {
        return record.net ?? record.salesAmount ?? 0;
      }
      if (record.processor === 'Shift4') {
        return record.payoutAmount ?? record.salesAmount ?? 0;
      }
      return record.net ?? record.salesAmount ?? 0;
    };

    existing.forEach(record => {
      const key = `${record.processor}-${record.month}-${record.merchantId}`;
      recordMap.set(key, record);
    });

    newRecords.forEach(record => {
      const key = `${record.processor}-${record.month}-${record.merchantId}`;
      const existingRecord = recordMap.get(key);
      
      if (!existingRecord || getRevenue(record) > getRevenue(existingRecord)) {
        recordMap.set(key, record);
      }
    });

    const merged = Array.from(recordMap.values());
    this.saveRecords(merged);
  },

  deleteRecordsByMonth(month: string, processor?: string): void {
    const records = this.getAllRecords();
    const filtered = records.filter(r =>
      !(r.month === month && (!processor || r.processor === processor))
    );
    this.saveRecords(filtered);
  },

  clearAllRecords(): void {
    localStorage.removeItem(STORAGE_KEYS.RECORDS);
    localStorage.removeItem(STORAGE_KEYS.FILES);
  },

  getUploadedFiles(): UploadedFile[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.FILES);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error loading files:', error);
      return [];
    }
  },

  addUploadedFile(file: UploadedFile): void {
    const files = this.getUploadedFiles();
    files.push(file);
    localStorage.setItem(STORAGE_KEYS.FILES, JSON.stringify(files));
  },

  deleteUploadedFile(fileId: string): void {
    const files = this.getUploadedFiles();
    const filtered = files.filter(f => f.id !== fileId);
    localStorage.setItem(STORAGE_KEYS.FILES, JSON.stringify(filtered));
  },

  // Merchant Metadata Management
  getAllMetadata(): MerchantMetadata[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.METADATA);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error loading metadata:', error);
      return [];
    }
  },

  saveMetadata(metadata: MerchantMetadata[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.METADATA, JSON.stringify(metadata));
    } catch (error) {
      console.error('Error saving metadata:', error);
      throw new Error('Failed to save metadata to storage');
    }
  },

  addMetadata(newMetadata: MerchantMetadata[]): void {
    const existing = this.getAllMetadata();
    const metadataMap = new Map<string, MerchantMetadata>();

    // Keep existing metadata
    existing.forEach(meta => {
      metadataMap.set(meta.merchantId, meta);
    });

    // Overwrite with new metadata (latest upload wins)
    newMetadata.forEach(meta => {
      metadataMap.set(meta.merchantId, meta);
    });

    const merged = Array.from(metadataMap.values());
    this.saveMetadata(merged);
  },

  getMetadataByMID(merchantId: string): MerchantMetadata | undefined {
    const allMetadata = this.getAllMetadata();
    return allMetadata.find(m => m.merchantId === merchantId);
  },

  clearAllMetadata(): void {
    localStorage.removeItem(STORAGE_KEYS.METADATA);
  },

  // Cross-reference validation
  getValidationWarnings(): ValidationWarning[] {
    const records = this.getAllRecords();
    const metadata = this.getAllMetadata();
    const warnings: ValidationWarning[] = [];

    if (metadata.length === 0) {
      return warnings; // No metadata to validate against
    }

    // Create metadata lookup
    const metadataMap = new Map<string, MerchantMetadata>();
    metadata.forEach(m => metadataMap.set(m.merchantId, m));

    // Check each record
    records.forEach(record => {
      const meta = metadataMap.get(record.merchantId);
      if (!meta) return; // No metadata for this merchant

      // Check branch mismatch
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

      // Check processor mismatch
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
  },
};

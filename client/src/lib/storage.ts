import { MerchantRecord, UploadedFile } from '@shared/schema';

const STORAGE_KEYS = {
  RECORDS: 'merchant_records',
  FILES: 'uploaded_files',
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

    existing.forEach(record => {
      const key = `${record.processor}-${record.month}-${record.merchantId}`;
      recordMap.set(key, record);
    });

    newRecords.forEach(record => {
      const key = `${record.processor}-${record.month}-${record.merchantId}`;
      const existingRecord = recordMap.get(key);
      
      if (!existingRecord || record.salesAmount > existingRecord.salesAmount) {
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
};

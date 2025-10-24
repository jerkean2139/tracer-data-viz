import { MerchantRecord, UploadedFile, MerchantMetadata, ValidationWarning } from '@shared/schema';

// Helper function to make API calls
async function apiCall<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`API call failed: ${response.statusText}`);
  }

  return response.json();
}

export const storageService = {
  async getAllRecords(): Promise<MerchantRecord[]> {
    try {
      return await apiCall<MerchantRecord[]>('/api/records');
    } catch (error) {
      console.error('Error loading records:', error);
      return [];
    }
  },

  async saveRecords(records: MerchantRecord[]): Promise<void> {
    // Not used in API-based storage
    console.warn('saveRecords is deprecated, use addRecords instead');
  },

  async addRecords(newRecords: MerchantRecord[]): Promise<void> {
    try {
      console.log('Sending records to API:', newRecords.length, 'records');
      console.log('First record sample:', newRecords[0]);
      await apiCall('/api/records', {
        method: 'POST',
        body: JSON.stringify(newRecords),
      });
    } catch (error) {
      console.error('Error adding records:', error);
      console.error('Full error details:', error);
      throw error; // Re-throw the original error instead of wrapping it
    }
  },

  async deleteRecordsByMonth(month: string, processor?: string): Promise<void> {
    try {
      const url = processor 
        ? `/api/records/${month}/${processor}`
        : `/api/records/${month}`;
      await apiCall(url, { method: 'DELETE' });
    } catch (error) {
      console.error('Error deleting records:', error);
      throw new Error('Failed to delete records');
    }
  },

  async clearAllRecords(): Promise<void> {
    try {
      await apiCall('/api/records', { method: 'DELETE' });
    } catch (error) {
      console.error('Error clearing records:', error);
      throw new Error('Failed to clear records');
    }
  },

  async getUploadedFiles(): Promise<UploadedFile[]> {
    try {
      return await apiCall<UploadedFile[]>('/api/files');
    } catch (error) {
      console.error('Error loading files:', error);
      return [];
    }
  },

  async addUploadedFile(file: UploadedFile): Promise<void> {
    try {
      await apiCall('/api/files', {
        method: 'POST',
        body: JSON.stringify(file),
      });
    } catch (error) {
      console.error('Error adding file:', error);
      throw new Error('Failed to save file to storage');
    }
  },

  async deleteUploadedFile(fileId: string): Promise<void> {
    try {
      await apiCall(`/api/files/${fileId}`, { method: 'DELETE' });
    } catch (error) {
      console.error('Error deleting file:', error);
      throw new Error('Failed to delete file');
    }
  },

  async getAllMetadata(): Promise<MerchantMetadata[]> {
    try {
      return await apiCall<MerchantMetadata[]>('/api/metadata');
    } catch (error) {
      console.error('Error loading metadata:', error);
      return [];
    }
  },

  async saveMetadata(metadata: MerchantMetadata[]): Promise<void> {
    // Not used in API-based storage
    console.warn('saveMetadata is deprecated, use addMetadata instead');
  },

  async addMetadata(newMetadata: MerchantMetadata[]): Promise<void> {
    try {
      await apiCall('/api/metadata', {
        method: 'POST',
        body: JSON.stringify(newMetadata),
      });
    } catch (error) {
      console.error('Error adding metadata:', error);
      throw new Error('Failed to save metadata to storage');
    }
  },

  async getMetadataByMID(merchantId: string): Promise<MerchantMetadata | undefined> {
    try {
      const metadata = await apiCall<MerchantMetadata | null>(`/api/metadata/${merchantId}`);
      return metadata || undefined;
    } catch (error) {
      console.error('Error loading metadata:', error);
      return undefined;
    }
  },

  async clearAllMetadata(): Promise<void> {
    try {
      await apiCall('/api/metadata', { method: 'DELETE' });
    } catch (error) {
      console.error('Error clearing metadata:', error);
      throw new Error('Failed to clear metadata');
    }
  },

  async getValidationWarnings(): Promise<ValidationWarning[]> {
    try {
      return await apiCall<ValidationWarning[]>('/api/validation-warnings');
    } catch (error) {
      console.error('Error loading validation warnings:', error);
      return [];
    }
  },
};

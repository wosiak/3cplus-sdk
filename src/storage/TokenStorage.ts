// src/storage/TokenStorage.ts
import fs from 'fs';
import path from 'path';

export interface StoredAuth {
  token: string;
  domain: string;
}

export class FileTokenStorage {
  private filePath: string;

  constructor(fileName = 'token.json') {
    this.filePath = path.resolve(__dirname, fileName);
  }

  saveAuthData(data: StoredAuth): void {
    fs.writeFileSync(this.filePath, JSON.stringify(data, null, 2));
  }

  getAuthData(): StoredAuth | null {
    if (!fs.existsSync(this.filePath)) return null;

    try {
      const content = fs.readFileSync(this.filePath, 'utf-8');
      const data: StoredAuth = JSON.parse(content);
      return data;
    } catch (err) {
      console.error('❌ Failed to read token file:', err);
      return null;
    }
  }

  getToken(): string | null {
    return this.getAuthData()?.token || null;
  }

  getDomain(): string | null {
    return this.getAuthData()?.domain || null;
  }
}
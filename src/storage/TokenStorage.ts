// src/storage/TokenStorage.ts

import fs from 'fs';
import path from 'path';

export interface TokenStore {
  saveToken(token: string): void;
  getToken(): string | null;
}

export class FileTokenStorage implements TokenStore {
  private filePath: string;

  constructor(fileName = 'token.json') {
    this.filePath = path.resolve(__dirname, fileName);
  }

  saveToken(token: string): void {
    const data = { token };
    fs.writeFileSync(this.filePath, JSON.stringify(data, null, 2));
  }

  getToken(): string | null {
    if (!fs.existsSync(this.filePath)) return null;

    try {
      const content = fs.readFileSync(this.filePath, 'utf-8');
      const data = JSON.parse(content);
      return data.token || null;
    } catch (err) {
      console.error('Failed to read token file:', err);
      return null;
    }
  }
}

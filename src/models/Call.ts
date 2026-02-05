// src/models/Call.ts

export interface CallQualify {
    qualification_id: number;
    qualification_note: string;
}

export interface CallQualifyResponse {
    success: boolean;
    message?: string;
}
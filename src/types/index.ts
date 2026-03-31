// src/types/index.ts

export interface ApiResponse<T> {
    isSuccess: boolean;
    data: T;
    meta?: {
        totalRecords: number;
        totalPages: number;
        currentPage: number;
    };
    message?: string;
}
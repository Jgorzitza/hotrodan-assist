// Common types used across the Llama RAG project

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  offset?: number;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'user' | 'viewer';
  createdAt: Date;
  updatedAt: Date;
}

export interface Config {
  environment: 'development' | 'staging' | 'production';
  apiUrl: string;
  databaseUrl: string;
  jwtSecret: string;
}

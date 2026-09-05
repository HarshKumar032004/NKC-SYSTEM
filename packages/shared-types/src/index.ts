export const UserRole = {
  ADMIN: 'ADMIN',
  FACULTY: 'FACULTY',
  STUDENT: 'STUDENT',
} as const;

export type UserRole = (typeof UserRole)[keyof typeof UserRole];

export interface ApiSuccessResponse<T> {
  statusCode: number;
  data: T;
  meta?: Record<string, unknown>;
}

export interface ApiErrorResponse {
  statusCode: number;
  error: string;
  message: string | string[];
}

export type HealthStatus = 'ok' | 'error';

export interface HealthCheckResponse {
  status: HealthStatus;
  timestamp: string;
  service: string;
  version: string;
  uptimeSeconds: number;
}

export * from './student.js';
export * from './branch.js';

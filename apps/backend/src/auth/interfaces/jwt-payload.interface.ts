export interface JwtPayload {
  sub: string; // userId
  email: string;
  role: string;
  branchId: string;
  isSystemRole?: boolean;
  jti?: string;
}

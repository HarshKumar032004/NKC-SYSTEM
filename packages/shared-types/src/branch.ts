import { z } from 'zod';

export const CreateBranchSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(150),
  code: z.string().min(2, 'Code must be at least 2 characters').max(20),
  address: z.string().min(5, 'Address must be at least 5 characters'),
  contactPhone: z.string().min(10, 'Contact phone is required').max(20),
  email: z.string().email('Invalid email address').optional().nullable(),
  city: z.string().optional().nullable(),
  state: z.string().optional().nullable(),
  zipCode: z.string().optional().nullable(),
  managerName: z.string().optional().nullable(),
  hostelFee: z.coerce.number().min(0).default(0),
  messFee: z.coerce.number().min(0).default(0),
  isActive: z.boolean(),
});

export const UpdateBranchSchema = CreateBranchSchema.partial();

export type CreateBranchDto = z.infer<typeof CreateBranchSchema>;
export type UpdateBranchDto = z.infer<typeof UpdateBranchSchema>;

export interface BranchResponse {
  id: string;
  name: string;
  code: string;
  address: string;
  contactPhone: string;
  email: string | null;
  city: string | null;
  state: string | null;
  zipCode: string | null;
  managerName: string | null;
  hostelFee: number;
  messFee: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

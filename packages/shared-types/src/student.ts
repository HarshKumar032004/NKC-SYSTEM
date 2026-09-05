import { z } from 'zod';

export const CreateStudentSchema = z.object({
  firstName: z.string().min(2, 'First name is too short').max(100),
  lastName: z.string().min(1, 'Last name is required').max(100),
  dob: z.coerce.date(),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER']),
  bloodGroup: z.enum(['A_POS', 'A_NEG', 'B_POS', 'B_NEG', 'AB_POS', 'AB_NEG', 'O_POS', 'O_NEG']).optional(),
  branchId: z.string().uuid(),
  photoUrl: z.string().url().optional(),
  address: z.string().optional(),
  skills: z.array(z.string()).optional(),
  email: z.string().email().or(z.literal('')).optional(),
  phone: z.string().min(10).max(20).or(z.literal('')).optional(),
  aadharNumber: z.string().min(12).max(20).or(z.literal('')).optional(),
  admissionDate: z.coerce.date().optional(),
  previousSchool: z.string().max(255).or(z.literal('')).optional(),
  isHosteler: z.boolean().default(false),
  discountPercent: z.coerce.number().min(0).max(100).default(0),
  paymentType: z.enum(['LUMP_SUM', 'INSTALLMENT']).default('LUMP_SUM'),
  feeStructureIds: z.array(z.string().uuid()).optional(),
  
  // Nested initial creations
  guardians: z.array(
    z.object({
      name: z.string().min(2).max(150),
      relationship: z.string().min(2).max(50),
      phone: z.string().min(10).max(20),
      email: z.string().email().or(z.literal('')).optional(),
      occupation: z.string().max(100).or(z.literal('')).optional(),
      isPrimary: z.boolean().default(false)
    })
  ).min(1, 'At least one guardian is required'),
  
  // Target batch
  batchId: z.string().uuid(),
  
  // Link to Lead
  leadId: z.string().uuid().optional(),
});

export type CreateStudentDto = z.infer<typeof CreateStudentSchema>;

export const UpdateStudentSchema = CreateStudentSchema.partial();
export type UpdateStudentDto = z.infer<typeof UpdateStudentSchema>;

export const StudentFilterQuerySchema = z.object({
  branchId: z.string().uuid().optional(),
  status: z.enum(['ENROLLED', 'SUSPENDED', 'ALUMNI', 'WITHDRAWN']).optional(),
  batchId: z.string().uuid().optional(),
  search: z.string().optional(), // For name or enrollment number
  isHosteler: z.coerce.boolean().optional(),
  feeStatus: z.string().optional(), // OVERDUE, PENDING, PAID
  cursor: z.string().uuid().optional(), // For pagination
  take: z.coerce.number().min(1).max(100).default(20),
});

export type StudentFilterQueryDto = z.infer<typeof StudentFilterQuerySchema>;

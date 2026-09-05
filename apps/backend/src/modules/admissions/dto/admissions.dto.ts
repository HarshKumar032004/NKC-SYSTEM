import { IsString, IsOptional, IsEmail, IsEnum, MaxLength, IsPhoneNumber, IsNotEmpty } from 'class-validator';
import { LeadStatus } from '@prisma/client';

export class CreateLeadDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(15)
  // Optionally use @IsPhoneNumber() if a specific locale is guaranteed, else IsString + Regex is safer
  phone!: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(100)
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  source?: string;
}

export class UpdateLeadStatusDto {
  @IsEnum(LeadStatus)
  status!: LeadStatus;
}

export class LogFollowUpDto {
  @IsString()
  @IsNotEmpty()
  contactMethod!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  notes!: string;

  @IsOptional()
  @IsString()
  outcome?: string;

  @IsOptional()
  nextFollowUpDate?: Date;
}

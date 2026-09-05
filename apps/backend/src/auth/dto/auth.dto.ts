import { IsEmail, IsNotEmpty, IsString, MinLength, IsStrongPassword } from 'class-validator';

export class LoginDto {
  @IsEmail({}, { message: 'Invalid email format' })
  @IsNotEmpty({ message: 'Email is required' })
  email!: string;

  @IsString()
  @IsNotEmpty({ message: 'Password is required' })
  password!: string;
}

export class ForgotPasswordDto {
  @IsEmail({}, { message: 'Invalid email format' })
  @IsNotEmpty({ message: 'Email is required' })
  email!: string;
}

export class ResetPasswordDto {
  @IsString()
  @IsNotEmpty({ message: 'Token is required' })
  token!: string;

  @IsString()
  @IsNotEmpty({ message: 'Password is required' })
  @IsStrongPassword({
    minLength: 12,
    minLowercase: 1,
    minUppercase: 1,
    minNumbers: 1,
    minSymbols: 1,
  }, { message: 'Password must be at least 12 characters long, and contain lowercase, uppercase, numbers, and symbols.' })
  newPassword!: string;
}

export class ChangePasswordDto {
  @IsString()
  @IsNotEmpty({ message: 'Current password is required' })
  currentPassword!: string;

  @IsString()
  @IsNotEmpty({ message: 'New password is required' })
  @IsStrongPassword({
    minLength: 12,
    minLowercase: 1,
    minUppercase: 1,
    minNumbers: 1,
    minSymbols: 1,
  }, { message: 'Password must be at least 12 characters long, and contain lowercase, uppercase, numbers, and symbols.' })
  newPassword!: string;
}

import { z } from 'zod';
import { emailAddress, objectId, passwordField } from './common.validators';

export const loginSchema = z.object({
  email: emailAddress,
  password: z.string().min(1, 'Password is required').max(72, 'Password is too long'),
});

export const forgotPasswordSchema = z.object({ email: emailAddress });

export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  newPassword: passwordField,
});

export const adminResetPasswordSchema = z.object({
  employeeId: objectId('Employee'),
  newPassword: passwordField,
});

export const refreshTokenSchema = z.object({ refreshToken: z.string().min(1, 'Refresh token is required') });

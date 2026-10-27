import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { employeeRepository } from '../repositories/EmployeeRepository';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/jwt';
import { AppError } from '../utils/AppError';
import { env } from '../config/env';
import { Employee } from '../models/Employee.model';
import { emailService } from './email.service';

export class AuthService {
  async login(email: string, password: string) {
    const employee = await employeeRepository.findByEmailWithPassword(email);
    if (!employee) {
      throw AppError.unauthorized('Invalid email or password');
    }
    // Deactivating an employee blocks login (spec section 4)
    if (employee.status !== 'active') {
      throw AppError.forbidden('This account has been deactivated. Contact your administrator.');
    }
    const isMatch = await employee.comparePassword(password);
    if (!isMatch) {
      throw AppError.unauthorized('Invalid email or password');
    }

    const payload = { sub: employee._id.toString(), isAdmin: employee.isAdmin };
    return {
      accessToken: signAccessToken(payload),
      refreshToken: signRefreshToken(payload),
      employee,
    };
  }

  async refresh(refreshToken: string) {
    let payload;
    try {
      payload = verifyRefreshToken(refreshToken);
    } catch {
      throw AppError.unauthorized('Invalid or expired refresh token');
    }
    const employee = await employeeRepository.findById(payload.sub);
    if (!employee || employee.status !== 'active') {
      throw AppError.unauthorized('Account not available');
    }
    const newPayload = { sub: employee._id.toString(), isAdmin: employee.isAdmin };
    return {
      accessToken: signAccessToken(newPayload),
      refreshToken: signRefreshToken(newPayload),
    };
  }

  /** Forgot Password must verify that the employee is active (spec section 4 & 19). */
  async forgotPassword(email: string): Promise<void> {
    const employee = await Employee.findOne({ email: email.toLowerCase(), isDeleted: { $ne: true } });
    if (!employee) {
      throw AppError.notFound('No employee account exists with this email address');
    }
    if (employee.status !== 'active') {
      throw AppError.forbidden('This employee account is inactive. Contact your administrator.');
    }

    const rawToken = crypto.randomBytes(32).toString('hex');
    employee.passwordResetToken = crypto.createHash('sha256').update(rawToken).digest('hex');
    employee.passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await employee.save();

    const baseUrl = env.passwordResetUrl || `${env.clientOrigin.split(',')[0].trim()}/reset-password`;
    const resetUrl = new URL(baseUrl);
    resetUrl.searchParams.set('token', rawToken);

    const sent = await emailService.sendPasswordResetEmail({
      to: employee.email,
      firstName: employee.firstName,
      resetUrl: resetUrl.toString(),
    });

    if (!sent) {
      employee.passwordResetToken = undefined;
      employee.passwordResetExpires = undefined;
      await employee.save();
      throw new AppError('Unable to send the password reset email right now. Please try again later.', 500);
    }
  }

  async resetPassword(rawToken: string, newPassword: string): Promise<void> {
    const hashed = crypto.createHash('sha256').update(rawToken).digest('hex');
    const employee = await Employee.findOne({
      passwordResetToken: hashed,
      passwordResetExpires: { $gt: new Date() },
    }).select('+passwordHash +passwordResetToken +passwordResetExpires');

    if (!employee || employee.status !== 'active') {
      throw AppError.badRequest('Reset token is invalid or has expired');
    }

    employee.passwordHash = newPassword; // pre-save hook hashes it
    employee.passwordResetToken = undefined;
    employee.passwordResetExpires = undefined;
    await employee.save();
  }

  /** Admin can reset any employee's password directly (spec section 19). */
  async adminResetPassword(employeeId: string, newPassword: string): Promise<void> {
    const employee = await employeeRepository.findById(employeeId);
    if (!employee) throw AppError.notFound('Employee not found');
    employee.passwordHash = newPassword;
    await employee.save();
  }

  async logout(_employeeId: string): Promise<void> {
    // Logging out only ends the authenticated session. Running task time continues.
    // Tasks are paused by explicit Pause, attendance checkout, or break start.
  }

  async hashInitialPassword(plain: string): Promise<string> {
    return bcrypt.hash(plain, env.bcryptSaltRounds);
  }
}

export const authService = new AuthService();

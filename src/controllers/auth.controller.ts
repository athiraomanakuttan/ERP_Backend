import { Request, Response } from 'express';
import { authService } from '../services/auth.service';
import { sendSuccess } from '../utils/apiResponse';
import { asyncHandler } from '../middlewares/asyncHandler';

export const login = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body;
  const { accessToken, refreshToken, employee } = await authService.login(email, password);
  sendSuccess(res, {
    message: 'Login successful',
    data: {
      accessToken,
      refreshToken,
      employee: {
        id: employee._id.toString(),
        firstName: employee.firstName,
        lastName: employee.lastName,
        email: employee.email,
        isAdmin: employee.isAdmin,
      },
    },
  });
});

export const refresh = asyncHandler(async (req: Request, res: Response) => {
  const { refreshToken } = req.body;
  const tokens = await authService.refresh(refreshToken);
  sendSuccess(res, { message: 'Token refreshed', data: tokens });
});

export const forgotPassword = asyncHandler(async (req: Request, res: Response) => {
  const { email } = req.body;
  await authService.forgotPassword(email);
  sendSuccess(res, {
    message: 'Password reset instructions have been sent to your email address.',
  });
});

export const resetPassword = asyncHandler(async (req: Request, res: Response) => {
  const { token, newPassword } = req.body;
  await authService.resetPassword(token, newPassword);
  sendSuccess(res, { message: 'Password has been reset. You can now log in.' });
});

export const adminResetPassword = asyncHandler(async (req: Request, res: Response) => {
  const { employeeId, newPassword } = req.body;
  await authService.adminResetPassword(employeeId, newPassword);
  sendSuccess(res, { message: 'Employee password has been reset' });
});

export const me = asyncHandler(async (req: Request, res: Response) => {
  sendSuccess(res, { message: 'Current session', data: req.user });
});

export const logout = asyncHandler(async (req: Request, res: Response) => {
  await authService.logout(req.user!.id);
  sendSuccess(res, { message: 'Logged out successfully' });
});

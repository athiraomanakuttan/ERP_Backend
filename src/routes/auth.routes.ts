import { Router } from 'express';
import * as authController from '../controllers/auth.controller';
import { validate } from '../middlewares/validate';
import { authenticate } from '../middlewares/authenticate';
import { requireAdmin } from '../middlewares/requirePermission';
import {
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  adminResetPasswordSchema,
  refreshTokenSchema,
  changePasswordSchema,
  profilePhotoSchema,
} from '../validators/auth.validators';

const router = Router();

router.post('/login', validate({ body: loginSchema }), authController.login);
router.post('/refresh', validate({ body: refreshTokenSchema }), authController.refresh);
router.post('/forgot-password', validate({ body: forgotPasswordSchema }), authController.forgotPassword);
router.post('/reset-password', validate({ body: resetPasswordSchema }), authController.resetPassword);
router.post(
  '/admin-reset-password',
  authenticate,
  requireAdmin,
  validate({ body: adminResetPasswordSchema }),
  authController.adminResetPassword
);
router.get('/me', authenticate, authController.me);
router.post('/change-password', authenticate, validate({ body: changePasswordSchema }), authController.changePassword);
router.put('/profile-photo', authenticate, validate({ body: profilePhotoSchema }), authController.updateProfilePhoto);
router.post('/logout', authenticate, authController.logout);

export default router;

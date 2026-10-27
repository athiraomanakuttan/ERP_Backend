declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        firstName: string;
        lastName?: string;
        email: string;
        isAdmin: boolean;
        roleId: string;
        permissionKeys: string[];
      };
    }
  }
}

export {};

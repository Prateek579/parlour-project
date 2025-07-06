import { Response, NextFunction } from "express";
import { AuthRequest } from "./authMiddleware";

export const authorizeRoles = () => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (req.user && req.user.role === "superadmin") {
      return next();
    }
    return res.status(404).json({ message: "Not allowed" });
  };
};

export const requireRole = (roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (req.user && roles.includes(req.user.role)) {
      return next();
    }
    return res.status(403).json({ message: "Access denied" });
  };
}; 
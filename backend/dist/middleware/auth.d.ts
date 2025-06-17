import { Response, NextFunction } from 'express';
import { AuthenticatedRequest, ApiResponse } from '../types';
export declare const authenticateToken: (req: AuthenticatedRequest, res: Response<ApiResponse>, next: NextFunction) => void;
export declare const optionalAuth: (req: AuthenticatedRequest, res: Response, next: NextFunction) => void;
//# sourceMappingURL=auth.d.ts.map
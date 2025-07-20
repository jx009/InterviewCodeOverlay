import { Response } from 'express';
export declare class ResponseUtils {
    static success<T>(res: Response, data?: T, message?: string): void;
    static error(res: Response, error: string, statusCode?: number): void;
    static validationError(res: Response, errors: string[]): void;
    static unauthorized(res: Response, message?: string): void;
    static forbidden(res: Response, message?: string): void;
    static notFound(res: Response, message?: string): void;
    static internalError(res: Response, message?: string): void;
    static paginated<T>(res: Response, data: T[], total: number, page: number, limit: number, message?: string): void;
}
//# sourceMappingURL=response.d.ts.map
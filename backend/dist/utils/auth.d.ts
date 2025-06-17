import { UserPayload } from '../types';
export declare class AuthUtils {
    static generateAccessToken(payload: UserPayload): string;
    static generateRefreshToken(payload: UserPayload): string;
    static verifyAccessToken(token: string): UserPayload | null;
    static verifyRefreshToken(token: string): UserPayload | null;
    static hashPassword(password: string): Promise<string>;
    static verifyPassword(password: string, hashedPassword: string): Promise<boolean>;
    static getTokenExpirationDate(): Date;
    static getRefreshTokenExpirationDate(): Date;
    static extractBearerToken(authHeader?: string): string | null;
}
//# sourceMappingURL=auth.d.ts.map
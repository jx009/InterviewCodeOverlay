"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthUtils = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1h';
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';
if (!JWT_SECRET) {
    throw new Error('🔒 安全错误: JWT_SECRET 环境变量未配置！请在 .env 文件中设置强随机密钥');
}
if (!JWT_REFRESH_SECRET) {
    throw new Error('🔒 安全错误: JWT_REFRESH_SECRET 环境变量未配置！请在 .env 文件中设置强随机密钥');
}
console.log('✅ JWT密钥配置检查通过');
class AuthUtils {
    static generateAccessToken(payload) {
        return jsonwebtoken_1.default.sign(payload, JWT_SECRET, {
            expiresIn: JWT_EXPIRES_IN,
        });
    }
    static generateRefreshToken(payload) {
        return jsonwebtoken_1.default.sign(payload, JWT_REFRESH_SECRET, {
            expiresIn: JWT_REFRESH_EXPIRES_IN,
        });
    }
    static verifyAccessToken(token) {
        try {
            return jsonwebtoken_1.default.verify(token, JWT_SECRET);
        }
        catch (error) {
            return null;
        }
    }
    static verifyRefreshToken(token) {
        try {
            return jsonwebtoken_1.default.verify(token, JWT_REFRESH_SECRET);
        }
        catch (error) {
            return null;
        }
    }
    static async hashPassword(password) {
        const saltRounds = 12;
        return bcryptjs_1.default.hash(password, saltRounds);
    }
    static async verifyPassword(password, hashedPassword) {
        return bcryptjs_1.default.compare(password, hashedPassword);
    }
    static getTokenExpirationDate() {
        const now = new Date();
        const expirationTime = JWT_EXPIRES_IN;
        if (expirationTime.endsWith('h')) {
            const hours = parseInt(expirationTime.slice(0, -1));
            now.setHours(now.getHours() + hours);
        }
        else if (expirationTime.endsWith('d')) {
            const days = parseInt(expirationTime.slice(0, -1));
            now.setDate(now.getDate() + days);
        }
        else if (expirationTime.endsWith('m')) {
            const minutes = parseInt(expirationTime.slice(0, -1));
            now.setMinutes(now.getMinutes() + minutes);
        }
        return now;
    }
    static getRefreshTokenExpirationDate() {
        const now = new Date();
        const expirationTime = JWT_REFRESH_EXPIRES_IN;
        if (expirationTime.endsWith('h')) {
            const hours = parseInt(expirationTime.slice(0, -1));
            now.setHours(now.getHours() + hours);
        }
        else if (expirationTime.endsWith('d')) {
            const days = parseInt(expirationTime.slice(0, -1));
            now.setDate(now.getDate() + days);
        }
        else if (expirationTime.endsWith('m')) {
            const minutes = parseInt(expirationTime.slice(0, -1));
            now.setMinutes(now.getMinutes() + minutes);
        }
        return now;
    }
    static extractBearerToken(authHeader) {
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return null;
        }
        return authHeader.substring(7);
    }
}
exports.AuthUtils = AuthUtils;
//# sourceMappingURL=auth.js.map
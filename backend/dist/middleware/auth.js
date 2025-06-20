"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.optionalAuth = exports.authMiddleware = exports.authenticateToken = void 0;
const auth_1 = require("../utils/auth");
const database_1 = require("../config/database");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers.authorization;
    const token = auth_1.AuthUtils.extractBearerToken(authHeader);
    if (!token) {
        res.status(401).json({
            success: false,
            error: '未提供访问令牌'
        });
        return;
    }
    const decoded = auth_1.AuthUtils.verifyAccessToken(token);
    if (!decoded) {
        res.status(401).json({
            success: false,
            error: '访问令牌无效或已过期'
        });
        return;
    }
    req.user = { userId: decoded.id };
    next();
};
exports.authenticateToken = authenticateToken;
const authMiddleware = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            res.status(401).json({ error: '未提供访问令牌' });
            return;
        }
        const token = authHeader.substring(7);
        const config = (0, database_1.getConfig)();
        const decoded = jsonwebtoken_1.default.verify(token, config.security.jwtSecret);
        req.user = { userId: decoded.userId };
        next();
    }
    catch (error) {
        console.error('Token验证失败:', error);
        res.status(401).json({ error: '访问令牌无效或已过期' });
        return;
    }
};
exports.authMiddleware = authMiddleware;
const optionalAuth = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        const token = auth_1.AuthUtils.extractBearerToken(authHeader);
        if (token) {
            const decoded = auth_1.AuthUtils.verifyAccessToken(token);
            if (decoded) {
                req.user = { userId: decoded.id };
            }
        }
        next();
    }
    catch (error) {
        next();
    }
};
exports.optionalAuth = optionalAuth;
//# sourceMappingURL=auth.js.map
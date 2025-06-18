"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.optionalAuth = exports.authMiddleware = exports.authenticateToken = void 0;
const auth_1 = require("../utils/auth");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
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
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({ error: '未提供访问令牌' });
        return;
    }
    const token = authHeader.substring(7);
    try {
        const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
        req.user = { userId: decoded.userId };
        next();
    }
    catch (error) {
        res.status(401).json({ error: '访问令牌无效或已过期' });
        return;
    }
};
exports.authMiddleware = authMiddleware;
const optionalAuth = (req, res, next) => {
    const authHeader = req.headers.authorization;
    const token = auth_1.AuthUtils.extractBearerToken(authHeader);
    if (token) {
        const decoded = auth_1.AuthUtils.verifyAccessToken(token);
        if (decoded) {
            req.user = { userId: decoded.id };
        }
    }
    next();
};
exports.optionalAuth = optionalAuth;
//# sourceMappingURL=auth.js.map
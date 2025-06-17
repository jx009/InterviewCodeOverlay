"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.optionalAuth = exports.authenticateToken = void 0;
const auth_1 = require("../utils/auth");
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
    req.user = decoded;
    next();
};
exports.authenticateToken = authenticateToken;
const optionalAuth = (req, res, next) => {
    const authHeader = req.headers.authorization;
    const token = auth_1.AuthUtils.extractBearerToken(authHeader);
    if (token) {
        const decoded = auth_1.AuthUtils.verifyAccessToken(token);
        if (decoded) {
            req.user = decoded;
        }
    }
    next();
};
exports.optionalAuth = optionalAuth;
//# sourceMappingURL=auth.js.map
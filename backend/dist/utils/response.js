"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ResponseUtils = void 0;
class ResponseUtils {
    static success(res, data, message) {
        res.json({
            success: true,
            data,
            message
        });
    }
    static error(res, error, statusCode = 400) {
        res.status(statusCode).json({
            success: false,
            error
        });
    }
    static validationError(res, errors) {
        res.status(400).json({
            success: false,
            error: 'Validation failed',
            data: { errors }
        });
    }
    static unauthorized(res, message) {
        res.status(401).json({
            success: false,
            error: message || '未授权访问'
        });
    }
    static forbidden(res, message) {
        res.status(403).json({
            success: false,
            error: message || '禁止访问'
        });
    }
    static notFound(res, message) {
        res.status(404).json({
            success: false,
            error: message || '资源未找到'
        });
    }
    static internalError(res, message) {
        res.status(500).json({
            success: false,
            error: message || '服务器内部错误'
        });
    }
    static paginated(res, data, total, page, limit, message) {
        res.json({
            success: true,
            data,
            message,
            pagination: {
                total,
                page,
                limit,
                pages: Math.ceil(total / limit)
            }
        });
    }
}
exports.ResponseUtils = ResponseUtils;
//# sourceMappingURL=response.js.map
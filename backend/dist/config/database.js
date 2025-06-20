"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeDatabase = exports.reloadConfig = exports.getConfig = exports.sessionManager = exports.checkDatabaseHealth = exports.disconnectDatabase = exports.connectDatabase = exports.connectRedis = exports.redis = exports.prisma = void 0;
const client_1 = require("@prisma/client");
const redis_1 = require("redis");
const config_loader_1 = __importStar(require("./config-loader"));
const config = config_loader_1.dbConfig;
exports.prisma = new client_1.PrismaClient({
    datasources: {
        db: {
            url: config_loader_1.default.getMySQLConnectionString()
        }
    },
    log: config.app.debug ? ['query', 'error', 'warn'] : ['error'],
});
const redisConfig = {
    host: config.redis.host,
    port: config.redis.port,
    password: config.redis.password || undefined,
    db: config.redis.database,
    keyPrefix: config.redis.keyPrefix,
    retryDelayOnFailover: config.redis.retryDelayOnFailover,
    maxRetriesPerRequest: config.redis.maxRetriesPerRequest,
    lazyConnect: config.redis.lazyConnect,
    keepAlive: config.redis.keepAlive,
};
exports.redis = (0, redis_1.createClient)({
    url: config_loader_1.default.getRedisConnectionString(),
    ...redisConfig
});
const connectRedis = async () => {
    try {
        if (!exports.redis.isOpen) {
            await exports.redis.connect();
        }
        console.log(`✅ Redis连接成功 (${config.redis.host}:${config.redis.port})`);
    }
    catch (error) {
        console.error('❌ Redis连接失败:', error);
        throw error;
    }
};
exports.connectRedis = connectRedis;
const connectDatabase = async () => {
    try {
        await exports.prisma.$connect();
        console.log(`✅ MySQL数据库连接成功 (${config.mysql.host}:${config.mysql.port}/${config.mysql.database})`);
    }
    catch (error) {
        console.error('❌ MySQL数据库连接失败:', error);
        throw error;
    }
};
exports.connectDatabase = connectDatabase;
const disconnectDatabase = async () => {
    try {
        await exports.prisma.$disconnect();
        if (exports.redis.isOpen) {
            await exports.redis.quit();
        }
        console.log('✅ 数据库连接已关闭');
    }
    catch (error) {
        console.error('❌ 关闭数据库连接失败:', error);
    }
};
exports.disconnectDatabase = disconnectDatabase;
const checkDatabaseHealth = async () => {
    try {
        await exports.prisma.$queryRaw `SELECT 1`;
        if (!exports.redis.isOpen) {
            await exports.redis.connect();
        }
        await exports.redis.ping();
        return {
            mysql: true,
            redis: true,
            config: {
                mysqlHost: config.mysql.host,
                mysqlDatabase: config.mysql.database,
                redisHost: config.redis.host,
                redisDatabase: config.redis.database
            }
        };
    }
    catch (error) {
        console.error('数据库健康检查失败:', error);
        return { mysql: false, redis: false, error: error };
    }
};
exports.checkDatabaseHealth = checkDatabaseHealth;
exports.sessionManager = {
    async setSession(sessionId, userId, expiresIn = config.session.expiresIn) {
        const sessionData = {
            userId,
            createdAt: new Date().toISOString(),
            expiresAt: new Date(Date.now() + expiresIn * 1000).toISOString()
        };
        if (!exports.redis.isOpen) {
            await exports.redis.connect();
        }
        await exports.redis.setEx(`${config.redis.keyPrefix}session:${sessionId}`, expiresIn, JSON.stringify(sessionData));
        return sessionData;
    },
    async getSession(sessionId) {
        if (!exports.redis.isOpen) {
            await exports.redis.connect();
        }
        const sessionData = await exports.redis.get(`${config.redis.keyPrefix}session:${sessionId}`);
        return sessionData ? JSON.parse(sessionData) : null;
    },
    async deleteSession(sessionId) {
        if (!exports.redis.isOpen) {
            await exports.redis.connect();
        }
        await exports.redis.del(`${config.redis.keyPrefix}session:${sessionId}`);
    },
    async setVerificationCode(email, code, expiresIn = config.email.verification.expiresMinutes * 60) {
        if (!exports.redis.isOpen) {
            await exports.redis.connect();
        }
        await exports.redis.setEx(`${config.redis.keyPrefix}verify:${email}`, expiresIn, code);
    },
    async getVerificationCode(email) {
        if (!exports.redis.isOpen) {
            await exports.redis.connect();
        }
        return await exports.redis.get(`${config.redis.keyPrefix}verify:${email}`);
    },
    async deleteVerificationCode(email) {
        if (!exports.redis.isOpen) {
            await exports.redis.connect();
        }
        await exports.redis.del(`${config.redis.keyPrefix}verify:${email}`);
    }
};
const getConfig = () => config;
exports.getConfig = getConfig;
const reloadConfig = () => config_loader_1.default.reloadConfig();
exports.reloadConfig = reloadConfig;
const initializeDatabase = async () => {
    try {
        await (0, exports.connectDatabase)();
        await (0, exports.connectRedis)();
        const health = await (0, exports.checkDatabaseHealth)();
        if (health.mysql && health.redis) {
            console.log('🎉 数据库系统初始化完成');
            console.log(`📊 配置信息:`, health.config);
        }
        else {
            throw new Error('数据库健康检查失败');
        }
    }
    catch (error) {
        console.error('❌ 数据库系统初始化失败:', error);
        throw error;
    }
};
exports.initializeDatabase = initializeDatabase;
exports.default = {
    prisma: exports.prisma,
    redis: exports.redis,
    connectDatabase: exports.connectDatabase,
    connectRedis: exports.connectRedis,
    disconnectDatabase: exports.disconnectDatabase,
    checkDatabaseHealth: exports.checkDatabaseHealth,
    sessionManager: exports.sessionManager,
    getConfig: exports.getConfig,
    reloadConfig: exports.reloadConfig,
    initializeDatabase: exports.initializeDatabase
};
//# sourceMappingURL=database.js.map
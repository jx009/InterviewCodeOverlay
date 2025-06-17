"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.prisma = void 0;
exports.connectDatabase = connectDatabase;
exports.disconnectDatabase = disconnectDatabase;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
});
exports.prisma = prisma;
async function connectDatabase() {
    try {
        await prisma.$connect();
        console.log('✅ 数据库连接成功');
    }
    catch (error) {
        console.error('❌ 数据库连接失败:', error);
        process.exit(1);
    }
}
async function disconnectDatabase() {
    try {
        await prisma.$disconnect();
        console.log('✅ 数据库连接已断开');
    }
    catch (error) {
        console.error('❌ 断开数据库连接时出错:', error);
    }
}
process.on('SIGINT', async () => {
    await disconnectDatabase();
    process.exit(0);
});
process.on('SIGTERM', async () => {
    await disconnectDatabase();
    process.exit(0);
});
//# sourceMappingURL=database.js.map
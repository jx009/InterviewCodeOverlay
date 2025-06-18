const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');

class Database {
  constructor() {
    this.dbPath = path.join(__dirname, 'interview_overlay.db');
    this.db = null;
    this.init();
  }

  async init() {
    try {
      this.db = new sqlite3.Database(this.dbPath, (err) => {
        if (err) {
          console.error('数据库连接失败:', err.message);
        } else {
          console.log('✅ SQLite数据库连接成功');
        }
      });

      await this.createTables();
      await this.seedDefaultData();
    } catch (error) {
      console.error('数据库初始化失败:', error);
    }
  }

  async createTables() {
    return new Promise((resolve, reject) => {
      const createUserTable = `
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          username TEXT UNIQUE NOT NULL,
          email TEXT UNIQUE NOT NULL,
          password TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `;

      const createConfigTable = `
        CREATE TABLE IF NOT EXISTS user_configs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          ai_model TEXT DEFAULT 'claude-sonnet-4-20250514',
          language TEXT DEFAULT 'python',
          theme TEXT DEFAULT 'dark',
          shortcuts TEXT DEFAULT '{"takeScreenshot":"Ctrl+H","openQueue":"Ctrl+Q","openSettings":"Ctrl+S"}',
          display TEXT DEFAULT '{"opacity":0.9,"position":"top-right","autoHide":false,"hideDelay":3000}',
          processing TEXT DEFAULT '{"autoProcess":true,"saveScreenshots":true,"compressionLevel":0.8}',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
        )
      `;

      const createTokenTable = `
        CREATE TABLE IF NOT EXISTS refresh_tokens (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          token TEXT NOT NULL,
          expires_at DATETIME NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
        )
      `;

      this.db.serialize(() => {
        this.db.run(createUserTable, (err) => {
          if (err) console.error('创建用户表失败:', err);
        });
        
        this.db.run(createConfigTable, (err) => {
          if (err) console.error('创建配置表失败:', err);
        });
        
        this.db.run(createTokenTable, (err) => {
          if (err) console.error('创建令牌表失败:', err);
          else resolve();
        });
      });
    });
  }

  async seedDefaultData() {
    // 检查是否已有测试用户
    const existingUser = await this.getUserByUsername('123456');
    if (!existingUser) {
      console.log('🌱 创建默认测试用户...');
      const hashedPassword = await bcrypt.hash('123456', 10);
      
      await this.createUser({
        username: '123456',
        email: '123456@test.com',
        password: hashedPassword
      });
      
      console.log('✅ 默认测试用户创建成功 (用户名/密码: 123456)');
    }
  }

  // 用户管理方法
  async createUser(userData) {
    return new Promise((resolve, reject) => {
      const { username, email, password } = userData;
      const query = `INSERT INTO users (username, email, password) VALUES (?, ?, ?)`;
      
      this.db.run(query, [username, email, password], function(err) {
        if (err) {
          reject(err);
        } else {
          // 为新用户创建默认配置
          const userId = this.lastID;
          const configQuery = `INSERT INTO user_configs (user_id) VALUES (?)`;
          
          this.db.run(configQuery, [userId], (configErr) => {
            if (configErr) {
              console.error('创建默认配置失败:', configErr);
            }
          });
          
          resolve({ id: userId, username, email });
        }
      });
    });
  }

  async getUserByEmail(email) {
    return new Promise((resolve, reject) => {
      const query = `SELECT * FROM users WHERE email = ?`;
      this.db.get(query, [email], (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }

  async getUserByUsername(username) {
    return new Promise((resolve, reject) => {
      const query = `SELECT * FROM users WHERE username = ?`;
      this.db.get(query, [username], (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }

  async getUserById(id) {
    return new Promise((resolve, reject) => {
      const query = `SELECT * FROM users WHERE id = ?`;
      this.db.get(query, [id], (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }

  async getUserByUsernameOrEmail(identifier) {
    return new Promise((resolve, reject) => {
      const query = `SELECT * FROM users WHERE username = ? OR email = ?`;
      this.db.get(query, [identifier, identifier], (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }

  // 配置管理方法
  async getUserConfig(userId) {
    return new Promise((resolve, reject) => {
      const query = `SELECT * FROM user_configs WHERE user_id = ?`;
      this.db.get(query, [userId], (err, row) => {
        if (err) {
          reject(err);
        } else if (row) {
          // 解析JSON字段
          const config = {
            aiModel: row.ai_model,
            language: row.language,
            theme: row.theme,
            shortcuts: JSON.parse(row.shortcuts),
            display: JSON.parse(row.display),
            processing: JSON.parse(row.processing)
          };
          resolve(config);
        } else {
          // 如果没有配置，创建默认配置
          this.createDefaultConfig(userId).then(resolve).catch(reject);
        }
      });
    });
  }

  async createDefaultConfig(userId) {
    return new Promise((resolve, reject) => {
      const defaultConfig = {
        aiModel: 'claude-sonnet-4-20250514',
        language: 'python',
        theme: 'dark',
        shortcuts: { takeScreenshot: 'Ctrl+H', openQueue: 'Ctrl+Q', openSettings: 'Ctrl+S' },
        display: { opacity: 0.9, position: 'top-right', autoHide: false, hideDelay: 3000 },
        processing: { autoProcess: true, saveScreenshots: true, compressionLevel: 0.8 }
      };

      const query = `
        INSERT INTO user_configs (user_id, ai_model, language, theme, shortcuts, display, processing) 
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `;
      
      this.db.run(query, [
        userId,
        defaultConfig.aiModel,
        defaultConfig.language,
        defaultConfig.theme,
        JSON.stringify(defaultConfig.shortcuts),
        JSON.stringify(defaultConfig.display),
        JSON.stringify(defaultConfig.processing)
      ], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve(defaultConfig);
        }
      });
    });
  }

  async updateUserConfig(userId, configUpdate) {
    return new Promise((resolve, reject) => {
      // 先获取当前配置
      this.getUserConfig(userId).then(currentConfig => {
        const updatedConfig = { ...currentConfig, ...configUpdate };
        
        const query = `
          UPDATE user_configs 
          SET ai_model = ?, language = ?, theme = ?, shortcuts = ?, display = ?, processing = ?, updated_at = CURRENT_TIMESTAMP
          WHERE user_id = ?
        `;
        
        this.db.run(query, [
          updatedConfig.aiModel,
          updatedConfig.language,
          updatedConfig.theme,
          JSON.stringify(updatedConfig.shortcuts),
          JSON.stringify(updatedConfig.display),
          JSON.stringify(updatedConfig.processing),
          userId
        ], function(err) {
          if (err) {
            reject(err);
          } else {
            resolve(updatedConfig);
          }
        });
      }).catch(reject);
    });
  }

  // 刷新令牌管理
  async storeRefreshToken(userId, token, expiresAt) {
    return new Promise((resolve, reject) => {
      const query = `INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES (?, ?, ?)`;
      this.db.run(query, [userId, token, expiresAt], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve(this.lastID);
        }
      });
    });
  }

  async validateRefreshToken(token) {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT rt.*, u.id as userId, u.email, u.username 
        FROM refresh_tokens rt 
        JOIN users u ON rt.user_id = u.id 
        WHERE rt.token = ? AND rt.expires_at > datetime('now')
      `;
      this.db.get(query, [token], (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }

  async deleteRefreshToken(token) {
    return new Promise((resolve, reject) => {
      const query = `DELETE FROM refresh_tokens WHERE token = ?`;
      this.db.run(query, [token], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve(this.changes);
        }
      });
    });
  }

  // 清理过期令牌
  async cleanupExpiredTokens() {
    return new Promise((resolve, reject) => {
      const query = `DELETE FROM refresh_tokens WHERE expires_at <= datetime('now')`;
      this.db.run(query, function(err) {
        if (err) {
          reject(err);
        } else {
          if (this.changes > 0) {
            console.log(`🧹 清理了 ${this.changes} 个过期令牌`);
          }
          resolve(this.changes);
        }
      });
    });
  }

  async close() {
    if (this.db) {
      this.db.close((err) => {
        if (err) {
          console.error('数据库关闭失败:', err.message);
        } else {
          console.log('数据库连接已关闭');
        }
      });
    }
  }
}

// 创建数据库实例
const db = new Database();

// 定期清理过期令牌（每小时一次）
setInterval(() => {
  db.cleanupExpiredTokens().catch(console.error);
}, 60 * 60 * 1000);

module.exports = db; 
# LLM动态配置使用说明

## 概述
现在系统支持从数据库动态读取LLM API配置，可以通过修改数据库来切换不同的API厂商。

## 数据库设置

### 1. 创建配置表
首先运行SQL脚本创建配置表：
```bash
mysql -u your_user -p your_database < backend/create_llm_config_table.sql
```

### 2. 配置说明
配置表 `llm_config` 包含以下配置项：

| 配置键 | 描述 | 示例值 |
|--------|------|--------|
| base_url | API基础URL | https://api.openai.com/v1 |
| api_key | API密钥 | sk-xxx... |
| max_retries | 最大重试次数 | 2 |
| timeout | 请求超时时间(毫秒) | 30000 |
| provider | 提供商名称 | openai |

## 切换API厂商

### OpenAI
```sql
UPDATE llm_config SET config_value = 'https://api.openai.com/v1' WHERE config_key = 'base_url';
UPDATE llm_config SET config_value = 'your-openai-api-key' WHERE config_key = 'api_key';
UPDATE llm_config SET config_value = 'openai' WHERE config_key = 'provider';
```

### Anthropic Claude
```sql
UPDATE llm_config SET config_value = 'https://api.anthropic.com' WHERE config_key = 'base_url';
UPDATE llm_config SET config_value = 'your-anthropic-api-key' WHERE config_key = 'api_key';
UPDATE llm_config SET config_value = 'anthropic' WHERE config_key = 'provider';
```

### Google AI
```sql
UPDATE llm_config SET config_value = 'https://generativelanguage.googleapis.com/v1beta' WHERE config_key = 'base_url';
UPDATE llm_config SET config_value = 'your-google-api-key' WHERE config_key = 'api_key';
UPDATE llm_config SET config_value = 'google' WHERE config_key = 'provider';
```

### 自定义API
```sql
UPDATE llm_config SET config_value = 'https://your-custom-api.com/v1' WHERE config_key = 'base_url';
UPDATE llm_config SET config_value = 'your-custom-api-key' WHERE config_key = 'api_key';
UPDATE llm_config SET config_value = 'custom' WHERE config_key = 'provider';
```

## API接口

### 获取LLM配置
- **接口**: `GET /api/llm/config`
- **认证**: 需要session token
- **返回**: 当前LLM配置信息

### 管理员更新配置
- **接口**: `POST /api/admin/llm/config`
- **认证**: 需要管理员权限
- **参数**: baseUrl, apiKey, maxRetries, timeout, provider

### 管理员查看配置
- **接口**: `GET /api/admin/llm/config`
- **认证**: 需要管理员权限
- **返回**: 所有配置详情

## 缓存机制
- LLM配置缓存5分钟，避免频繁数据库查询
- 客户端会自动处理配置更新和重新初始化
- 可调用 `refreshLLMConfig()` 方法强制刷新配置

## 错误处理
系统会自动处理以下错误：
- 网络连接失败：自动重试
- 配置获取失败：使用默认配置或提示用户
- API初始化失败：显示明确错误信息

## 注意事项
1. 修改数据库配置后，客户端会在下次AI调用时自动获取新配置
2. API密钥等敏感信息仅对管理员可见
3. 建议在生产环境中定期更换API密钥
4. 确保数据库连接安全，保护API密钥不被泄露
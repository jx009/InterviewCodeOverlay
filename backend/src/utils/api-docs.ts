export interface ApiEndpoint {
  method: string;
  path: string;
  description: string;
  auth: boolean;
  adminOnly?: boolean;
  parameters?: {
    name: string;
    type: string;
    required: boolean;
    description: string;
    location: 'query' | 'body' | 'path';
  }[];
  responses?: {
    status: number;
    description: string;
    example?: any;
  }[];
}

export interface ApiGroup {
  name: string;
  description: string;
  endpoints: ApiEndpoint[];
}

export class ApiDocGenerator {
  private static apiGroups: ApiGroup[] = [
    {
      name: '认证相关',
      description: '用户认证、注册、登录等接口',
      endpoints: [
        {
          method: 'POST',
          path: '/api/auth/register',
          description: '用户注册',
          auth: false,
          parameters: [
            { name: 'username', type: 'string', required: true, description: '用户名', location: 'body' },
            { name: 'email', type: 'string', required: true, description: '邮箱地址', location: 'body' },
            { name: 'password', type: 'string', required: true, description: '密码', location: 'body' }
          ],
          responses: [
            { status: 200, description: '注册成功', example: { success: true, message: '注册成功' } },
            { status: 400, description: '参数错误' },
            { status: 409, description: '用户已存在' }
          ]
        },
        {
          method: 'POST',
          path: '/api/auth/login',
          description: '用户登录',
          auth: false,
          parameters: [
            { name: 'email', type: 'string', required: true, description: '邮箱地址', location: 'body' },
            { name: 'password', type: 'string', required: true, description: '密码', location: 'body' }
          ],
          responses: [
            { status: 200, description: '登录成功', example: { success: true, data: { token: 'jwt_token', user: {} } } },
            { status: 401, description: '认证失败' }
          ]
        },
        {
          method: 'POST',
          path: '/api/auth/logout',
          description: '用户登出',
          auth: true,
          responses: [
            { status: 200, description: '登出成功' }
          ]
        }
      ]
    },
    {
      name: '积分系统',
      description: '积分管理、充值、消费等接口',
      endpoints: [
        {
          method: 'GET',
          path: '/api/points/balance',
          description: '获取用户积分余额',
          auth: true,
          responses: [
            { status: 200, description: '获取成功', example: { success: true, data: { balance: 100 } } }
          ]
        },
        {
          method: 'POST',
          path: '/api/points/recharge',
          description: '充值积分',
          auth: true,
          parameters: [
            { name: 'amount', type: 'number', required: true, description: '充值金额', location: 'body' },
            { name: 'description', type: 'string', required: false, description: '充值说明', location: 'body' }
          ],
          responses: [
            { status: 200, description: '充值成功' },
            { status: 400, description: '参数错误' }
          ]
        },
        {
          method: 'GET',
          path: '/api/points/transactions',
          description: '获取积分交易记录',
          auth: true,
          parameters: [
            { name: 'page', type: 'number', required: false, description: '页码', location: 'query' },
            { name: 'limit', type: 'number', required: false, description: '每页数量', location: 'query' }
          ],
          responses: [
            { status: 200, description: '获取成功' }
          ]
        }
      ]
    },
    {
      name: '搜题功能',
      description: '搜题、AI处理等接口',
      endpoints: [
        {
          method: 'POST',
          path: '/api/search/cost',
          description: '预估搜题成本',
          auth: true,
          parameters: [
            { name: 'modelName', type: 'string', required: true, description: 'AI模型名称', location: 'body' },
            { name: 'questionType', type: 'string', required: true, description: '题目类型', location: 'body' }
          ],
          responses: [
            { status: 200, description: '获取成功', example: { success: true, data: { cost: 2 } } }
          ]
        },
        {
          method: 'POST',
          path: '/api/search/question',
          description: '搜题处理',
          auth: true,
          parameters: [
            { name: 'modelName', type: 'string', required: true, description: 'AI模型名称', location: 'body' },
            { name: 'questionType', type: 'string', required: true, description: '题目类型', location: 'body' },
            { name: 'question', type: 'string', required: true, description: '题目内容', location: 'body' }
          ],
          responses: [
            { status: 200, description: '处理成功' },
            { status: 400, description: '积分不足或参数错误' }
          ]
        }
      ]
    },
    {
      name: '管理员功能',
      description: '管理员专用接口',
      endpoints: [
        {
          method: 'GET',
          path: '/api/admin/stats',
          description: '获取系统统计信息',
          auth: true,
          adminOnly: true,
          responses: [
            { status: 200, description: '获取成功' },
            { status: 403, description: '需要管理员权限' }
          ]
        },
        {
          method: 'GET',
          path: '/api/admin/users',
          description: '获取用户列表',
          auth: true,
          adminOnly: true,
          parameters: [
            { name: 'page', type: 'number', required: false, description: '页码', location: 'query' },
            { name: 'limit', type: 'number', required: false, description: '每页数量', location: 'query' },
            { name: 'search', type: 'string', required: false, description: '搜索关键词', location: 'query' }
          ],
          responses: [
            { status: 200, description: '获取成功' }
          ]
        },
        {
          method: 'PUT',
          path: '/api/admin/users/:id/status',
          description: '更新用户状态',
          auth: true,
          adminOnly: true,
          parameters: [
            { name: 'id', type: 'number', required: true, description: '用户ID', location: 'path' },
            { name: 'isActive', type: 'boolean', required: true, description: '是否激活', location: 'body' }
          ],
          responses: [
            { status: 200, description: '更新成功' }
          ]
        },
        {
          method: 'POST',
          path: '/api/admin/users/:id/recharge',
          description: '管理员为用户充值',
          auth: true,
          adminOnly: true,
          parameters: [
            { name: 'id', type: 'number', required: true, description: '用户ID', location: 'path' },
            { name: 'amount', type: 'number', required: true, description: '充值金额', location: 'body' },
            { name: 'description', type: 'string', required: false, description: '充值说明', location: 'body' }
          ],
          responses: [
            { status: 200, description: '充值成功' }
          ]
        }
      ]
    },
    {
      name: '系统监控',
      description: '系统监控和健康检查接口',
      endpoints: [
        {
          method: 'GET',
          path: '/api/monitoring/health',
          description: '基础健康检查（公开接口）',
          auth: false,
          responses: [
            { status: 200, description: '系统健康' },
            { status: 503, description: '系统异常' }
          ]
        },
        {
          method: 'GET',
          path: '/api/monitoring/metrics',
          description: '获取系统指标',
          auth: true,
          adminOnly: true,
          responses: [
            { status: 200, description: '获取成功' }
          ]
        },
        {
          method: 'GET',
          path: '/api/monitoring/overview',
          description: '获取系统概览',
          auth: true,
          adminOnly: true,
          responses: [
            { status: 200, description: '获取成功' }
          ]
        }
      ]
    }
  ];

  /**
   * 生成HTML格式的API文档
   */
  static generateHtmlDocs(): string {
    const html = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>InterviewCodeOverlay API 文档</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f5f5f5;
        }
        .container {
            background: white;
            border-radius: 8px;
            padding: 30px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        h1 {
            color: #2c3e50;
            border-bottom: 3px solid #3498db;
            padding-bottom: 10px;
            margin-bottom: 30px;
        }
        h2 {
            color: #34495e;
            margin-top: 40px;
            margin-bottom: 20px;
            padding: 10px 0;
            border-bottom: 2px solid #ecf0f1;
        }
        h3 {
            color: #2980b9;
            margin-top: 30px;
            margin-bottom: 15px;
        }
        .endpoint {
            background: #f8f9fa;
            border: 1px solid #e9ecef;
            border-radius: 6px;
            margin: 20px 0;
            padding: 20px;
        }
        .method {
            display: inline-block;
            padding: 4px 8px;
            border-radius: 4px;
            font-weight: bold;
            font-size: 12px;
            margin-right: 10px;
        }
        .method.GET { background: #28a745; color: white; }
        .method.POST { background: #007bff; color: white; }
        .method.PUT { background: #ffc107; color: black; }
        .method.DELETE { background: #dc3545; color: white; }
        .path {
            font-family: 'Courier New', monospace;
            background: #e9ecef;
            padding: 2px 6px;
            border-radius: 3px;
            font-size: 14px;
        }
        .auth-required {
            background: #fff3cd;
            color: #856404;
            padding: 2px 6px;
            border-radius: 3px;
            font-size: 12px;
            margin-left: 10px;
        }
        .admin-only {
            background: #f8d7da;
            color: #721c24;
            padding: 2px 6px;
            border-radius: 3px;
            font-size: 12px;
            margin-left: 5px;
        }
        .parameters, .responses {
            margin-top: 15px;
        }
        .param-table, .response-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 10px;
        }
        .param-table th, .param-table td,
        .response-table th, .response-table td {
            border: 1px solid #dee2e6;
            padding: 8px 12px;
            text-align: left;
        }
        .param-table th, .response-table th {
            background: #f8f9fa;
            font-weight: 600;
        }
        .required {
            color: #dc3545;
            font-weight: bold;
        }
        .optional {
            color: #6c757d;
        }
        code {
            background: #f8f9fa;
            padding: 2px 4px;
            border-radius: 3px;
            font-family: 'Courier New', monospace;
            font-size: 90%;
        }
        pre {
            background: #f8f9fa;
            border: 1px solid #e9ecef;
            border-radius: 4px;
            padding: 15px;
            overflow-x: auto;
            font-size: 14px;
        }
        .toc {
            background: #e3f2fd;
            border-radius: 6px;
            padding: 20px;
            margin-bottom: 30px;
        }
        .toc ul {
            margin: 0;
            padding-left: 20px;
        }
        .toc a {
            color: #1976d2;
            text-decoration: none;
        }
        .toc a:hover {
            text-decoration: underline;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🚀 InterviewCodeOverlay API 文档</h1>
        
        <div class="toc">
            <h3>📋 目录</h3>
            <ul>
                ${this.apiGroups.map(group => `<li><a href="#${group.name}">${group.name}</a></li>`).join('')}
            </ul>
        </div>

        <div style="background: #d4edda; border: 1px solid #c3e6cb; border-radius: 6px; padding: 15px; margin-bottom: 30px;">
            <h4 style="margin-top: 0; color: #155724;">📖 使用说明</h4>
            <ul style="margin-bottom: 0;">
                <li><strong>Base URL:</strong> <code>http://localhost:3001</code></li>
                <li><strong>认证方式:</strong> Bearer Token (JWT)</li>
                <li><strong>请求格式:</strong> JSON</li>
                <li><strong>响应格式:</strong> JSON</li>
            </ul>
        </div>

        ${this.apiGroups.map(group => this.generateGroupHtml(group)).join('')}
        
        <div style="margin-top: 50px; padding-top: 20px; border-top: 2px solid #ecf0f1; text-align: center; color: #6c757d;">
            <p>📅 文档生成时间: ${new Date().toLocaleString('zh-CN')}</p>
            <p>🔧 InterviewCodeOverlay Backend API v1.0.0</p>
        </div>
    </div>
</body>
</html>`;
    return html;
  }

  private static generateGroupHtml(group: ApiGroup): string {
    return `
        <h2 id="${group.name}">📂 ${group.name}</h2>
        <p>${group.description}</p>
        ${group.endpoints.map(endpoint => this.generateEndpointHtml(endpoint)).join('')}
    `;
  }

  private static generateEndpointHtml(endpoint: ApiEndpoint): string {
    return `
        <div class="endpoint">
            <h3>
                <span class="method ${endpoint.method}">${endpoint.method}</span>
                <span class="path">${endpoint.path}</span>
                ${endpoint.auth ? '<span class="auth-required">🔒 需要认证</span>' : ''}
                ${endpoint.adminOnly ? '<span class="admin-only">👑 管理员</span>' : ''}
            </h3>
            <p>${endpoint.description}</p>
            
            ${endpoint.parameters && endpoint.parameters.length > 0 ? `
                <div class="parameters">
                    <h4>📝 请求参数</h4>
                    <table class="param-table">
                        <thead>
                            <tr>
                                <th>参数名</th>
                                <th>类型</th>
                                <th>必填</th>
                                <th>位置</th>
                                <th>说明</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${endpoint.parameters.map(param => `
                                <tr>
                                    <td><code>${param.name}</code></td>
                                    <td>${param.type}</td>
                                    <td class="${param.required ? 'required' : 'optional'}">
                                        ${param.required ? '是' : '否'}
                                    </td>
                                    <td>${param.location}</td>
                                    <td>${param.description}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            ` : ''}
            
            ${endpoint.responses && endpoint.responses.length > 0 ? `
                <div class="responses">
                    <h4>📤 响应说明</h4>
                    <table class="response-table">
                        <thead>
                            <tr>
                                <th>状态码</th>
                                <th>说明</th>
                                <th>示例</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${endpoint.responses.map(response => `
                                <tr>
                                    <td><code>${response.status}</code></td>
                                    <td>${response.description}</td>
                                    <td>${response.example ? `<pre>${JSON.stringify(response.example, null, 2)}</pre>` : '-'}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            ` : ''}
        </div>
    `;
  }

  /**
   * 生成Markdown格式的API文档
   */
  static generateMarkdownDocs(): string {
    let markdown = `# InterviewCodeOverlay API 文档

## 📖 使用说明

- **Base URL:** \`http://localhost:3001\`
- **认证方式:** Bearer Token (JWT)
- **请求格式:** JSON
- **响应格式:** JSON

## 📋 目录

${this.apiGroups.map(group => `- [${group.name}](#${group.name.replace(/\s+/g, '-').toLowerCase()})`).join('\n')}

`;

    this.apiGroups.forEach(group => {
      markdown += `## ${group.name}

${group.description}

`;
      group.endpoints.forEach(endpoint => {
        markdown += `### ${endpoint.method} ${endpoint.path}

${endpoint.description}

${endpoint.auth ? '🔒 **需要认证**' : ''}${endpoint.adminOnly ? ' 👑 **管理员权限**' : ''}

`;
        if (endpoint.parameters && endpoint.parameters.length > 0) {
          markdown += `#### 请求参数

| 参数名 | 类型 | 必填 | 位置 | 说明 |
|--------|------|------|------|------|
${endpoint.parameters.map(param => 
  `| \`${param.name}\` | ${param.type} | ${param.required ? '是' : '否'} | ${param.location} | ${param.description} |`
).join('\n')}

`;
        }

        if (endpoint.responses && endpoint.responses.length > 0) {
          markdown += `#### 响应说明

| 状态码 | 说明 |
|--------|------|
${endpoint.responses.map(response => 
  `| \`${response.status}\` | ${response.description} |`
).join('\n')}

`;
        }
        markdown += '\n---\n\n';
      });
    });

    markdown += `
---

📅 文档生成时间: ${new Date().toLocaleString('zh-CN')}
🔧 InterviewCodeOverlay Backend API v1.0.0
`;

    return markdown;
  }

  /**
   * 获取API概览信息
   */
  static getApiOverview() {
    const totalEndpoints = this.apiGroups.reduce((sum, group) => sum + group.endpoints.length, 0);
    const authRequiredEndpoints = this.apiGroups.reduce((sum, group) => 
      sum + group.endpoints.filter(e => e.auth).length, 0);
    const adminOnlyEndpoints = this.apiGroups.reduce((sum, group) => 
      sum + group.endpoints.filter(e => e.adminOnly).length, 0);

    return {
      totalGroups: this.apiGroups.length,
      totalEndpoints,
      authRequiredEndpoints,
      adminOnlyEndpoints,
      publicEndpoints: totalEndpoints - authRequiredEndpoints,
      groups: this.apiGroups.map(group => ({
        name: group.name,
        description: group.description,
        endpointCount: group.endpoints.length
      }))
    };
  }
} 
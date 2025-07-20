import { Router, Request, Response } from 'express';
import { ApiDocGenerator } from '../utils/api-docs';

const router = Router();

/**
 * 获取HTML格式的API文档
 * GET /api/docs
 */
router.get('/', (req: Request, res: Response) => {
  try {
    const htmlDocs = ApiDocGenerator.generateHtmlDocs();
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(htmlDocs);
  } catch (error) {
    console.error('生成HTML文档失败:', error);
    res.status(500).json({
      success: false,
      error: '生成API文档失败'
    });
  }
});

/**
 * 获取Markdown格式的API文档
 * GET /api/docs/markdown
 */
router.get('/markdown', (req: Request, res: Response) => {
  try {
    const markdownDocs = ApiDocGenerator.generateMarkdownDocs();
    res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="api-docs.md"');
    res.send(markdownDocs);
  } catch (error) {
    console.error('生成Markdown文档失败:', error);
    res.status(500).json({
      success: false,
      error: '生成Markdown文档失败'
    });
  }
});

/**
 * 获取API概览信息
 * GET /api/docs/overview
 */
router.get('/overview', (req: Request, res: Response) => {
  try {
    const overview = ApiDocGenerator.getApiOverview();
    res.json({
      success: true,
      data: overview,
      message: '获取API概览成功'
    });
  } catch (error) {
    console.error('获取API概览失败:', error);
    res.status(500).json({
      success: false,
      error: '获取API概览失败'
    });
  }
});

export default router; 
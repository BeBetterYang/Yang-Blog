# Yang‘s Blog

一个使用 Notion 数据库作为内容后端、Vite + React 作为前端、Vercel 托管的极简博客。

## Notion 数据库字段

同一个 Notion database 中维护文章和页面内容，字段名建议保持小写：

| 字段 | 用途 |
| --- | --- |
| `type` | `post` 表示文章，`about` 表示关于页 |
| `status` | `published` 才会在前端展示文章 |
| `title` | 标题 |
| `summary` | 摘要 |
| `category` | 分类，导航里的“分类”直接读取这里的值 |
| `tags` | 标签，导航里的“标签”直接读取这里的值 |
| `slug` | 文章详情 URL 标识 |
| `date` | 发布日期 |
| `password` | 不为空时，前端需要输入密码后才能查看正文 |
| `icon` | emoji 或图片 URL；也可以直接使用 Notion 页面 icon |

正文来自每条 Notion 记录对应页面的 blocks，当前支持段落、标题、列表、引用、callout、代码、图片、分割线和待办。

## 本地开发

1. 安装依赖：

```bash
npm install
```

2. 创建本地环境变量：

```bash
cp .env.example .env.local
```

3. 在 Notion 创建 internal integration，将 integration 邀请到数据库页面，然后填写 `.env.local`：

```bash
NOTION_TOKEN="secret_xxx"
NOTION_DATABASE_ID="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
```

4. 启动开发服务器：

```bash
npm run dev
```

本地地址默认是 `http://localhost:3000`。

## Vercel 发布

在 Vercel 项目设置的 Environment Variables 中添加：

```bash
NOTION_TOKEN
NOTION_DATABASE_ID
NOTION_CACHE_TTL_MS
VITE_BLOG_DESCRIPTION
```

然后部署：

```bash
npx vercel
npx vercel --prod
```

项目已包含 `vercel.json`，Vercel 会构建 `dist` 并把 `/api/*` 作为 Serverless Functions 运行。

## 脚本

```bash
npm run dev      # 本地 Vite + Express API
npm run build    # 生产构建
npm run preview  # 预览静态前端
npm run lint     # TypeScript 检查
```
# Yang-Blog

# RickyYY 的代办事项

一个适合学生个人使用的网页待办清单。界面支持桌面和手机，包含密码登录、任务增删改、完成状态、截止日期、优先级、分类、搜索、筛选、排序和今日完成进度。

它的运行时依赖为零：后端使用 Node.js 标准库，前端使用原生 HTML/CSS/JavaScript，任务保存在本机的 `data/todos.json`。不需要安装数据库，也不需要云服务器。

## 1. 本地运行

要求 Node.js 20 或更高版本。

最简单的方式是双击项目根目录中的 `start.cmd`。浏览器会自动打开 `http://127.0.0.1:3000`。请先在 `.env` 中设置好 `TODO_PASSWORD` 再启动。使用期间保持命令行窗口开启；关闭窗口即可停止网站。

也可以在 PowerShell 中启动：

```powershell
cd "你的项目目录"
npm start
```

浏览器打开 `http://127.0.0.1:3000`，输入你在 `.env` 中设置的 `TODO_PASSWORD`。开发时也可以用 `npm run dev`，修改服务端代码后会自动重启。

如果想修改密码，编辑本机 `.env` 中的 `TODO_PASSWORD`，保存后重新启动网站。`.env` 只用于当前电脑，不会进入任务数据。

### 配置 AI 批量导入

登录后点击“粘贴文本，AI 整理”，可以粘贴聊天记录、会议纪要或作业要求。LLM 会先生成待办预览，你确认后才写入清单。

在 `.env` 中填入服务端 API Key：

```dotenv
AI_API_KEY=sk-...
AI_API_STYLE=responses
AI_BASE_URL=https://api.openai.com/v1
AI_MODEL=gpt-5-mini
```

修改后重启应用。API Key 只由服务器读取，不会发送到浏览器。

如果使用 DeepSeek，可改成：

```dotenv
AI_API_KEY=你的 DeepSeek API Key
AI_API_STYLE=chat
AI_BASE_URL=https://api.deepseek.com
AI_MODEL=deepseek-flash
```

DeepSeek 提供 `deepseek-flash` 和 `deepseek-v4-pro` 两个模型。批量整理日常待办使用 `deepseek-flash` 即可。

如果使用阿里云百炼的 OpenAI 兼容接口，可使用：

```dotenv
AI_API_STYLE=chat
AI_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
AI_MODEL=qwen-plus
```

## 2. 项目结构

```text
.
├─ server.mjs            # HTTP 服务、登录、任务 API、JSON 持久化
├─ public/
│  ├─ index.html         # 页面语义结构
│  ├─ styles.css         # 桌面/手机响应式样式
│  └─ app.js             # 页面状态、API 请求和交互
├─ data/todos.json       # 首次运行后自动创建，保存任务数据
├─ deploy/
│  ├─ morrow.service     # systemd 后台服务
│  ├─ nginx.conf         # Nginx 反向代理
│  └─ install.sh         # 服务器安装脚本
└─ .env.example          # 环境变量示例
```

开发时分三层理解：

1. `index.html` 定义页面元素，`styles.css` 控制视觉与响应式布局。
2. `app.js` 把任务数组渲染成卡片，并在按钮被点击后调用 API。
3. `server.mjs` 验证登录，读取/写入 `data/todos.json`，再把 JSON 返回给浏览器。

主要接口如下：

| 方法 | 路径 | 用途 |
| --- | --- | --- |
| `GET` | `/api/session` | 检查登录状态 |
| `POST` | `/api/login` | 密码登录 |
| `GET` | `/api/todos` | 获取任务 |
| `POST` | `/api/todos` | 新建任务 |
| `PATCH` | `/api/todos/:id` | 修改/完成任务 |
| `DELETE` | `/api/todos/:id` | 删除任务 |
| `GET` | `/api/health` | 部署健康检查 |

## 3. 可选：公网访问

如果要把应用放到公网，可部署到任意一台 Linux 云服务器。下面以阿里云 ECS 为例。

在云控制台进入 **云服务器 ECS → 网络与安全组 → 安全组 → 配置规则**，给实例所在安全组添加入方向规则：

| 端口 | 来源 | 用途 |
| --- | --- | --- |
| `22/tcp` | 你的公网 IP `/32`，不要长期用 `0.0.0.0/0` | SSH 管理 |
| `80/tcp` | `0.0.0.0/0` | 网页访问 |

现在不需要开放 `3000` 端口，应用只监听服务器本机，由 Nginx 转发。

如果不知道 SSH 密码，可以在 ECS 控制台先 **重置实例密码**。重置后通常需要重启实例才生效。

## 4. 上传并部署

先在本地生成发布压缩包。下面的命令不包含测试数据、`.env` 和运行日志：

```powershell
cd "你的项目目录"
New-Item -ItemType Directory -Force dist | Out-Null
tar -czf dist/morrow-todo.tar.gz package.json server.mjs public deploy .env.example
scp dist/morrow-todo.tar.gz root@你的服务器IP:/tmp/
```

如果 `scp` 第一次连接时询问 `yes/no`，输入 `yes`。随后输入服务器的 root 密码。

登录服务器：

```bash
ssh root@你的服务器IP
```

在服务器上安装 Node.js 并解压应用：

```bash
dnf install -y tar curl
curl -fsSL https://rpm.nodesource.com/setup_22.x | bash -
dnf install -y nodejs
node --version

mkdir -p /opt/morrow
tar -xzf /tmp/morrow-todo.tar.gz -C /opt/morrow
cd /opt/morrow
cp .env.example .env
```

生成 `SESSION_SECRET`：

```bash
openssl rand -hex 32
```

编辑环境变量：

```bash
vi /opt/morrow/.env
```

按键盘 `i` 进入编辑模式，将文件改成类似下面这样。密码请自己另设，不要直接使用示例：

```dotenv
TODO_PASSWORD=换成你自己的强密码
SESSION_SECRET=把上一步生成的64位字符串粘贴到这里
PORT=3000
HOST=127.0.0.1
COOKIE_SECURE=false
NODE_ENV=production
```

按 `Esc`，输入 `:wq` 后回车保存。

执行安装脚本：

```bash
cd /opt/morrow
bash deploy/install.sh
```

看到 `部署完成` 后，在浏览器访问：

```text
http://你的服务器IP
```

输入你在 `.env` 中设置的 `TODO_PASSWORD` 即可使用。

## 5. 部署后的检查

检查服务状态：

```bash
systemctl status morrow --no-pager
systemctl status nginx --no-pager
curl http://127.0.0.1/api/health
```

最后一次命令应返回：

```json
{"ok":true}
```

查看实时日志：

```bash
journalctl -u morrow -f
```

如打不开网页，按顺序检查：

1. Nginx 是否运行：`systemctl status nginx`
2. Node 应用是否运行：`systemctl status morrow`
3. 服务器本机是否正常：`curl http://127.0.0.1:3000/api/health`
4. 阿里云安全组是否开放 `80/tcp`
5. 云服务器内部防火墙是否放行：`firewall-cmd --state`

## 6. 更新、备份和恢复

更新代码时，在本地重新生成压缩包，然后上传、覆盖代码并重启：

```powershell
tar -czf dist/morrow-todo.tar.gz package.json server.mjs public deploy .env.example
scp dist/morrow-todo.tar.gz root@你的服务器IP:/tmp/
```

```bash
tar -xzf /tmp/morrow-todo.tar.gz -C /opt/morrow
chown -R morrow:morrow /opt/morrow
chmod 700 /opt/morrow/.env /opt/morrow/data
systemctl restart morrow
```

压缩包不包含 `data/`，所以更新代码不会覆盖任务数据。

手动备份：

```bash
tar -czf /root/morrow-data-$(date +%F).tar.gz -C /opt/morrow data
```

把备份拉回本地：

```powershell
scp root@你的服务器IP:/root/morrow-data-2026-11-12.tar.gz .
```

从备份恢复：

```bash
systemctl stop morrow
tar -xzf /root/morrow-data-2026-11-12.tar.gz -C /opt/morrow
chown -R morrow:morrow /opt/morrow/data
systemctl start morrow
```

## 7. 后续可扩展方向

当前版本按“单用户、个人使用”设计。若后续需要多用户，建议把 JSON 存储升级为 PostgreSQL 或 MySQL，并增加注册、数据隔离和密码哈希；不要只在前端增加一个用户名字段。

有了正式域名后，下一步可以：

1. 将域名 A 记录解析到你的服务器 IP。
2. 修改 `/etc/nginx/conf.d/morrow.conf` 中的 `server_name`。
3. 安装 Certbot，为域名申请免费 HTTPS 证书。
4. 将 `.env` 的 `COOKIE_SECURE` 改为 `true`，重启应用。

如果需要手机桌面图标和离线外壳，可以在此版本上继续增加 Web App Manifest 与 Service Worker。

## 8. 上传到 GitHub

本项目不含第三方依赖，也未附带运行时数据。上传前请确认：

- `.env` 已在 `.gitignore` 中，不要提交真实密码和 API Key。
- `data/todos.json` 保存的是本地任务，已被忽略。
- 截图、浏览器测试目录和打包产物都不应进入仓库。

首次上传：

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/你的用户名/rickyyy-todo.git
git push -u origin main
```

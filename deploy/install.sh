#!/usr/bin/env bash
set -euo pipefail

APP_DIR="/opt/morrow"
APP_USER="morrow"

if [[ "${EUID}" -ne 0 ]]; then
  echo "请使用 root 执行：sudo bash deploy/install.sh"
  exit 1
fi

if [[ ! -f "${APP_DIR}/server.mjs" || ! -f "${APP_DIR}/.env" ]]; then
  echo "找不到 ${APP_DIR}/server.mjs 或 ${APP_DIR}/.env，请先完成文件上传和 .env 配置。"
  exit 1
fi

if grep -qE '^(TODO_PASSWORD=replace|SESSION_SECRET=replace)' "${APP_DIR}/.env"; then
  echo "请先修改 ${APP_DIR}/.env 中的 TODO_PASSWORD 和 SESSION_SECRET。"
  exit 1
fi

if ! id "${APP_USER}" >/dev/null 2>&1; then
  useradd --system --home-dir "${APP_DIR}" --shell /sbin/nologin "${APP_USER}"
fi

install -d -o "${APP_USER}" -g "${APP_USER}" "${APP_DIR}/data"
chown -R "${APP_USER}:${APP_USER}" "${APP_DIR}"
chmod 700 "${APP_DIR}/.env" "${APP_DIR}/data"

install -m 0644 "${APP_DIR}/deploy/morrow.service" /etc/systemd/system/morrow.service
systemctl daemon-reload
systemctl enable --now morrow

if ! command -v nginx >/dev/null 2>&1; then
  dnf install -y nginx
fi

install -m 0644 "${APP_DIR}/deploy/nginx.conf" /etc/nginx/conf.d/morrow.conf
nginx -t
systemctl enable --now nginx
systemctl reload nginx

for _ in {1..10}; do
  if curl -fsS http://127.0.0.1:3000/api/health >/dev/null; then
    break
  fi
  sleep 1
done

if ! curl -fsS http://127.0.0.1:3000/api/health >/dev/null; then
  echo "应用健康检查失败，请执行：journalctl -u morrow -n 100 --no-pager"
  exit 1
fi

if ! curl -fsS http://127.0.0.1/api/health >/dev/null; then
  echo "Nginx 转发检查失败，请执行：nginx -T && journalctl -u morrow -n 100 --no-pager"
  exit 1
fi

echo
echo "部署完成，请通过服务器公网 IP 或域名访问。"
echo "查看应用日志：journalctl -u morrow -f"

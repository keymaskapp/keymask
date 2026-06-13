#!/usr/bin/env bash
set -euo pipefail

# 生成两个服务端主密钥(各为 base64 编码的 32 字节,即 AES-256):
#   KEYSARK_SESSION_SECRET     —— 会话密钥。
#   KEYSARK_DB_ENCRYPTION_KEY  —— DB 内 OAuth token 信封加密的主密钥。
# 两个值互相独立,分别用 `openssl rand -base64 32` 生成。
#
# 提醒:
#   - KEYSARK_DB_ENCRYPTION_KEY 一旦加密了 token 就不能更换,否则已存 token 解不开;
#     生产建议交给 KMS 注入。
#   - 这两个是服务端密钥,与端到端加密的助记词主密钥无关(后者只在浏览器,绝不进服务端)。

echo "KEYSARK_SESSION_SECRET=$(openssl rand -base64 32)"
echo "KEYSARK_DB_ENCRYPTION_KEY=$(openssl rand -base64 32)"

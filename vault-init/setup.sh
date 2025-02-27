#!/bin/sh
# vault-init/setup.sh

# Đợi Vault khởi động
sleep 5

# Đảm bảo jq được cài đặt
if ! command -v jq &> /dev/null; then
    echo "jq not found, installing..."
    apk add --no-cache jq || apt-get update && apt-get install -y jq
fi

# Đăng nhập vào Vault với root token
vault login dev-token

# Bật secret engine KV version 2
vault secrets enable -version=2 -path=secret kv

# Tạo các đường dẫn và thêm cấu hình
# 1. Cấu hình nén
vault kv put secret/notification-service/compression \
  enabled=true \
  threshold=5120 \
  level=3 \
  enableMetrics=true

# 2. Cấu hình Redis
vault kv put secret/notification-service/redis \
  host="redis" \
  port=6379 \
  enableCaching=true \
  ttl=3600

# 3. Cấu hình RabbitMQ
vault kv put secret/notification-service/rabbitmq \
  host="rabbitmq" \
  port=5672 \
  user="admin" \
  password="admin123" \
  exchange="notifications" \
  enableCompression=true

# Tạo policy cho dịch vụ thông báo
vault policy write notification-service - <<EOF
path "secret/data/notification-service/*" {
  capabilities = ["read", "list"]
}
EOF

# Tạo token cho dịch vụ thông báo với policy đã tạo
# mkdir -p /vault/token
# ln -sf /vault/config/notification-token /vault/token/notification-token
chmod 644 /vault/config/notification-token

echo "Vault đã được cấu hình thành công!"
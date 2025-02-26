#!/bin/bash
# start-services.sh

# Khởi động Vault trước
docker-compose up -d vault

# Đợi Vault khởi động và khỏe mạnh
echo "Đợi Vault khởi động..."
until docker-compose exec vault vault status > /dev/null 2>&1; do
  sleep 2
done

# Thực hiện script cấu hình Vault
echo "Cấu hình Vault..."
docker-compose exec vault sh /vault/config/setup.sh

# Khởi động các service còn lại
echo "Khởi động các service khác..."
docker-compose up -d

echo "Hệ thống đã sẵn sàng!"
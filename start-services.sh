#!/bin/bash

# Function to check if Docker is running
check_docker() {
  if ! docker info > /dev/null 2>&1; then
    echo "Docker does not appear to be running. Let me try to start it..."
    return 1
  else
    echo "Docker is already running."
    return 0
  fi
}

# Try to start Docker if not running
start_docker() {
  if [[ "$OSTYPE" == "darwin"* ]]; then  # macOS
    echo "Attempting to start Docker Desktop on macOS..."
    open -a Docker
    
    # Wait for Docker to start (can take some time)
    echo "Waiting for Docker to start. This might take up to a minute..."
    for i in {1..60}; do
      if docker info > /dev/null 2>&1; then
        echo "Docker started successfully."
        return 0
      fi
      sleep 1
      echo -n "."
    done
    
    echo "Failed to start Docker automatically. Please start Docker Desktop manually."
    return 1
    
  elif [[ "$OSTYPE" == "linux-gnu"* ]]; then  # Linux
    echo "Attempting to start Docker service on Linux..."
    sudo systemctl start docker
    
    # Wait for Docker to start
    for i in {1..30}; do
      if docker info > /dev/null 2>&1; then
        echo "Docker started successfully."
        return 0
      fi
      sleep 1
      echo -n "."
    done
    
    echo "Failed to start Docker. Check if the Docker service is installed properly."
    return 1
  else
    echo "Cannot automatically start Docker on this OS. Please start Docker manually."
    return 1
  fi
}

# Main script execution
main() {
  # Check if Docker is running, try to start it if not
  if ! check_docker; then
    if ! start_docker; then
      echo "Exiting script since Docker is required but not available."
      exit 1
    fi
  fi
  
  # Continue with your Docker commands
  echo "Proceeding with Docker operations..."
  
  # Start Vault first
  docker compose up -d vault
  
  # Wait for Vault to become healthy
  echo "Waiting for Vault to start..."
  until docker compose exec -T vault vault status > /dev/null 2>&1; do
    sleep 2
    echo -n "."
  done
  echo "Vault is running."
  
  # Configure Vault
  echo "Configuring Vault..."
  docker compose exec -T vault sh /vault/config/setup.sh
  
  # Start remaining services (excluding vault which is already running)
  echo "Starting remaining services..."
  docker compose up -d postgres redis rabbitmq elasticsearch kibana logstash prometheus grafana api db-seeder
  
  echo "All services started successfully!"
}

# Run the main function
main
# Push Notification Service

A scalable and robust service for managing and delivering push notifications across multiple channels.

## Documentation

We've moved our documentation to Docusaurus for a better developer experience! The documentation is now available as an interactive website with improved navigation, search functionality, and interactive diagrams.

### Accessing the Documentation

#### Local Development

To view the documentation locally:

```bash
# Navigate to the documentation directory
cd docs

# Install dependencies
npm install

# Start the development server
npm start
```

This will launch the documentation site at [http://localhost:3002](http://localhost:3002).

#### Online Documentation

Our documentation is also available online at [https://longvv.github.io/push-notification-service/](https://longvv.github.io/push-notification-service/)

### Documentation Structure

Our documentation is organized into several sections:

- **Introduction** - Overview of the Push Notification Service
- **Getting Started** - Setup and configuration instructions
- **API Reference** - Complete API reference for all endpoints
- **Technical Documentation** - Detailed technical implementation details
- **Implementation Status** - Current status of features and components
- **Database Seeder** - Guide to generating test data

## Overview

The Push Notification Service is a microservice-based platform designed to handle notification delivery with a focus on real-time push notifications and WebSocket delivery. The service is being developed incrementally, with more features planned for future releases.

### Key Features

- **Real-time notifications** via WebSockets
- **Message queueing** with RabbitMQ
- **User and device management** API
- **Containerized deployment** with Docker
- **Monitoring and logging** infrastructure
- **Comprehensive test data generation**

## Quick Start

```bash
# Clone the repository
git clone https://github.com/yourusername/push-notification-service.git
cd push-notification-service

# Setup environment
chmod +x setup.sh
./setup.sh

# Start the services with Docker Compose
docker-compose up -d

# Check if services are running
docker-compose ps

# Check API availability
curl http://localhost:3001/api/healthcheck
```

For detailed instructions, please refer to the [Setup Guide](https://your-domain.com/push-notification-docs/docs/setup-and-configuration) in our documentation.

## Contributing to Documentation

We welcome contributions to both the code and documentation! Here's how to contribute to the documentation:

1. **Setup**: Follow the steps in "Accessing the Documentation" to get the documentation site running locally.

2. **Create or Edit Content**: Documentation files are in Markdown format in the `docs/docs` directory.

3. **Add Interactive Diagrams**: We use Mermaid for diagrams. Add diagrams directly in markdown:

   ```markdown
   ```mermaid
   flowchart TD
       A[Start] --> B[End]
   ```
   ```

4. **Preview Changes**: The development server will automatically refresh to show your changes.

5. **Submit a Pull Request**: Once you're satisfied with your changes, submit a pull request.

## Implementation Status

For a detailed overview of which features are implemented vs. planned, please visit the [Implementation Status](https://your-domain.com/push-notification-docs/docs/implementation-status) page in our documentation.

## License

[Your License Information]

---

Thank you for using Push Notification Service! For any questions or issues, please [open an issue](https://github.com/yourusername/push-notification-service/issues) on our GitHub repository.

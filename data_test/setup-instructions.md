# Push Notification Service Database Seeder

This document explains how to set up and run the database seeder script for the Push Notification Service.

## Prerequisites

- Node.js installed (v14 or higher)
- PostgreSQL database running and accessible
- The database schema should already be created (tables structure)

## Setup

1. Create a new file in your project root called `data-generator.js` and copy the script content into it.

2. Install the required dependencies:

```bash
npm install sequelize pg pg-hstore faker uuid dotenv
```

3. Ensure your `.env` file contains the correct database connection settings:

```
DB_HOST=localhost  # Or your PostgreSQL host
DB_PORT=5432
DB_NAME=notification_db
DB_USER=admin
DB_PASSWORD=admin123
```

## Running the Script

Run the script with:

```bash
node data-generator.js
```

## What the Script Does

The script will generate and insert sample data for:

1. **Users** (100 records)
   - Random names, emails, and phone numbers

2. **Devices** (200-300 records)
   - Each user will have 1-3 devices
   - Mixture of Android, iOS, and web devices

3. **Notifications** (500 records)
   - Various types of notifications with realistic titles and content
   - Distributed across users

4. **User Preferences** (100-400 records)
   - Each user will have 1-4 notification preferences

5. **Sent Notifications** (~400 records)
   - Records for about 80% of notifications marked as sent

6. **Notification Logs** (1000-2500 records)
   - Multiple log entries per notification tracking its lifecycle

## Customizing the Data

You can modify the following variables in the script to change the amount of data generated:

- `userCount`: Number of users to create
- `notificationCount`: Number of notifications to create
- `notificationTitles`: Array of possible notification titles
- `notificationTypes`: Array of possible notification types
- `deviceTypes`: Array of possible device types
- `logTypes`: Array of possible log types

You can also adjust the date ranges by modifying the parameters in the `randomDate()` function calls.

## Troubleshooting

If you encounter any errors:

1. **Database Connection Issues**
   - Verify your database credentials in the `.env` file
   - Ensure PostgreSQL is running and accessible

2. **Duplicate Key Errors**
   - If you run the script multiple times, you might get unique constraint violations
   - To fix this, either drop the tables before running again or modify the script to use different ranges of IDs

3. **Missing Tables**
   - Ensure the database schema is set up correctly before running this script
   - You can use the SQL scripts provided in your project's `init-scripts` folder

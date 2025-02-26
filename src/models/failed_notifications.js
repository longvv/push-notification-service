const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('failed_notifications', {
    id: {
      autoIncrement: true,
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true
    },
    notification_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'notifications',
        key: 'id'
      }
    },
    error_message: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    retry_count: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0
    }
  }, {
    sequelize,
    tableName: 'failed_notifications',
    schema: 'public',
    timestamps: true,
    indexes: [
      {
        name: "failed_notifications_pkey",
        unique: true,
        fields: [
          { name: "id" },
        ]
      },
    ]
  });
};

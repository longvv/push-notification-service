const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('notification_logs', {
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
    log_type: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    log_message: {
      type: DataTypes.TEXT,
      allowNull: false
    }
  }, {
    sequelize,
    tableName: 'notification_logs',
    schema: 'public',
    timestamps: true,
    indexes: [
      {
        name: "notification_logs_pkey",
        unique: true,
        fields: [
          { name: "id" },
        ]
      },
    ]
  });
};

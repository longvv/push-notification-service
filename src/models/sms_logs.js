const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('sms_logs', {
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
    phone_number: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    sent_at: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: Sequelize.Sequelize.literal('CURRENT_TIMESTAMP')
    }
  }, {
    sequelize,
    tableName: 'sms_logs',
    schema: 'public',
    timestamps: false,
    indexes: [
      {
        name: "sms_logs_pkey",
        unique: true,
        fields: [
          { name: "id" },
        ]
      },
    ]
  });
};

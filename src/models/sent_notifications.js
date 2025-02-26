const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('sent_notifications', {
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
    sent_at: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: Sequelize.Sequelize.literal('CURRENT_TIMESTAMP')
    }
  }, {
    sequelize,
    tableName: 'sent_notifications',
    schema: 'public',
    timestamps: false,
    indexes: [
      {
        name: "sent_notifications_pkey",
        unique: true,
        fields: [
          { name: "id" },
        ]
      },
    ]
  });
};

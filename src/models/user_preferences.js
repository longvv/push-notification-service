const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('user_preferences', {
    id: {
      autoIncrement: true,
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    notification_type: {
      type: DataTypes.STRING(255),
      allowNull: false
    }
  }, {
    sequelize,
    tableName: 'user_preferences',
    schema: 'public',
    timestamps: true,
    indexes: [
      {
        name: "user_preferences_pkey",
        unique: true,
        fields: [
          { name: "id" },
        ]
      },
    ]
  });
};

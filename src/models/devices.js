const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('devices', {
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
    device_token: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    device_type: {
      type: DataTypes.STRING(50),
      allowNull: false
    }
  }, {
    sequelize,
    tableName: 'devices',
    schema: 'public',
    timestamps: true,
    indexes: [
      {
        name: "devices_pkey",
        unique: true,
        fields: [
          { name: "id" },
        ]
      },
    ]
  });
};

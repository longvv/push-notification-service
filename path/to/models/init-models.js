var DataTypes = require("sequelize").DataTypes;
var _devices = require("../../../src/models/devices");
var _email_logs = require("../../../src/models/email_logs");
var _failed_notifications = require("../../../src/models/failed_notifications");
var _notification_logs = require("../../../src/models/notification_logs");
var _notifications = require("../../../src/models/notifications");
var _push_notification_logs = require("../../../src/models/push_notification_logs");
var _sent_notifications = require("../../../src/models/sent_notifications");
var _sms_logs = require("../../../src/models/sms_logs");
var _user_preferences = require("../../../src/models/user_preferences");
var _users = require("../../../src/models/users");
var _webhook_logs = require("../../../src/models/webhook_logs");

function initModels(sequelize) {
  var devices = _devices(sequelize, DataTypes);
  var email_logs = _email_logs(sequelize, DataTypes);
  var failed_notifications = _failed_notifications(sequelize, DataTypes);
  var notification_logs = _notification_logs(sequelize, DataTypes);
  var notifications = _notifications(sequelize, DataTypes);
  var push_notification_logs = _push_notification_logs(sequelize, DataTypes);
  var sent_notifications = _sent_notifications(sequelize, DataTypes);
  var sms_logs = _sms_logs(sequelize, DataTypes);
  var user_preferences = _user_preferences(sequelize, DataTypes);
  var users = _users(sequelize, DataTypes);
  var webhook_logs = _webhook_logs(sequelize, DataTypes);

  email_logs.belongsTo(notifications, { as: "notification", foreignKey: "notification_id"});
  notifications.hasMany(email_logs, { as: "email_logs", foreignKey: "notification_id"});
  failed_notifications.belongsTo(notifications, { as: "notification", foreignKey: "notification_id"});
  notifications.hasMany(failed_notifications, { as: "failed_notifications", foreignKey: "notification_id"});
  notification_logs.belongsTo(notifications, { as: "notification", foreignKey: "notification_id"});
  notifications.hasMany(notification_logs, { as: "notification_logs", foreignKey: "notification_id"});
  push_notification_logs.belongsTo(notifications, { as: "notification", foreignKey: "notification_id"});
  notifications.hasMany(push_notification_logs, { as: "push_notification_logs", foreignKey: "notification_id"});
  sent_notifications.belongsTo(notifications, { as: "notification", foreignKey: "notification_id"});
  notifications.hasMany(sent_notifications, { as: "sent_notifications", foreignKey: "notification_id"});
  sms_logs.belongsTo(notifications, { as: "notification", foreignKey: "notification_id"});
  notifications.hasMany(sms_logs, { as: "sms_logs", foreignKey: "notification_id"});
  webhook_logs.belongsTo(notifications, { as: "notification", foreignKey: "notification_id"});
  notifications.hasMany(webhook_logs, { as: "webhook_logs", foreignKey: "notification_id"});
  devices.belongsTo(users, { as: "user", foreignKey: "user_id"});
  users.hasMany(devices, { as: "devices", foreignKey: "user_id"});
  notifications.belongsTo(users, { as: "user", foreignKey: "user_id"});
  users.hasMany(notifications, { as: "notifications", foreignKey: "user_id"});
  user_preferences.belongsTo(users, { as: "user", foreignKey: "user_id"});
  users.hasMany(user_preferences, { as: "user_preferences", foreignKey: "user_id"});

  return {
    devices,
    email_logs,
    failed_notifications,
    notification_logs,
    notifications,
    push_notification_logs,
    sent_notifications,
    sms_logs,
    user_preferences,
    users,
    webhook_logs,
  };
}
module.exports = initModels;
module.exports.initModels = initModels;
module.exports.default = initModels;

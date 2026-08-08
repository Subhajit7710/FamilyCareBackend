const { Sequelize, DataTypes } = require("sequelize");
const sequelize = require("../config/database");

// Import models (we'll reuse the same structure)
const User = require("./User");
const Family = require("./Family");
const FamilyMember = require("./FamilyMember");

// Define associations
User.belongsToMany(Family, {
  through: FamilyMember,
  foreignKey: "user_id",
  otherKey: "family_id",
});

Family.belongsToMany(User, {
  through: FamilyMember,
  foreignKey: "family_id",
  otherKey: "user_id",
});

Family.belongsTo(User, {
  as: "creator",
  foreignKey: "created_by",
});

FamilyMember.belongsTo(User, {
  foreignKey: "user_id",
});

FamilyMember.belongsTo(Family, {
  foreignKey: "family_id",
});

module.exports = {
  User,
  Family,
  FamilyMember,
  sequelize,
};

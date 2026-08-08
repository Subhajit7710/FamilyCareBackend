const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

const FamilyMember = sequelize.define(
  "FamilyMember",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "users",
        key: "id",
      },
    },
    family_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "families",
        key: "id",
      },
    },
    role: {
      type: DataTypes.ENUM("admin", "member"),
      defaultValue: "member",
    },
    joined_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    tableName: "family_members",
    timestamps: false,
    indexes: [
      {
        unique: true,
        fields: ["user_id", "family_id"],
      },
    ],
  },
);

module.exports = FamilyMember;

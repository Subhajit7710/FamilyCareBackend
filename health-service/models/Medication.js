const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

const Medication = sequelize.define(
  "Medication",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    patient_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    dosage: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    schedule: {
      type: DataTypes.STRING(10),
      allowNull: true,
    },
    frequency: {
      type: DataTypes.STRING(50),
      defaultValue: "once-daily",
    },
    status: {
      type: DataTypes.ENUM("active", "completed", "stopped"),
      defaultValue: "active",
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    tableName: "medications",
    timestamps: false,
    indexes: [
      {
        fields: ["schedule"],
      },
    ],
  },
);

module.exports = Medication;

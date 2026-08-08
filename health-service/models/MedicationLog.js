const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

const MedicationLog = sequelize.define(
  "MedicationLog",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    medication_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    patient_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    taken_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    marked_by: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM("taken", "missed", "snoozed"),
      defaultValue: "taken",
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    tableName: "medication_logs",
    timestamps: false,
    indexes: [
      {
        fields: ["taken_at"],
      },
    ],
  },
);

module.exports = MedicationLog;

const Patient = require("./Patient");
const Medication = require("./Medication");
const MedicationLog = require("./MedicationLog");

// Define associations
Patient.hasMany(Medication, { foreignKey: "patient_id" });
Medication.belongsTo(Patient, { foreignKey: "patient_id" });

Patient.hasMany(MedicationLog, { foreignKey: "patient_id" });
MedicationLog.belongsTo(Patient, { foreignKey: "patient_id" });

Medication.hasMany(MedicationLog, { foreignKey: "medication_id" });
MedicationLog.belongsTo(Medication, { foreignKey: "medication_id" });

module.exports = {
  Patient,
  Medication,
  MedicationLog,
};

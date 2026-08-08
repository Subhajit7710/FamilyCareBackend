const express = require("express");
const router = express.Router();
const { authenticate } = require("../middleware/auth");
const patientController = require("../controllers/patientController");
const medicationController = require("../controllers/medicationController");

// All routes require authentication
router.use(authenticate);

// Patient routes
router.post("/patients", patientController.createPatient);
router.get("/patients/:id", patientController.getPatient);
router.put("/patients/:id", patientController.updatePatient);
router.delete("/patients/:id", patientController.deletePatient);
router.get("/families/:familyId/patients", patientController.getFamilyPatients);

// Medication routes
router.post("/medications", medicationController.addMedication);
router.get(
  "/patients/:patientId/medications",
  medicationController.listMedications,
);
router.post("/medications/:id/taken", medicationController.markAsTaken);
router.get(
  "/patients/:patientId/history",
  medicationController.getMedicationHistory,
);

// External API route
router.get("/drug-info/:name", medicationController.getDrugInfo);

module.exports = router;

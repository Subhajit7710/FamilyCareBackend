const { Patient, Medication, MedicationLog } = require("../models");
const axios = require("axios");

// Create patient (/patients)
const createPatient = async (req, res) => {
  try {
    const { name, age, conditions, familyId } = req.body;
    const userId = req.user.id;

    const patient = await Patient.create({
      user_id: userId,
      family_id: familyId,
      name,
      age,
      conditions,
    });

    res.status(201).json({
      success: true,
      patient,
    });
  } catch (error) {
    console.error("Create patient error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to create patient",
    });
  }
};

// Get patient with medications (/patients/:id)
const getPatient = async (req, res) => {
  try {
    const { id } = req.params; // from member.id (which is user_id)

    // First try by user_id since the dashboard navigates to /patient/:userId
    let patient = await Patient.findOne({
      where: { user_id: id },
      include: [
        {
          model: Medication,
          where: { status: "active" },
          required: false,
        },
      ],
    });

    if (!patient) {
      // Fallback: If no user_id found, try as patient.id
      patient = await Patient.findByPk(id, {
        include: [
          {
            model: Medication,
            where: { status: "active" },
            required: false,
          },
        ],
      });
    }

    if (!patient) {
      // Auto-create a placeholder patient profile
      try {
        let familyId = null;
        
        // Query the cross-service family_members table dynamically
        const { sequelize } = require("../config/database");
        const [results] = await sequelize.query(
          "SELECT family_id FROM family_members WHERE user_id = :userId",
          { replacements: { userId: id } }
        );
        
        if (results && results.length > 0) {
          familyId = results[0].family_id;
        }

        patient = await Patient.create({
          user_id: id,
          family_id: familyId,
          name: req.user.name || 'Family Member',
          age: null,
          conditions: null,
        });
        console.log('[GET PATIENT] Auto-created patient id:', patient.id, 'for user_id:', id, 'with family_id:', familyId);
        patient = patient.toJSON();
        patient.Medications = [];
      } catch (createErr) {
        console.error('[GET PATIENT] Auto-create failed:', createErr.message);
      }
    }

    // If still no patient, return graceful empty shell
    if (!patient) {
      return res.json({
        success: true,
        patient: { id: null, user_id: id, name: 'Family Member', age: null, conditions: null, Medications: [] },
      });
    }

    res.json({ success: true, patient });
  } catch (error) {
    console.error('Get patient error:', error);
    res.status(500).json({ success: false, error: 'Failed to get patient' });
  }
};


// Update patient (/patients/:id)
const updatePatient = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, age, conditions } = req.body;

    const patient = await Patient.findByPk(id);
    if (!patient) {
      return res.status(404).json({
        success: false,
        error: "Patient not found",
      });
    }

    await patient.update({ name, age, conditions });

    res.json({
      success: true,
      patient,
    });
  } catch (error) {
    console.error("Update patient error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to update patient",
    });
  }
};

// Delete patient (/patients/:id)
const deletePatient = async (req, res) => {
  try {
    const { id } = req.params;

    const patient = await Patient.findByPk(id);
    if (!patient) {
      return res.status(404).json({
        success: false,
        error: "Patient not found",
      });
    }

    await patient.destroy();

    res.json({
      success: true,
      message: "Patient deleted successfully",
    });
  } catch (error) {
    console.error("Delete patient error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to delete patient",
    });
  }
};

// Get all patients in family (/families/:familyId/patients)
const getFamilyPatients = async (req, res) => {
  try {
    const { familyId } = req.params;

    const patients = await Patient.findAll({
      where: { family_id: familyId },
      include: [
        {
          model: Medication,
          where: { status: "active" },
          required: false,
        },
      ],
    });

    res.json({
      success: true,
      patients,
    });
  } catch (error) {
    console.error("Get family patients error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to get patients",
    });
  }
};

module.exports = {
  createPatient,
  getPatient,
  updatePatient,
  deletePatient,
  getFamilyPatients,
};

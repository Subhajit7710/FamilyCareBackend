const { Medication, MedicationLog, Patient } = require("../models");
const { Op } = require("sequelize");
const axios = require("axios");
const Redis = require("ioredis");
const { scheduleReminders } = require("../queues/medicationQueue");
const { getIo } = require("../socket/ioStore");
const redis = new Redis(process.env.REDIS_URL);

// Add medication
const addMedication = async (req, res) => {
  try {
    const { patientId, name, dosage, schedule, frequency, time } = req.body;
    console.log('[ADD MED] body:', req.body);

    // Resolve user_id to actual patient.id securely
    let targetPatientId = patientId;
    let patientRow = await Patient.findByPk(patientId);
    
    if (!patientRow) {
      patientRow = await Patient.findOne({ where: { user_id: patientId } });
      if (patientRow) {
        targetPatientId = patientRow.id;
      } else {
        return res.status(404).json({ success: false, error: 'Patient not found' });
      }
    }
    console.log('[ADD MED] resolved patientId:', patientId, '→', targetPatientId);

    const medication = await Medication.create({
      patient_id: targetPatientId,
      name,
      dosage,
      schedule: schedule || time || '08:00',
      frequency: frequency || 'once-daily',
      status: 'active',
    });
    console.log('[ADD MED] created:', medication.id);

    // Schedule the reminder immediately securely into BullMQ
    try {
      await scheduleReminders(medication.id, targetPatientId, medication.schedule);
    } catch (schedErr) {
      console.error('[ADD MED] Failed to schedule reminder into BullMQ:', schedErr.message);
    }

    res.status(201).json({ success: true, medication });
  } catch (error) {
    console.error('[ADD MED] error:', error.message);
    res.status(500).json({ success: false, error: 'Failed to add medication', detail: error.message });
  }
};

// List medications for patient
const listMedications = async (req, res) => {
  try {
    const { patientId } = req.params;
    console.log('[LIST MED] patientId from URL:', patientId);

    // Map user_id → actual patient.id securely
    let searchId = patientId;
    let patientRow = await Patient.findByPk(patientId);
    
    if (!patientRow) {
      patientRow = await Patient.findOne({ where: { user_id: patientId } });
      if (patientRow) {
        searchId = patientRow.id;
      }
    }
    console.log('[LIST MED] resolved searchId:', searchId);

    const medications = await Medication.findAll({
      where: { patient_id: searchId },
      order: [['created_at', 'DESC']],
    });
    console.log('[LIST MED] found:', medications.length, 'medications');

    res.json({ success: true, medications });
  } catch (error) {
    console.error('[LIST MED] error:', error.message);
    res.status(500).json({ success: false, error: 'Failed to get medications' });
  }
};


// MARK AS TAKEN - Core feature! (/medications/:id/taken)
const markAsTaken = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Find medication with patient
    const medication = await Medication.findByPk(id, {
      include: [{ model: Patient }],
    });

    if (!medication) {
      return res.status(404).json({
        success: false,
        error: "Medication not found",
      });
    }

    // Create log
    const log = await MedicationLog.create({
      medication_id: id,
      patient_id: medication.patient_id,
      marked_by: userId,
      taken_at: new Date(),
      status: "taken",
    });

    // Invalidate cache
    await redis.del(`patient:${medication.patient_id}:medications`);

    // PUBLISH TO REDIS FOR REAL-TIME UPDATES
    const eventData = {
      type: "TAKEN",
      medicationId: medication.id,
      medicationName: medication.name,
      patientId: medication.patient_id,
      patientName: medication.Patient.name,
      familyId: medication.Patient.family_id,
      takenBy: req.user.name || "Family Member",
      time: new Date().toISOString(),
      logId: log.id,
    };

    // Publish to Redis (may fail if Redis unavailable - non-fatal)
    try {
      await redis.publish("medication:taken", JSON.stringify(eventData));
      console.log("Published medication:taken event via Redis:", eventData);
    } catch (redisErr) {
      console.warn('[MARK TAKEN] Redis publish failed (non-fatal):', redisErr.message);
    }

    // Also emit DIRECTLY via socket.io (works even without Redis pub/sub)
    const io = getIo();
    if (io && medication.Patient && medication.Patient.family_id) {
      io.to(`family:${medication.Patient.family_id}`).emit('medication-taken', eventData);
      console.log('[MARK TAKEN] Emitted directly via socket to family:', medication.Patient.family_id);
    }

    console.log("Published medication:taken event:", eventData);

    res.json({
      success: true,
      message: "Medication marked as taken",
      log,
      realtime: "Update sent to family members",
    });
  } catch (error) {
    console.error("Mark as taken error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to mark medication as taken",
    });
  }
};

// Get drug info from external API
const getDrugInfo = async (req, res) => {
  try {
    const { name } = req.params;

    // Check Redis cache first
    const cached = await redis.get(`drug:${name}`);
    if (cached) {
      return res.json({
        success: true,
        drug: JSON.parse(cached),
        source: "cache",
      });
    }

    // Call OpenFDA API
    const response = await axios.get(
      `https://api.fda.gov/drug/label.json?search=openfda.brand_name:"${name}"&limit=1`,
    );

    if (!response.data.results || response.data.results.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Drug not found",
      });
    }

    const drugData = response.data.results[0];
    const drugInfo = {
      name: name,
      purpose: drugData.purpose || ["Information not available"],
      warnings: drugData.warnings || ["No warnings available"],
      dosage: drugData.dosage_and_administration || ["Follow prescription"],
      sideEffects: drugData.adverse_reactions || ["Consult doctor"],
    };

    // Cache for 24 hours
    await redis.setex(`drug:${name}`, 86400, JSON.stringify(drugInfo));

    res.json({
      success: true,
      drug: drugInfo,
      source: "api",
    });
  } catch (error) {
    console.error("Drug info error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch drug information",
    });
  }
};

// Get medication history (/patients/:patientId/history?days=7)
const getMedicationHistory = async (req, res) => {
  try {
    const { patientId } = req.params;
    const { days = 7 } = req.query;

    // Resolve user_id → actual patient.id securely
    let resolvedPatientId = patientId;
    let patientRow = await Patient.findByPk(patientId);
    
    if (!patientRow) {
      patientRow = await Patient.findOne({ where: { user_id: patientId } });
      if (patientRow) {
        resolvedPatientId = patientRow.id;
      }
    }

    const date = new Date();
    date.setDate(date.getDate() - parseInt(days, 10));

    const logs = await MedicationLog.findAll({
      where: {
        patient_id: resolvedPatientId,
        taken_at: { [Op.gte]: date },
      },
      include: [{ model: Medication }],
      order: [["taken_at", "DESC"]],
    });

    res.json({
      success: true,
      history: logs,
    });
  } catch (error) {
    console.error("History error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to get medication history",
    });
  }
};

module.exports = {
  addMedication,
  listMedications,
  markAsTaken,
  getDrugInfo,
  getMedicationHistory,
};

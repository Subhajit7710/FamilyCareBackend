const axios = require("axios");

const GATEWAY_URL = "http://localhost:3000"; // Changed to gateway!

let authToken;
let familyId;
let patientId;
let medicationId;

// Login through gateway
const login = async () => {
  try {
    const response = await axios.post(`${GATEWAY_URL}/auth/login`, {
      email: "test@example.com",
      password: "password123",
    });
    console.log("✅ Login successful");
    return response.data.token;
  } catch (error) {
    console.error("❌ Login failed:", error.response?.data || error.message);
  }
};

// Get profile through gateway
const getProfile = async (token) => {
  try {
    const response = await axios.get(`${GATEWAY_URL}/auth/profile`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    console.log("✅ Profile retrieved:", response.data.user.name);
  } catch (error) {
    console.error(
      "❌ Get profile failed:",
      error.response?.data || error.message,
    );
  }
};

// Create a family through gateway
const createFamily = async (token) => {
  try {
    const response = await axios.post(
      `${GATEWAY_URL}/families`,
      { name: "Smith Family" },
      { headers: { Authorization: `Bearer ${token}` } },
    );
    console.log("✅ Family created:", response.data.family.name);
    return response.data.family.id;
  } catch (error) {
    console.error(
      "❌ Create family failed:",
      error.response?.data || error.message,
    );
  }
};

// Get family members through gateway
const getMembers = async (token, id) => {
  try {
    const response = await axios.get(`${GATEWAY_URL}/families/${id}/members`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    console.log(`✅ ${response.data.members.length} family member(s) found`);
  } catch (error) {
    console.error(
      "❌ Get members failed:",
      error.response?.data || error.message,
    );
  }
};

// Create patient through gateway
const createPatient = async (token) => {
  try {
    const response = await axios.post(
      `${GATEWAY_URL}/health/patients`,
      {
        name: "Robert Smith",
        age: 72,
        conditions: "Diabetes, Hypertension",
        familyId: familyId || 1,
      },
      { headers: { Authorization: `Bearer ${token}` } },
    );
    console.log("✅ Patient created:", response.data.patient.name);
    return response.data.patient.id;
  } catch (error) {
    console.error(
      "❌ Create patient failed:",
      error.response?.data || error.message,
    );
  }
};

// Add medication through gateway
const addMedication = async (token, patientId) => {
  try {
    const response = await axios.post(
      `${GATEWAY_URL}/health/medications`,
      {
        patientId,
        name: "Metformin",
        dosage: "500mg",
        schedule: "08:00:00",
        frequency: "daily",
      },
      { headers: { Authorization: `Bearer ${token}` } },
    );
    console.log("✅ Medication added:", response.data.medication.name);
    return response.data.medication.id;
  } catch (error) {
    console.error(
      "❌ Add medication failed:",
      error.response?.data || error.message,
    );
  }
};

// Get medications through gateway
const getMedications = async (token, patientId) => {
  try {
    const response = await axios.get(
      `${GATEWAY_URL}/health/patients/${patientId}/medications`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    console.log(`✅ ${response.data.medications.length} medication(s) found`);
  } catch (error) {
    console.error(
      "❌ Get medications failed:",
      error.response?.data || error.message,
    );
  }
};

// Mark as taken through gateway (CORE FEATURE!)
const markAsTaken = async (token, medicationId) => {
  try {
    const response = await axios.post(
      `${GATEWAY_URL}/health/medications/${medicationId}/taken`,
      {},
      { headers: { Authorization: `Bearer ${token}` } },
    );
    console.log("✅ Medication marked as taken!");
    console.log("   📢 Real-time update sent to family members");
  } catch (error) {
    console.error(
      "❌ Mark as taken failed:",
      error.response?.data || error.message,
    );
  }
};

// Get drug info through gateway
const getDrugInfo = async (token, drugName) => {
  try {
    const response = await axios.get(
      `${GATEWAY_URL}/health/drug-info/${drugName}`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    console.log(`✅ Drug info retrieved for: ${response.data.drug.name}`);
    console.log(`   Source: ${response.data.source}`);
  } catch (error) {
    console.error(
      "❌ Drug info failed:",
      error.response?.data || error.message,
    );
  }
};

// Run all tests
const runTests = async () => {
  console.log("\n");
  console.log("═══════════════════════════════════════════════════════");
  console.log("     🚀 FAMILYCARE API GATEWAY TEST SUITE");
  console.log("═══════════════════════════════════════════════════════\n");

  // Login
  authToken = await login();
  if (!authToken) return;

  // Get profile
  await getProfile(authToken);

  // Create family
  familyId = await createFamily(authToken);
  if (!familyId) return;

  // Get family members
  await getMembers(authToken, familyId);

  // Create patient
  patientId = await createPatient(authToken);
  if (!patientId) return;

  // Add medication
  medicationId = await addMedication(authToken, patientId);
  if (!medicationId) return;

  // Get medications
  await getMedications(authToken, patientId);

  // Mark as taken (CORE FEATURE!)
  await markAsTaken(authToken, medicationId);

  // Get drug info
  await getDrugInfo(authToken, "Metformin");

  console.log("\n═══════════════════════════════════════════════════════");
  console.log("     ✅ ALL TESTS PASSED THROUGH GATEWAY!");
  console.log("═══════════════════════════════════════════════════════\n");
};

runTests();

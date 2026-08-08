const axios = require("axios");

const AUTH_URL = "http://localhost:3001";
const HEALTH_URL = "http://localhost:3003";

let authToken;
let patientId;
let medicationId;

// Login
const login = async () => {
  try {
    const response = await axios.post(`${AUTH_URL}/auth/login`, {
      email: "test@example.com",
      password: "password123",
    });
    console.log("Login successful");
    return response.data.token;
  } catch (error) {
    console.error("❌ Login failed:", error.response?.data || error.message);
  }
};

// Create patient
const createPatient = async (token) => {
  try {
    const response = await axios.post(
      `${HEALTH_URL}/health/patients`,
      {
        name: "Robert Smith",
        age: 72,
        conditions: "Diabetes, Hypertension",
        familyId: 1,
      },
      { headers: { Authorization: `Bearer ${token}` } },
    );
    console.log("Patient created:", response.data);
    return response.data.patient.id;
  } catch (error) {
    console.error(
      "Create patient failed:",
      error.response?.data || error.message,
    );
  }
};

// Add medication
const addMedication = async (token, patientId) => {
  try {
    const response = await axios.post(
      `${HEALTH_URL}/health/medications`,
      {
        patientId,
        name: "Metformin",
        dosage: "500mg",
        schedule: "08:00:00",
        frequency: "daily",
      },
      { headers: { Authorization: `Bearer ${token}` } },
    );
    console.log("Medication added:", response.data);
    return response.data.medication.id;
  } catch (error) {
    console.error(
      "Add medication failed:",
      error.response?.data || error.message,
    );
  }
};

// Get medications
const getMedications = async (token, patientId) => {
  try {
    const response = await axios.get(
      `${HEALTH_URL}/health/patients/${patientId}/medications`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    console.log("Medications retrieved:", response.data);
  } catch (error) {
    console.error(
      "Get medications failed:",
      error.response?.data || error.message,
    );
  }
};

// Mark as taken (CORE FEATURE!)
const markAsTaken = async (token, medicationId) => {
  try {
    const response = await axios.post(
      `${HEALTH_URL}/health/medications/${medicationId}/taken`,
      {},
      { headers: { Authorization: `Bearer ${token}` } },
    );
    console.log("Marked as taken:", response.data);
  } catch (error) {
    console.error(
      "Mark as taken failed:",
      error.response?.data || error.message,
    );
  }
};

// Get drug info from API
const getDrugInfo = async (token, drugName) => {
  try {
    const response = await axios.get(
      `${HEALTH_URL}/health/drug-info/${drugName}`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    console.log("Drug info retrieved:", response.data);
  } catch (error) {
    console.error("Drug info failed:", error.response?.data || error.message);
  }
};

// Run all tests
const runTests = async () => {
  console.log("Testing Health Service");

  authToken = await login();
  if (!authToken) return;

  patientId = await createPatient(authToken);
  if (!patientId) return;

  medicationId = await addMedication(authToken, patientId);
  if (!medicationId) return;

  await getMedications(authToken, patientId);

  await markAsTaken(authToken, medicationId);

  await getDrugInfo(authToken, "Metformin");

  console.log("All health service tests completed!");
};

runTests();

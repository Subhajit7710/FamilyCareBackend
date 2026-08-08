const axios = require("axios");

const AUTH_URL = "http://localhost:3001";
const FAMILY_URL = "http://localhost:3002";

let authToken;
let familyId;
let inviteCode;

// First, login to get token
const login = async () => {
  try {
    const response = await axios.post(`${AUTH_URL}/auth/login`, {
      email: "test@example.com",
      password: "password123",
    });
    console.log("Login successful");
    return response.data.token;
  } catch (error) {
    console.error("Login failed:", error.response?.data || error.message);
  }
};

// Create a family
const createFamily = async (token) => {
  try {
    const response = await axios.post(
      `${FAMILY_URL}/families`,
      { name: "Smith Family" },
      { headers: { Authorization: `Bearer ${token}` } },
    );
    console.log("Family created:", response.data);
    return response.data.family.id;
  } catch (error) {
    console.error(
      "Create family failed:",
      error.response?.data || error.message,
    );
  }
};

// Get family details
const getFamily = async (token, id) => {
  try {
    const response = await axios.get(`${FAMILY_URL}/families/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    console.log("Got family details:", response.data);
  } catch (error) {
    console.error("Get family failed:", error.response?.data || error.message);
  }
};

// Generate invite
const generateInvite = async (token, id) => {
  try {
    const response = await axios.post(
      `${FAMILY_URL}/families/${id}/invite`,
      {},
      { headers: { Authorization: `Bearer ${token}` } },
    );
    console.log("Invite generated:", response.data);
    return response.data.inviteCode;
  } catch (error) {
    console.error(
      "Generate invite failed:",
      error.response?.data || error.message,
    );
  }
};

// Get family members
const getMembers = async (token, id) => {
  try {
    const response = await axios.get(`${FAMILY_URL}/families/${id}/members`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    console.log("Family members:", response.data);
  } catch (error) {
    console.error("Get members failed:", error.response?.data || error.message);
  }
};

// Run all tests
const runTests = async () => {
  console.log("Testing Family Service");

  // Login
  authToken = await login();
  if (!authToken) return;

  // Create family
  familyId = await createFamily(authToken);
  if (!familyId) return;

  // Get family details
  await getFamily(authToken, familyId);

  // Generate invite
  inviteCode = await generateInvite(authToken, familyId);

  // Get members
  await getMembers(authToken, familyId);

  console.log("All family service tests completed!");
};

runTests();

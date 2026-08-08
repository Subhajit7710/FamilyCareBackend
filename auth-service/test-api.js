const axios = require("axios");

const BASE_URL = "http://localhost:3000";

// Test registration
const testRegister = async () => {
  try {
    const response = await axios.post(`${BASE_URL}/auth/register`, {
      email: "test@example.com",
      password: "password123",
      name: "Test User",
      phone: "1234567890",
    });
    console.log("Register success:", response.data);
    return response.data.token;
  } catch (error) {
    console.error("Register failed:", error.response?.data || error.message);
  }
};

// Test login
const testLogin = async () => {
  try {
    const response = await axios.post(`${BASE_URL}/auth/login`, {
      email: "test@example.com",
      password: "password123",
    });
    console.log("Login success:", response.data);
    return response.data.token;
  } catch (error) {
    console.error("Login failed:", error.response?.data || error.message);
  }
};

// Test profile with token
const testProfile = async (token) => {
  try {
    const response = await axios.get(`${BASE_URL}/auth/profile`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    console.log("Profile success:", response.data);
  } catch (error) {
    console.error("Profile failed:", error.response?.data || error.message);
  }
};

// Run tests
const runTests = async () => {
  console.log("Testing Auth Service");

  // Test register
  const registerToken = await testRegister();

  // Test login
  const loginToken = await testLogin();

  // Test profile with login token
  if (loginToken) {
    await testProfile(loginToken);
  }
};

runTests();

const axios = require("axios");

const API_BASE = "http://localhost:3000/api";
const TEST_TOKEN = "your_jwt_token_here"; // Get from browser dev tools

async function testEndpoints() {
  console.log("🧪 Testing API endpoints...");

  const headers = {
    Authorization: `Bearer ${TEST_TOKEN}`,
    "Content-Type": "application/json",
  };

  try {
    // Test get all reports
    console.log("\n📡 Testing GET /reports");
    const reports = await axios.get(`${API_BASE}/reports`, { headers });
    console.log("✅ GET /reports success:", reports.data);
  } catch (error) {
    console.error(
      "❌ GET /reports failed:",
      error.response?.status,
      error.response?.data
    );
  }

  try {
    // Test create test report
    console.log("\n📡 Testing POST /reports/test");
    const testReport = await axios.post(
      `${API_BASE}/reports/test`,
      {
        stationId: "1", // Use an existing station ID
        type: "incident",
      },
      { headers }
    );
    console.log("✅ POST /reports/test success:", testReport.data);
  } catch (error) {
    console.error(
      "❌ POST /reports/test failed:",
      error.response?.status,
      error.response?.data
    );
  }
}

testEndpoints();

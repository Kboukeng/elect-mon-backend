// Test script for public API endpoints
const axios = require("axios");

const BASE_URL = process.env.API_BASE_URL || "http://localhost:3000";

async function testPublicEndpoints() {
  console.log("🧪 Testing Public API Endpoints...\n");

  try {
    // Test 1: GET /api/stations/public
    console.log("1. Testing GET /api/stations/public...");
    const stationsResponse = await axios.get(`${BASE_URL}/api/stations/public`);
    console.log("✅ Status:", stationsResponse.status);
    console.log("📊 Response:", JSON.stringify(stationsResponse.data, null, 2));
    console.log("");

    // Test 2: GET /api/voters/public
    console.log("2. Testing GET /api/voters/public...");
    const votersResponse = await axios.get(`${BASE_URL}/api/voters/public`);
    console.log("✅ Status:", votersResponse.status);
    console.log("📊 Response:", JSON.stringify(votersResponse.data, null, 2));
    console.log("");

    // Test 3: GET /api/reports/public
    console.log("3. Testing GET /api/reports/public...");
    const reportsResponse = await axios.get(`${BASE_URL}/api/reports/public`);
    console.log("✅ Status:", reportsResponse.status);
    console.log("📊 Response:", JSON.stringify(reportsResponse.data, null, 2));
    console.log("");

    // Test 4: POST /api/reports/public
    console.log("4. Testing POST /api/reports/public...");
    const testReport = {
      station_id: "STA001", // Assuming this station exists
      type: "incident",
      message: "Test report from public API test script",
    };

    const createReportResponse = await axios.post(
      `${BASE_URL}/api/reports/public`,
      testReport
    );
    console.log("✅ Status:", createReportResponse.status);
    console.log(
      "📊 Response:",
      JSON.stringify(createReportResponse.data, null, 2)
    );
    console.log("");

    console.log("🎉 All public API endpoints are working correctly!");
  } catch (error) {
    console.error("❌ Test failed:", error.response?.data || error.message);
    if (error.response) {
      console.error("Status:", error.response.status);
      console.error("Headers:", error.response.headers);
    }
  }
}

// Run the tests
testPublicEndpoints();

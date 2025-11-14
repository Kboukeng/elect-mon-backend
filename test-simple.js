// Simple test to verify the public API endpoints
const axios = require("axios");

async function testAPI() {
  try {
    console.log("Testing GET /api/stations/public...");
    const response = await axios.get(
      "http://localhost:3000/api/stations/public"
    );
    console.log("✅ Success:", response.status);
    console.log("Data:", response.data);
  } catch (error) {
    console.log("❌ Error:", error.response?.data || error.message);
  }
}

testAPI();

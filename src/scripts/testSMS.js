// 5. TEST SMS PROCESSING SCRIPT
// Create this file as scripts/testSMS.js

const reportController = require("../controllers/reportController");

// Mock request and response objects for testing
function createMockReqRes(body) {
  const req = { body };
  const res = {
    status: (code) => ({
      json: (data) => console.log(`Status ${code}:`, data),
    }),
    json: (data) => console.log("Response:", data),
  };
  return { req, res };
}

async function testSMSProcessing() {
  console.log("🧪 Testing SMS processing...");

  // Test different SMS message formats
  const testMessages = [
    {
      Body: "Station 1 equipment broken",
      From: "+1234567890",
    },
    {
      Body: "St 2 queue issue very long line",
      From: "+1234567891",
    },
    {
      Body: "5 incident need help",
      From: "+1234567892",
    },
    {
      Body: "Station 999 security problem", // This should fail - station doesn't exist
      From: "+1234567893",
    },
  ];

  for (const message of testMessages) {
    console.log(`\n📱 Testing message: "${message.Body}" from ${message.From}`);
    const { req, res } = createMockReqRes(message);

    try {
      await reportController.handleSMS(req, res);
    } catch (error) {
      console.error("❌ SMS processing failed:", error.message);
    }
  }
}

// Run test
testSMS();

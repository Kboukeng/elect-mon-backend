const twilio = require("twilio");
const logger = require("../utils/logger");

class TwilioService {
  constructor() {
    this.client = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );
  }

  async sendSMS(to, message) {
    try {
      const result = await this.client.messages.create({
        body: message,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: to,
      });
      logger.info(`SMS sent successfully: ${result.sid}`);
      return result;
    } catch (error) {
      logger.error(`SMS sending failed: ${error.message}`);
      throw error;
    }
  }

  parseSMSReport(message) {
    const parts = message.trim().toUpperCase().split(" ");
    if (parts.length < 2) {
      throw new Error("Invalid SMS format. Expected: [TYPE] [STATION_ID]");
    }

    const type = parts[0];
    const stationId = parts[1];

    if (!["VIOLENCE", "FRAUD", "SAFE"].includes(type)) {
      throw new Error("Invalid report type. Must be VIOLENCE, FRAUD, or SAFE");
    }

    return { type, stationId };
  }

  // ADD/UPDATE this method to parse SMS reports
  parseSMSReport(message) {
    // Convert message to lowercase for easier parsing
    const msg = message.toLowerCase().trim();

    // Initialize defaults
    let type = "incident"; // default type
    let stationId = null;

    // Extract station ID - look for patterns like "station 123", "st 123", "123"
    const stationPatterns = [
      /station\s+(\d+)/,
      /st\s+(\d+)/,
      /stn\s+(\d+)/,
      /^(\d+)/, // number at start
      /(\d+)$/, // number at end
    ];

    for (const pattern of stationPatterns) {
      const match = msg.match(pattern);
      if (match) {
        stationId = match[1];
        break;
      }
    }

    // Extract report type based on keywords
    const typeKeywords = {
      equipment: "equipment_failure",
      broken: "equipment_failure",
      malfunction: "equipment_failure",
      machine: "equipment_failure",
      queue: "queue_issue",
      line: "queue_issue",
      waiting: "queue_issue",
      crowd: "queue_issue",
      security: "security_concern",
      fight: "security_concern",
      violence: "security_concern",
      threat: "security_concern",
      access: "accessibility_issue",
      disabled: "accessibility_issue",
      wheelchair: "accessibility_issue",
      ramp: "accessibility_issue",
      incident: "incident",
      problem: "incident",
      issue: "incident",
      help: "other",
      other: "other",
    };

    // Check for type keywords in message
    for (const [keyword, reportType] of Object.entries(typeKeywords)) {
      if (msg.includes(keyword)) {
        type = reportType;
        break;
      }
    }

    // Log the parsing result
    console.log(
      `SMS Parsing: "${message}" -> Station: ${stationId}, Type: ${type}`
    );

    return { type, stationId };
  }
}

module.exports = new TwilioService();

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
}

module.exports = new TwilioService();

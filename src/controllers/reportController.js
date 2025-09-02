const supabase = require("../config/database");
const TwilioService = require("../config/twilio")
const logger = require("../utils/logger");

class ReportController {
  async handleSMS(req, res) {
    try {
      const { Body: message, From: phoneNumber } = req.body;

      logger.info(`Received SMS from ${phoneNumber}: ${message}`);

      const { type, stationId } = TwilioService.parseSMSReport(message);

      // Verify station exists
      const { data: station, error: stationError } = await supabase
        .from("voting_station")
        .select("id")
        .eq("id", stationId)
        .single();

      if (stationError || !station) {
        await TwilioService.sendSMS(phoneNumber, "Error: Station not found");
        return res.status(400).json({ error: "Station not found" });
      }

      // Save report
      const { data: report, error: reportError } = await supabase
        .from("report")
        .insert([
          {
            station_id: stationId,
            type: type,
          },
        ])
        .select()
        .single();

      if (reportError) throw reportError;

      // Send confirmation SMS
      await TwilioService.sendSMS(
        phoneNumber,
        `Report ${report.id} received for station ${stationId}. Type: ${type}`
      );

      res.json({
        message: "Report processed successfully",
        reportId: report.id,
      });
    } catch (error) {
      logger.error(`SMS processing failed: ${error.message}`);
      res.status(500).json({ error: "Failed to process SMS report" });
    }
  }

  async getByStation(req, res) {
    try {
      const { stationId } = req.params;

      const { data: reports, error } = await supabase
        .from("report")
        .select("*")
        .eq("station_id", stationId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      res.json({ reports });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch reports" });
    }
  }
}

module.exports = new ReportController();

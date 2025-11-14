const supabase = require("../config/database");
const TwilioService = require("../config/twilio")
const logger = require("../utils/logger");

class ReportController {
  // Add this method for getting all reports
  async getAllReports(req, res) {
    try {
      const { page = 1, limit = 100 } = req.query;
      const offset = (page - 1) * limit;

      const {
        data: reports,
        error,
        count,
      } = await supabase
        .from("report")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false })
        .range(offset, offset + parseInt(limit) - 1);

      if (error) throw error;

      res.json({
        reports: reports || [],
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: count || 0,
          totalPages: Math.ceil((count || 0) / parseInt(limit)),
        },
      });
    } catch (error) {
      logger.error(`Get all reports failed: ${error.message}`);
      res.status(500).json({ error: "Failed to fetch reports" });
    }
  }

  // Add this method for deleting reports
  async deleteReport(req, res) {
    try {
      const { reportId } = req.params;

      const { error } = await supabase
        .from("report")
        .delete()
        .eq("id", reportId);

      if (error) throw error;

      res.json({ message: "Report deleted successfully" });
    } catch (error) {
      logger.error(`Delete report failed: ${error.message}`);
      res.status(500).json({ error: "Failed to delete report" });
    }
  }

  // Add this method for creating test reports
  async createTestReport(req, res) {
    try {
      const { stationId, type = "incident" } = req.body;

      // Verify station exists
      const { data: station, error: stationError } = await supabase
        .from("voting_station")
        .select("id")
        .eq("id", stationId)
        .single();

      if (stationError || !station) {
        return res.status(400).json({ error: "Station not found" });
      }

      // Create test report
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

      res.json({
        message: "Test report created successfully",
        report,
      });
    } catch (error) {
      logger.error(`Create test report failed: ${error.message}`);
      res.status(500).json({ error: "Failed to create test report" });
    }
  }

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

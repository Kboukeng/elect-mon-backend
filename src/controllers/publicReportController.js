const supabase = require("../config/database");
const logger = require("../utils/logger");

class PublicReportController {
  // GET /api/reports/public - Returns public fraud reports
  async getPublicReports(req, res) {
    try {
      const { page = 1, limit = 1000 } = req.query;
      const offset = (page - 1) * limit;

      const {
        data: reports,
        error,
        count,
      } = await supabase
        .from("report")
        .select("id, station_id, type, created_at", { count: "exact" })
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
      logger.error(`Get public reports failed: ${error.message}`);
      res.status(500).json({ error: "Failed to fetch reports" });
    }
  }

  // POST /api/reports/public - Accepts fraud reports from public
  async createPublicReport(req, res) {
    try {
      const { station_id, type, message } = req.body;

      // Validate required fields
      if (!station_id || !type || !message) {
        return res.status(400).json({
          error:
            "Missing required fields: station_id, type, and message are required",
        });
      }

      // Validate message length
      if (message.length < 5 || message.length > 2000) {
        return res.status(400).json({
          error: "Message must be between 5 and 2000 characters",
        });
      }

      // Validate report type
      const validTypes = [
        "security_concern",
        "equipment_failure",
        "queue_issue",
        "accessibility_issue",
        "incident",
        "other",
      ];

      if (!validTypes.includes(type)) {
        return res.status(400).json({
          error: `Invalid report type. Must be one of: ${validTypes.join(
            ", "
          )}`,
        });
      }

      // Verify station exists
      const { data: station, error: stationError } = await supabase
        .from("voting_station")
        .select("id")
        .eq("id", station_id)
        .single();

      if (stationError || !station) {
        return res.status(400).json({ error: "Station not found" });
      }

      // Sanitize message (basic HTML escaping)
      const sanitizedMessage = message
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#x27;");

      // Create report
      const { data: report, error: reportError } = await supabase
        .from("report")
        .insert([
          {
            station_id: station_id,
            type: type,
            message: sanitizedMessage,
            status: "under_investigation",
          },
        ])
        .select("id, station_id, type, message, created_at")
        .single();

      if (reportError) throw reportError;

      logger.info(
        `Public report created: ${report.id} for station ${station_id}`
      );

      res.status(201).json({
        success: true,
        report: {
          id: report.id,
          station_id: report.station_id,
          type: report.type,
          message: report.message,
          created_at: report.created_at,
        },
      });
    } catch (error) {
      logger.error(`Create public report failed: ${error.message}`);
      res.status(500).json({ error: "Failed to create report" });
    }
  }
}

module.exports = new PublicReportController();

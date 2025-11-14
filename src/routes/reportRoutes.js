// BACKEND FIXES

// 1. UPDATE REPORT CONTROLLER (controllers/reportController.js)
// Add the missing methods to your existing reportController.js

const supabase = require("../config/database");
const TwilioService = require("../config/twilio");
const logger = require("../utils/logger");

class ReportController {
  // Your existing handleSMS method (keep as is)
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

  // ADD THIS METHOD - Get all reports (Super Admin)
  async getAllReports(req, res) {
    try {
      const { page = 1, limit = 100 } = req.query;
      const offset = (page - 1) * limit;

      const { data: reports, error, count } = await supabase
        .from("report")
        .select("*", { count: 'exact' })
        .order("created_at", { ascending: false })
        .range(offset, offset + parseInt(limit) - 1);

      if (error) throw error;

      res.json({
        reports: reports || [],
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: count || 0,
          totalPages: Math.ceil((count || 0) / parseInt(limit))
        }
      });
    } catch (error) {
      logger.error(`Get all reports failed: ${error.message}`);
      res.status(500).json({ error: "Failed to fetch reports" });
    }
  }

  // Your existing getByStation method (keep as is)
  async getByStation(req, res) {
    try {
      const { stationId } = req.params;

      const { data: reports, error } = await supabase
        .from("report")
        .select("*")
        .eq("station_id", stationId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      res.json({ reports: reports || [] });
    } catch (error) {
      logger.error(`Get station reports failed: ${error.message}`);
      res.status(500).json({ error: "Failed to fetch reports" });
    }
  }

  // ADD THIS METHOD - Delete report (Super Admin only)
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

  // ADD THIS METHOD - Test method to manually create a report
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
        report
      });
    } catch (error) {
      logger.error(`Create test report failed: ${error.message}`);
      res.status(500).json({ error: "Failed to create test report" });
    }
  }
}

module.exports = new ReportController();

// 2. UPDATE REPORT ROUTES (routes/reportRoutes.js)
const express = require("express");
const reportController = require("../controllers/reportController");
const { authenticateToken } = require("../middlewares/auth");

const router = express.Router();

// SMS endpoint (no auth needed for Twilio webhook)
router.post("/sms", reportController.handleSMS);

// GET all reports - Super Admin only
router.get("/", 
  authenticateToken, 
  (req, res, next) => {
    if (req.user.role !== 'super_admin') {
      return res.status(403).json({ error: "Access denied" });
    }
    next();
  },
  reportController.getAllReports
);

// GET reports by station - Admin and Super Admin
router.get("/station/:stationId",
  authenticateToken,
  reportController.getByStation
);

// DELETE report - Super Admin only
router.delete("/:reportId",
  authenticateToken,
  (req, res, next) => {
    if (req.user.role !== 'super_admin') {
      return res.status(403).json({ error: "Access denied" });
    }
    next();
  },
  reportController.deleteReport
);

// Test route to create sample reports (remove in production)
router.post("/test",
  authenticateToken,
  reportController.createTestReport
);

module.exports = router;




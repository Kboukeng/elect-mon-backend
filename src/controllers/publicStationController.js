const supabase = require("../config/database");
const logger = require("../utils/logger");

class PublicStationController {
  // GET /api/stations - Returns all stations with status
  async getAllStations(req, res) {
    try {
      const { data: stations, error } = await supabase
        .from("voting_station")
        .select("id, name, location, status")
        .order("name", { ascending: true });

      if (error) throw error;

      // Ensure all stations have a status field (default to 'active' if not set)
      const stationsWithStatus = stations.map((station) => ({
        ...station,
        region: station.region || "Unknown", // Add region field with default
        status: station.status || "active",
      }));

      res.json({ stations: stationsWithStatus });
    } catch (error) {
      logger.error(`Get public stations failed: ${error.message}`);
      res.status(500).json({ error: "Failed to fetch stations" });
    }
  }
}

module.exports = new PublicStationController();

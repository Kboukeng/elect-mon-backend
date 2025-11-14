const supabase = require("../config/database");
const logger = require("../utils/logger");

class PublicVoterController {
  // GET /api/voters/public - Returns voter data for fraud dashboard
  async getPublicVoters(req, res) {
    try {
      const { data: voters, error } = await supabase
        .from("voter")
        .select("id, station_id, has_voted")
        .order("station_id", { ascending: true });

      if (error) throw error;

      // Transform data to match expected format
      const transformedVoters = voters.map((voter) => ({
        id: voter.id,
        station_id: voter.station_id,
        has_voted: voter.has_voted,
        // Alternative field names for compatibility
        hasVoted: voter.has_voted,
        voted: voter.has_voted,
        status: voter.has_voted ? "voted" : "not_voted",
      }));

      res.json({ voters: transformedVoters });
    } catch (error) {
      logger.error(`Get public voters failed: ${error.message}`);
      res.status(500).json({ error: "Failed to fetch voter data" });
    }
  }
}

module.exports = new PublicVoterController();

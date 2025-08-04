const supabase = require("../config/supabase");
const { auditLog } = require("../utils/auditLogger");

class ResultController {
  async submit(req, res) {
    try {
      const { stationId, candidateAVotes, candidateBVotes } = req.body;

      // Get voter count for fraud detection
      const { count: voterCount, error: voterError } = await supabase
        .from("voter")
        .select("*", { count: "exact", head: true })
        .eq("station_id", stationId);

      if (voterError) throw voterError;

      const totalVotes = candidateAVotes + candidateBVotes;
      const isFraudulent = totalVotes > voterCount;

      const { data: result, error } = await supabase
        .from("result")
        .insert([
          {
            station_id: stationId,
            candidate_a_votes: candidateAVotes,
            candidate_b_votes: candidateBVotes,
          },
        ])
        .select()
        .single();

      if (error) throw error;

      // Auto-report fraud if detected
      if (isFraudulent) {
        await supabase.from("report").insert([
          {
            station_id: stationId,
            type: "FRAUD",
          },
        ]);
      }

      await auditLog("CREATE", "result", result.id);

      res.status(201).json({
        message: "Results submitted successfully",
        result,
        warning: isFraudulent
          ? "Potential fraud detected: votes exceed registered voters"
          : null,
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to submit results" });
    }
  }

  async getPublic(req, res) {
    try {
      const { data: results, error } = await supabase
        .from("result")
        .select(
          `
          *,
          voting_station (
            name,
            location
          )
        `
        )
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Calculate totals
      const totals = results.reduce(
        (acc, result) => {
          acc.candidateA += result.candidate_a_votes;
          acc.candidateB += result.candidate_b_votes;
          return acc;
        },
        { candidateA: 0, candidateB: 0 }
      );

      res.json({ results, totals });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch results" });
    }
  }
}

module.exports = new ResultController();

const supabase = require("../config/supabase");
const csv = require("csv-parser");
const fs = require("fs");

class VoterController {
  async verify(req, res) {
    try {
      const { voterId } = req.body;

      const { data: voter, error } = await supabase
        .from("voter")
        .select("*, voting_station(name, location)")
        .eq("id", voterId)
        .single();

      if (error || !voter) {
        return res.status(404).json({ error: "Voter not found" });
      }

      res.json({
        eligible: true,
        voter: {
          id: voter.id,
          name: voter.name,
          hasVoted: voter.has_voted,
          station: voter.voting_station,
        },
      });
    } catch (error) {
      res.status(500).json({ error: "Verification failed" });
    }
  }

  async getByStation(req, res) {
    try {
      const { station } = req.query;

      const { data: voters, error } = await supabase
        .from("voter")
        .select("*")
        .eq("station_id", station)
        .order("name");

      if (error) throw error;

      res.json({ voters });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch voters" });
    }
  }

  async importCSV(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "CSV file required" });
      }

      const voters = [];

      fs.createReadStream(req.file.path)
        .pipe(csv())
        .on("data", (row) => {
          voters.push({
            name: row.name,
            station_id: row.station_id,
          });
        })
        .on("end", async () => {
          try {
            const { data, error } = await supabase
              .from("voter")
              .insert(voters)
              .select();

            if (error) throw error;

            fs.unlinkSync(req.file.path);

            res.json({
              message: `${data.length} voters imported successfully`,
              voters: data,
            });
          } catch (error) {
            res.status(500).json({ error: "Failed to import voters" });
          }
        });
    } catch (error) {
      res.status(500).json({ error: "Import failed" });
    }
  }
}

module.exports = new VoterController();

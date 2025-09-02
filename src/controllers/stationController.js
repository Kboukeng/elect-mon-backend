const supabase = require("../config/database");
const csv = require("csv-parser");
const fs = require("fs");
const { auditLog } = require("../utils/auditLogger");

class StationController {
  async create(req, res) {
    try {
      const { name, location } = req.body;

      const { data: station, error } = await supabase
        .from("voting_station")
        .insert([{ name, location }])
        .select()
        .single();

      if (error) throw error;

      await auditLog("CREATE", "voting_station", station.id);

      res.status(201).json({
        message: "Station created successfully",
        station,
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to create station" });
    }
  }

  async getAll(req, res) {
    try {
      const { data: stations, error } = await supabase
        .from("voting_station")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      res.json({ stations });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch stations" });
    }
  }

  async getById(req, res) {
    try {
      const { id } = req.params;

      const { data: station, error } = await supabase
        .from("voting_station")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;

      res.json({ station });
    } catch (error) {
      res.status(404).json({ error: "Station not found" });
    }
  }

  async update(req, res) {
    try {
      const { id } = req.params;
      const { name, location } = req.body;

      const { data: station, error } = await supabase
        .from("voting_station")
        .update({ name, location })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;

      await auditLog("UPDATE", "voting_station", id);

      res.json({
        message: "Station updated successfully",
        station,
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to update station" });
    }
  }

  async delete(req, res) {
    try {
      const { id } = req.params;

      const { error } = await supabase
        .from("voting_station")
        .delete()
        .eq("id", id);

      if (error) throw error;

      await auditLog("DELETE", "voting_station", id);

      res.json({ message: "Station deleted successfully" });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete station" });
    }
  }

  async importCSV(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "CSV file required" });
      }

      const stations = [];

      fs.createReadStream(req.file.path)
        .pipe(csv())
        .on("data", (row) => {
          stations.push({
            name: row.name,
            location: row.location,
          });
        })
        .on("end", async () => {
          try {
            const { data, error } = await supabase
              .from("voting_station")
              .insert(stations)
              .select();

            if (error) throw error;

            // Clean up uploaded file
            fs.unlinkSync(req.file.path);

            res.json({
              message: `${data.length} stations imported successfully`,
              stations: data,
            });
          } catch (error) {
            res.status(500).json({ error: "Failed to import stations" });
          }
        });
    } catch (error) {
      res.status(500).json({ error: "Import failed" });
    }
  }
}

module.exports = new StationController();

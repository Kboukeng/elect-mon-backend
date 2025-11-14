const supabase = require("../config/database");
const csv = require("csv-parser");
const fs = require("fs");
const path = require("path");
const xlsx = require("xlsx");
const pdfParse = require("pdf-parse");
const mammoth = require("mammoth");
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

  // Enhanced method to handle multiple file formats
  async importFile(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "File required" });
      }

      const filePath = req.file.path;
      const fileExtension = path.extname(req.file.originalname).toLowerCase();
      let stations = [];

      try {
        switch (fileExtension) {
          case ".csv":
            stations = await this.processCSV(filePath);
            break;
          case ".xlsx":
          case ".xls":
            stations = await this.processExcel(filePath);
            break;
          case ".pdf":
            stations = await this.processPDF(filePath);
            break;
          case ".docx":
          case ".doc":
            stations = await this.processWord(filePath);
            break;
          default:
            throw new Error(`Unsupported file format: ${fileExtension}`);
        }

        if (stations.length === 0) {
          throw new Error("No valid station data found in the file");
        }

        // Validate station data
        const validStations = this.validateStationData(stations);

        if (validStations.length === 0) {
          throw new Error(
            "No valid stations found. Please check your data format."
          );
        }

        // Insert stations into database
        const { data, error } = await supabase
          .from("voting_station")
          .insert(validStations)
          .select();

        if (error) throw error;

        // Log audit trail
        for (const station of data) {
          await auditLog("IMPORT", "voting_station", station.id);
        }

        res.json({
          message: `${data.length} stations imported successfully`,
          stations: data,
          skipped: stations.length - validStations.length,
        });
      } catch (processingError) {
        throw processingError;
      } finally {
        // Clean up uploaded file
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }
    } catch (error) {
      res.status(500).json({
        error: error.message || "Import failed",
        details: error.stack,
      });
    }
  }

  // Process CSV files
  async processCSV(filePath) {
    return new Promise((resolve, reject) => {
      const stations = [];

      fs.createReadStream(filePath)
        .pipe(csv())
        .on("data", (row) => {
          stations.push({
            name: row.name || row.Name || row.station_name,
            location: row.location || row.Location || row.address,
          });
        })
        .on("end", () => {
          resolve(stations);
        })
        .on("error", (error) => {
          reject(new Error(`CSV processing error: ${error.message}`));
        });
    });
  }

  // Process Excel files (.xlsx, .xls)
  async processExcel(filePath) {
    try {
      const workbook = xlsx.readFile(filePath);
      const sheetName = workbook.SheetNames[0]; // Use first sheet
      const worksheet = workbook.Sheets[sheetName];
      const data = xlsx.utils.sheet_to_json(worksheet);

      return data.map((row) => ({
        name: row.name || row.Name || row.station_name || row["Station Name"],
        location:
          row.location ||
          row.Location ||
          row.address ||
          row["Address"] ||
          row["Location"],
      }));
    } catch (error) {
      throw new Error(`Excel processing error: ${error.message}`);
    }
  }

  // Process PDF files
  async processPDF(filePath) {
    try {
      const dataBuffer = fs.readFileSync(filePath);
      const data = await pdfParse(dataBuffer);

      // Extract text and parse for station data
      const text = data.text;
      const stations = this.parseTextForStations(text);

      return stations;
    } catch (error) {
      throw new Error(`PDF processing error: ${error.message}`);
    }
  }

  // Process Word documents (.docx)
  async processWord(filePath) {
    try {
      const result = await mammoth.extractRawText({ path: filePath });
      const text = result.value;

      // Extract station data from text
      const stations = this.parseTextForStations(text);

      return stations;
    } catch (error) {
      throw new Error(`Word document processing error: ${error.message}`);
    }
  }

  // Parse text content for station information
  parseTextForStations(text) {
    const stations = [];
    const lines = text.split("\n").filter((line) => line.trim());

    // Simple pattern matching for station data
    // Expecting format: "Station Name - Location" or "Station Name, Location"
    const stationPattern = /^(.+?)[-,]\s*(.+)$/;

    for (const line of lines) {
      const match = line.trim().match(stationPattern);
      if (match) {
        const [, name, location] = match;
        if (name && location) {
          stations.push({
            name: name.trim(),
            location: location.trim(),
          });
        }
      } else {
        // Try to extract using common keywords
        const lowerLine = line.toLowerCase();
        if (lowerLine.includes("station") || lowerLine.includes("polling")) {
          // Extract potential station data
          const parts = line.split(/[,;|]/);
          if (parts.length >= 2) {
            stations.push({
              name: parts[0].trim(),
              location: parts[1].trim(),
            });
          }
        }
      }
    }

    return stations;
  }

  // Validate station data
  validateStationData(stations) {
    return stations.filter((station) => {
      return (
        station.name &&
        station.location &&
        station.name.trim() !== "" &&
        station.location.trim() !== "" &&
        station.name.length <= 255 &&
        station.location.length <= 500
      );
    });
  }

  // Legacy CSV import method (kept for backward compatibility)
  async importCSV(req, res) {
    return this.importFile(req, res);
  }
}

module.exports = new StationController();

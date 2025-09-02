const supabase = require("../config/database");
const csv = require("csv-parser");
const fs = require("fs");
const multer = require("multer");
const mammoth = require("mammoth"); // For Word documents
const pdf = require("pdf-parse"); // For PDF documents
const logger = require("../utils/logger");
const { auditLog } = require("../utils/auditLogger");

class VoterController {
  // Verify voter eligibility and voting status
  async verify(req, res) {
    try {
      const { voterId, registrationNumber } = req.body;

      // Search by voter ID or registration number
      let query = supabase
        .from("voter")
        .select("*, voting_station(name, location)")
        .single();

      if (voterId) {
        query = query.eq("id", voterId);
      } else if (registrationNumber) {
        query = query.eq("registration_number", registrationNumber);
      } else {
        return res.status(400).json({
          error: "Either voterId or registrationNumber is required",
        });
      }

      const { data: voter, error } = await query;

      if (error || !voter) {
        return res.status(404).json({ error: "Voter not found" });
      }

      res.json({
        eligible: true,
        voter: {
          id: voter.id,
          name: voter.name,
          registrationNumber: voter.registration_number,
          hasVoted: voter.has_voted,
          station: voter.voting_station,
          canVote: !voter.has_voted,
        },
      });
    } catch (error) {
      logger.error(`Voter verification failed: ${error.message}`);
      res.status(500).json({ error: "Verification failed" });
    }
  }

  // Mark voter as voted
  async markAsVoted(req, res) {
    try {
      const { voterId, registrationNumber } = req.body;
      const userStation = req.user.stationId;

      // Find voter by ID or registration number
      let searchQuery = supabase.from("voter").select("*");

      if (voterId) {
        searchQuery = searchQuery.eq("id", voterId);
      } else if (registrationNumber) {
        searchQuery = searchQuery.eq("registration_number", registrationNumber);
      } else {
        return res.status(400).json({
          error: "Either voterId or registrationNumber is required",
        });
      }

      const { data: voter, error: findError } = await searchQuery.single();

      if (findError || !voter) {
        return res.status(404).json({ error: "Voter not found" });
      }

      // Check if voter already voted
      if (voter.has_voted) {
        return res.status(400).json({
          error: "Voter has already voted",
          votedAt: voter.voted_at || "Unknown time",
        });
      }

      // Check if voter belongs to the correct station
      if (voter.station_id !== userStation) {
        return res.status(400).json({
          error: `Voter is registered at station ${voter.station_id}, not ${userStation}`,
        });
      }

      // Mark as voted
      const { data: updatedVoter, error: updateError } = await supabase
        .from("voter")
        .update({
          has_voted: true,
          voted_at: new Date().toISOString(),
        })
        .eq("id", voter.id)
        .select()
        .single();

      if (updateError) throw updateError;

      await auditLog("VOTE", "voter", voter.id);

      res.json({
        message: "Voter marked as voted successfully",
        voter: {
          id: updatedVoter.id,
          name: updatedVoter.name,
          registrationNumber: updatedVoter.registration_number,
          hasVoted: updatedVoter.has_voted,
          votedAt: updatedVoter.voted_at,
        },
      });
    } catch (error) {
      logger.error(`Mark as voted failed: ${error.message}`);
      res.status(500).json({ error: "Failed to mark voter as voted" });
    }
  }

  // Get all voters (admin only)
  async getAllVoters(req, res) {
    try {
      const { page = 1, limit = 50, station, hasVoted } = req.query;
      const offset = (page - 1) * limit;

      let query = supabase
        .from("voter")
        .select("*, voting_station(name, location)", { count: "exact" })
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1);

      // Filter by station if provided
      if (station) {
        query = query.eq("station_id", station);
      }

      // Filter by voting status if provided
      if (hasVoted !== undefined) {
        query = query.eq("has_voted", hasVoted === "true");
      }

      const { data: voters, error, count } = await query;

      if (error) throw error;

      res.json({
        voters,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(count / limit),
        },
      });
    } catch (error) {
      logger.error(`Get all voters failed: ${error.message}`);
      res.status(500).json({ error: "Failed to fetch voters" });
    }
  }

  // Get voters by station
  async getByStation(req, res) {
    try {
      const { station } = req.query;
      const userStation = req.user.stationId;

      // Use provided station or user's station
      const targetStation = station || userStation;

      if (!targetStation) {
        return res.status(400).json({ error: "Station ID is required" });
      }

      // Only allow users to see voters from their own station (unless super_admin)
      if (req.user.role !== "super_admin" && targetStation !== userStation) {
        return res.status(403).json({
          error: "You can only view voters from your assigned station",
        });
      }

      const { data: voters, error } = await supabase
        .from("voter")
        .select("*")
        .eq("station_id", targetStation)
        .order("name");

      if (error) throw error;

      // Get voting statistics
      const totalVoters = voters.length;
      const votedCount = voters.filter((v) => v.has_voted).length;
      const remainingCount = totalVoters - votedCount;

      res.json({
        voters,
        statistics: {
          total: totalVoters,
          voted: votedCount,
          remaining: remainingCount,
          turnoutPercentage:
            totalVoters > 0 ? ((votedCount / totalVoters) * 100).toFixed(2) : 0,
        },
      });
    } catch (error) {
      logger.error(`Get voters by station failed: ${error.message}`);
      res.status(500).json({ error: "Failed to fetch voters" });
    }
  }

  // Get voter by ID
  async getVoterById(req, res) {
    try {
      const { id } = req.params;

      const { data: voter, error } = await supabase
        .from("voter")
        .select("*, voting_station(name, location)")
        .eq("id", id)
        .single();

      if (error || !voter) {
        return res.status(404).json({ error: "Voter not found" });
      }

      res.json({ voter });
    } catch (error) {
      logger.error(`Get voter by ID failed: ${error.message}`);
      res.status(500).json({ error: "Failed to fetch voter" });
    }
  }

  // Create new voter (admin only)
  async createVoter(req, res) {
    try {
      const { name, stationId, registrationNumber } = req.body;

      // Check if registration number already exists
      const { data: existingVoter } = await supabase
        .from("voter")
        .select("id")
        .eq("registration_number", registrationNumber)
        .single();

      if (existingVoter) {
        return res.status(409).json({
          error: "Voter with this registration number already exists",
        });
      }

      const { data: voter, error } = await supabase
        .from("voter")
        .insert([
          {
            name,
            station_id: stationId,
            registration_number: registrationNumber,
            has_voted: false,
          },
        ])
        .select("*, voting_station(name, location)")
        .single();

      if (error) throw error;

      await auditLog("CREATE", "voter", voter.id);

      res.status(201).json({
        message: "Voter created successfully",
        voter,
      });
    } catch (error) {
      logger.error(`Create voter failed: ${error.message}`);
      res.status(500).json({ error: "Failed to create voter" });
    }
  }

  // Update voter (admin only)
  async updateVoter(req, res) {
    try {
      const { id } = req.params;
      const { name, stationId, registrationNumber } = req.body;

      // Check if new registration number conflicts with existing ones
      if (registrationNumber) {
        const { data: existingVoter } = await supabase
          .from("voter")
          .select("id")
          .eq("registration_number", registrationNumber)
          .neq("id", id)
          .single();

        if (existingVoter) {
          return res.status(409).json({
            error: "Another voter with this registration number already exists",
          });
        }
      }

      const { data: voter, error } = await supabase
        .from("voter")
        .update({
          name,
          station_id: stationId,
          registration_number: registrationNumber,
        })
        .eq("id", id)
        .select("*, voting_station(name, location)")
        .single();

      if (error || !voter) {
        return res.status(404).json({ error: "Voter not found" });
      }

      await auditLog("UPDATE", "voter", id);

      res.json({
        message: "Voter updated successfully",
        voter,
      });
    } catch (error) {
      logger.error(`Update voter failed: ${error.message}`);
      res.status(500).json({ error: "Failed to update voter" });
    }
  }

  // Delete voter (super admin only)
  async deleteVoter(req, res) {
    try {
      const { id } = req.params;

      const { error } = await supabase.from("voter").delete().eq("id", id);

      if (error) {
        return res.status(404).json({ error: "Voter not found" });
      }

      await auditLog("DELETE", "voter", id);

      res.json({ message: "Voter deleted successfully" });
    } catch (error) {
      logger.error(`Delete voter failed: ${error.message}`);
      res.status(500).json({ error: "Failed to delete voter" });
    }
  }

  // Import voters from CSV
  async importCSV(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "CSV file required" });
      }

      const voters = [];
      const errors = [];

      fs.createReadStream(req.file.path)
        .pipe(csv())
        .on("data", (row) => {
          // Validate required fields
          if (!row.name || !row.station_id || !row.registration_number) {
            errors.push(
              `Missing required fields for row: ${JSON.stringify(row)}`
            );
            return;
          }

          voters.push({
            name: row.name.trim(),
            station_id: row.station_id.trim(),
            registration_number: row.registration_number.trim(),
            has_voted: false,
          });
        })
        .on("end", async () => {
          try {
            if (errors.length > 0) {
              fs.unlinkSync(req.file.path);
              return res.status(400).json({
                error: "CSV validation errors",
                details: errors,
              });
            }

            // Check for duplicate registration numbers in the import
            const regNumbers = voters.map((v) => v.registration_number);
            const duplicates = regNumbers.filter(
              (item, index) => regNumbers.indexOf(item) !== index
            );

            if (duplicates.length > 0) {
              fs.unlinkSync(req.file.path);
              return res.status(400).json({
                error: "Duplicate registration numbers in CSV",
                duplicates: [...new Set(duplicates)],
              });
            }

            // Insert voters
            const { data, error } = await supabase
              .from("voter")
              .insert(voters)
              .select();

            if (error) throw error;

            fs.unlinkSync(req.file.path);

            await auditLog(
              "BULK_CREATE",
              "voter",
              `imported_${data.length}_voters`
            );

            res.json({
              message: `${data.length} voters imported successfully`,
              imported: data.length,
              voters: data,
            });
          } catch (error) {
            fs.unlinkSync(req.file.path);
            logger.error(`CSV import failed: ${error.message}`);

            if (error.code === "23505") {
              res.status(409).json({
                error:
                  "Some registration numbers already exist in the database",
              });
            } else {
              res.status(500).json({ error: "Failed to import voters" });
            }
          }
        })
        .on("error", (error) => {
          fs.unlinkSync(req.file.path);
          logger.error(`CSV parsing failed: ${error.message}`);
          res.status(500).json({ error: "Failed to parse CSV file" });
        });
    } catch (error) {
      logger.error(`Import CSV failed: ${error.message}`);
      res.status(500).json({ error: "Import failed" });
    }
  }

  // Import voters from PDF (basic implementation)
  async importPDF(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "PDF file required" });
      }

      const dataBuffer = fs.readFileSync(req.file.path);
      const pdfData = await pdf(dataBuffer);
      const text = pdfData.text;

      // Basic parsing - you may need to adjust based on PDF format
      const lines = text.split("\n").filter((line) => line.trim().length > 0);
      const voters = [];

      // Assuming PDF format: Name, Registration Number, Station ID per line
      for (const line of lines) {
        const parts = line.split(",").map((part) => part.trim());
        if (parts.length >= 3) {
          voters.push({
            name: parts[0],
            registration_number: parts[1],
            station_id: parts[2],
            has_voted: false,
          });
        }
      }

      if (voters.length === 0) {
        fs.unlinkSync(req.file.path);
        return res.status(400).json({
          error: "No valid voter data found in PDF",
        });
      }

      const { data, error } = await supabase
        .from("voter")
        .insert(voters)
        .select();

      if (error) throw error;

      fs.unlinkSync(req.file.path);

      await auditLog(
        "BULK_CREATE",
        "voter",
        `imported_${data.length}_voters_from_pdf`
      );

      res.json({
        message: `${data.length} voters imported from PDF successfully`,
        imported: data.length,
        voters: data,
      });
    } catch (error) {
      if (req.file) fs.unlinkSync(req.file.path);
      logger.error(`PDF import failed: ${error.message}`);
      res.status(500).json({ error: "Failed to import voters from PDF" });
    }
  }

  // Get voting statistics
  async getVotingStats(req, res) {
    try {
      const { stationId } = req.query;
      const userStation = req.user.stationId;

      let query = supabase.from("voter").select("station_id, has_voted");

      // Filter by station if provided and authorized
      if (stationId) {
        if (req.user.role !== "super_admin" && stationId !== userStation) {
          return res.status(403).json({
            error: "You can only view statistics for your assigned station",
          });
        }
        query = query.eq("station_id", stationId);
      } else if (req.user.role !== "super_admin") {
        query = query.eq("station_id", userStation);
      }

      const { data: voters, error } = await query;

      if (error) throw error;

      // Calculate statistics
      const stats = {
        totalVoters: voters.length,
        votedCount: voters.filter((v) => v.has_voted).length,
        remainingCount: voters.filter((v) => !v.has_voted).length,
      };

      stats.turnoutPercentage =
        stats.totalVoters > 0
          ? ((stats.votedCount / stats.totalVoters) * 100).toFixed(2)
          : 0;

      // If super admin, provide station-wise breakdown
      if (req.user.role === "super_admin" && !stationId) {
        const stationStats = {};
        voters.forEach((voter) => {
          if (!stationStats[voter.station_id]) {
            stationStats[voter.station_id] = { total: 0, voted: 0 };
          }
          stationStats[voter.station_id].total++;
          if (voter.has_voted) {
            stationStats[voter.station_id].voted++;
          }
        });

        // Add turnout percentage for each station
        Object.keys(stationStats).forEach((station) => {
          const st = stationStats[station];
          st.remaining = st.total - st.voted;
          st.turnoutPercentage =
            st.total > 0 ? ((st.voted / st.total) * 100).toFixed(2) : 0;
        });

        stats.byStation = stationStats;
      }

      res.json({ statistics: stats });
    } catch (error) {
      logger.error(`Get voting stats failed: ${error.message}`);
      res.status(500).json({ error: "Failed to fetch voting statistics" });
    }
  }
}

module.exports = new VoterController();

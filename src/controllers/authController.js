const supabase = require("../config/database");
const logger = require("../utils/logger");
const { auditLog } = require("../utils/auditLogger");
const fs = require("fs");
const path = require("path");
const xlsx = require("xlsx");
const pdfParse = require("pdf-parse");
const mammoth = require("mammoth");
const csv = require("csv-parser");

class AuthController {
  async register(req, res) {
    try {
      const { name, email, password, role, stationId } = req.body;

      // Create user in Supabase Auth
      const { data: authData, error: authError } =
        await supabase.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
        });

      if (authError) throw authError;

      // Create staff record
      const { data: staff, error: staffError } = await supabase
        .from("staff")
        .insert([
          {
            name,
            email,
            role,
            station_id: stationId,
            auth_id: authData.user.id, // Store Supabase Auth ID
          },
        ])
        .select()
        .single();

      if (staffError) {
        // If staff creation fails, cleanup auth user
        await supabase.auth.admin.deleteUser(authData.user.id);
        throw staffError;
      }

      await auditLog("CREATE", "staff", staff.id);

      res.status(201).json({
        message: "User registered successfully",
        user: { id: staff.id, name, email, role },
      });
    } catch (error) {
      logger.error(`Registration failed: ${error.message}`);
      res.status(500).json({ error: "Registration failed" });
    }
  }

  async login(req, res) {
    try {
      const { email, password } = req.body;

      // First, check if user exists in staff table
      const { data: staff, error: staffError } = await supabase
        .from("staff")
        .select("id, role, station_id, name")
        .eq("email", email)
        .single();

      if (staffError || !staff) {
        logger.error(`User not found in staff records: ${email}`);
        return res.status(401).json({ error: "Invalid credentials" });
      }

      // Then authenticate with Supabase Auth
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        logger.error(`Supabase auth failed: ${error.message}`);
        return res.status(401).json({ error: "Invalid credentials" });
      }

      res.json({
        message: "Login successful",
        token: data.session.access_token,
        user: {
          email: data.user.email,
          role: staff.role,
          stationId: staff.station_id,
          name: staff.name,
        },
      });
    } catch (error) {
      logger.error(`Login failed: ${error.message}`);
      res.status(401).json({ error: "Invalid credentials" });
    }
  }

  async logout(req, res) {
    try {
      await supabase.auth.signOut();
      res.json({ message: "Logout successful" });
    } catch (error) {
      logger.error(`Logout failed: ${error.message}`);
      res.status(500).json({ error: "Logout failed" });
    }
  }

  async getProfile(req, res) {
    try {
      const { data: user, error } = await supabase
        .from("staff")
        .select("*")
        .eq("email", req.user.email)
        .single();

      if (error) throw error;

      res.json({ user });
    } catch (error) {
      logger.error(`Get profile failed: ${error.message}`);
      res.status(500).json({ error: "Failed to fetch profile" });
    }
  }

  async getUsers(req, res) {
    try {
      const { data: users, error } = await supabase
        .from("staff")
        .select("id, name, email, role, station_id, created_at");

      if (error) throw error;

      res.json({ users });
    } catch (error) {
      logger.error(`Get users failed: ${error.message}`);
      res.status(500).json({ error: "Failed to fetch users" });
    }
  }

  async getUserById(req, res) {
    try {
      const { id } = req.params;

      const { data: user, error } = await supabase
        .from("staff")
        .select("*")
        .eq("id", id)
        .single();

      if (error || !user) {
        return res.status(404).json({ error: "User not found" });
      }

      res.json({ user });
    } catch (error) {
      logger.error(`Get user by ID failed: ${error.message}`);
      res.status(500).json({ error: "Failed to fetch user" });
    }
  }

  async updateUser(req, res) {
    try {
      const { id } = req.params;
      const { name, email, role, stationId } = req.body;

      // First get the current user to get auth_id
      const { data: currentUser, error: getUserError } = await supabase
        .from("staff")
        .select("auth_id, email")
        .eq("id", id)
        .single();

      if (getUserError || !currentUser) {
        return res.status(404).json({ error: "User not found" });
      }

      // Update in Supabase Auth if email changed
      if (email && email !== currentUser.email) {
        const { error: authUpdateError } =
          await supabase.auth.admin.updateUserById(currentUser.auth_id, {
            email,
          });
        if (authUpdateError) throw authUpdateError;
      }

      // Update staff record
      const { data: user, error } = await supabase
        .from("staff")
        .update({ name, email, role, station_id: stationId })
        .eq("id", id)
        .select()
        .single();

      if (error || !user) {
        return res.status(404).json({ error: "User not found" });
      }

      await auditLog("UPDATE", "staff", id);

      res.json({ message: "User updated successfully", user });
    } catch (error) {
      logger.error(`Update user failed: ${error.message}`);
      res.status(500).json({ error: "Failed to update user" });
    }
  }

  async changePassword(req, res) {
    try {
      const { id } = req.params;
      const { password } = req.body;

      // Get the user's auth_id
      const { data: staff, error: staffError } = await supabase
        .from("staff")
        .select("auth_id")
        .eq("id", id)
        .single();

      if (staffError || !staff) {
        return res.status(404).json({ error: "User not found" });
      }

      // Update password in Supabase Auth
      const { error: authError } = await supabase.auth.admin.updateUserById(
        staff.auth_id,
        { password }
      );

      if (authError) throw authError;

      await auditLog("UPDATE", "staff", id);

      res.json({ message: "Password updated successfully" });
    } catch (error) {
      logger.error(`Change password failed: ${error.message}`);
      res.status(500).json({ error: "Failed to update password" });
    }
  }

  async deleteUser(req, res) {
    try {
      const { id } = req.params;

      // First get the auth_id
      const { data: staff, error: getError } = await supabase
        .from("staff")
        .select("auth_id")
        .eq("id", id)
        .single();

      if (getError || !staff) {
        return res.status(404).json({ error: "User not found" });
      }

      // Delete from staff table
      const { error: deleteError } = await supabase
        .from("staff")
        .delete()
        .eq("id", id);

      if (deleteError) throw deleteError;

      // Delete from Supabase Auth
      if (staff.auth_id) {
        await supabase.auth.admin.deleteUser(staff.auth_id);
      }

      await auditLog("DELETE", "staff", id);

      res.json({ message: "User deleted successfully" });
    } catch (error) {
      logger.error(`Delete user failed: ${error.message}`);
      res.status(500).json({ error: "Failed to delete user" });
    }
  }

  // Add this method to the existing AuthController class

async importUsers(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "File required" });
    }

    const filePath = req.file.path;
    const fileExtension = path.extname(req.file.originalname).toLowerCase();
    const { stationId } = req.body; // Optional station ID from form
    
    let users = [];

    try {
      switch (fileExtension) {
        case '.csv':
          users = await this.processUserCSV(filePath);
          break;
        case '.xlsx':
        case '.xls':
          users = await this.processUserExcel(filePath);
          break;
        case '.pdf':
          users = await this.processUserPDF(filePath);
          break;
        case '.docx':
        case '.doc':
          users = await this.processUserWord(filePath);
          break;
        default:
          throw new Error(`Unsupported file format: ${fileExtension}`);
      }

      if (users.length === 0) {
        throw new Error("No valid user data found in the file");
      }

      // Validate and process users
      const validUsers = this.validateUserImportData(users, stationId);

      if (validUsers.length === 0) {
        throw new Error("No valid users found. Please check your data format.");
      }

      // Create users in batch
      const createdUsers = [];
      const errors = [];

      for (const userData of validUsers) {
        try {
          // Create user in Supabase Auth
          const { data: authData, error: authError } = await supabase.auth.admin.createUser({
            email: userData.email,
            password: userData.password,
            email_confirm: true,
          });

          if (authError) {
            errors.push(`Failed to create auth for ${userData.email}: ${authError.message}`);
            continue;
          }

          // Create staff record
          const { data: staff, error: staffError } = await supabase
            .from("staff")
            .insert([
              {
                name: userData.name,
                email: userData.email,
                role: userData.role,
                station_id: userData.stationId,
                auth_id: authData.user.id,
              },
            ])
            .select()
            .single();

          if (staffError) {
            // Cleanup auth user if staff creation fails
            await supabase.auth.admin.deleteUser(authData.user.id);
            errors.push(`Failed to create staff record for ${userData.email}: ${staffError.message}`);
            continue;
          }

          createdUsers.push(staff);
          await auditLog("IMPORT", "staff", staff.id);

        } catch (error) {
          errors.push(`Error creating user ${userData.email}: ${error.message}`);
        }
      }

      res.json({
        message: `${createdUsers.length} users imported successfully`,
        users: createdUsers,
        skipped: users.length - createdUsers.length,
        errors: errors.length > 0 ? errors : undefined,
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
    logger.error(`User import failed: ${error.message}`);
    res.status(500).json({ 
      error: error.message || "Import failed",
      details: error.stack
    });
  }
}

// Process CSV files for user import
async processUserCSV(filePath) {
  return new Promise((resolve, reject) => {
    const users = [];
    
    fs.createReadStream(filePath)
      .pipe(csv())
      .on("data", (row) => {
        users.push({
          name: row.name || row.Name || row.full_name || row['Full Name'],
          email: row.email || row.Email || row['Email Address'],
          password: row.password || row.Password || this.generateRandomPassword(),
          role: row.role || row.Role || 'worker',
          stationId: row.station_id || row.stationId || row['Station ID'] || row.station,
        });
      })
      .on("end", () => {
        resolve(users);
      })
      .on("error", (error) => {
        reject(new Error(`CSV processing error: ${error.message}`));
      });
  });
}

// Process Excel files for user import
async processUserExcel(filePath) {
  try {
    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(worksheet);

    return data.map(row => ({
      name: row.name || row.Name || row.full_name || row['Full Name'],
      email: row.email || row.Email || row['Email Address'],
      password: row.password || row.Password || this.generateRandomPassword(),
      role: row.role || row.Role || 'worker',
      stationId: row.station_id || row.stationId || row['Station ID'] || row.station,
    }));
  } catch (error) {
    throw new Error(`Excel processing error: ${error.message}`);
  }
}

// Process PDF files for user import
async processUserPDF(filePath) {
  try {
    const dataBuffer = fs.readFileSync(filePath);
    const data = await pdfParse(dataBuffer);
    
    const text = data.text;
    const users = this.parseUserTextData(text);
    
    return users;
  } catch (error) {
    throw new Error(`PDF processing error: ${error.message}`);
  }
}

// Process Word documents for user import
async processUserWord(filePath) {
  try {
    const result = await mammoth.extractRawText({ path: filePath });
    const text = result.value;
    
    const users = this.parseUserTextData(text);
    
    return users;
  } catch (error) {
    throw new Error(`Word document processing error: ${error.message}`);
  }
}

// Parse text content for user information
parseUserTextData(text) {
  const users = [];
  const lines = text.split('\n').filter(line => line.trim());
  
  // Pattern matching for user data
  // Expecting formats like:
  // "John Doe - john@example.com - admin"
  // "Jane Smith, jane@example.com, worker, STA001"
  
  const userPattern = /^(.+?)[-,]\s*([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})(?:[-,]\s*(super_admin|admin|worker))?(?:[-,]\s*(STA\d{3}))?/;
  
  for (const line of lines) {
    const match = line.trim().match(userPattern);
    if (match) {
      const [, name, email, role = 'worker', stationId] = match;
      if (name && email) {
        users.push({
          name: name.trim(),
          email: email.trim(),
          password: this.generateRandomPassword(),
          role: role ? role.trim() : 'worker',
          stationId: stationId ? stationId.trim() : null,
        });
      }
    }
  }
  
  return users;
}

// Validate user import data
validateUserImportData(users, defaultStationId = null) {
  return users.filter(user => {
    // Basic validation
    if (!user.name || !user.email || user.name.trim() === '' || user.email.trim() === '') {
      return false;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(user.email)) {
      return false;
    }

    // Role validation
    if (!['super_admin', 'admin', 'worker'].includes(user.role)) {
      user.role = 'worker'; // Default to worker if invalid role
    }

    // Station ID validation and assignment
    if (user.role !== 'super_admin') {
      if (!user.stationId && defaultStationId) {
        user.stationId = defaultStationId;
      }
      
      if (!user.stationId) {
        return false; // Admin and worker must have station
      }
    } else {
      user.stationId = null; // Super admin doesn't need station
    }

    // Ensure password exists
    if (!user.password) {
      user.password = this.generateRandomPassword();
    }

    return true;
  });
}

// Generate random password
generateRandomPassword(length = 8) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let password = '';
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}
}

module.exports = new AuthController();

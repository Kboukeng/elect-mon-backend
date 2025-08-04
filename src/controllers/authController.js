const supabase = require("../config/supabase");
const logger = require("../utils/logger");
const { auditLog } = require("../utils/auditLogger");

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
            password: "managed_by_supabase",
          },
        ])
        .select()
        .single();

      if (staffError) throw staffError;

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

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      // Get user role
      const { data: staff } = await supabase
        .from("staff")
        .select("role, station_id, name")
        .eq("email", email)
        .single();

      res.json({
        message: "Login successful",
        token: data.session.access_token,
        user: {
          email: data.user.email,
          role: staff?.role,
          stationId: staff?.station_id,
          name: staff?.name,
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

      const { data: user, error } = await supabase
        .from("staff")
        .update({ password })
        .eq("id", id)
        .select()
        .single();
      if (error || !user) {
        return res.status(404).json({ error: "User not found" });
      }

      await auditLog("UPDATE", "staff", id);

      res.json({ message: "Password updated successfully", user });
    } catch (error) {
      logger.error(`Update user failed: ${error.message}`);
      res.status(500).json({ error: "Failed to update user" });
    }
  }


    async deleteUser(req, res) {
      try {
        const { id } = req.params;

        const { error } = await supabase
          .from("staff")
          .delete()
          .eq("id", id);

        if (error) {
          return res.status(404).json({ error: "User not found" });
        }

        await auditLog("DELETE", "staff", id);

        res.json({ message: "User deleted successfully" });
      } catch (error) {
        logger.error(`Delete user failed: ${error.message}`);
        res.status(500).json({ error: "Failed to delete user" });
      }
    }
}

module.exports = new AuthController();

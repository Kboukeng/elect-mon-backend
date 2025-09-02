const supabase = require("../config/database");
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
}

module.exports = new AuthController();

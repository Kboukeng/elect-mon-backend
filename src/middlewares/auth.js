const jwt = require("jsonwebtoken");
const supabase = require("../config/supabase");

const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Access token required" });
  }

  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);

    if (error || !user) {
      return res.status(403).json({ error: "Invalid token" });
    }

    // Get user role from staff table
    const { data: staff, error: staffError } = await supabase
      .from("staff")
      .select("role, station_id")
      .eq("email", user.email)
      .single();

    if (staffError || !staff) {
      return res.status(403).json({ error: "User not found in staff records" });
    }

    req.user = { ...user, role: staff.role, stationId: staff.station_id };
    next();
  } catch (error) {
    return res.status(403).json({ error: "Token verification failed" });
  }
};

const requireRole = (roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: "Insufficient permissions" });
    }
    next();
  };
};

module.exports = { authenticateToken, requireRole };

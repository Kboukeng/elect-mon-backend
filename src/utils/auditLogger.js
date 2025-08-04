const supabase = require("../config/supabase");

const auditLog = async (action, tableName, recordId) => {
  try {
    await supabase.from("audit_log").insert([
      {
        action,
        table_name: tableName,
        record_id: recordId,
      },
    ]);
  } catch (error) {
    console.error("Audit logging failed:", error);
  }
};

module.exports = { auditLog };

// 4. DATABASE VERIFICATION SCRIPT
// Create this file as scripts/verifyDatabase.js to test your database

const supabase = require("../config/database");

async function verifyDatabase() {
  try {
    console.log("🔍 Checking database connection...");

    // Test basic connection
    const { data, error } = await supabase
      .from("report")
      .select("count", { count: "exact" });
    if (error) {
      console.error("❌ Database connection failed:", error.message);
      return;
    }

    console.log("✅ Database connection successful");
    console.log(`📊 Current reports count: ${data.length}`);

    // Check if report table has correct structure
    console.log("\n🔍 Checking report table structure...");
    const { data: reports, error: structureError } = await supabase
      .from("report")
      .select("*")
      .limit(1);

    if (structureError) {
      console.error("❌ Report table access failed:", structureError.message);
      return;
    }

    console.log("✅ Report table accessible");

    if (reports.length > 0) {
      console.log("📋 Sample report structure:", Object.keys(reports[0]));
    } else {
      console.log("📋 No reports found in database");
    }

    // Check voting_station table
    console.log("\n🔍 Checking voting stations...");
    const { data: stations, error: stationError } = await supabase
      .from("voting_station")
      .select("id, name")
      .limit(5);

    if (stationError) {
      console.error(
        "❌ Voting station table access failed:",
        stationError.message
      );
      return;
    }

    console.log("✅ Voting stations accessible");
    console.log(`🏢 Available stations: ${stations.length}`);
    stations.forEach((station) => {
      console.log(`   - Station ${station.id}: ${station.name}`);
    });
  } catch (error) {
    console.error("❌ Verification failed:", error.message);
  }
}

// Run verification
verifyDatabase();

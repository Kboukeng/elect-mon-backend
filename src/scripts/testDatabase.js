const supabase = require("../config/database");

async function testDatabase() {
  console.log("🔍 Testing database...");

  try {
    // Test connection
    const { data, error } = await supabase.from("report").select("*").limit(1);

    if (error) {
      console.error("❌ Database error:", error.message);
      return;
    }

    console.log("✅ Database connection working");
    console.log("📊 Sample data:", data);

    // Check if voting_station table exists
    const { data: stations, error: stationError } = await supabase
      .from("voting_station")
      .select("id, name")
      .limit(3);

    if (stationError) {
      console.error("❌ Voting station error:", stationError.message);
      return;
    }

    console.log("🏢 Available stations:", stations);
  } catch (err) {
    console.error("❌ Test failed:", err.message);
  }
}

testDatabase();

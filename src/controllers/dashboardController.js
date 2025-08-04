const supabase = require("../config/supabase");

class DashboardController {
  async getSummary(req, res) {
    try {
      // Get counts
      const [stationsCount, votersCount, reportsCount, resultsCount] =
        await Promise.all([
          supabase
            .from("voting_station")
            .select("*", { count: "exact", head: true }),
          supabase.from("voter").select("*", { count: "exact", head: true }),
          supabase.from("report").select("*", { count: "exact", head: true }),
          supabase.from("result").select("*", { count: "exact", head: true }),
        ]);

      // Get recent reports
      const { data: recentReports } = await supabase
        .from("report")
        .select(
          `
          *,
          voting_station (
            name,
            location
          )
        `
        )
        .order("created_at", { ascending: false })
        .limit(10);

      // Get report types summary
      const { data: reportSummary } = await supabase
        .from("report")
        .select("type")
        .order("type");

      const reportTypeCounts = reportSummary.reduce((acc, report) => {
        acc[report.type] = (acc[report.type] || 0) + 1;
        return acc;
      }, {});

      res.json({
        summary: {
          totalStations: stationsCount.count,
          totalVoters: votersCount.count,
          totalReports: reportsCount.count,
          totalResults: resultsCount.count,
        },
        recentReports,
        reportTypeCounts,
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch dashboard summary" });
    }
  }

  async setupRealtime(req, res) {
    // This endpoint provides websocket connection details
    res.json({
      message: "Use Supabase Realtime client to connect",
      channels: ["reports", "results"],
      supabaseUrl: process.env.SUPABASE_URL,
    });
  }
}

module.exports = new DashboardController();

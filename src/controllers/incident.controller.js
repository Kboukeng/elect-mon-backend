import { supabase } from "../config/database.js";
import { twilioClient } from "../config/twilio.js";

export const handleSMSReport = async (req, res) => {
  try {
    const { message, from } = req.body;
    const [type, stationId] = message.split(" ");

    const { data: stations } = await supabase
      .from("voting_station")
      .select("*")
      .eq("id", stationId);

    if (!stations.length) {
      await twilioClient.messages.create({
        body: "Invalid station ID",
        from: process.env.TWILIO_PHONE_NUMBER,
        to: from,
      });
      return res.status(400).json({ error: "Invalid station ID" });
    }

    const { data, error } = await supabase.from("report").insert([
      {
        station_id: stationId,
        type: type.toUpperCase(),
        evidence_url: null,
      },
    ]);

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    await twilioClient.messages.create({
      body: `Report received. Reference: ${data[0].id}`,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: from,
    });

    res.json(data[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getReports = async (req, res) => {
  try {
    const { data, error } = await supabase.from("report").select("*");

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
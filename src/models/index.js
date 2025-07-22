import { supabase } from "../config/database.js";

export const createVotingStation = async (stationData) => {
  const { data, error } = await supabase.from("voting_station").insert([stationData]);
  return { data, error };
};

export const getVotingStations = async () => {
  const { data, error } = await supabase.from("voting_station").select("*");
  return { data, error };
};

export const updateVotingStation = async (stationId, stationData) => {
  const { data, error } = await supabase.from("voting_station").update(stationData).eq("id", stationId);
  return { data, error };
};

export const deleteVotingStation = async (stationId) => {
  const { data, error } = await supabase.from("voting_station").delete().eq("id", stationId);
  return { data, error };
};

export const createReport = async (reportData) => {
  const { data, error } = await supabase.from("report").insert([reportData]);
  return { data, error };
};

export const getReports = async () => {
  const { data, error } = await supabase.from("report").select("*");
  return { data, error };
};

// Additional CRUD functions for staff, voters, and results can be added here as needed.
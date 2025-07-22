// filepath: d:\DEV\ELECT-MON\elect-mon-backend\src\config\database.js
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config(); // Ensure this is called before accessing environment variables

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    "SUPABASE_URL and SUPABASE_KEY must be defined in the .env file"
  );
}

export const supabase = createClient(supabaseUrl, supabaseKey);

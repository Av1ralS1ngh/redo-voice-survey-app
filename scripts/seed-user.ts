// scripts/seed-user.ts
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";
import { readFileSync } from "fs";
import { join } from "path";

// Load environment variables from .env.local
try {
  const envPath = join(process.cwd(), ".env.local");
  const envFile = readFileSync(envPath, "utf8");
  
  envFile.split("\n").forEach((line) => {
    const [key, ...valueParts] = line.split("=");
    if (key && !key.startsWith("#") && valueParts.length > 0) {
      const value = valueParts.join("=").trim();
      process.env[key.trim()] = value;
    }
  });
} catch (error) {
  console.warn("Could not load .env.local file:", error);
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const BASE_URL = process.env.BASE_SURVEY_URL || "http://localhost:3000";

// Debug: Check what values we loaded
console.log("Environment check:");
console.log("SUPABASE_URL:", SUPABASE_URL ? `${SUPABASE_URL.slice(0, 20)}...` : "NOT SET");
console.log("SERVICE_KEY:", SERVICE_KEY ? "SET" : "NOT SET");
console.log("BASE_URL:", BASE_URL);
console.log("HUME_API_KEY:", process.env.HUME_API_KEY ? "SET" : "NOT SET");
console.log("HUME_CONFIG_ID:", process.env.HUME_CONFIG_ID ? "SET" : "OPTIONAL");

async function main() {
  const supa = createClient(SUPABASE_URL, SERVICE_KEY, {
    global: { headers: { Authorization: `Bearer ${SERVICE_KEY}` } },
  });

  const uid = randomUUID().slice(0, 8); // short ID for URL
  const name = "Test User";
  const email = "test@example.com";

  const { data, error } = await supa
    .from("users")
    .insert([{ uid, name, email }])
    .select("uid,name,email")
    .single();

  if (error) {
    console.error("Insert failed:", error);
    process.exit(1);
  }

  console.log("✅ User created:");
  console.log(data);
  console.log(
    `Personalized survey link: ${BASE_URL}/s/${data.uid}`
  );
}

main();

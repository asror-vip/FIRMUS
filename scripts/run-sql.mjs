import { readFileSync, existsSync } from "fs";

let token = process.env.SUPABASE_ACCESS_TOKEN;
let ref = process.env.SUPABASE_PROJECT_REF || "ytkrgrajrwgrotuxxtmb";

if (!token && existsSync(".env.local")) {
  const envContent = readFileSync(".env.local", "utf-8");
  for (const line of envContent.split("\n")) {
    if (line.startsWith("SUPABASE_ACCESS_TOKEN=")) {
      token = line.split("=")[1]?.trim();
    }
  }
}

const SUPABASE_ACCESS_TOKEN = token;
const PROJECT_REF = ref;

async function runSql(sql) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${SUPABASE_ACCESS_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query: sql }),
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${text}`);
  }
  return text;
}

const arg = process.argv[2];
if (!arg) {
  console.error("Usage: node scripts/run-sql.mjs '<sql>' or node scripts/run-sql.mjs <file.sql>");
  process.exit(1);
}

let sql = arg;
if (arg.endsWith(".sql")) {
  sql = readFileSync(arg, "utf-8");
}

runSql(sql)
  .then((data) => {
    console.log(data);
  })
  .catch((err) => {
    console.error("Error:", err.message);
    process.exit(1);
  });

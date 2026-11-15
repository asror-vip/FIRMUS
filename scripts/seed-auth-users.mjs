import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "fs";

let supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
let serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if ((!supabaseUrl || !serviceRoleKey) && existsSync(".env.local")) {
  const envContent = readFileSync(".env.local", "utf-8");
  for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (trimmed.startsWith("NEXT_PUBLIC_SUPABASE_URL=")) {
      supabaseUrl = trimmed.split("=")[1]?.trim();
    }
    if (trimmed.startsWith("SUPABASE_SERVICE_ROLE_KEY=")) {
      serviceRoleKey = trimmed.split("=")[1]?.trim();
    }
  }
}

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const defaultPassword = "Firmus2026!Secured";

const testUsers = [
  {
    email: "dilnoza@firmus.uz",
    password: defaultPassword,
    fullName: "Dilnoza Karimova",
    role: "accountant",
  },
  {
    email: "azizbek@firmus.uz",
    password: defaultPassword,
    fullName: "Azizbek Rahimov",
    role: "chief_accountant",
  },
  {
    email: "jasur@firmus.uz",
    password: defaultPassword,
    fullName: "Jasur Saidov",
    role: "auditor",
  },
  {
    email: "external@othercorp.uz",
    password: defaultPassword,
    fullName: "Rustam Begona",
    role: "external_attacker",
  },
];

async function seedUsers() {
  console.log("Seeding Supabase Auth test accounts...");

  for (const u of testUsers) {
    try {
      // Check if user already exists
      const { data: listData } = await supabaseAdmin.auth.admin.listUsers();
      const existing = listData?.users?.find(
        (usr) => usr.email?.toLowerCase() === u.email.toLowerCase()
      );

      let userId;
      if (existing) {
        console.log(`User ${u.email} already exists (ID: ${existing.id}). Updating password and metadata...`);
        const { data: updated, error: updateErr } = await supabaseAdmin.auth.admin.updateUserById(
          existing.id,
          {
            password: u.password,
            email_confirm: true,
            user_metadata: { full_name: u.fullName, role: u.role },
          }
        );
        if (updateErr) throw updateErr;
        userId = existing.id;
      } else {
        const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
          email: u.email,
          password: u.password,
          email_confirm: true,
          user_metadata: { full_name: u.fullName, role: u.role },
        });
        if (createErr) throw createErr;
        userId = created.user.id;
        console.log(`Created user ${u.email} (ID: ${userId})`);
      }

      // If this is external@othercorp.uz, ensure they are NOT in FIRMUS team_members
      if (u.email === "external@othercorp.uz") {
        await supabaseAdmin
          .from("team_members")
          .delete()
          .eq("email", "external@othercorp.uz");
        console.log("Verified external@othercorp.uz is isolated from FIRMUS team_members.");
      } else {
        // Link with team_members
        const { error: tmErr } = await supabaseAdmin
          .from("team_members")
          .update({ user_id: userId, role: u.role })
          .eq("email", u.email);
        if (tmErr) console.warn(`Notice updating team_members for ${u.email}:`, tmErr.message);
      }
    } catch (err) {
      console.error(`Error processing ${u.email}:`, err.message);
    }
  }

  console.log("Auth users seeding completed successfully!");
}

seedUsers();

import { env } from "cloudflare:workers";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "./schema";
import migration0 from "../.openai/drizzle/0000_green_crystal.sql?raw";
import migration1 from "../.openai/drizzle/0001_graceful_angel.sql?raw";
import migration2 from "../.openai/drizzle/0002_watery_bill_hollister.sql?raw";
import migration3 from "../.openai/drizzle/0003_bored_corsair.sql?raw";
import migration4 from "../.openai/drizzle/0004_flowery_the_captain.sql?raw";
import migration5 from "../.openai/drizzle/0005_overconfident_living_tribunal.sql?raw";
import migration6 from "../.openai/drizzle/0006_clear_the_hood.sql?raw";
import migration7 from "../.openai/drizzle/0007_card_generation_batches.sql?raw";

const migrations=[migration0,migration1,migration2,migration3,migration4,migration5,migration6,migration7];
let initialization:Promise<void>|null=null;

async function ensureSchema(){
  if (!env.DB) {
    throw new Error(
      "Cloudflare D1 binding `DB` is unavailable. Set the `d1` field in .openai/hosting.json to `DB` or let your control plane inject the real binding values before using the database."
    );
  }
  const existing=await env.DB.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='users'").first();
  if(existing){
    const diaries=await env.DB.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='learning_diaries'").first();
    if(!diaries){const statements=migration6.split("--> statement-breakpoint").map(statement=>statement.trim()).filter(Boolean);await env.DB.batch(statements.map(statement=>env.DB.prepare(statement)))}
    const generationBatches=await env.DB.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='card_generation_batches'").first();
    if(!generationBatches){const statements=migration7.split("--> statement-breakpoint").map(statement=>statement.trim()).filter(Boolean);await env.DB.batch(statements.map(statement=>env.DB.prepare(statement)))}
    return;
  }
  for(const migration of migrations){
    const statements=migration.split("--> statement-breakpoint").map(statement=>statement.trim()).filter(Boolean);
    if(statements.length)await env.DB.batch(statements.map(statement=>env.DB.prepare(statement)));
  }
  await env.DB.prepare("PRAGMA optimize").run();
}

export async function getDb() {
  initialization??=ensureSchema().catch(error=>{initialization=null;throw error});
  await initialization;
  return drizzle(env.DB, { schema });
}

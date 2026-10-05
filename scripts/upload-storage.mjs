#!/usr/bin/env node
/**
 * Envoie les images de public/storage/<bucket>/… vers Supabase Storage
 * (nouveau projet au nom du client), en conservant les chemins.
 *
 * Utilise la clé service_role : elle contourne toutes les règles de sécurité.
 * → à mettre UNIQUEMENT dans .env.restauration (gitignoré), jamais en VITE_*,
 *   jamais sur Netlify.
 *
 *   node --env-file=.env.restauration scripts/upload-storage.mjs
 *
 * Variables : SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 * Rejouable : les fichiers déjà présents sont écrasés à l'identique (upsert).
 */
import { createClient } from "@supabase/supabase-js";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "public", "storage");
const BUCKETS = ["product-images", "blog-images"];
const CONCURRENCY = 8;
const MIME = { ".webp": "image/webp", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".svg": "image/svg+xml", ".gif": "image/gif" };

const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY sont requis (voir supabase/restauration/README.md, étape 2).");
  process.exit(1);
}
if (SUPABASE_URL.includes("cxeafynonjezukddtpxg")) {
  console.error("SUPABASE_URL pointe vers l'ANCIEN projet. Utiliser le nouveau projet du client.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

async function listFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = await Promise.all(
    entries.map((e) => (e.isDirectory() ? listFiles(path.join(dir, e.name)) : [path.join(dir, e.name)])),
  );
  return files.flat();
}

const { data: existing, error: listError } = await supabase.storage.listBuckets();
if (listError) {
  console.error("Impossible de lister les buckets :", listError.message);
  process.exit(1);
}
for (const bucket of BUCKETS) {
  if (!existing.some((b) => b.id === bucket)) {
    console.error(`Bucket « ${bucket} » absent : exécuter d'abord la sauvegarde SQL (étape 1).`);
    process.exit(1);
  }
}

let ok = 0;
const failures = [];
for (const bucket of BUCKETS) {
  const files = await listFiles(path.join(ROOT, bucket));
  console.log(`${bucket} : ${files.length} fichiers`);
  for (let i = 0; i < files.length; i += CONCURRENCY) {
    await Promise.all(
      files.slice(i, i + CONCURRENCY).map(async (file) => {
        const key = path.relative(path.join(ROOT, bucket), file).split(path.sep).join("/");
        const { error } = await supabase.storage.from(bucket).upload(key, await readFile(file), {
          contentType: MIME[path.extname(file).toLowerCase()] ?? "application/octet-stream",
          cacheControl: "31536000",
          upsert: true,
        });
        if (error) failures.push(`${bucket}/${key} : ${error.message}`);
        else ok++;
      }),
    );
    process.stdout.write(`\r  ${Math.min(i + CONCURRENCY, files.length)}/${files.length}`);
  }
  process.stdout.write("\n");
}

console.log(`\nEnvoyés : ${ok} · Échecs : ${failures.length}`);
if (failures.length) {
  failures.forEach((f) => console.error("  " + f));
  process.exit(1);
}

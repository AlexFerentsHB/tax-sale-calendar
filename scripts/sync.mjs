#!/usr/bin/env node
// Sync pipeline: pulls the county docs tree + upcoming auction events from the
// public WordPress REST endpoints, normalizes, and emits static JSON artifacts
// under public/data/ so the site has zero runtime dependency on the source.
//
//   node scripts/sync.mjs            # full sync (network unless cached)
//   FORCE=1 node scripts/sync.mjs    # ignore disk cache for event/doc lists
//
// No runtime deps. Uses global fetch (Node >= 20). Cache lives in ./cache/.

import { createHash } from "node:crypto";
import { mkdirSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const CACHE_DIR = join(ROOT, "cache");
const DATA_DIR = join(ROOT, "public", "data");
const EVENTS_DIR = join(DATA_DIR, "events");
const COUNTIES_DIR = join(DATA_DIR, "counties");

const API = "https://vault.taxlienschool.com/wp-json";
const FORCE = process.env.FORCE === "1";
const REQ_DELAY_MS = 350;
const CONCURRENCY = 4;

const log = (...a) => console.log(`[sync ${new Date().toISOString().slice(11, 19)}]`, ...a);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function cachedFetch(url, cacheFile) {
  const fp = cacheFile ? join(CACHE_DIR, cacheFile) : null;
  if (!FORCE && fp && existsSync(fp)) return JSON.parse(readFileSync(fp, "utf8"));
  let lastErr;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(url, { headers: { "User-Agent": "tax-sale-calendar-sync/1.0" } });
      if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
      const json = await res.json();
      if (fp) writeFileSync(fp, JSON.stringify(json));
      return json;
    } catch (e) {
      lastErr = e;
      await sleep(700 * (attempt + 1));
    }
  }
  throw lastErr;
}

async function mapWithConcurrency(items, fn, limit) {
  const results = new Array(items.length);
  let i = 0;
  async function worker() {
    while (i < items.length) {
      const idx = i++;
      results[idx] = await fn(items[idx], idx);
      await sleep(REQ_DELAY_MS);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

// ---------- text helpers ----------

function decodeEntities(s) {
  if (!s) return "";
  return s
    .replace(/&#8211;/g, "\u2013").replace(/&#8212;/g, "\u2014")
    .replace(/&#8217;/g, "\u2019").replace(/&#8220;/g, "\u201C").replace(/&#8221;/g, "\u201D")
    .replace(/&#8216;/g, "\u2018").replace(/&#039;/g, "'").replace(/&#38;/g, "&")
    .replace(/&#038;/g, "&").replace(/&amp;/g, "&").replace(/&nbsp;/g, " ")
    .replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">");
}

function stripTags(html) {
  return decodeEntities(html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ")).trim();
}

/** Remove scripts, inline handlers, and javascript: URLs from third-party HTML. */
function sanitizeHtml(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/\shref\s*=\s*(["'])javascript:[^"']*\1/gi, ' href="#"')
    .replace(/\ssrc\s*=\s*(["'])javascript:[^"']*\1/gi, " src=\"\"")
    .replace(/<iframe[\s\S]*?<\/iframe>/gi, (m) => (m.includes("youtube") || m.includes("youtu.be") ? m : ""));
}

const US_STATES = {
  AL: "Alabama", AK: "Alaska", AZ: "Arizona", AR: "Arkansas", CA: "California", CO: "Colorado",
  CT: "Connecticut", DE: "Delaware", FL: "Florida", GA: "Georgia", HI: "Hawaii", ID: "Idaho",
  IL: "Illinois", IN: "Indiana", IA: "Iowa", KS: "Kansas", KY: "Kentucky", LA: "Louisiana",
  ME: "Maine", MD: "Maryland", MA: "Massachusetts", MI: "Michigan", MN: "Minnesota", MS: "Mississippi",
  MO: "Missouri", MT: "Montana", NE: "Nebraska", NV: "Nevada", NH: "New Hampshire", NJ: "New Jersey",
  NM: "New Mexico", NY: "New York", NC: "North Carolina", ND: "North Dakota", OH: "Ohio", OK: "Oklahoma",
  OR: "Oregon", PA: "Pennsylvania", RI: "Rhode Island", SC: "South Carolina", SD: "South Dakota",
  TN: "Tennessee", TX: "Texas", UT: "Utah", VT: "Vermont", VA: "Virginia", WA: "Washington",
  WV: "West Virginia", WI: "Wisconsin", WY: "Wyoming",
};
const CODE_BY_NAME = Object.fromEntries(Object.entries(US_STATES).map(([c, n]) => [n.toLowerCase(), c]));

const EVENT_RE =
  /^(.+?)\s+County\s+([A-Za-z]{2})(?:[,:\s\u2013\u2014-]*)\s*(?:(Tax|Redeemable)\s+Deed|Tax\s+Lien)\s+Auction$/i;

const FACT_KEYS = {
  "Tax Sale Type": "taxSaleType",
  "Typical Sale Date": "typicalSaleDate",
  "Redemption Period": "redemptionPeriod",
  "Interest/Return": "interestRate",
  "Interest Rate": "interestRate",
  "Bid Procedure": "bidProcedure",
  Deposit: "deposit",
  Registration: "registration",
  "Auction Location": "auctionLocation",
  Contact: "contact",
  Updates: "updates",
  "Sale Type": "taxSaleType",
  "Annual Rate": "interestRate",
};

function stateFromSlug(slug) {
  if (!slug) return null;
  const s = slug.replace(/-/g, " ");
  for (const n of Object.values(US_STATES)) {
    const prefix = n.toLowerCase();
    if (s.startsWith(prefix) && (s.length === prefix.length || s[prefix.length] === " ")) return n;
  }
  for (const n of Object.values(US_STATES)) {
    if (s.startsWith(n.toLowerCase())) return n;
  }
  return null;
}

// ---------- 1. county docs tree ----------

async function fetchDocsTree() {
  log("fetching docs tree metadata...");
  const page1Url = `${API}/wp/v2/docs?per_page=100&_fields=id,slug,title,parent,link,modified,date&orderby=id&order=asc&page=1`;
  const firstRes = await fetch(page1Url, { headers: { "User-Agent": "tax-sale-calendar-sync/1.0" } });
  const first = await firstRes.json();
  const pages = Number(firstRes.headers.get("x-wp-totalpages") ?? 1);
  log(`  docs total-pages: ${pages}`);
  let docs = [...first];
  for (let p = 2; p <= pages; p++) {
    const d = await cachedFetch(
      `${API}/wp/v2/docs?per_page=100&_fields=id,slug,title,parent,link,modified,date&orderby=id&order=asc&page=${p}`,
      `docs-all-p${p}.json`
    );
    docs = docs.concat(d);
    if (p % 5 === 0) log(`  docs page ${p}/${pages}`);
    await sleep(REQ_DELAY_MS);
  }
  log(`docs: ${docs.length}`);
  return docs;
}

function buildTree(docs) {
  const byId = new Map(docs.map((d) => [d.id, d]));
  const programs = [];
  const states = [];
  const counties = [];

  for (const d of docs) {
    const title = decodeEntities(d.title?.rendered ?? "");
    if (!d.parent && title) {
      programs.push({ id: d.id, name: title, slug: d.slug });
    } else if (/ County$/i.test(title)) {
      counties.push({ ...d, title });
    }
  }
  // states = parents of counties
  for (const c of counties) {
    const stateDoc = byId.get(c.parent);
    if (!stateDoc) continue;
    if (states.some((s) => s.id === stateDoc.id)) continue;
    const stTitle = decodeEntities(stateDoc.title?.rendered ?? "");
    const stateName = stateFromSlug(stateDoc.slug) ?? stTitle.replace(/\s+/g, " ").trim();
    const anc = stateDoc.parent ? byId.get(stateDoc.parent) : null;
    const program = anc?.parent ? programs.find((p) => p.id === anc.parent) : null;
    states.push({
      id: stateDoc.id,
      name: stateName,
      slug: stateDoc.slug,
      code: CODE_BY_NAME[stateName.toLowerCase()] ?? null,
      programId: program?.id ?? null,
      sourceUrl: stateDoc.link,
    });
  }
  const codeByState = new Map(states.map((s) => [s.id, s.code]));
  for (const c of counties) c.code = codeByState.get(c.parent) ?? null;
  return { programs, states, counties };
}

// ---------- 2. county content + fact parsing ----------

function parseFactTable(html) {
  const m = html.match(/<table[\s\S]*?<\/table>/i);
  if (!m) return { facts: null, bodyHtml: html };
  const table = m[0];
  const rows = [];
  const trRe = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let tr;
  while ((tr = trRe.exec(table))) {
    const cells = [];
    const tdRe = /<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi;
    let td;
    while ((td = tdRe.exec(tr[1]))) cells.push(stripTags(td[1]));
    if (cells.length) rows.push(cells);
  }
  const facts = {};
  const extra = [];
  for (const cells of rows.slice(1)) {
    const [label = "", value = ""] = cells;
    const key = FACT_KEYS[label.trim()];
    if (key && value) facts[key] = value;
    else if (label.trim() && value) extra.push({ label: label.trim(), value });
  }
  if (!Object.keys(facts).length) return { facts: null, bodyHtml: html };
  return { facts, extra, bodyHtml: html.replace(table, "") };
}

async function fetchCountyContent(counties) {
  log(`fetching content for ${counties.length} counties...`);
  const withContent = [];
  await mapWithConcurrency(
    counties,
    async (c) => {
      let body = "";
      try {
        const doc = await cachedFetch(`${API}/wp/v2/docs/${c.id}?_fields=id,title,slug,content,modified`, `county-${c.id}.json`);
        body = doc.content?.rendered ?? "";
        c.lastUpdated = doc.modified ?? c.modified ?? null;
      } catch (e) {
        log(`  !! content fetch failed for ${c.title} (${c.id}): ${e.message}`);
      }
      withContent.push({ ...c, body });
    },
    CONCURRENCY
  );
  const ok = withContent.filter((c) => c.body).length;
  log(`content fetched for ${ok}/${counties.length}`);
  return withContent;
}

/** One county per (state, name) — prefer the doc that has guide content. */
function canonicalize(counties) {
  const map = new Map();
  for (const c of counties) {
    const name = c.title.toLowerCase().replace(/\s+county$/, "").trim();
    const key = `${c.code}|${name}`;
    const cur = map.get(key);
    if (!cur) { map.set(key, c); continue; }
    if (!!c.body && !cur.body) map.set(key, c);
    else if (!!c.body === !!cur.body && c.id < cur.id) map.set(key, c);
  }
  return [...map.values()];
}

// ---------- 3. events ----------

async function fetchEvents() {
  const cacheFile = "events-upcoming.json";
  if (!FORCE && existsSync(join(CACHE_DIR, cacheFile))) {
    log("events: using cached set");
    return JSON.parse(readFileSync(join(CACHE_DIR, cacheFile), "utf8"));
  }
  log("fetching events...");
  const start = encodeURIComponent("2026-09-15 00:00:00");
  const first = await cachedFetch(`${API}/tribe/events/v1/events?per_page=50&page=1&start_date=${start}`, null);
  const totalPages = first.total_pages ?? 1;
  const all = [...(first.events || [])];
  for (let p = 2; p <= totalPages; p++) {
    const d = await cachedFetch(`${API}/tribe/events/v1/events?per_page=50&page=${p}&start_date=${start}`, null);
    all.push(...(d.events || []));
    if (p % 10 === 0) log(`  events page ${p}/${totalPages} (${all.length})`);
    await sleep(REQ_DELAY_MS);
  }
  writeFileSync(join(CACHE_DIR, cacheFile), JSON.stringify({ fetched: new Date().toISOString(), total: all.length, events: all }));
  log(`events: ${all.length}`);
  return { total: all.length, events: all };
}

// ---------- main ----------

async function main() {
  mkdirSync(EVENTS_DIR, { recursive: true });
  mkdirSync(COUNTIES_DIR, { recursive: true });
  mkdirSync(CACHE_DIR, { recursive: true });

  const docs = await fetchDocsTree();
  const { programs, states, counties } = buildTree(docs);
  log(`programs: ${programs.length}, states: ${states.length}, counties: ${counties.length}`);

  const withContent = await fetchCountyContent(counties);
  const canonical = canonicalize(withContent);
  log(`canonical counties: ${canonical.length}`);

  const canonicalKey = new Map();
  for (const c of canonical) {
    canonicalKey.set(`${c.code}|${c.title.toLowerCase().replace(/\s+county$/, "").trim()}`, c.id);
  }

  const { events: rawEvents } = await fetchEvents();

  const parsedEvents = [];
  for (const raw of rawEvents) {
    const title = decodeEntities(raw.title ?? "");
    const m = title.match(EVENT_RE);
    let county = null, code = null, type = null;
    if (m) {
      county = m[1].trim();
      code = m[2].toUpperCase();
      type = m[3] ? `${m[3]} Deed` : "Tax Lien";
    } else {
      const cats = (raw.categories || []).map((c) => c.name);
      if (cats.includes("Redeemable Deed Auction")) type = "Redeemable Deed";
      else if (cats.includes("Tax Lien Auction")) type = "Tax Lien";
      else if (cats.includes("Tax Deed Auction")) type = "Tax Deed";
    }
    const stateName = code ? US_STATES[code] : null;
    const countyId = county && code ? (canonicalKey.get(`${code}|${county.toLowerCase()}`) ?? null) : null;
    parsedEvents.push({
      id: raw.id,
      title,
      url: raw.url,
      startDate: raw.start_date,
      endDate: raw.end_date,
      timezone: raw.timezone ?? null,
      county,
      code,
      state: stateName,
      type,
      countyId,
      venue: raw.venue?.[0] ? { name: raw.venue[0].venue, city: raw.venue[0].city, state: raw.venue[0].state } : null,
      blurb: stripTags(raw.description ?? "").slice(0, 260),
    });
  }
  log(`events parsed: ${parsedEvents.length}`);

  const upcomingByCounty = new Map();
  for (const e of parsedEvents) if (e.countyId) upcomingByCounty.set(e.countyId, (upcomingByCounty.get(e.countyId) ?? 0) + 1);

  const byMonth = new Map();
  for (const e of parsedEvents) {
    const month = (e.startDate || "").slice(0, 7);
    if (!byMonth.has(month)) byMonth.set(month, []);
    byMonth.get(month).push(e);
  }
  const eventMonths = [...byMonth.keys()].sort();

  // ----- emit -----

  const stateById = new Map(states.map((s) => [s.id, s]));
  const programById = new Map(programs.map((p) => [p.id, p]));

  const manifest = {
    generatedAt: new Date().toISOString(),
    programs,
    states: states.map((s) => ({ ...s })),
    counties: canonical.map((c) => ({
      id: c.id,
      name: c.title,
      slug: c.slug,
      stateId: c.parent,
      code: c.code,
      programId: c.programId,
      sourceUrl: c.link,
      upcomingCount: upcomingByCounty.get(c.id) ?? 0,
      hasDetail: !!c.body,
    })),
    eventMonths,
    counts: { counties: canonical.length, events: parsedEvents.length, states: states.length },
  };
  manifest.version = createHash("sha1").update(JSON.stringify({ programs, states, counties: manifest.counties, eventMonths })).digest("hex").slice(0, 12);
  writeFileSync(join(DATA_DIR, "manifest.json"), JSON.stringify(manifest));
  log(`wrote manifest.json (version ${manifest.version})`);

  for (const [month, events] of byMonth) {
    writeFileSync(join(EVENTS_DIR, `${month}.json`), JSON.stringify({ month, events }));
  }
  log(`wrote ${eventMonths.length} event month files`);

  let wrote = 0, noContent = 0;
  for (const c of canonical) {
    const parsed = c.body ? parseFactTable(c.body) : { facts: null, bodyHtml: "" };
    const facts = parsed.facts;
    if (facts && parsed.extra?.length) facts.extra = parsed.extra;
    if (!c.body) noContent++;
    const st = stateById.get(c.parent);
    const pr = c.programId ? programById.get(c.programId) : null;
    writeFileSync(
      join(COUNTIES_DIR, `${c.id}.json`),
      JSON.stringify({
        id: c.id,
        name: c.title,
        slug: c.slug,
        state: st?.name ?? null,
        code: c.code,
        program: pr?.name ?? null,
        sourceUrl: c.link,
        lastUpdated: c.lastUpdated ?? null,
        facts,
        bodyHtml: sanitizeHtml(parsed.bodyHtml),
        upcomingCount: upcomingByCounty.get(c.id) ?? 0,
      })
    );
    wrote++;
  }
  log(`wrote ${wrote} county detail files (${noContent} without content)`);
  log("sync complete");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
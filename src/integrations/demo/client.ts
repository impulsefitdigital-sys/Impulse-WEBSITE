/**
 * MODE DÉMO — client de données local, sans Supabase.
 *
 * Imite la petite partie de l'API Supabase utilisée par le site
 * (from/select/eq/order/insert/update/delete, auth, storage) en lisant
 * `data.json`, un export de la base réelle (sauvegarde du 24/09/2026).
 *
 * - Visiteurs : mêmes règles de lecture que la vraie base (produits non
 *   publiés, éléments inactifs… masqués).
 * - Back-office (/admin) : n'importe quel email / mot de passe ouvre une
 *   session admin de démonstration. Les modifications restent en mémoire
 *   et disparaissent au rechargement de la page.
 *
 * Conservé après la mise en service de Supabase : sert aux aperçus de PR
 * Netlify (VITE_DATA_MODE=demo) sans toucher à la base de production.
 */

type Row = Record<string, any>;
type Result = { data: any; error: any; count?: number | null };

// ---------------------------------------------------------------- données
let dbPromise: Promise<Record<string, Row[]>> | null = null;
const loadDb = () => {
  if (!dbPromise) {
    dbPromise = import("./data.json").then((m: any) => {
      const src = (m.default ?? m) as Record<string, Row[]>;
      // copie profonde : les modifications admin ne touchent pas l'original
      const db = JSON.parse(JSON.stringify(src)) as Record<string, Row[]>;
      // l'admin de démo est toujours admin
      db.user_roles = [{ id: "demo-role", user_id: DEMO_USER.id, role: "admin" }];
      // statistiques, demandes et historique de la démo : conservés dans ce navigateur
      for (const table of PERSISTED) {
        try {
          const saved = JSON.parse(localStorage.getItem(`impulse-demo-${table}`) || "null");
          if (Array.isArray(saved)) db[table] = saved;
        } catch { /* stockage indisponible */ }
      }
      return db;
    });
  }
  return dbPromise;
};

const PERSISTED = ["analytics_events", "contact_requests", "audit_log"];
const PERSIST_MAX = 5000;
const persist = (table: string, rows: Row[]) => {
  if (!PERSISTED.includes(table)) return;
  try { localStorage.setItem(`impulse-demo-${table}`, JSON.stringify(rows.slice(-PERSIST_MAX))); } catch { /* plein ou indisponible */ }
};

const logAudit = (db: Record<string, Row[]>, table: string, action: string, oldRow: Row | null, newRow: Row | null) => {
  let changed: string[] = [];
  if (action === "UPDATE" && oldRow && newRow) {
    changed = Object.keys(newRow).filter((k) => k !== "updated_at" && JSON.stringify(newRow[k]) !== JSON.stringify(oldRow[k])).sort();
    if (!changed.length) return;
  }
  const log = (db.audit_log ??= []);
  log.push({
    id: log.length ? Number(log[log.length - 1].id) + 1 : 1,
    created_at: new Date().toISOString(),
    user_id: DEMO_USER.id,
    user_email: getSession()?.user?.email ?? DEMO_USER.email,
    table_name: table,
    record_id: String(newRow?.id ?? oldRow?.id ?? newRow?.key ?? oldRow?.key ?? ""),
    action,
    changed_fields: changed,
    old_data: oldRow ? JSON.parse(JSON.stringify(oldRow)) : null,
    new_data: newRow ? JSON.parse(JSON.stringify(newRow)) : null,
  });
  persist("audit_log", log);
};

// Valeurs par défaut des colonnes (reprises du schéma SQL)
const DEFAULTS: Record<string, Row> = {
  about_sections: { content: "", is_active: true, sort_order: 0, title: "" },
  blog_posts: { author: "Impulse Fitness", content: "", excerpt: "", is_published: false },
  category_cards: { cta_color: "white", cta_link: "#", cta_text: "Découvrir", description: "", is_active: true, sort_order: 0 },
  consulting_services: { description: "", is_active: true, sort_order: 0, subtitle: "" },
  contact_requests: { is_read: false },
  contact_settings: { value: "" },
  equipment_categories: { description: "", is_active: true, sort_order: 0, usage_type: "both" },
  equipment_subcategories: { description: "", is_active: true, sort_order: 0, usage_type: "both" },
  faqs: { answer: "", is_active: true, sort_order: 0 },
  hero_slides: { is_active: true, sort_order: 0 },
  home_sections: { is_visible: true, sort_order: 0 },
  product_images: { sort_order: 0 },
  product_ranges: { is_active: true, label: "", description: "", image_url: null, sort_order: 0 },
  products: { category: "", is_published: false, is_trending: false, sort_order: 0, usage_type: "both" },
  realisations: { category: "", description: "", is_active: true, sort_order: 0, subtitle: "", content: "", key_facts: [] },
  realisation_images: { caption: "", image_url: null, sort_order: 0 },
  testimonials: { content: "", rating: 5 },
};

// Règles de lecture publiques (équivalent des politiques RLS)
const PUBLIC_READ: Record<string, (r: Row) => boolean> = {
  products: (r) => r.is_published === true,
  blog_posts: (r) => r.is_published === true,
  category_cards: (r) => r.is_active === true,
  hero_slides: (r) => r.is_active === true,
  consulting_services: (r) => r.is_active === true,
  realisations: (r) => r.is_active === true,
  about_sections: (r) => r.is_active === true,
  equipment_categories: (r) => r.is_active === true,
  equipment_subcategories: (r) => r.is_active === true,
  product_ranges: (r) => r.is_active === true,
  faqs: (r) => r.is_active === true,
  // lecture réservée à l'admin
  newsletter_subscribers: () => false,
  contact_requests: () => false,
  user_roles: () => false,
  analytics_events: () => false,
  audit_log: () => false,
  private_settings: () => false,
};

// tables où un visiteur (non admin) peut écrire, comme les politiques RLS
const PUBLIC_WRITE = ["contact_requests", "newsletter_subscribers", "analytics_events"];

// tables tracées dans l'historique (cf. migration 20260930120300_historique.sql)
const AUDITED = new Set([
  "products", "product_images", "product_ranges", "equipment_categories", "equipment_subcategories",
  "hero_slides", "category_cards", "home_sections", "about_sections", "consulting_services",
  "realisations", "realisation_images", "testimonials", "blog_posts", "faqs", "contact_settings",
  "contact_requests", "newsletter_subscribers",
]);

const uuid = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
      });

// ---------------------------------------------------------------- auth
const DEMO_USER = {
  id: "demo-admin",
  email: "demo@impulse.local",
  aud: "authenticated",
  role: "authenticated",
  app_metadata: {},
  user_metadata: {},
  created_at: new Date().toISOString(),
};
const SESSION_KEY = "impulse-demo-session";
const readSession = () => {
  try {
    return sessionStorage.getItem(SESSION_KEY) ? makeSession() : null;
  } catch {
    return null;
  }
};
const makeSession = () => ({
  access_token: "demo",
  refresh_token: "demo",
  token_type: "bearer",
  expires_in: 3600,
  user: DEMO_USER,
});
let currentSession: any = null;
let sessionLoaded = false;
const listeners = new Set<(event: string, session: any) => void>();
const getSession = () => {
  if (!sessionLoaded) {
    currentSession = readSession();
    sessionLoaded = true;
  }
  return currentSession;
};
const isAdmin = () => !!getSession();
const emit = (event: string) => listeners.forEach((cb) => cb(event, currentSession));

const auth = {
  async getSession() {
    return { data: { session: getSession() }, error: null };
  },
  async getUser() {
    return { data: { user: getSession()?.user ?? null }, error: null };
  },
  onAuthStateChange(cb: (event: string, session: any) => void) {
    listeners.add(cb);
    return { data: { subscription: { unsubscribe: () => listeners.delete(cb) } } };
  },
  async signInWithPassword({ email }: { email: string; password: string }) {
    currentSession = { ...makeSession(), user: { ...DEMO_USER, email: email || DEMO_USER.email } };
    sessionLoaded = true;
    try { sessionStorage.setItem(SESSION_KEY, "1"); } catch { /* navigation privée */ }
    emit("SIGNED_IN");
    return { data: { session: currentSession, user: currentSession.user }, error: null };
  },
  async signOut() {
    currentSession = null;
    sessionLoaded = true;
    try { sessionStorage.removeItem(SESSION_KEY); } catch { /* ignore */ }
    emit("SIGNED_OUT");
    return { error: null };
  },
};

// ---------------------------------------------------------------- storage
const uploads = new Map<string, string>();
const storage = {
  from(bucket: string) {
    return {
      async upload(path: string, file: Blob) {
        uploads.set(`${bucket}/${path}`, URL.createObjectURL(file));
        return { data: { path }, error: null };
      },
      getPublicUrl(path: string) {
        const key = `${bucket}/${path}`;
        return { data: { publicUrl: uploads.get(key) ?? `/storage/${key}` } };
      },
      async remove(paths: string[]) {
        paths.forEach((p) => uploads.delete(`${bucket}/${p}`));
        return { data: [], error: null };
      },
    };
  },
};

// ---------------------------------------------------------------- requêtes
type Filter = (r: Row) => boolean;

const likeToRegex = (pattern: string, flags: string) =>
  new RegExp(
    "^" +
      String(pattern)
        .replace(/[.+?^${}()|[\]\\]/g, "\\$&")
        .replace(/%/g, ".*")
        .replace(/_/g, ".") +
      "$",
    flags,
  );

const parseValue = (v: string): any => {
  if (v === "null") return null;
  if (v === "true") return true;
  if (v === "false") return false;
  return v;
};

const opFilter = (col: string, op: string, value: any): Filter => {
  switch (op) {
    case "eq": return (r) => r[col] == value; // eslint-disable-line eqeqeq
    case "neq": return (r) => r[col] != value; // eslint-disable-line eqeqeq
    case "gt": return (r) => r[col] > value;
    case "gte": return (r) => r[col] >= value;
    case "lt": return (r) => r[col] < value;
    case "lte": return (r) => r[col] <= value;
    case "like": return (r) => r[col] != null && likeToRegex(value, "").test(String(r[col]));
    case "ilike": return (r) => r[col] != null && likeToRegex(value, "i").test(String(r[col]));
    case "is": return (r) => (value === null ? r[col] == null : r[col] === value);
    case "in": {
      const list = Array.isArray(value)
        ? value
        : String(value).replace(/^\(|\)$/g, "").split(",").map((s) => parseValue(s.trim()));
      return (r) => list.includes(r[col]);
    }
    default:
      console.warn(`[démo] opérateur non géré : ${op}`);
      return () => true;
  }
};

class Query implements PromiseLike<Result> {
  private filters: Filter[] = [];
  private orders: { col: string; asc: boolean; nullsFirst: boolean }[] = [];
  private limitN: number | null = null;
  private rangeFromTo: [number, number] | null = null;
  private mode: "many" | "single" | "maybeSingle" = "many";
  private action: "select" | "insert" | "update" | "delete" | "upsert" = "select";
  private payload: any = null;
  private upsertKey = "id";
  private countMode = false;
  private headOnly = false;

  /**
   * @param source  autre jeu de données (copie publique en cache, cf. integrations/supabase/client.ts) :
   *                lecture seule, toujours en visiteur. Par défaut : data.json du mode démo.
   */
  constructor(private table: string, private source?: () => Promise<Record<string, Row[]>>) {}

  // --- lecture / retour
  select(_cols?: string, opts?: { count?: string; head?: boolean }) {
    if (opts?.count) this.countMode = true;
    if (opts?.head) this.headOnly = true;
    return this;
  }
  // --- écritures
  insert(rows: Row | Row[]) { this.action = "insert"; this.payload = rows; return this; }
  update(patch: Row) { this.action = "update"; this.payload = patch; return this; }
  upsert(rows: Row | Row[], opts?: { onConflict?: string }) {
    this.action = "upsert"; this.payload = rows; this.upsertKey = opts?.onConflict || "id"; return this;
  }
  delete() { this.action = "delete"; return this; }
  // --- filtres
  eq(c: string, v: any) { this.filters.push(opFilter(c, "eq", v)); return this; }
  neq(c: string, v: any) { this.filters.push(opFilter(c, "neq", v)); return this; }
  gt(c: string, v: any) { this.filters.push(opFilter(c, "gt", v)); return this; }
  gte(c: string, v: any) { this.filters.push(opFilter(c, "gte", v)); return this; }
  lt(c: string, v: any) { this.filters.push(opFilter(c, "lt", v)); return this; }
  lte(c: string, v: any) { this.filters.push(opFilter(c, "lte", v)); return this; }
  like(c: string, v: any) { this.filters.push(opFilter(c, "like", v)); return this; }
  ilike(c: string, v: any) { this.filters.push(opFilter(c, "ilike", v)); return this; }
  is(c: string, v: any) { this.filters.push(opFilter(c, "is", v)); return this; }
  in(c: string, v: any[]) { this.filters.push(opFilter(c, "in", v)); return this; }
  match(obj: Row) { Object.entries(obj).forEach(([c, v]) => this.eq(c, v)); return this; }
  filter(c: string, op: string, v: any) { this.filters.push(opFilter(c, op, v)); return this; }
  not(c: string, op: string, v: any) { const f = opFilter(c, op, v); this.filters.push((r) => !f(r)); return this; }
  or(expr: string) {
    const parts = expr.split(",").map((p) => {
      const [col, op, ...rest] = p.split(".");
      return opFilter(col, op, parseValue(rest.join(".")));
    });
    this.filters.push((r) => parts.some((f) => f(r)));
    return this;
  }
  // --- tri / pagination
  order(col: string, opts?: { ascending?: boolean; nullsFirst?: boolean }) {
    const asc = opts?.ascending !== false;
    this.orders.push({ col, asc, nullsFirst: opts?.nullsFirst ?? !asc });
    return this;
  }
  limit(n: number) { this.limitN = n; return this; }
  range(from: number, to: number) { this.rangeFromTo = [from, to]; return this; }
  single() { this.mode = "single"; return this; }
  maybeSingle() { this.mode = "maybeSingle"; return this; }

  then<A = Result, B = never>(
    onOk?: ((v: Result) => A | PromiseLike<A>) | null,
    onErr?: ((e: any) => B | PromiseLike<B>) | null,
  ): PromiseLike<A | B> {
    return this.run().then(onOk, onErr);
  }

  private async run(): Promise<Result> {
    if (this.source && this.action !== "select") {
      return { data: null, error: { message: "Copie publique en lecture seule", code: "42501" } };
    }
    let db: Record<string, Row[]>;
    try {
      db = await (this.source ?? loadDb)();
    } catch (e) {
      return { data: null, error: { message: e instanceof Error ? e.message : "Données indisponibles" } };
    }
    const rows = (db[this.table] ??= []);
    const admin = !this.source && isAdmin();
    const match = (r: Row) => this.filters.every((f) => f(r));
    const now = new Date().toISOString();

    if (this.action !== "select" && !admin && !PUBLIC_WRITE.includes(this.table)) {
      return { data: null, error: { message: "Mode démo : connexion admin requise", code: "42501" } };
    }
    const audit = admin && AUDITED.has(this.table)
      ? (action: string, oldRow: Row | null, newRow: Row | null) => logAudit(db, this.table, action, oldRow, newRow)
      : () => {};

    let out: Row[] = [];
    if (this.action === "insert" || this.action === "upsert") {
      const list = Array.isArray(this.payload) ? this.payload : [this.payload];
      for (const input of list) {
        const existing = this.action === "upsert" ? rows.find((r) => r[this.upsertKey] === input[this.upsertKey]) : null;
        if (existing) {
          const before = { ...existing };
          Object.assign(existing, input, { updated_at: now });
          audit("UPDATE", before, existing);
          out.push(existing);
        } else {
          const row = { ...(DEFAULTS[this.table] || {}), id: uuid(), created_at: now, updated_at: now, ...input };
          rows.push(row);
          audit("INSERT", null, row);
          out.push(row);
        }
      }
      persist(this.table, rows);
    } else if (this.action === "update") {
      out = rows.filter(match);
      out.forEach((r) => {
        const before = { ...r };
        Object.assign(r, this.payload, "updated_at" in r ? { updated_at: now } : {});
        audit("UPDATE", before, r);
      });
      persist(this.table, rows);
    } else if (this.action === "delete") {
      out = rows.filter(match);
      out.forEach((r) => audit("DELETE", r, null));
      db[this.table] = rows.filter((r) => !match(r));
      persist(this.table, db[this.table]);
    } else {
      const visible = admin ? rows : rows.filter(PUBLIC_READ[this.table] ?? (() => true));
      out = visible.filter(match);
      if (this.orders.length) {
        out = [...out].sort((a, b) => {
          for (const o of this.orders) {
            const av = a[o.col], bv = b[o.col];
            if (av == null && bv == null) continue;
            if (av == null) return o.nullsFirst ? -1 : 1;
            if (bv == null) return o.nullsFirst ? 1 : -1;
            if (av < bv) return o.asc ? -1 : 1;
            if (av > bv) return o.asc ? 1 : -1;
          }
          return 0;
        });
      }
      if (this.rangeFromTo) out = out.slice(this.rangeFromTo[0], this.rangeFromTo[1] + 1);
      if (this.limitN != null) out = out.slice(0, this.limitN);
    }

    const count = this.countMode ? out.length : null;
    const copy = JSON.parse(JSON.stringify(out));
    if (this.headOnly) return { data: null, error: null, count };
    if (this.mode === "single") {
      if (copy.length !== 1) return { data: null, error: { message: "Aucune ligne trouvée", code: "PGRST116" }, count };
      return { data: copy[0], error: null, count };
    }
    if (this.mode === "maybeSingle") return { data: copy[0] ?? null, error: null, count };
    return { data: copy, error: null, count };
  }
}

// ---------------------------------------------------------------- fonctions serveur (équivalents démo)
let demoQuoteCounter = 0;

const demoSubmitRequest = async (p: Row) => {
  const db = await loadDb();
  const name = String(p.full_name || "").trim();
  const phone = String(p.phone || "").trim();
  if (name.length < 2) return { data: null, error: { message: "Nom invalide" } };
  if (phone.length < 6) return { data: null, error: { message: "Téléphone invalide" } };
  const rows = (db.contact_requests ??= []);
  const year = new Date().getFullYear();
  if (!demoQuoteCounter) {
    demoQuoteCounter = rows.filter((r) => String(r.quote_number || "").startsWith(`DEV-${year}-`)).length;
  }
  const quote_number = p.request_type === "devis" ? `DEV-${year}-${String(++demoQuoteCounter).padStart(4, "0")}` : null;
  const now = new Date().toISOString();
  const row = {
    id: uuid(), created_at: now, updated_at: now, is_read: false, status: "nouveau", notes: "", amount: null, follow_up_date: null,
    request_type: p.request_type === "devis" ? "devis" : "contact", quote_number,
    full_name: name, phone, email: String(p.email || "").trim() || `${phone}@no-email.local`,
    company: p.company || null, city: p.city || null, usage_type: p.usage_type || null,
    items: Array.isArray(p.items) ? p.items : [], message: p.message || null,
    utm_source: p.utm_source ?? null, utm_medium: p.utm_medium ?? null, utm_campaign: p.utm_campaign ?? null,
    referrer: p.referrer ?? null, landing_page: p.landing_page ?? null, session_id: p.session_id ?? null,
  };
  rows.push(row);
  persist("contact_requests", rows);
  return { data: { id: row.id, quote_number }, error: null };
};

const casablancaDay = (iso: string) => new Date(new Date(iso).getTime() + 60 * 60 * 1000).toISOString().slice(0, 10);

/** Même calcul que analytics_report() en SQL (migration 20260930120100). */
const demoAnalyticsReport = async (from: string, to: string) => {
  const db = await loadDb();
  const ev = (db.analytics_events || []).filter((e) => e.created_at >= from && e.created_at < to);
  const count = (name: string) => ev.filter((e) => e.event === name).length;

  const sessions = new Map<string, { product: boolean; add: boolean; form: boolean; quote: boolean; contact: boolean }>();
  ev.forEach((e) => {
    if (!e.session_id) return;
    const s = sessions.get(e.session_id) ?? { product: false, add: false, form: false, quote: false, contact: false };
    if (e.event === "product_view") s.product = true;
    if (e.event === "quote_add") s.add = true;
    if (e.event === "form_start") s.form = true;
    if (e.event === "quote_submit") s.quote = true;
    if (e.event === "contact_submit") s.contact = true;
    sessions.set(e.session_id, s);
  });
  const starts = new Map<string, Row>();
  ev.filter((e) => e.event === "session_start" && e.session_id)
    .sort((a, b) => (a.created_at < b.created_at ? -1 : 1))
    .forEach((e) => { if (!starts.has(e.session_id)) starts.set(e.session_id, e); });

  const group = <T,>(list: T[], key: (x: T) => string) => {
    const m = new Map<string, T[]>();
    list.forEach((x) => { const k = key(x); m.set(k, [...(m.get(k) || []), x]); });
    return m;
  };
  const sessionList = [...sessions.values()];

  const daily = [...group(ev, (e) => casablancaDay(e.created_at)).entries()].sort().map(([day, list]) => ({
    day,
    sessions: new Set(list.map((e) => e.session_id).filter(Boolean)).size,
    page_views: list.filter((e) => e.event === "page_view").length,
    quotes: list.filter((e) => e.event === "quote_submit").length,
    contacts: list.filter((e) => e.event === "contact_submit").length,
  }));
  const pages = [...group(ev.filter((e) => e.event === "page_view" && e.path), (e) => e.path).entries()]
    .map(([path, l]) => ({ path, views: l.length })).sort((a, b) => b.views - a.views).slice(0, 15);
  const names = new Map((db.products || []).map((p) => [String(p.id), p.name]));
  const products = [...group(ev.filter((e) => ["product_view", "quote_add"].includes(e.event) && e.product_id), (e) => e.product_id).entries()]
    .map(([product_id, l]) => ({
      product_id, name: names.get(product_id) ?? null,
      views: l.filter((e) => e.event === "product_view").length, adds: l.filter((e) => e.event === "quote_add").length,
    }))
    .sort((a, b) => b.views - a.views || b.adds - a.adds).slice(0, 15);
  const searches = [...group(ev.filter((e) => e.event === "search" && e.label), (e) => String(e.label).trim().toLowerCase()).entries()]
    .map(([term, l]) => ({ term, count: l.length, no_result: l.filter((e) => Number(e.value) === 0).length }))
    .sort((a, b) => b.count - a.count).slice(0, 20);
  const src = [...starts.entries()].filter(([id]) => sessions.has(id)).map(([id, st]) => ({
    source: st.utm_source || st.referrer || "direct", medium: st.utm_medium || "", campaign: st.utm_campaign || "", s: sessions.get(id)!,
  }));
  const sources = [...group(src, (x) => `${x.source}|${x.medium}|${x.campaign}`).values()].map((l) => ({
    source: l[0].source, medium: l[0].medium, campaign: l[0].campaign, sessions: l.length,
    quotes: l.filter((x) => x.s.quote).length, contacts: l.filter((x) => x.s.contact).length,
  })).sort((a, b) => b.sessions - a.sessions).slice(0, 20);
  const devices = [...group([...starts.values()], (e) => e.device || "inconnu").entries()]
    .map(([device, l]) => ({ device, sessions: l.length })).sort((a, b) => b.sessions - a.sessions);

  return {
    totals: {
      sessions: sessions.size,
      visitors: new Set(ev.map((e) => e.visitor_id).filter(Boolean)).size,
      page_views: count("page_view"), product_views: count("product_view"), searches: count("search"),
      quote_adds: count("quote_add"), quote_opens: count("quote_open"), form_starts: count("form_start"),
      quote_submits: count("quote_submit"), contact_submits: count("contact_submit"),
      whatsapp_clicks: count("whatsapp_click"), phone_clicks: count("phone_click"), email_clicks: count("email_click"),
    },
    funnel: {
      sessions: sessions.size,
      product: sessionList.filter((s) => s.product).length,
      add: sessionList.filter((s) => s.add).length,
      form: sessionList.filter((s) => s.form).length,
      quote: sessionList.filter((s) => s.quote).length,
    },
    daily, pages, products, searches, sources, devices,
  };
};

/**
 * Démo uniquement : génère 30 jours de visites et quelques demandes FICTIVES pour montrer
 * les écrans Statistiques / Demandes. Les données sont marquées « (démo) ».
 */
const demoSeed = async () => {
  const db = await loadDb();
  const products = (db.products || []).filter((p) => p.is_published);
  const pick = <T,>(l: T[]) => l[Math.floor(Math.random() * l.length)];
  const campaigns = [
    { utm_source: "facebook", utm_medium: "paid_social", utm_campaign: "salles-de-sport-casablanca", w: 5 },
    { utm_source: "instagram", utm_medium: "paid_social", utm_campaign: "home-gym-automne", w: 4 },
    { utm_source: "google", utm_medium: "cpc", utm_campaign: "equipement-fitness-maroc", w: 3 },
    { utm_source: null, utm_medium: null, utm_campaign: null, referrer: "google.com", w: 6 },
    { utm_source: null, utm_medium: null, utm_campaign: null, referrer: null, w: 8 },
  ];
  const weighted = campaigns.flatMap((c) => Array(c.w).fill(c));
  const terms = ["tapis de course", "multi station", "banc", "velo", "elliptique", "rameur", "haltères", "cage crossfit"];
  const events: Row[] = [];
  const now = Date.now();
  let id = (db.analytics_events || []).length + 1;
  for (let d = 29; d >= 0; d--) {
    const perDay = 25 + Math.floor(Math.random() * 30) + (d < 10 ? 15 : 0);
    for (let s = 0; s < perDay; s++) {
      const sid = `demo-${d}-${s}-${Math.random().toString(36).slice(2, 8)}`;
      const c = pick(weighted);
      const device = Math.random() < 0.68 ? "mobile" : Math.random() < 0.8 ? "desktop" : "tablet";
      const visitor = Math.random() < 0.6 ? `v-${Math.floor(Math.random() * perDay * 20)}` : null; // ~60 % acceptent les cookies
      let t = now - d * 86400000 - Math.floor(Math.random() * 80000000);
      const push = (event: string, extra: Row = {}) => events.push({
        id: id++, created_at: new Date((t += 20000 + Math.random() * 90000)).toISOString(), event, session_id: sid,
        visitor_id: visitor, device, path: extra.path ?? "/", product_id: null, label: null, value: null,
        utm_source: null, utm_medium: null, utm_campaign: null, referrer: null, ...extra,
      });
      push("session_start", { utm_source: c.utm_source, utm_medium: c.utm_medium, utm_campaign: c.utm_campaign, referrer: c.referrer ?? null, path: "/" });
      push("page_view", { path: pick(["/", "/", "/professionnel/musculation", "/residentiel/cardio", "/professionnel", "/blog"]) });
      if (Math.random() < 0.2) push("search", (() => { const term = pick(terms); return { label: term, value: term === "cage crossfit" ? 0 : 3, path: "/recherche" }; })());
      if (Math.random() < 0.55) {
        const p = pick(products);
        push("page_view", { path: `/produit/${p.id}` });
        push("product_view", { product_id: p.id, label: p.name, path: `/produit/${p.id}` });
        if (Math.random() < 0.3) {
          push("quote_add", { product_id: p.id, label: p.name });
          if (Math.random() < 0.55) {
            push("page_view", { path: "/devis" });
            push("form_start", { path: "/devis" });
            if (Math.random() < 0.45) push("quote_submit", { path: "/devis", value: 1 });
          }
        }
      }
      if (Math.random() < 0.06) push("whatsapp_click");
      if (Math.random() < 0.03) push("phone_click");
      if (Math.random() < 0.02) push("contact_submit", { path: "/contact" });
    }
  }
  db.analytics_events = [...(db.analytics_events || []), ...events];
  persist("analytics_events", db.analytics_events);

  const cities = ["Casablanca", "Rabat", "Marrakech", "Tanger", "Agadir", "Fès"];
  const statuses = ["nouveau", "nouveau", "contacte", "devis_envoye", "gagne", "perdu"];
  const reqs = (db.contact_requests ??= []);
  for (let i = 0; i < 8; i++) {
    const c = pick(campaigns);
    const items = Array.from({ length: 1 + Math.floor(Math.random() * 3) }, () => {
      const p = pick(products);
      return { id: p.id, name: p.name, category: p.category, quantity: 1 + Math.floor(Math.random() * 3) };
    });
    const res = await demoSubmitRequest({
      request_type: i < 6 ? "devis" : "contact", usage_type: i % 2 ? "residentiel" : "professionnel",
      full_name: `Client fictif ${i + 1} (démo)`, phone: `06000000${String(i).padStart(2, "0")}`,
      company: i % 2 ? "" : `Salle démo ${i + 1}`, city: pick(cities), items: i < 6 ? items : [],
      message: "Demande générée pour la démonstration.", ...c, landing_page: "/",
    });
    const row = reqs.find((r) => r.id === (res.data as Row).id)!;
    row.created_at = new Date(now - (i * 3 + 1) * 86400000).toISOString();
    row.status = statuses[i % statuses.length];
    if (row.status === "contacte") row.follow_up_date = new Date(now - 86400000).toISOString().slice(0, 10);
    if (row.status === "gagne") row.amount = 85000;
  }
  persist("contact_requests", reqs);
  return { data: events.length, error: null };
};

/** Requête en lecture seule sur un autre jeu de données (copie publique servie par Netlify). */
export const snapshotQuery = (table: string, source: () => Promise<Record<string, Row[]>>) => new Query(table, source);

export const demoClient = {
  from: (table: string) => new Query(table),
  auth,
  storage,
  async rpc(fn: string, args?: Row) {
    if (fn === "has_role") return { data: isAdmin() && args?._role === "admin", error: null };
    if (fn === "submit_request") return demoSubmitRequest((args?.p ?? {}) as Row);
    if (fn === "analytics_report") {
      if (!isAdmin()) return { data: null, error: { message: "Accès réservé à l'administrateur" } };
      return { data: await demoAnalyticsReport(String(args?.p_from), String(args?.p_to)), error: null };
    }
    if (fn === "purge_audit_log" || fn === "purge_analytics_events") return { data: 0, error: null };
    if (fn === "resync_sheet") return { data: null, error: { message: "Envoi vers Google Sheets indisponible en mode démo (nécessite Supabase)." } };
    if (fn === "demo_seed") return isAdmin() ? demoSeed() : { data: null, error: { message: "Connexion admin requise" } };
    return { data: null, error: { message: `rpc ${fn} non disponible en démo` } };
  },
  channel() {
    const ch: any = { on: () => ch, subscribe: () => ch, unsubscribe: () => {} };
    return ch;
  },
  removeChannel() {},
};

import { getDb } from "../db/schema";
import { defaultLabor, defaultSettings, defaultTemplates } from "../db/seed";
import { nowIso, todayIso, uid } from "../db/ids";
import { buildCatalog, freezeCatalog } from "../engine/calc";
import type {
  Customer,
  Project,
  ProjeDurum,
  Quote,
  QuoteTuru,
  Settings,
} from "../types";
import { newQuote, reviseQuoteDoc } from "./quote-ops";

export async function ensureSeed(): Promise<void> {
  const db = getDb();
  const s = await db.settings.get("main");
  if (!s) {
    await db.transaction("rw", db.settings, db.labor, db.templates, async () => {
      await db.settings.put(defaultSettings());
      if ((await db.labor.count()) === 0) await db.labor.bulkPut(defaultLabor());
      if ((await db.templates.count()) === 0) await db.templates.bulkPut(defaultTemplates());
    });
  }
}

/* ------------------------------- Müşteri/proje ------------------------------ */

export async function saveCustomer(c: Partial<Customer> & { ad: string }): Promise<string> {
  const db = getDb();
  const id = c.id ?? uid();
  const prev = c.id ? await db.customers.get(c.id) : undefined;
  await db.customers.put({
    id,
    ad: c.ad,
    telefon: c.telefon ?? prev?.telefon ?? "",
    eposta: c.eposta ?? prev?.eposta ?? "",
    adres: c.adres ?? prev?.adres ?? "",
    notlar: c.notlar ?? prev?.notlar ?? "",
    olusturuldu: prev?.olusturuldu ?? nowIso(),
  });
  return id;
}

export async function deleteCustomer(id: string): Promise<boolean> {
  const db = getDb();
  if ((await db.projects.where("customerId").equals(id).count()) > 0) return false;
  await db.customers.delete(id);
  return true;
}

export async function saveProject(p: Partial<Project> & { customerId: string; ad: string }): Promise<string> {
  const db = getDb();
  const id = p.id ?? uid();
  const prev = p.id ? await db.projects.get(p.id) : undefined;
  await db.projects.put({
    id,
    customerId: p.customerId,
    ad: p.ad,
    adres: p.adres ?? prev?.adres ?? "",
    durum: p.durum ?? prev?.durum ?? "kesif",
    kesifTarihi: p.kesifTarihi ?? prev?.kesifTarihi,
    baslangic: p.baslangic ?? prev?.baslangic,
    bitis: p.bitis ?? prev?.bitis,
    notlar: p.notlar ?? prev?.notlar ?? "",
    onayliQuoteId: p.onayliQuoteId ?? prev?.onayliQuoteId,
    olusturuldu: prev?.olusturuldu ?? nowIso(),
  });
  return id;
}

export async function setProjectStatus(id: string, durum: ProjeDurum): Promise<void> {
  await getDb().projects.update(id, { durum });
}

export async function deleteProject(id: string): Promise<void> {
  const db = getDb();
  await db.transaction(
    "rw",
    [db.projects, db.quotes, db.payments, db.extraJobs, db.deliveries, db.handovers, db.expenses, db.events, db.files],
    async () => {
      await db.quotes.where("projectId").equals(id).delete();
      await db.payments.where("projectId").equals(id).delete();
      await db.extraJobs.where("projectId").equals(id).delete();
      await db.deliveries.where("projectId").equals(id).delete();
      await db.handovers.where("projectId").equals(id).delete();
      await db.expenses.where("projectId").equals(id).delete();
      await db.events.where("projectId").equals(id).delete();
      await db.files.where("projectId").equals(id).delete();
      await db.projects.delete(id);
    },
  );
}

/* ---------------------------------- Teklif --------------------------------- */

export async function createQuote(projectId: string, tur: QuoteTuru): Promise<string> {
  const db = getDb();
  const project = await db.projects.get(projectId);
  if (!project) throw new Error("Proje bulunamadı");
  const settings = (await db.settings.get("main")) ?? defaultSettings();
  const yil = new Date().getFullYear();
  const mevcut = await db.quotes.toArray();
  const sira = mevcut.filter((q) => q.yil === yil).reduce((a, q) => Math.max(a, q.sira), 0) + 1;
  const q = newQuote({ project, tur, yil, sira, settings });
  await db.transaction("rw", db.quotes, db.projects, async () => {
    await db.quotes.put(q);
    if (project.durum === "kesif") await db.projects.update(project.id, { durum: "teklif" });
  });
  return q.id;
}

/** Taslak teklifi düzenler. Gönderilmiş/onaylı teklif değiştirilemez (revize açılır). */
export async function updateQuote(id: string, mutate: (q: Quote) => void): Promise<void> {
  const db = getDb();
  await db.transaction("rw", db.quotes, async () => {
    const q = await db.quotes.get(id);
    if (!q || q.durum !== "taslak") return;
    mutate(q);
    q.guncellendi = nowIso();
    await db.quotes.put(q);
  });
}

export async function deleteQuote(id: string): Promise<boolean> {
  const db = getDb();
  const q = await db.quotes.get(id);
  if (!q || q.durum !== "taslak") return false;
  await db.quotes.delete(id);
  return true;
}

export async function reviseQuote(id: string, kesineCevir = false): Promise<string | null> {
  const db = getDb();
  const q = await db.quotes.get(id);
  if (!q || q.durum === "taslak" || q.durum === "onaylandi") return null;
  const settings = await db.settings.get("main");
  const next = reviseQuoteDoc(q, { kesineCevir, settings });
  await db.transaction("rw", db.quotes, async () => {
    if (q.durum === "gonderildi") await db.quotes.update(q.id, { durum: "yerineGecti" });
    await db.quotes.put(next);
  });
  return next.id;
}

/** Gönderildi: fiyatlar dondurulur ve teklif düzenlemeye kapanır. */
export async function sendQuote(id: string): Promise<void> {
  const db = getDb();
  const q = await db.quotes.get(id);
  if (!q || q.durum !== "taslak") return;
  const live = buildCatalog(await db.products.toArray(), await db.labor.toArray());
  const now = nowIso();
  q.dondurulmus = freezeCatalog(q, live, now);
  q.durum = "gonderildi";
  q.guncellendi = now;
  await db.quotes.put(q);
}

export async function rejectQuote(id: string): Promise<void> {
  const db = getDb();
  const q = await db.quotes.get(id);
  if (!q || q.durum !== "gonderildi") return;
  await db.quotes.update(id, { durum: "reddedildi", guncellendi: nowIso() });
}

export async function approveQuote(id: string, secenekId: string): Promise<void> {
  const db = getDb();
  await db.transaction("rw", db.quotes, db.projects, async () => {
    const q = await db.quotes.get(id);
    if (!q || q.durum !== "gonderildi") return;
    const kardesler = await db.quotes.where("rootId").equals(q.rootId).toArray();
    for (const k of kardesler) {
      if (k.id !== id && (k.durum === "gonderildi" || k.durum === "taslak")) {
        await db.quotes.update(k.id, { durum: "yerineGecti" });
      }
    }
    await db.quotes.update(id, { durum: "onaylandi", secilenSecenekId: secenekId, guncellendi: nowIso() });
    await db.projects.update(q.projectId, { durum: "onayli", onayliQuoteId: id });
  });
}

/** Taslağa geri dön (yanlışlıkla gönderildi işaretlendiyse). Dondurulan fiyatlar silinir. */
export async function reopenQuote(id: string): Promise<void> {
  const db = getDb();
  const q = await db.quotes.get(id);
  if (!q || q.durum !== "gonderildi") return;
  await db.quotes.update(id, { durum: "taslak", dondurulmus: undefined, guncellendi: nowIso() });
}

/* --------------------------------- Ayarlar --------------------------------- */

export async function saveSettings(patch: Partial<Settings>): Promise<void> {
  const db = getDb();
  const cur = (await db.settings.get("main")) ?? defaultSettings();
  await db.settings.put({ ...cur, ...patch, id: "main" });
}

export { todayIso };

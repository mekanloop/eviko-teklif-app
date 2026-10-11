import { getDb } from "../db/schema";

const TABLES = [
  "products", "labor", "templates", "customers", "projects", "quotes", "payments",
  "extraJobs", "deliveries", "handovers", "expenses", "events", "settings",
] as const;

function blobToDataUrl(b: Blob): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(String(r.result));
    r.onerror = () => rej(r.error);
    r.readAsDataURL(b);
  });
}

async function dataUrlToBlob(u: string): Promise<Blob> {
  return await (await fetch(u)).blob();
}

export interface BackupFile {
  uygulama: "eviko-teklif";
  surum: 1;
  tarih: string;
  tablolar: Record<string, unknown[]>;
}

export async function exportBackup(): Promise<BackupFile> {
  const db = getDb();
  const tablolar: Record<string, unknown[]> = {};
  for (const t of TABLES) tablolar[t] = await db.table(t).toArray();
  const files = await db.files.toArray();
  tablolar.files = await Promise.all(files.map(async (f) => ({ ...f, blob: await blobToDataUrl(f.blob) })));
  return { uygulama: "eviko-teklif", surum: 1, tarih: new Date().toISOString(), tablolar };
}

export async function importBackup(data: BackupFile): Promise<void> {
  if (data?.uygulama !== "eviko-teklif" || !data.tablolar) throw new Error("Geçersiz yedek dosyası");
  const db = getDb();
  const files = await Promise.all(
    ((data.tablolar.files ?? []) as Array<Record<string, unknown> & { blob: string }>).map(async (f) => ({
      ...f,
      blob: await dataUrlToBlob(f.blob),
    })),
  );
  await db.transaction("rw", db.tables, async () => {
    for (const t of TABLES) {
      await db.table(t).clear();
      const rows = data.tablolar[t] ?? [];
      if (rows.length) await db.table(t).bulkPut(rows);
    }
    await db.files.clear();
    if (files.length) await db.files.bulkPut(files as never);
  });
}

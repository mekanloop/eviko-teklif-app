import Dexie, { type EntityTable } from "dexie";
import type {
  CalEvent,
  Customer,
  Delivery,
  Expense,
  ExtraJob,
  Handover,
  LaborType,
  Payment,
  Product,
  ProjectFile,
  Project,
  Quote,
  Settings,
  WorkTemplate,
} from "../types";

/**
 * Yerel veritabanı (tarayıcı IndexedDB). Uygulama yalnızca `lib/data` katmanı üzerinden
 * buraya dokunur; Supabase'e geçişte yalnızca o katman değişir.
 */
export class EvikoDB extends Dexie {
  products!: EntityTable<Product, "id">;
  labor!: EntityTable<LaborType, "id">;
  templates!: EntityTable<WorkTemplate, "id">;
  customers!: EntityTable<Customer, "id">;
  projects!: EntityTable<Project, "id">;
  quotes!: EntityTable<Quote, "id">;
  payments!: EntityTable<Payment, "id">;
  extraJobs!: EntityTable<ExtraJob, "id">;
  deliveries!: EntityTable<Delivery, "id">;
  handovers!: EntityTable<Handover, "id">;
  expenses!: EntityTable<Expense, "id">;
  events!: EntityTable<CalEvent, "id">;
  files!: EntityTable<ProjectFile, "id">;
  settings!: EntityTable<Settings, "id">;

  constructor(name = "eviko-teklif") {
    super(name);
    this.version(1).stores({
      products: "id, tedarikci, kategori, ad, aktif",
      labor: "id",
      templates: "id, grup, sira",
      customers: "id, ad",
      projects: "id, customerId, durum",
      quotes: "id, projectId, customerId, rootId, no, durum",
      payments: "id, projectId",
      extraJobs: "id, projectId",
      deliveries: "id, projectId",
      handovers: "id, projectId",
      expenses: "id, projectId",
      events: "id, tarih, projectId",
      files: "id, projectId",
      settings: "id",
    });
  }
}

let _db: EvikoDB | null = null;
export function getDb(): EvikoDB {
  if (!_db) _db = new EvikoDB();
  return _db;
}

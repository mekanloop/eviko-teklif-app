"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { useMemo } from "react";
import { getDb } from "../db/schema";
import { buildCatalog, type Catalog } from "../engine/calc";
import type { Quote } from "../types";

/** undefined = yükleniyor */
export function useSettings() {
  return useLiveQuery(() => getDb().settings.get("main"), []);
}
export function useProducts() {
  return useLiveQuery(() => getDb().products.toArray(), []);
}
export function useCabinets() {
  return useLiveQuery(async () => (await getDb().cabinets.toArray()).sort((a, b) => a.ad.localeCompare(b.ad, "tr")), []);
}
export function useGiderler() {
  return useLiveQuery(() => getDb().giderler.toArray(), []);
}
export function useAllExpensesList() {
  return useLiveQuery(async () => (await getDb().expenses.toArray()).sort((a, b) => b.tarih.localeCompare(a.tarih)), []);
}
export function useAllPaymentsList() {
  return useLiveQuery(async () => (await getDb().payments.toArray()).sort((a, b) => b.tarih.localeCompare(a.tarih)), []);
}
export function useLabor() {
  return useLiveQuery(() => getDb().labor.toArray(), []);
}
export function useTemplates() {
  return useLiveQuery(async () => (await getDb().templates.toArray()).sort((a, b) => a.sira - b.sira), []);
}
export function useCustomers() {
  return useLiveQuery(async () => (await getDb().customers.toArray()).sort((a, b) => a.ad.localeCompare(b.ad, "tr")), []);
}
export function useCustomer(id: string) {
  return useLiveQuery(() => getDb().customers.get(id), [id]);
}
export function useProjects() {
  return useLiveQuery(async () => (await getDb().projects.toArray()).sort((a, b) => b.olusturuldu.localeCompare(a.olusturuldu)), []);
}
export function useProject(id: string) {
  return useLiveQuery(() => getDb().projects.get(id), [id]);
}
export function useQuotes() {
  return useLiveQuery(async () => (await getDb().quotes.toArray()).sort((a, b) => b.olusturuldu.localeCompare(a.olusturuldu)), []);
}
export function useProjectQuotes(projectId: string) {
  return useLiveQuery(async () => (await getDb().quotes.where("projectId").equals(projectId).toArray()).sort((a, b) => a.olusturuldu.localeCompare(b.olusturuldu)), [projectId]);
}
export function useQuote(id: string) {
  return useLiveQuery(() => getDb().quotes.get(id), [id]);
}
export function usePayments(projectId: string) {
  return useLiveQuery(async () => (await getDb().payments.where("projectId").equals(projectId).toArray()).sort((a, b) => a.tarih.localeCompare(b.tarih)), [projectId]);
}
export function useExtraJobs(projectId: string) {
  return useLiveQuery(async () => (await getDb().extraJobs.where("projectId").equals(projectId).toArray()).sort((a, b) => a.tarih.localeCompare(b.tarih)), [projectId]);
}
export function useDeliveries(projectId: string) {
  return useLiveQuery(() => getDb().deliveries.where("projectId").equals(projectId).toArray(), [projectId]);
}
export function useHandovers(projectId: string) {
  return useLiveQuery(() => getDb().handovers.where("projectId").equals(projectId).toArray(), [projectId]);
}
export function useExpenses(projectId: string) {
  return useLiveQuery(async () => (await getDb().expenses.where("projectId").equals(projectId).toArray()).sort((a, b) => a.tarih.localeCompare(b.tarih)), [projectId]);
}
export function useAllPayments() {
  return useLiveQuery(() => getDb().payments.toArray(), []);
}
export function useAllExtraJobs() {
  return useLiveQuery(() => getDb().extraJobs.toArray(), []);
}
export function useAllExpenses() {
  return useLiveQuery(() => getDb().expenses.toArray(), []);
}
export function useEvents() {
  return useLiveQuery(async () => (await getDb().events.toArray()).sort((a, b) => (a.tarih + (a.saat ?? "")).localeCompare(b.tarih + (b.saat ?? ""))), []);
}
export function useFiles(projectId: string) {
  return useLiveQuery(async () => (await getDb().files.where("projectId").equals(projectId).toArray()).sort((a, b) => b.tarih.localeCompare(a.tarih)), [projectId]);
}

/** Güncel fiyat kataloğu; ürün/usta değişince yeniden hesaplanır. */
export function useCatalog(): Catalog | undefined {
  const products = useProducts();
  const labor = useLabor();
  const cabinets = useCabinets();
  const giderler = useGiderler();
  return useMemo(() => (products && labor && cabinets && giderler ? buildCatalog(products, labor, cabinets, giderler) : undefined), [products, labor, cabinets, giderler]);
}

export type { Quote };

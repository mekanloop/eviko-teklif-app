import type { OptionResult } from "@/lib/engine/calc";
import type { ProjectFinance } from "@/lib/engine/finance";
import type { Customer, Project, Quote } from "@/lib/types";

export interface ProjectCtx {
  project: Project;
  customer: Customer | undefined;
  quote: Quote | undefined;
  result: OptionResult | undefined;
  finance: ProjectFinance;
}

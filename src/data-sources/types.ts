import type { Signal } from "@/types";

export interface DataSourceContext {
  company: string;
  url: string;
  datePosted?: string;
  hasStructuredData: boolean;
}

export type DataSourceScope = "company" | "job";

export interface DataSource {
  readonly id: string;
  readonly requiresApiKey: boolean;
  readonly scope: DataSourceScope;
  check(context: DataSourceContext): Promise<Signal | Signal[]>;
}

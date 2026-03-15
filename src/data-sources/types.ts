import type { Signal } from "@/types";

export interface DataSourceContext {
  company: string;
  url: string;
  datePosted?: string;
  hasStructuredData: boolean;
}

export interface DataSource {
  readonly id: string;
  readonly requiresApiKey: boolean;
  check(context: DataSourceContext): Promise<Signal>;
}

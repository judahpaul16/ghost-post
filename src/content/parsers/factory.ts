import type { SiteParser } from "./types";
import type { CustomPageConfig } from "@/types";
import { linkedinParser } from "./linkedin";
import { greenhouseParser } from "./greenhouse";
import { leverParser } from "./lever";
import { workdayParser } from "./workday";
import { indeedParser } from "./indeed";
import { oracleParser } from "./oracle";
import { genericParser } from "./generic";
import { createCustomParser } from "./custom";

const builtinParsers: SiteParser[] = [
  linkedinParser,
  greenhouseParser,
  leverParser,
  workdayParser,
  indeedParser,
  oracleParser,
];

export class ParserFactory {
  static create(url: URL, customPages: CustomPageConfig[] = []): SiteParser {
    const customParsers = customPages.map(createCustomParser);
    const match = [...customParsers, ...builtinParsers].find((p) => p.canParse(url));
    return match ?? genericParser;
  }
}

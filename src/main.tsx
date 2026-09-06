import { index, json, jsx, response, site } from "deno-static/mod.ts";

import { JepIndexSchema } from "@/lib/openjdk-jep/types.ts";
import { withTimeTag } from "@/lib/timed.ts";

import { SiteConfig } from "./config.ts";
import { fetchAll } from "./data.ts";
import { buildFeed } from "./feed.ts";
import { JepHistorySchema } from "./types.ts";

import { HomePage } from "./pages/home.tsx";

const { currentIndex, history } = await withTimeTag(
  fetchAll(),
  (tag) => console.log(`[fetch]`, `done`, `(${tag})`),
);

await site(() => ({
  [index]: jsx(<HomePage index={currentIndex} />),

  [SiteConfig.feedPath]: response(buildFeed(history)),

  [SiteConfig.storedHistoryPath]: json(JepHistorySchema.encode(history)),
  [SiteConfig.storedIndexPath]: json(JepIndexSchema.encode(currentIndex)),
}));

import { JepIndexSchema } from "@/lib/openjdk-jep/types.ts";
import { computeStateDelta, fetchJepIndex } from "@/lib/openjdk-jep/index.ts";
import { withTimeTag } from "@/lib/timed.ts";

import { SiteConfig } from "./config.ts";
import { JepHistorySchema } from "./types.ts";

const SKIP = Deno.env.get("ACTION_SKIP") === "true";

export async function fetchAll() {
  const currentIndex = await withTimeTag(
    fetchJepIndex(),
    (tag) => console.log(`[fetch]`, `OpenJDK JEP index`, `(${tag})`),
  );

  const storedIndex = await withTimeTag(
    fetchStoredIndex(),
    (tag) => console.log(`[fetch]`, `stored index`, `(${tag})`),
  );

  const storedHistory = await withTimeTag(
    fetchStoredHistory(),
    (tag) => console.log(`[fetch]`, `stored history`, `(${tag})`),
  );

  const delta = Array.from(computeStateDelta(storedIndex, currentIndex));

  if (delta.length > SiteConfig.historyAnomalyLength) {
    throw new Error(
      `history anomaly detected: delta bigger than ${SiteConfig.historyAnomalyLength} items`,
    );
  }

  const history = [...delta, ...storedHistory];

  return {
    currentIndex,
    history,
  };
}

async function fetchStoredHistory() {
  const res = await fetch(
    new URL(SiteConfig.storedHistoryPath, SiteConfig.baseUrl),
  );

  if (!res.ok || !res.body) {
    console.log(`[fetch]`, `did not fetch stored history`);
    return [];
  }

  return JepHistorySchema.decode(await res.json());
}

async function fetchStoredIndex() {
  if (SKIP) {
    console.log(`[fetch]`, "ACTION_SKIP=true, skipping this run's delta");
    return undefined;
  }

  const res = await fetch(
    new URL(SiteConfig.storedIndexPath, SiteConfig.baseUrl),
  );

  if (!res.ok || !res.body) {
    console.log(`[fetch]`, `did not fetch stored index`);
    return undefined;
  }

  return JepIndexSchema.decode(await res.json());
}

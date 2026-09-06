import * as HTML from "npm:node-html-parser@^9.0.1";

import {
  JepIndex,
  JepIndexItem,
  JepIndexItemStateDelta,
  JepIndexMetadata,
  JepStateShorthandCodec,
  JepTypeShorthandCodec,
} from "./types.ts";

export const JEP_INDEX_URL = new URL("https://openjdk.org/jeps/0");

export function* computeStateDelta(
  previous: JepIndex | undefined,
  current: JepIndex,
): Generator<JepIndexItemStateDelta> {
  if (previous === undefined) {
    return;
  }

  const previousByJep = new Map<string, JepIndexItem>(
    previous.items.map((item) => [item.jep, item]),
  );

  for (const item of current.items) {
    const reference = previousByJep.get(item.jep);
    if (reference === undefined) {
      yield {
        previousState: undefined,
        item: item,
        updated: current.metadata.updated,
      };
    } else if (item.state !== reference.state) {
      yield {
        previousState: reference.state,
        item: item,
        updated: current.metadata.updated,
      };
    }
  }
}

export async function fetchJepIndex(): Promise<JepIndex> {
  const res = await fetch(JEP_INDEX_URL, {
    headers: {
      "user-agent": "curl/8.14.1",
    },
  });

  if (!res.ok) {
    throw new Error(`failed to fetch: ${res.status} ${res.statusText}`);
  }

  return parseJepIndex(await res.text());
}

function parseJepIndex(source: string): JepIndex {
  const doc = HTML.parse(source);

  const metadata = parseJepIndexMetadata(parseJepPageMetadata(doc));

  const items = Array.from(parseJepIndexItems(doc));

  return {
    metadata,
    items,
  };
}

function parseJepIndexMetadata(meta: Map<string, string>): JepIndexMetadata {
  return {
    created: parseJepDateTime(required(meta.get("Created"))),
    updated: parseJepDateTime(required(meta.get("Updated"))),
  };
}

// NOTE assuming timestamps are UTC
function parseJepDateTime(value: string): Temporal.Instant {
  const re =
    /^(?<year>\d{4})\/(?<month>\d{2})\/(?<day>\d{2}) (?<hour>\d{2}):(?<minute>\d{2})$/;

  const fixed = value.replace(re, "$<year>-$<month>-$<day>T$<hour>:$<minute>");

  return Temporal.PlainDateTime.from(fixed).toZonedDateTime("UTC").toInstant();
}

function parseJepPageMetadata(root: HTML.HTMLElement): Map<string, string> {
  const head = required(root.querySelector("table.head"));

  const metadata = new Map<string, string>();

  for (const row of head.querySelectorAll("tr")) {
    const name = required(text(row.querySelector("td:nth-child(1)")));
    const value = required(text(row.querySelector("td:nth-child(2)")));

    metadata.set(name, value);
  }

  return metadata;
}

function* parseJepIndexItems(root: HTML.HTMLElement) {
  for (const table of root.querySelectorAll("table.jeps")) {
    const tableTitle = required(text(table.previousElementSibling));

    for (const row of table.querySelectorAll("tr")) {
      const type = required(text(row.querySelector("td:nth-child(1)")));
      const state = required(text(row.querySelector("td:nth-child(2)")));
      const release = text(row.querySelector("td:nth-child(3)"));
      const area = text(row.querySelector("td.cl"));
      const component = text(row.querySelector("td.cr"));
      const jep = required(text(row.querySelector("td.jep")));
      const title = required(text(row.querySelector("td:last-child")));
      const href = required(
        row.querySelector("td:last-child a")?.getAttribute("href"),
      );

      yield {
        category: tableTitle,
        type: required(JepTypeShorthandCodec.parse(type)),
        state: required(JepStateShorthandCodec.parse(state)),
        area: parseComponent(area),
        component: parseComponent(component),
        release,
        jep,
        title,
        url: new URL(href, JEP_INDEX_URL),
      } satisfies JepIndexItem;
    }
  }
}

function parseComponent(value: string | undefined): string | undefined {
  switch (value) {
    case undefined:
      return undefined;
    case "—":
      return undefined;
    default:
      return value;
  }
}

function text(elem: HTML.HTMLElement | null): string | undefined {
  if (elem === null) {
    return undefined;
  }
  const value = elem.textContent.trim();
  return value === "" ? undefined : value;
}

function required<T>(value: T | undefined | null): T {
  if (value === undefined || value === null) {
    throw new Error("expected");
  }
  return value;
}

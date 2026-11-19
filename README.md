# openjdk-jep-history

This tool tracks the [OpenJDK JEP Index](https://openjdk.org/jeps/0) and
publishes an RSS feed that contains individual JEP updates.

Inspired by https://github.com/PerfectSlayer/openjdk-jep-bsky

## Prerequisites

- [Deno](https://deno.land) installed on your system

## Development

Fetch the latest source data and start the local development server:

```bash
deno task serve
```

The site will be available at `http://localhost:3000`.

## Building

Build the generated content and static site:

```bash
deno task build
```

The built site will be output to the `dist/` directory.

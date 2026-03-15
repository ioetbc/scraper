import { configure, getConsoleSink, getLogger, type LogRecord } from "@logtape/logtape";

function formatLogRecord(record: LogRecord): string {
  const timestamp = new Date(record.timestamp).toISOString();
  const level = record.level.toUpperCase().padEnd(5);
  const category = record.category.join(".");
  const message = record.message.map(m => typeof m === "string" ? m : JSON.stringify(m)).join("");

  // Format properties as key=value pairs for readability
  const props = Object.entries(record.properties)
    .map(([k, v]) => `${k}=${JSON.stringify(v)}`)
    .join(" ");

  return props
    ? `${timestamp} ${level} [${category}] ${message} ${props}\n`
    : `${timestamp} ${level} [${category}] ${message}\n`;
}

export async function setupLogging() {
  await configure({
    sinks: {
      console: getConsoleSink({ formatter: formatLogRecord }),
    },
    loggers: [
      {
        category: ["habitz"],
        lowestLevel: "debug",
        sinks: ["console"],
      },
      {
        category: ["logtape", "meta"],
        lowestLevel: "warning",
        sinks: ["console"],
      },
    ],
  });
}

// Pre-configured loggers for each module
export const searchLogger = getLogger(["habitz", "search"]);
export const apifyLogger = getLogger(["habitz", "apify"]);
export const classifierLogger = getLogger(["habitz", "classifier"]);
export const brandExplorerLogger = getLogger(["habitz", "brand-explorer"]);

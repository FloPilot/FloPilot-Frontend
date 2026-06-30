export type ParsedPricingGrid = {
  columns: string[];
  rows: { minQty: number; prices: number[] }[];
};

/** Parse raw CSV text into a 2-D array, respecting quoted fields. */
function parseCsvRows(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  const s = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (inQuotes) {
      if (ch === '"') {
        if (s[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += ch;
    }
  }
  row.push(field);
  rows.push(row);
  return rows;
}

function toNumber(value: string | undefined): number {
  const cleaned = String(value ?? "")
    .replace(/[$,\s]/g, "")
    .trim();
  const n = Number(cleaned);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

/**
 * Parse a pricing CSV in the grid format:
 *   - first column = quantity break (min qty)
 *   - remaining columns = price options (e.g. "1 COLOR", "2 COLOR")
 *   - each cell = per-unit price
 */
export function parsePricingCsv(
  text: string
): { grid?: ParsedPricingGrid; error?: string } {
  const records = parseCsvRows(text).filter((r) =>
    r.some((c) => c.trim() !== "")
  );

  if (records.length < 2) {
    return {
      error: "CSV needs a header row and at least one quantity row.",
    };
  }

  const header = records[0];
  const columns = header
    .slice(1)
    .map((c, i) => c.trim() || `Column ${i + 1}`);

  if (columns.length === 0) {
    return { error: "No price columns found after the quantity column." };
  }

  const rows: { minQty: number; prices: number[] }[] = [];
  for (const record of records.slice(1)) {
    const minQty = parseInt(String(record[0] ?? "").replace(/[^\d]/g, ""), 10);
    if (!Number.isFinite(minQty) || minQty <= 0) continue;
    const prices = columns.map((_, i) => toNumber(record[i + 1]));
    rows.push({ minQty, prices });
  }

  if (rows.length === 0) {
    return { error: "No valid quantity rows found in the CSV." };
  }

  rows.sort((a, b) => a.minQty - b.minQty);
  return { grid: { columns, rows } };
}

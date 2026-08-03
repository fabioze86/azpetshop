export function parseCsv(content: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  const text = content.replace(/\r\n/g, "\n");

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows.filter((r) => !(r.length === 1 && r[0] === ""));
}

export function parseCsvRecords(content: string): Record<string, string>[] {
  const rows = parseCsv(content);
  if (rows.length === 0) return [];
  const [header, ...rest] = rows;
  return rest.map((row) => {
    const record: Record<string, string> = {};
    header.forEach((key, idx) => {
      record[key.trim()] = (row[idx] ?? "").trim();
    });
    return record;
  });
}

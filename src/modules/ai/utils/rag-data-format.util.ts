const toTableCell = (value: unknown): string => {
  if (value === null || value === undefined) {
    return '';
  }

  if (typeof value === 'string') {
    return value;
  }

  if (
    typeof value === 'number' ||
    typeof value === 'boolean' ||
    typeof value === 'bigint'
  ) {
    return String(value);
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
};

export function flattenJsonToTable(
  tableName: string,
  data: Record<string, any> | Array<Record<string, any>>,
): string {
  const safeTableName = (tableName || 'TABLE').toUpperCase();
  const rows = Array.isArray(data) ? data : [data];

  if (rows.length === 0) {
    return `[${safeTableName}]\n`;
  }

  const headerSet = new Set<string>();
  for (const row of rows) {
    for (const key of Object.keys(row)) {
      headerSet.add(key);
    }
  }
  const headerKeys = Array.from(headerSet);

  const header = headerKeys.join(' | ');
  const body = rows
    .map((row) => headerKeys.map((key) => toTableCell(row[key])).join('|'))
    .join('\n');

  return body ? `[${safeTableName}]\n ${header} ${body}` : `[${safeTableName}]\n ${header}`;
}

const maybeParseJsonString = (value: string): unknown => {
  const trimmed = value.trim();
  if (!trimmed) {
    return value;
  }

  if (
    (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
    (trimmed.startsWith('[') && trimmed.endsWith(']'))
  ) {
    try {
      return JSON.parse(trimmed);
    } catch {
      return value;
    }
  }

  return value;
};

const flattenValue = (
  value: unknown,
  keyPath: string,
  result: Record<string, string>,
): void => {
  if (value === null || value === undefined) {
    result[keyPath] = '';
    return;
  }

  if (typeof value === 'string') {
    const parsed = maybeParseJsonString(value);
    if (parsed !== value) {
      flattenValue(parsed, keyPath, result);
      return;
    }
    result[keyPath] = value;
    return;
  }

  if (value instanceof Date) {
    result[keyPath] = value.toISOString();
    return;
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      result[keyPath] = '[]';
      return;
    }

    value.forEach((item, index) => {
      flattenValue(item, `${keyPath}[${index}]`, result);
    });
    return;
  }

  if (typeof value === 'object') {
    const objectValue = value as Record<string, unknown>;
    const keys = Object.keys(objectValue);

    if (keys.length === 0) {
      result[keyPath] = '{}';
      return;
    }

    for (const key of keys) {
      const nestedKey = keyPath ? `${keyPath}.${key}` : key;
      flattenValue(objectValue[key], nestedKey, result);
    }
    return;
  }

  result[keyPath] = String(value);
};

const flattenRows = (
  data: Record<string, any> | Array<Record<string, any>>,
): Array<Record<string, string>> => {
  const rows = Array.isArray(data) ? data : [data];

  return rows.map((row) => {
    const flattened: Record<string, string> = {};
    for (const [key, value] of Object.entries(row ?? {})) {
      flattenValue(value, key, flattened);
    }
    return flattened;
  });
};

const escapeCsvValue = (value: string): string => {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
};

export function flattenJsonToCsvTable(
  tableName: string,
  data: Record<string, any> | Array<Record<string, any>>,
): string {
  const safeTableName = (tableName || 'TABLE').toUpperCase();
  const rows = flattenRows(data);

  if (rows.length === 0) {
    return `# ${safeTableName}\n`;
  }

  const headerSet = new Set<string>();
  for (const row of rows) {
    for (const key of Object.keys(row)) {
      headerSet.add(key);
    }
  }

  const headers = Array.from(headerSet);
  const headerLine = headers.map(escapeCsvValue).join(',');
  const bodyLines = rows.map((row) =>
    headers.map((header) => escapeCsvValue(row[header] ?? '')).join(','),
  );

  return `# ${safeTableName}\n${[headerLine, ...bodyLines].join('\n')}`;
}

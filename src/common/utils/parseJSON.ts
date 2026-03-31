
export function parseJsonStrings(value: unknown): unknown {
  if (value === null || value === undefined) {
    return value;
  }

  if (typeof value === 'string') {
    const cleaned = value
      .replace(/```json/gi, '')
      .replace(/```/g, '')
      .trim();

    try {
      const parsed = JSON.parse(cleaned);
      return parseJsonStrings(parsed);
    } catch {
      return value;
    }
  }

  if (Array.isArray(value)) {
    return value.map((item) => parseJsonStrings(item));
  }

  if (typeof value === 'object') {
    if (value instanceof Date) {
      return value;
    }

    const parsed: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value)) {
      parsed[key] = parseJsonStrings(item);
    }
    return parsed;
  }

  return value;
}
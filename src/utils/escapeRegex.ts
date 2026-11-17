/** Escapes user-supplied text so it is matched literally inside a RegExp (prevents crashes and ReDoS from input like "(" or ".*.*.*"). */
export function escapeRegex(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Case-insensitive "contains" matcher built from raw user input. */
export function containsRegex(input: string): RegExp {
  return new RegExp(escapeRegex(input.trim()), 'i');
}


/**
 * Builds a MongoDB AND-of-ORs search filter. Every whitespace-separated word
 * must match at least one of the supplied fields. This lets searches such as
 * "maya siva" match { firstName: "Maya", lastName: "Sivananda" }.
 */
export function multiWordSearch(input: string, fields: string[]): Record<string, unknown> {
  const tokens = input.trim().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return {};
  return {
    $and: tokens.map((token) => ({
      $or: fields.map((field) => ({ [field]: new RegExp(escapeRegex(token), 'i') })),
    })),
  };
}

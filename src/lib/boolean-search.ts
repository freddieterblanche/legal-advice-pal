/**
 * Boolean search helper shared by attorney, expert, mediator and arbitrator
 * listing pages. Supports:
 *   - implicit AND between space-separated terms ("commercial cape town")
 *   - explicit OR / || between groups        ("insolvency OR tax")
 *   - NOT and leading "-" for negation       ("commercial NOT labour", "-labour")
 *
 * Each term is matched (ilike) against every field passed in `fields`. Pass
 * the helper the in-progress PostgREST query builder and it returns the
 * builder with the appropriate `.or(...)` applied — or unchanged when the
 * query string is empty.
 *
 * Token cap (16) protects against pathological inputs that would otherwise
 * generate huge PostgREST expressions.
 */
export function applyBooleanSearch<T extends { or: (expr: string) => T }>(
  query: T,
  rawQ: string | undefined | null,
  fields: string[],
): T {
  const raw = (rawQ ?? "").trim();
  if (!raw || fields.length === 0) return query;

  const buildTerm = (token: string, negate: boolean): string | null => {
    const term = token.replace(/[(),"*]/g, " ").trim();
    if (!term) return null;
    const like = `*${term}*`;
    if (negate) {
      return `and(${fields.map((f) => `${f}.not.ilike.${like}`).join(",")})`;
    }
    return `or(${fields.map((f) => `${f}.ilike.${like}`).join(",")})`;
  };

  const tokens = raw.split(/\s+/).filter(Boolean).slice(0, 16);
  const clauses: { negate: boolean; raw: string }[][] = [[]];
  let negateNext = false;

  for (const tok of tokens) {
    const u = tok.toUpperCase();
    if (u === "OR" || u === "||") {
      clauses.push([]);
      negateNext = false;
      continue;
    }
    if (u === "NOT" || u === "AND") {
      if (u === "NOT") negateNext = true;
      continue;
    }
    let term = tok;
    let neg = negateNext;
    if (term.startsWith("-") && term.length > 1) {
      neg = true;
      term = term.slice(1);
    }
    clauses[clauses.length - 1].push({ negate: neg, raw: term });
    negateNext = false;
  }

  const exprs = clauses
    .map((terms) => {
      const built = terms
        .map((t) => buildTerm(t.raw, t.negate))
        .filter((x): x is string => !!x);
      if (!built.length) return null;
      return built.length === 1 ? built[0] : `and(${built.join(",")})`;
    })
    .filter((x): x is string => !!x);

  if (!exprs.length) return query;
  return query.or(exprs.join(","));
}

/** Short user-facing hint string for forms that use applyBooleanSearch. */
export const BOOLEAN_SEARCH_HINT = "Tip: combine terms with OR and NOT — e.g. commercial OR construction NOT labour.";

/** Build IINA HTTP options with required `data` field. */
export function httpOptions(
  headers: Record<string, string> = {},
  data: Record<string, unknown> = {},
): IINA.HTTPRequestOption<Record<string, unknown>> {
  return { params: {}, headers, data };
}
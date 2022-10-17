import { IsKeyOf } from "@type_guard";

export function Map<
  T extends Record<string, unknown>,
  TResult extends { [TKey in keyof T]: unknown }
>(
  data: T,
  mapper: <TKey extends keyof T>(key: TKey, value: T[TKey]) => TResult[TKey]
): TResult {
  // deno-lint-ignore no-explicit-any
  const result: any = {};
  for (const key in data)
    if (!IsKeyOf(data, key)) continue;
    else result[key] = mapper(key, data[key]);

  return result;
}

import { Readify, StatePart } from "./deps.ts";

export type Idd<T> = T & { id: string };

export function Unpack<T extends StatePart>(
  data: Readify<Record<string, T>>,
  skip = 0,
  take = 10
) {
  let result: Array<Idd<Readify<T>>> = [];

  let skipped = 0;
  let taken = 0;
  for (const [id, item] of data)
    if (skipped++ < skip) continue;
    else if (++taken > take) continue;
    // deno-lint-ignore no-explicit-any
    else result = [...result, { id, ...UnpackObject(item as any, 0, 100) }];

  return result;
}

export function UnpackWithoutId<T extends StatePart>(
  data: Readify<Record<string, T>>,
  skip = 0,
  take = 10
) {
  let result: Array<Readify<T>> = [];

  let skipped = 0;
  let taken = 0;
  for (const [_, item] of data)
    if (skipped++ < skip) continue;
    else if (++taken > take) continue;
    // deno-lint-ignore no-explicit-any
    else result = [...(result as any), item];

  return result;
}

export function UnpackObject<T extends Record<string, StatePart>>(
  data: Readify<T>,
  skip = 0,
  take = 10
): T {
  // deno-lint-ignore no-explicit-any
  const result: any = {};

  let skipped = 0;
  let taken = 0;
  for (const [key, item] of data)
    if (skipped++ < skip) continue;
    else if (++taken > take) continue;
    else result[key] = item;

  return result;
}

export function Pack<T>(...items: Array<T | undefined>): Record<string, T> {
  // deno-lint-ignore no-explicit-any
  const result: any = {};

  for (const item of items) if (item) result[crypto.randomUUID()] = item;

  return result;
}

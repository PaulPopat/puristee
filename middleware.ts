import { Checker } from "./deps.ts";
import PureRequest from "./pure-request.ts";

export function RequireBody<T>(checker: Checker<T>) {
  return (request: PureRequest) => {
    let body = request.body;
    if (body instanceof FormData) {
      // deno-lint-ignore no-explicit-any
      const result: any = {};
      for (const [key, value] of body.entries()) result[key] = value.valueOf();
      body = result;
    }

    if (checker(body)) return { continue: true as const, context: { body } };
    return { response: { status: 400, headers: {}, body: "" }, state: {} };
  };
}

function IsDictionaryMatch<T extends Record<string, string | null | undefined>>(
  checker: { [TKey in keyof T]: Checker<T[TKey]> },
  // deno-lint-ignore no-explicit-any
  subject: any
): subject is T {
  if (typeof subject !== "object") return false;
  for (const key in checker) if (!checker[key](subject[key])) return false;

  return true;
}

export function RequireParameters<
  T extends Record<string, string | null | undefined>
>(checker: { [TKey in keyof T]: Checker<T[TKey]> }) {
  return (request: PureRequest) => {
    const parameters = request.parameters;
    if (IsDictionaryMatch(checker, parameters))
      return { continue: true as const, context: { parameters } };
    return { response: { status: 400, headers: {}, body: "" }, state: {} };
  };
}

export function ServeFile(path: string, mime: string) {
  return async () => {
    try {
      const file = await Deno.open(path, { read: true });
      return {
        response: {
          status: 200,
          headers: {
            "Content-Type": mime,
          },
          body: file.readable,
        },
      };
    } catch (err) {
      if (err instanceof Deno.errors.NotFound)
        return { response: { status: 404 } };
      throw err;
    }
  };
}

export function ServeTextFile(path: string, mime: string) {
  return async () => {
    try {
      return {
        response: {
          status: 200,
          headers: {
            "Content-Type": mime,
          },
          body: await Deno.readTextFile(path),
        },
      };
    } catch (err) {
      if (err instanceof Deno.errors.NotFound)
        return { response: { status: 404 } };
      throw err;
    }
  };
}

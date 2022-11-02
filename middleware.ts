import { Checker, MediaType, Path } from "./deps.ts";
import PureRequest from "./pure-request.ts";
import { Response } from "./handler.ts";

const basic_error_response = { status: 400, headers: {}, body: "" };

type ResponseFactory = (data: unknown, request: PureRequest) => Response;

export function RequireBody<T>(
  checker: Checker<T>,
  error_response?: ResponseFactory
) {
  return (request: PureRequest) => {
    let body = request.body;
    if (body instanceof FormData) {
      // deno-lint-ignore no-explicit-any
      const result: any = {};
      for (const [key, value] of body.entries()) result[key] = value.valueOf();
      body = result;
    }

    if (checker(body)) return { continue: true as const, context: { body } };
    return error_response
      ? error_response(body, request)
      : basic_error_response;
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
>(
  checker: { [TKey in keyof T]: Checker<T[TKey]> },
  error_response?: ResponseFactory
) {
  return (request: PureRequest) => {
    const parameters = request.parameters;
    if (IsDictionaryMatch(checker, parameters))
      return { continue: true as const, context: { parameters } };
    return error_response
      ? error_response(parameters, request)
      : basic_error_response;
  };
}

async function SendFile(path: string, mime?: string): Promise<Response> {
  try {
    const stat = await Deno.stat(path);
    if (stat.isDirectory) return { status: 404 };
    const file = await Deno.open(path, { read: true });
    return {
      status: 200,
      headers: {
        "Content-Type": mime ?? MediaType.contentType(path)?.toString() ?? "",
      },
      body: file.readable,
    };
  } catch (err) {
    if (err instanceof Deno.errors.NotFound) return { status: 404 };
    throw err;
  }
}

export function ServeFile(path: string, mime?: string) {
  return () => SendFile(path, mime);
}

export function ServeDirectory(base: string) {
  return (request: PureRequest) => {
    const slug = request.parameters.slug;
    if (!slug) return SendFile(base);
    if (typeof slug === "string") return SendFile(Path.join(base, slug));
    return SendFile(Path.join(base, ...slug));
  };
}

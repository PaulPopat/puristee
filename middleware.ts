import { Checker, MediaType, Path } from "./deps.ts";
import PureRequest from "./pure-request.ts";
import { PureResponse } from "./handler.ts";

const basic_error_response = { status: 400, headers: {}, body: "" };

type ResponseFactory = (data: unknown, request: PureRequest) => PureResponse;

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

function IsDictionaryMatch<
  T extends Record<string, string | Array<string> | null | undefined>
>(
  checker: { [TKey in keyof T]: Checker<T[TKey]> },
  // deno-lint-ignore no-explicit-any
  subject: any
): subject is T {
  if (typeof subject !== "object") return false;
  for (const key in checker) if (!checker[key](subject[key])) return false;

  return true;
}

export function RequireParameters<
  T extends Record<string, string | Array<string> | null | undefined>
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

const extension_map: Record<string, string> = {
  svg: "image/svg",
};

function GetMime(path: string) {
  const extension = path.split(".").findLast(() => true);

  // if (!extension || !extension_map[extension])
  return MediaType.contentType(extension ?? "");
  // return extension_map[extension];
}

async function SendFile(path: string, mime?: string): Promise<PureResponse> {
  try {
    const stat = await Deno.stat(path);
    if (stat.isDirectory) return { status: 404 };
    const file = await Deno.open(path, { read: true });
    return {
      status: 200,
      headers: {
        "Content-Type": mime ?? GetMime(path) ?? "",
      },
      body: file.readable,
    };
  } catch (err) {
    console.error(err);
    if (err instanceof Deno.errors.NotFound) return { status: 404 };
    throw err;
  }
}

export function ServeFile(path: string, mime?: string) {
  return () => SendFile(Path.resolve(path), mime);
}

export function ServeDirectory(base: string) {
  return (request: PureRequest) => {
    const slug = request.parameters.slug;
    if (!slug) return SendFile(base);
    if (typeof slug === "string") return SendFile(Path.resolve(base, slug));
    return SendFile(Path.resolve(base, ...slug));
  };
}

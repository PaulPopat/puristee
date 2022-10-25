import { ParseMimeType } from "./mime-type.ts";
import { ExtractParameters, ExtractQuery } from "./path.ts";
import { ReadonlyRecord } from "./server.ts";

type BaseRequest = {
  json(): Promise<unknown>;
  text(): Promise<string>;
  formData(): Promise<FormData>;
  blob(): Promise<Blob>;
  arrayBuffer(): Promise<ArrayBuffer>;
  url: string;
  method: string;
  headers: Iterable<[string, string]> & { get(key: string): string | null };
};

async function GetJson(request: BaseRequest) {
  try {
    return await request[
      ParseMimeType(request.headers.get("Content-Type") ?? "")
    ]();
  } catch {
    return undefined;
  }
}

export default async function ParseRequest(request: BaseRequest, path: string) {
  const body = await GetJson(request);
  const url = new URL(request.url);
  return {
    get url() {
      return url.pathname;
    },
    get method() {
      return request.method;
    },
    get headers() {
      let result: ReadonlyRecord<string, string> = {};
      for (const [key, value] of request.headers)
        result = Object.assign(result, {
          get [key]() {
            return value;
          },
        });

      return result;
    },
    get parameters() {
      return {
        ...ExtractParameters(url.pathname, path),
        ...ExtractQuery(request.url),
      };
    },
    get body() {
      return body;
    },
  };
}

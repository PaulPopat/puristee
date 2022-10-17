import { ExtractParameters, ExtractQuery } from "./path.ts";
import { ReadonlyRecord, Request as PureRequest } from "./server.ts";

async function GetJson(request: Request) {
  try {
    return await request.json();
  } catch {
    return undefined;
  }
}

export default async function ParseRequest(
  request: Request,
  path: string
): Promise<PureRequest> {
  const body = await GetJson(request);
  return {
    get url() {
      return request.url;
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
        ...ExtractParameters(request.url, path),
        ...ExtractQuery(request.url),
      };
    },
    get body() {
      return body;
    },
  };
}

import Pattern from "./pattern.ts";
import { ReadonlyRecord } from "./server.ts";
import { ParseMimeType } from "./mime-type.ts";

async function GetJson(request: Request) {
  try {
    return await request[
      ParseMimeType(request.headers.get("Content-Type") ?? "")
    ]();
  } catch {
    return undefined;
  }
}

export default class PureRequest {
  private readonly url_object: URL;

  private constructor(
    private readonly request: Request,
    private readonly pattern: Pattern,
    private readonly body: unknown
  ) {
    this.url_object = new URL(request.url);
  }

  public get url() {
    return this.url_object.pathname;
  }

  public get method() {
    return this.request.method;
  }

  public get headers() {
    let result: ReadonlyRecord<string, string> = {};
    for (const [key, value] of this.request.headers)
      result = Object.assign(result, {
        get [key]() {
          return value;
        },
      });

    return result;
  }

  public get parameters() {
    return this.pattern.Parameters(this.url_object);
  }

  public static async Init(request: Request, pattern: Pattern) {
    const body = await GetJson(request);

    return new PureRequest(request, pattern, body);
  }
}

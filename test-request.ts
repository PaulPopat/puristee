export type TestRequestInit = {
  url: string;
  method: string;
  headers?: Record<string, string>;
  body: unknown;
};

export default class TestRequest implements Request {
  public constructor(private readonly init: TestRequestInit) {}

  public get cache(): RequestCache {
    return "default";
  }

  public get credentials(): RequestCredentials {
    return "same-origin";
  }

  public get destination(): RequestDestination {
    return "";
  }

  public get headers(): Headers {
    return new Headers(
      this.init.headers ?? { "Content-Type": "application/json" }
    );
  }

  public get integrity(): string {
    return "";
  }

  public get isHistoryNavigation(): boolean {
    return false;
  }

  public get isReloadNavigation(): boolean {
    return false;
  }

  public get keepalive(): boolean {
    return true;
  }

  public get method(): string {
    return this.init.method;
  }

  public get mode(): RequestMode {
    return "no-cors";
  }

  public get redirect(): RequestRedirect {
    return "follow";
  }

  public get referrer(): string {
    return "";
  }

  public get referrerPolicy(): ReferrerPolicy {
    return "same-origin";
  }

  public get signal(): AbortSignal {
    // deno-lint-ignore no-explicit-any
    return {} as any;
  }

  public get url(): string {
    return this.init.url;
  }

  clone(): Request {
    return new TestRequest(this.init);
  }

  public get body(): ReadableStream<Uint8Array> | null {
    return null;
  }

  public get bodyUsed(): boolean {
    return false;
  }

  public arrayBuffer(): Promise<ArrayBuffer> {
    if (!(this.init.body instanceof ArrayBuffer))
      throw new Error("Invalid body type");
    return Promise.resolve(this.init.body);
  }

  public blob(): Promise<Blob> {
    if (!(this.init.body instanceof Blob)) throw new Error("Invalid body type");
    return Promise.resolve(this.init.body);
  }

  public formData(): Promise<FormData> {
    if (!(this.init.body instanceof FormData))
      throw new Error("Invalid body type");
    return Promise.resolve(this.init.body);
  }

  // deno-lint-ignore no-explicit-any
  public json(): Promise<any> {
    return Promise.resolve(this.init.body);
  }

  public text(): Promise<string> {
    if (typeof this.init.body !== "string")
      throw new Error("Invalid body type");
    return Promise.resolve(this.init.body);
  }
}

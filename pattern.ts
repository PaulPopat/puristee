import ArrayableRecord from "./arrayable-record.ts";

class Part {
  public constructor(private readonly raw: string) {}

  public get IsParameter() {
    return this.raw.startsWith(":");
  }

  public get IsSlug() {
    return this.raw === "**";
  }

  public get Name() {
    return this.raw.replace(":", "");
  }

  public IsMatch(url_part: string) {
    return this.IsParameter || this.IsSlug || this.raw === url_part;
  }
}

export default class Pattern {
  private readonly parts: Array<Part>;

  public constructor(raw: string) {
    this.parts = raw
      .split("/")
      .filter((p) => p)
      .map((p) => new Part(p));

    if (this.parts.slice(0, this.parts.length - 1).some((p) => p.IsSlug))
      throw new Error("Slugs may only be at the end of patterns");
  }

  private get LastPart() {
    if (this.parts.length === 0) return undefined;
    return this.parts[this.parts.length - 1];
  }

  private get IsSlug() {
    return this.LastPart?.IsSlug ?? false;
  }

  public get Score() {
    if (this.IsSlug) return this.parts.length;

    const count = this.parts.filter((p) => p.IsParameter).length;
    return 100 - count;
  }

  private *JoinedParts(url_parts: Array<string>) {
    for (let i = 0; i < url_parts.length; i++)
      yield [this.parts[i] ?? this.LastPart, url_parts[i]] as const;
  }

  public IsMatch(url: URL) {
    const url_parts = url.pathname.split("/").filter((p) => p);
    if (this.parts.length !== url_parts.length && !this.IsSlug) return false;

    for (const [part, url_part] of this.JoinedParts(url_parts))
      if (!part.IsMatch(url_part)) return false;

    return true;
  }

  public Parameters(url: URL) {
    const url_parts = url.pathname.split("/").filter((p) => p);
    const manager = new ArrayableRecord<string>();

    for (const [part, url_part] of this.JoinedParts(url_parts))
      if (part.IsSlug) manager.Add("slug", url_part);
      else if (part.IsParameter) manager.Add(part.Name, url_part);

    for (const [key, value] of url.searchParams) manager.Add(key, value);

    return manager.Record;
  }
}

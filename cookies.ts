import ArrayableRecord from "./arrayable-record.ts";

export default function Cookies(request: Request) {
  const header = request.headers.get("Cookie");
  if (!header) return {};

  const result = new ArrayableRecord<string>();

  for (const data of header.split("; ")) {
    const [name, value] = data.split("=");
    if (!name || !value) continue;

    result.Add(decodeURIComponent(name), decodeURIComponent(value));
  }

  return result.Record;
}
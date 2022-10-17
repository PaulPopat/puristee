import { IsString } from "@type_guard";
import { Response as PureResponse } from "./server.ts";

export default function Send(response: PureResponse): Response {
  const original_body = response.body;
  const body = IsString(original_body)
    ? original_body
    : JSON.stringify(original_body);

  return new Response(body, {
    status: response.status,
    headers: response.headers,
  });
}

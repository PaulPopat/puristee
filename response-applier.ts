import { IsString } from "./deps.ts";
import { RenderToString } from "./jsx.ts";
import { PureResponse } from "./handler.ts";
import SetCookies from "./set-cookies.ts";

const AcceptedTypes = [
  Blob,
  ArrayBuffer,
  FormData,
  URLSearchParams,
  ReadableStream<Uint8Array>,
];

export default async function Send(response: PureResponse | Response) {
  if (response instanceof Response) return response;
  const headers = new Headers(response.headers);

  if (response.cookies)
    for (const value of SetCookies(response.cookies))
      headers.append("Set-Cookie", value);

  if ("jsx" in response) {
    headers.set("Content-Type", "text/html");
    return new Response(
      "<!DOCTYPE html>\n" + (await RenderToString(response.jsx)),
      {
        status: response.status,
        headers,
      }
    );
  }

  const original_body = response.body;
  for (const type of AcceptedTypes)
    if (original_body instanceof type)
      return new Response(original_body, {
        status: response.status,
        headers,
      });

  if (IsString(original_body))
    return new Response(original_body, {
      status: response.status,
      headers,
    });

  headers.set("Content-Type", "application/json");
  return new Response(JSON.stringify(original_body), {
    status: response.status,
    headers,
  });
}

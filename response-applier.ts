import { IsString } from "./deps.ts";
import { RenderToString } from "./jsx.ts";
import { Response as PureResponse } from "./server.ts";

const AcceptedTypes = [
  Blob,
  ArrayBuffer,
  FormData,
  URLSearchParams,
  ReadableStream<Uint8Array>,
];

export default async function Send(response: PureResponse) {
  if ("jsx" in response)
    return new Response(
      "<!DOCTYPE html>\n" + (await RenderToString(response.jsx)),
      {
        status: response.status,
        headers: {
          ...response.headers,
          "Content-Type": "text/html",
        },
      }
    );

  const original_body = response.body;
  for (const type of AcceptedTypes)
    if (original_body instanceof type)
      return new Response(original_body, {
        status: response.status,
        headers: response.headers,
      });

  if (IsString(original_body))
    return new Response(original_body, {
      status: response.status,
      headers: response.headers,
    });

  return new Response(JSON.stringify(original_body), {
    status: response.status,
    headers: {
      ...response.headers,
      "Content-Type": "application/json",
    },
  });
}

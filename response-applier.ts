import { IsString } from "./deps.ts";
import { Response as PureResponse } from "./server.ts";

const AcceptedTypes = [
  Blob,
  ArrayBuffer,
  FormData,
  URLSearchParams,
  ReadableStream<Uint8Array>,
];

export default function Send(response: PureResponse): Response {
  const original_body = response.body;
  for (const type of AcceptedTypes)
    if (original_body instanceof type)
      return new Response(original_body, {
        status: response.status,
        headers: response.headers,
      });

  const body = IsString(original_body)
    ? original_body
    : JSON.stringify(original_body);

  return new Response(body, {
    status: response.status,
    headers: response.headers,
  });
}

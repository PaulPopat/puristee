import { IsString } from "../safe-type/src/index.ts";
import { Response as PureResponse } from "./types.ts";

export default function Send(response: PureResponse): Response {
  const body = IsString(response.body)
    ? response.body
    : JSON.stringify(response.body);

  return new Response(body, {
    status: response.status,
    headers: response.headers,
  });
}

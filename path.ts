import { ReadonlyRecord } from "./types.ts";
import { IsArray, IsString } from "@type_guard";

/**
 * Checks to see if the URL part is for a parameter or not
 * @param part The URL part
 * @returns true if the part is a parameter
 */
function IsParameterPart(part: string) {
  return part.startsWith(":");
}

/**
 * Extracts the parameter name from the parameter part.
 * Does not check for if the part is a parameter or not
 * so make sure you do that first.
 * @param part The parameter part
 * @returns The parameter name of the part
 */
function GetParameterName(part: string) {
  return part.replace(":", "");
}

export function ExtractParameters(
  url: string,
  path: string
): ReadonlyRecord<string, string> {
  const url_parts = url.split("/");
  const path_parts = path.split("/");

  let result: ReadonlyRecord<string, string> = {};

  for (let i = 0; i < path_parts.length; i++)
    if (!IsParameterPart(path_parts[i])) continue;
    else
      result = Object.assign(result, {
        get [GetParameterName(path_parts[i])]() {
          return url_parts[i];
        },
      });

  return result;
}

export function ExtractQuery(
  url: string
): ReadonlyRecord<string, string | Iterable<string>> {
  let result: ReadonlyRecord<string, string | Iterable<string>> = {};

  const query = new URLSearchParams(url.split("?")[1] ?? "");
  for (const [key, value] of query) {
    const existing = result[key];
    result = Object.assign(result, {
      get [key]() {
        if (existing)
          if (IsArray(IsString)(existing)) return [value, ...existing];
          else return [value, existing];
        else return value;
      },
    });
  }

  return result;
}

export function GetBestMatch(url: string, paths: Array<string>) {
  const url_parts = url.split("/");
  const split_paths = paths.map((p) => p.split("/"));

  let possible = split_paths.filter((p) => p.length === url_parts.length);
  for (let i = 0; i < url_parts.length; i++)
    possible = possible.filter(
      (can) => IsParameterPart(can[i]) || can[i] === url_parts[i]
    );

  if (possible.length === 0) return undefined;

  return possible[0]?.join("/");
}

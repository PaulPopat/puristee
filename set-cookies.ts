const TimeUnitTransform = {
  seconds: (v: number) => v,
  minutes: (v: number) => v * 60,
  hours: (v: number) => v * 60 * 60,
  days: (v: number) => v * 60 * 60 * 24,
};

type TimeUnit = keyof typeof TimeUnitTransform;

type Time = `${number} ${TimeUnit}`;

export type SetCookie =
  | string
  | {
      value: string;
      expires?: Date;
      max_age?: Time;
      domain?: string;
      path?: string;
      secure?: boolean;
      http_only?: boolean;
      same_site?: "Strict" | "Lax" | "None";
    };

function ParseTime(time: Time) {
  const [value, unit] = time.split(" ");

  return TimeUnitTransform[unit as TimeUnit](parseInt(value));
}

function CreateCookieHeader(name: string, value: SetCookie) {
  if (typeof value === "string")
    return `${encodeURIComponent(name)}=${encodeURIComponent(value)}`;
  return [
    `${encodeURIComponent(name)}=${encodeURIComponent(value.value)}`,
    value.expires ? `Expires=${value.expires.toUTCString()}` : undefined,
    value.max_age ? `Max-Age=${ParseTime(value.max_age)}` : undefined,
    value.domain ? `Domain=${value.domain}` : undefined,
    value.path ? `Path=${value.path}` : undefined,
    value.secure ? `Secure` : undefined,
    value.http_only ? "HttpOnly" : undefined,
    value.same_site ? `SameSite=${value.same_site}` : undefined,
  ].join("; ");
}

export default function* SetCookies(data: Record<string, SetCookie>) {
  for (const key in data) yield CreateCookieHeader(key, data[key]);
}

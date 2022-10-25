export function ParseMimeType(header_value: string) {
  const data = header_value.split(";")[0];

  if (data.startsWith("text/")) return "text" as const;
  if (data === "application/json") return "json" as const;
  if (data === "multipart/form-data") return "formData" as const;
  if (data.startsWith("image/")) return "blob" as const;
  return "arrayBuffer";
}

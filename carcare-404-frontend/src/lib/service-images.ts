export function slugifyServiceName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replaceAll("&", "and")
    .replaceAll("/", " ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-|-$/g, "");
}

export function getServiceCoverImagePath(serviceName: string): string {
  return `/images/services/${slugifyServiceName(serviceName)}.jpg`;
}

export type SubslugType = "learn" | "projects" | "portfolio";

const keyFor = (slug: string, type: SubslugType) =>
  `cgps:subslugComplete:${slug.toLowerCase()}:${type}`;

export function getSubslugComplete(slug: string, type: SubslugType): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(keyFor(slug, type)) === "1";
}

export function setSubslugComplete(slug: string, type: SubslugType, value: boolean) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(keyFor(slug, type), value ? "1" : "0");
  // notify other tabs/components
  window.dispatchEvent(new Event("cgps-subslug-complete-changed"));
}
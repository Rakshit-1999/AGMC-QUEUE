/** Joins truthy class names (local copy: the kit's helper lives in components/ui/internal). */
export function cx(...names: Array<string | false | null | undefined>): string {
  return names.filter(Boolean).join(' ');
}

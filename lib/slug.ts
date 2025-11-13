const slugPattern = /[^a-z0-9]+/g;

export function slugify(input: string) {
  return input
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(slugPattern, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}


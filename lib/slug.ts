import { prisma } from '@/lib/prisma';

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

export async function generateUniquePracticeSlug(name: string) {
  const base = slugify(name) || 'practice';
  let slug = base;
  let iteration = 1;

  while (true) {
    const existing = await prisma.practice.findUnique({ where: { slug } });
    if (!existing) {
      return slug;
    }

    slug = `${base}-${iteration}`;
    iteration += 1;
  }
}


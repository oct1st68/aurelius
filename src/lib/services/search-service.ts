/**
 * Search service — global search for the Cmd/Ctrl+K palette.
 * Rate limited at the action boundary; reads the catalog in-memory.
 */

import type { Listing, Article } from "@/domain/entities";
import { repos } from "@/data/repositories";

export interface SearchHit {
  type: "watch" | "brand" | "article";
  id: string;
  title: string;
  subtitle: string;
  href: string;
}

export async function globalSearch(termRaw: string, limit = 12): Promise<SearchHit[]> {
  const term = termRaw.trim().toLowerCase();
  if (term.length < 2) return [];

  const [listings, brands, articles] = await Promise.all([
    repos().listings.list(),
    repos().brands.list(),
    repos().articles.list(),
  ]);

  const published: Listing[] = listings.filter((l) => l.status === "PUBLISHED");
  const hits: SearchHit[] = [];

  for (const brand of brands) {
    if (brand.name.toLowerCase().includes(term)) {
      hits.push({
        type: "brand",
        id: brand.id,
        title: brand.name,
        subtitle: `${brand.country} · Est. ${brand.foundedYear}`,
        href: `/houses/${brand.slug}`,
      });
    }
  }

  for (const listing of published) {
    const brand = brands.find((b) => b.id === listing.brandId);
    const haystack = `${brand?.name ?? ""} ${listing.model} ${listing.referenceNumber} ${listing.description} ${listing.dialColor} ${listing.caseMaterial}`.toLowerCase();
    if (haystack.includes(term)) {
      hits.push({
        type: "watch",
        id: listing.id,
        title: `${brand?.name ?? "AURELIUS"} ${listing.model}`,
        subtitle: `Ref. ${listing.referenceNumber} · ${listing.year}`,
        href: `/watches/${listing.slug}`,
      });
    }
  }

  for (const article of articles) {
    if (
      article.title.toLowerCase().includes(term) ||
      article.excerpt.toLowerCase().includes(term)
    ) {
      hits.push({
        type: "article",
        id: article.id,
        title: article.title,
        subtitle: "Minerva Archives",
        href: `/archives/${article.slug}`,
      });
    }
  }

  return hits.slice(0, limit);
}

export async function listArticles(): Promise<Article[]> {
  const rows = await repos().articles.list();
  return rows.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
}

export async function getArticleBySlug(slug: string): Promise<Article> {
  const article = await repos().articles.find((a) => a.slug === slug);
  if (!article) throw new Error("Article not found");
  return article;
}

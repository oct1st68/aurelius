import Link from "next/link";
import { notFound } from "next/navigation";
import { getArticleBySlug } from "@/lib/services/search-service";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const article = await getArticleBySlug(slug).catch(() => null);
  return { title: article ? article.title : "Article not found" };
}

export default async function ArticlePage({ params }: Props) {
  const { slug } = await params;
  const article = await getArticleBySlug(slug).catch(() => null);
  if (!article) notFound();

  return (
    <article className="museum-page">
      <nav aria-label="Breadcrumb" className="text-xs text-bronze">
        <Link href="/archives" className="hover:text-gold">
          Minerva Archives
        </Link>
        <span className="mx-2">/</span>
        <span className="text-travertine/70">{article.category}</span>
      </nav>

      <p className="eyebrow mt-8">{article.category}</p>
      <h1 className="font-display mt-3 text-4xl leading-tight text-ivory">{article.title}</h1>
      <p className="mt-4 text-xs text-bronze">
        {article.author} ·{" "}
        {new Date(article.publishedAt).toLocaleDateString("en-US", { dateStyle: "long" })}
      </p>
      <div className="gold-rule mt-8" />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`/media/${article.heroImage}`}
        alt={`${article.title} — editorial illustration`}
        className="mt-8 w-full border border-gold/15"
      />
      <div className="font-serif-lux mt-10 space-y-6 text-lg leading-relaxed text-travertine/90">
        {article.body.split("\n\n").map((para, i) => (
          <p key={i} className="whitespace-pre-line">
            {para}
          </p>
        ))}
      </div>
    </article>
  );
}

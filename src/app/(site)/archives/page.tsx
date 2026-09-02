import Link from "next/link";
import { listArticles } from "@/lib/services/search-service";

export const metadata = { title: "Minerva Archives" };

export default async function ArchivesPage() {
  const articles = await listArticles();
  return (
    <div className="museum-page">
      <p className="eyebrow">Minerva · Goddess of Wisdom</p>
      <h1 className="font-display mt-2 text-4xl text-ivory">The Minerva Archives</h1>
      <p className="font-serif-lux mt-4 max-w-2xl text-lg italic leading-relaxed text-travertine/75">
        Editorial content and watch knowledge — guides, history, collecting, and care.
      </p>
      <div className="gold-rule mt-8" />

      <div className="mt-10 space-y-6">
        {articles.map((article) => (
          <Link key={article.id} href={`/archives/${article.slug}`} className="panel panel-hover group flex flex-col gap-5 p-6 sm:flex-row">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/media/${article.heroImage}`}
              alt={`${article.title} — editorial illustration`}
              loading="lazy"
              className="h-40 w-full border border-gold/15 object-cover sm:w-56"
            />
            <div>
              <p className="badge">{article.category}</p>
              <h2 className="font-serif-lux mt-3 text-2xl text-ivory group-hover:text-gold">
                {article.title}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-travertine/65">{article.excerpt}</p>
              <p className="mt-3 text-xs text-bronze">
                {article.author} ·{" "}
                {new Date(article.publishedAt).toLocaleDateString("en-US", { dateStyle: "long" })}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

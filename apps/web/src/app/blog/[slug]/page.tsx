import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ContentShell } from "@/components/content-shell";
import { Prose } from "@/components/prose";
import { formatPostDate, getPost, POSTS } from "@/lib/content/blog";
import { localeHref, translate } from "@/lib/i18n";
import { getServerLocale } from "@/lib/locale-server";
import { testId } from "@/lib/test-id";

export function generateStaticParams() {
  return POSTS.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) return {};
  const locale = await getServerLocale();
  const c = post[locale];
  return {
    title: `${c.title} — KeysArk`,
    description: c.description,
    alternates: {
      canonical: localeHref(`/blog/${slug}`, locale),
      languages: {
        en: `/blog/${slug}`,
        "zh-CN": `/zh/blog/${slug}`,
        "x-default": `/blog/${slug}`,
      },
    },
    openGraph: {
      type: "article",
      title: c.title,
      description: c.description,
      publishedTime: post.date,
    },
  };
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) notFound();
  const locale = await getServerLocale();
  const c = post[locale];
  return (
    <ContentShell locale={locale} scope="blog-post">
      <a
        href={localeHref("/blog", locale)}
        className="text-sm text-[var(--color-muted-foreground)] transition-colors hover:text-[var(--color-foreground)]"
      >
        {translate(locale, "blog_back")}
      </a>
      <article {...testId("blog-post-article")} className="mt-6">
        <time className="text-xs text-[var(--color-muted-foreground)]">
          {formatPostDate(post.date, locale)}
        </time>
        <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">{c.title}</h1>
        <div className="mt-8">
          <Prose blocks={c.body} />
        </div>
      </article>
    </ContentShell>
  );
}

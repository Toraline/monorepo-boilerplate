import Link from "next/link";
import { useTranslations } from "next-intl";

// The page for an address that has no page.
export default function NotFoundPage() {
  const t = useTranslations("notFound");

  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center gap-4 p-8">
      <h1 className="heading-page text-brand">{t("title")}</h1>
      <p className="text-body">{t("description")}</p>
      <Link href="/" className="text-brand underline">
        {t("backHome")}
      </Link>
    </main>
  );
}

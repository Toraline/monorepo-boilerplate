import { useTranslations } from "next-intl";

// The start page of a user who is logged in.
export default function HomePage() {
  const t = useTranslations("home");

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4 p-8">
      <h1 className="heading-page m-0 text-brand">{t("title")}</h1>
      <p className="m-0 text-body">{t("description")}</p>
    </main>
  );
}

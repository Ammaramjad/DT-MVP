import { PageTitle } from "@/components/admin/PageTitle";
import { SettingsEditor } from "@/components/admin/SettingsEditor";
import { getSettings } from "@/lib/data";

export const metadata = { title: "Site settings" };

export default async function SettingsPage() {
  return (
    <>
      <PageTitle title="Site settings · 網站設定" sub="Homepage hero, images, statistics, app links, contact info and pricing rules." />
      <SettingsEditor initial={await getSettings()} />
    </>
  );
}

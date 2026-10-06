import { desc } from "drizzle-orm";
import { getDb, schema as s } from "@/db";
import { MediaLibrary } from "@/components/admin/MediaLibrary";
import { PageTitle } from "@/components/admin/PageTitle";

export const metadata = { title: "Media" };

export default async function MediaPage() {
  const db = await getDb();
  const rows = await db.select({ id: s.media.id, filename: s.media.filename, size: s.media.size }).from(s.media).orderBy(desc(s.media.id));
  return (
    <>
      <PageTitle title="Media library · 圖片庫" sub="Images are stored in the database. Use them in categories, vehicles, routes, promotions and site settings." />
      <MediaLibrary initial={rows.map((r) => ({ ...r, url: `/media/${r.id}` }))} />
    </>
  );
}

import { notFound } from "next/navigation";
import { CrudManager } from "@/components/admin/CrudManager";
import { PageTitle } from "@/components/admin/PageTitle";
import { isResource, RESOURCES } from "@/lib/admin-resources";
import { relationOptions } from "@/lib/admin-crud";

export async function generateMetadata({ params }: { params: Promise<{ resource: string }> }) {
  const { resource } = await params;
  return { title: isResource(resource) ? RESOURCES[resource].title : "Not found" };
}

export default async function ResourcePage({ params }: { params: Promise<{ resource: string }> }) {
  const { resource } = await params;
  if (!isResource(resource)) notFound();
  const r = RESOURCES[resource];
  const rel = r.fields.filter((f) => f.type === "relation" && f.relation);
  const opts = Object.fromEntries(await Promise.all(rel.map(async (f) => [f.name, await relationOptions(f.relation!)] as const)));
  return (
    <>
      <PageTitle title={`${r.title} · ${r.titleZh}`} sub="Changes are saved to the database and appear on the website immediately." />
      <CrudManager resource={r} options={opts} />
    </>
  );
}

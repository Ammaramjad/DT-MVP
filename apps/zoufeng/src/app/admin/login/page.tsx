import { redirect } from "next/navigation";
import { AdminLoginForm } from "@/components/admin/AdminLoginForm";
import { LogoMark } from "@/components/ui/Logo";
import { getAdmin } from "@/lib/admin-auth";

export const metadata = { title: "Admin login" };

export default async function AdminLogin({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const [{ next }, me] = await Promise.all([searchParams, getAdmin()]);
  if (me) redirect("/admin");
  return (
    <main className="grid min-h-dvh place-items-center bg-[url(/seed/hero-taipei-van.jpg)] bg-cover bg-center p-4">
      <div className="glass-strong w-full max-w-sm rounded-[30px] p-7">
        <div className="mb-5 flex items-center gap-3">
          <LogoMark size={44} />
          <div>
            <div className="text-[20px] font-black tracking-wide">ZOUFENG</div>
            <div className="text-[12px] text-muted">管理後台 · Admin panel</div>
          </div>
        </div>
        <AdminLoginForm next={next} />
      </div>
    </main>
  );
}

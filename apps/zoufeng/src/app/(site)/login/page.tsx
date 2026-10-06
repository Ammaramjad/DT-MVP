import { redirect } from "next/navigation";
import { AuthForm } from "@/components/site/AuthForm";
import { getCustomer, getLang } from "@/lib/data";

export const metadata = { title: "會員登入" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const [{ next }, lang, me] = await Promise.all([searchParams, getLang(), getCustomer()]);
  if (me) redirect("/account");
  return (
    <div className="mx-auto max-w-md pt-8">
      <AuthForm lang={lang} mode="login" next={next} />
    </div>
  );
}

import { redirect } from "next/navigation";
import { AuthForm } from "@/components/site/AuthForm";
import { getCustomer, getLang } from "@/lib/data";

export const metadata = { title: "註冊會員" };

export default async function RegisterPage() {
  const [lang, me] = await Promise.all([getLang(), getCustomer()]);
  if (me) redirect("/account");
  return (
    <div className="mx-auto max-w-md pt-8">
      <AuthForm lang={lang} mode="register" />
    </div>
  );
}

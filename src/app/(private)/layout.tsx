  import { redirect } from "next/navigation";
  import Sidebar from "./Sidebar";
  import { getUser } from "@/lib/auth";

  export default async function PrivateLayout({
    children,
  }: {
    children: React.ReactNode;
  }) {
    const user = await getUser();

    if (!user) {
      redirect("/login");
    }

    return (
      <div className="min-h-screen bg-slate-50">
        <Sidebar role={user.role} />

        <main className="min-h-screen pl-64">
          {children}
        </main>
      </div>
    );
  }
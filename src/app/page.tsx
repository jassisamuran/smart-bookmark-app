import LoginButton from "@/components/LoginButton";
import { createClient } from "@/lib/supabase/client";
import { redirect } from "next/navigation";

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) redirect("/dashbaord");
  return (
    <main
      className="min-h-screen flex items-center justify-center px-4"
      style={{ background: "var(--bg)" }}
    >
      <div className="text-center max-w-lg w-full">
        <div className="mb-8 flex justify-center">
          <div
            className="w-20 h-20 rounded-2xl flex items-center justify-center text-4xl"
            style={{
              background: "linear-gradient(135deg, var(--accent), #a855f7)",
              boxShadow: "0 0 40px var(--accent-glow)",
            }}
          ></div>
        </div>

        <h1
          className="text-5xl font-bold mb-4 tracking-tight"
          style={{ color: "var(--text)" }}
        >
          Smart<span style={{ color: "var(--accent)" }}>Marks</span>
        </h1>

        <p
          className="text-lg mb-10 leading-relaxed"
          style={{ color: "var(--muted)" }}
        >
          Save, organize, and access your bookmarks from anywhere.
          <br />
          Real-time sync across all your tabs.
        </p>
        <LoginButton />
        <p className="mt-6 text-sm" style={{ color: "var(--muted)" }}>
          No email required • Google sign-in only • Private by default
        </p>
      </div>
    </main>
  );
}

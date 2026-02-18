import BookmarkApp from "@/components/BookmarkApp";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/");

  const { data: bookmarks } = await supabase
    .from("bookmarks")
    .select("*")
    .order("created_at", { ascending: false });

  return <BookmarkApp user={user} initialBookmarks={bookmarks || []} />;
}

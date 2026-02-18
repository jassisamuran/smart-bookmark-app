"use client";

import { createClient } from "@/lib/supabase/client";
import { User } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type Bookmark = {
  id: string;
  url: string;
  title: string;
  created_at: string;
  user_id: string;
};

type Props = {
  user: User;
  initialBookmarks: Bookmark[];
};

export default function BookmarkApp({ user, initialBookmarks }: Props) {
  const [supabase] = useState(() => createClient());

  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const router = useRouter();

  useEffect(() => {
    setBookmarks(initialBookmarks);
  }, [initialBookmarks]);

  useEffect(() => {
    let channel: any;

    const setupRealtime = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        console.log("No session yet");
        return;
      }

      console.log("Session ready:", session.user.id);

      channel = supabase
        .channel(`bookmarks-${session.user.id}`)

        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "bookmarks",
            filter: `user_id=eq.${session.user.id}`,
          },
          (payload) => {
            if (payload.eventType === "INSERT") {
              const newBookmark = payload.new as Bookmark;

              setBookmarks((prev) => {
                if (prev.some((b) => b.id === newBookmark.id)) return prev;
                return [newBookmark, ...prev];
              });
            }

            if (payload.eventType === "DELETE") {
              const deletedId = payload.old.id;

              setBookmarks((prev) => prev.filter((b) => b.id !== deletedId));
            }
          },
        )

        .subscribe();
    };

    setupRealtime();

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  const addBookmark = async (e: React.FormEvent) => {
    e.preventDefault();

    setError("");

    if (!url.trim() || !title.trim()) {
      setError("URL and title required");

      return;
    }

    let formattedUrl = url.trim();

    if (
      !formattedUrl.startsWith("http://") &&
      !formattedUrl.startsWith("https://")
    ) {
      formattedUrl = "https://" + formattedUrl;
    }

    setLoading(true);

    const { error } = await supabase.from("bookmarks").insert({
      url: formattedUrl,
      title: title.trim(),
      user_id: user.id,
    });

    if (error) {
      setError(error.message);
    } else {
      setUrl("");
      setTitle("");
    }

    setLoading(false);
  };

  const deleteBookmark = async (id: string) => {
    setDeletingId(id);

    await supabase.from("bookmarks").delete().eq("id", id);

    setDeletingId(null);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();

    router.push("/");
  };

  return (
    <div className="min-h-screen p-6">
      <h1 className="text-2xl font-bold mb-6">SmartMarks</h1>

      <form onSubmit={addBookmark} className="mb-6">
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="URL"
          className="border p-2 mr-2"
        />

        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Title"
          className="border p-2 mr-2"
        />

        <button
          type="submit"
          disabled={loading}
          className="bg-blue-500 text-white px-4 py-2"
        >
          Save
        </button>
      </form>

      {error && <p className="text-red-500 mb-4">{error}</p>}

      {bookmarks.map((bookmark) => (
        <div
          key={bookmark.id}
          className="flex items-center justify-between border p-3 mb-2"
        >
          <div className="flex items-center gap-2">
            <a href={bookmark.url} target="_blank">
              {bookmark.title}
            </a>
          </div>

          <button
            onClick={() => deleteBookmark(bookmark.id)}
            className="text-red-500"
          >
            Delete
          </button>
        </div>
      ))}

      <button onClick={handleSignOut} className="mt-6 text-sm underline">
        Sign out
      </button>
    </div>
  );
}

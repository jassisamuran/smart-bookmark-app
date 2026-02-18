# Smart Bookmark App

A real-time bookmark manager built with Next.js 14, Supabase, and Google OAuth. Users can save, organize, and access their bookmarks from anywhere with instant synchronization across all browser tabs.

## 🚀 Live Demo

**Live URL:** https://smart-bookmark-app-eight-umber.vercel.app/

## ✨ Features

- **Google OAuth Authentication** - Secure sign-in with Google (no email/password required)
- **Add Bookmarks** - Save any URL with a custom title
- **Private by Default** - Each user only sees their own bookmarks (Row Level Security)
- **Real-time Sync** - Changes instantly appear across all open tabs using Supabase Realtime
- **Delete Bookmarks** - Remove bookmarks you no longer need
- **Beautiful UI** - Modern dark theme with smooth animations

## 🛠️ Tech Stack

- **Frontend:** Next.js 14 (App Router), React, TypeScript
- **Styling:** Tailwind CSS
- **Backend:** Supabase (PostgreSQL database)
- **Authentication:** Supabase Auth with Google OAuth
- **Real-time:** Supabase Realtime (WebSocket subscriptions)
- **Deployment:** Vercel

## 📋 Requirements Met

✅ User can sign up and log in using Google OAuth only  
✅ A logged-in user can add a bookmark (URL + title)  
✅ Bookmarks are private to each user (Row Level Security enforced)  
✅ Bookmark list updates in real-time without page refresh  
✅ User can delete their own bookmarks  
✅ App deployed on Vercel with working live URL

## 🚧 Problems Encountered & Solutions

### Problem 1: Realtime Subscription Not Working

**Issue:** Initially, the real-time updates weren't firing when adding/deleting bookmarks in a second tab. The subscription appeared to connect but no events were received.

**Root Cause:** Missing `REPLICA IDENTITY FULL` on the bookmarks table. Without this, Supabase couldn't read the `user_id` column in the replication stream, so client-side filters silently failed.

**Solution:**

```sql
ALTER TABLE bookmarks REPLICA IDENTITY FULL;
```

This allows Supabase to include all column values in the replication log, enabling proper filtering in the realtime subscription.

---

### Problem 2: Supabase Client Recreating on Every Render

**Issue:** The Supabase client was being recreated on every component render, causing the realtime channel to disconnect and reconnect constantly.

**Root Cause:** Called `createClient()` directly in the component body instead of memoizing it.

**Solution:** Used `useRef` to create the client once and persist it across renders:

```typescript
const supabaseRef = useRef(createClient());
const supabase = supabaseRef.current;
```

---

### Problem 3: Syntax Error in Channel Creation

**Issue:** Template literal syntax error: `.channel\`bookmarks-${user.id}\`)` caused the channel to never be created.

**Root Cause:** Missing opening parenthesis before the template literal.

**Solution:** Fixed to proper function call syntax:

```typescript
.channel("bookmarks-" + user.id)
```

---

### Problem 4: RLS Policies Blocking Realtime Events

**Issue:** When using filters in the realtime subscription (`filter: \`user_id=eq.${user.id}\``), events weren't being received due to interaction between RLS and filters.

**Root Cause:** Supabase Realtime filters + Row Level Security can conflict. The server-side filter was being applied before the payload reached the client, but RLS was blocking visibility.

**Solution:** Removed server-side filters and implemented client-side filtering instead:

```typescript
.on("postgres_changes",
  { event: "INSERT", schema: "public", table: "bookmarks" },
  (payload) => {
    const newBookmark = payload.new as Bookmark;
    if (newBookmark.user_id !== user.id) return; // client-side filter
    // ... update state
  }
)
```

---

### Problem 5: OAuth Callback Route Syntax Error

**Issue:** `NextResponse.redirect` called with template literal instead of string.

**Root Cause:** Missing parenthesis: `NextResponse.redirect\`${origin}/dashboard\`)`

**Solution:**

```typescript
return NextResponse.redirect(`${origin}/dashboard`);
```

---

### Problem 6: Google OAuth Redirect URI Configuration

**Issue:** Google OAuth failed with "redirect_uri_mismatch" error.

**Root Cause:** The authorized redirect URI in Google Cloud Console didn't match Supabase's callback URL.

**Solution:** Added the exact Supabase callback URL to Google Cloud Console:

```
https://[PROJECT_REF].supabase.co/auth/v1/callback
```

---

### Problem 7: Auto-formatting URLs

**Issue:** Users often forgot to include `https://` in URLs, causing broken links.

**Root Cause:** No URL validation or auto-correction.

**Solution:** Added automatic protocol prepending:

```typescript
let formattedUrl = url.trim();
if (
  !formattedUrl.startsWith("http://") &&
  !formattedUrl.startsWith("https://")
) {
  formattedUrl = "https://" + formattedUrl;
}
```

---

## 🏗️ Database Schema

```sql
CREATE TABLE bookmarks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  url TEXT NOT NULL,
  title TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Row Level Security
ALTER TABLE bookmarks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own bookmarks" ON bookmarks
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own bookmarks" ON bookmarks
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own bookmarks" ON bookmarks
  FOR DELETE USING (auth.uid() = user_id);

-- Enable Realtime
ALTER TABLE bookmarks REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE bookmarks;
```

## 🔧 Setup Instructions

### Prerequisites

- Node.js 18+
- A Supabase account
- A Google Cloud Platform account

### 1. Clone the Repository

```bash
git clone https://github.com/jassisamuran/smart-bookmark-app
cd smart-bookmark-app
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Set Up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to SQL Editor and run the database schema (see above)
3. Go to **Settings → API** and copy:
   - Project URL
   - anon/public key

### 4. Set Up Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project
3. Go to **APIs & Services → OAuth consent screen**
4. Go to **APIs & Services → Credentials**
5. Create OAuth 2.0 Client ID
6. Add authorized redirect URI: `https://[YOUR_PROJECT_REF].supabase.co/auth/v1/callback`
7. Copy Client ID and Client Secret
8. In Supabase, go to **Authentication → Providers → Google**
9. Enable Google and paste Client ID and Client Secret

### 5. Configure Environment Variables

Create a `.env.local` file:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 6. Run Locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### 7. Deploy to Vercel

```bash
npm install -g vercel
vercel
```

Add environment variables in Vercel dashboard, then update:

- Supabase → Authentication → URL Configuration → Site URL
- Supabase → Authentication → URL Configuration → Redirect URLs

## 📁 Project Structure

```
smart-bookmark-app/
├── src/
│   ├── app/
│   │   ├── auth/
│   │   │   └── callback/
│   │   │       └── route.ts          # OAuth callback handler
│   │   ├── dashboard/
│   │   │   └── page.tsx              # Main dashboard
│   │   ├── globals.css               # Global styles
│   │   ├── layout.tsx                # Root layout
│   │   └── page.tsx                  # Landing page
│   ├── components/
│   │   ├── BookmarkApp.tsx           # Main app component
│   │   └── LoginButton.tsx           # Google sign-in button
│   ├── lib/
│   │   └── supabase/
│   │       ├── client.ts             # Browser Supabase client
│   │       └── server.ts             # Server Supabase client
│   └── middleware.ts                 # Auth middleware
├── .env.local                        # Environment variables
├── package.json
└── README.md
```

## 🎯 Key Learnings

1. **Realtime requires REPLICA IDENTITY FULL** for filtered subscriptions to work properly
2. **useRef is essential** for maintaining singleton instances like Supabase clients in React
3. **Client-side filtering is more reliable** than server-side filters when working with RLS
4. **OAuth redirect URIs must match exactly** - even trailing slashes matter
5. **Supabase SSR** requires different client creation patterns for server vs. browser

## 📝 License

MIT

## 👤 Author

Jaspreet Singh - [https://github.com/jassisamuran/](https://github.com/jassisamuran)

## 🙏 Acknowledgments

- [Supabase Documentation](https://supabase.com/docs)
- [Next.js Documentation](https://nextjs.org/docs)
- [Tailwind CSS](https://tailwindcss.com)

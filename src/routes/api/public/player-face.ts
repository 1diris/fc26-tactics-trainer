import { createFileRoute } from "@tanstack/react-router";

const ALLOWED_HOSTS = new Set(["cdn.sofifa.net", "cdn.sofifa.com"]);

export const Route = createFileRoute("/api/public/player-face")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const raw = new URL(request.url).searchParams.get("u");
        if (!raw) return new Response("Missing url", { status: 400 });

        let target: URL;
        try {
          target = new URL(raw);
        } catch {
          return new Response("Invalid url", { status: 400 });
        }
        if (target.protocol !== "https:" || !ALLOWED_HOSTS.has(target.hostname)) {
          return new Response("Not found", { status: 404 });
        }

        // Portraits never change, so serve them from the edge cache when possible.
        const cacheKey = new Request(
          `https://player-face.local/${encodeURIComponent(target.toString())}`,
          { method: "GET" },
        );
        const cache = (globalThis as { caches?: { default?: Cache } }).caches?.default;
        if (cache) {
          const hit = await cache.match(cacheKey);
          if (hit) return hit;
        }

        const upstream = await fetch(target.toString(), {
          headers: {
            Referer: "https://sofifa.com/",
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
            Accept: "image/avif,image/webp,image/png,image/*;q=0.8",
          },
        });

        if (!upstream.ok || !upstream.body) {
          return new Response("Not found", { status: 404 });
        }

        return new Response(upstream.body, {
          status: 200,
          headers: {
            "Content-Type": upstream.headers.get("content-type") ?? "image/png",
            "Cache-Control": "public, max-age=31536000, immutable",
          },
        });
      },
    },
  },
});

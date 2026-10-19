import { describe, expect, it, vi } from "vitest";
import { readState, writeState, type D1Database } from "@/lib/cloudflare";
import { handleCloudflareApi } from "@/server";
import { createSeed } from "@/lib/seed";

describe("Cloudflare D1 Content Persistence", () => {
  it("syncs all content, posts, reviews, and collections to D1 tables on writeState", async () => {
    const executedQueries: string[] = [];
    const boundParams: unknown[][] = [];

    const mockDb: D1Database = {
      prepare: (query: string) => {
        executedQueries.push(query);
        return {
          bind: (...values: unknown[]) => {
            boundParams.push(values);
            return {
              first: async () => null,
              run: async () => ({}),
              all: async () => ({ results: [] }),
            };
          },
        };
      },
    };

    const seed = createSeed();
    await writeState(mockDb, seed);

    // Verify app_state, users, titles, posts, reviews, questions, answers, replies, likes, collections, library are synced
    expect(executedQueries.some((q) => q.includes("UPDATE app_state"))).toBe(true);
    expect(executedQueries.some((q) => q.includes("INSERT INTO users"))).toBe(true);
    expect(executedQueries.some((q) => q.includes("INSERT INTO titles"))).toBe(true);
    expect(executedQueries.some((q) => q.includes("INSERT INTO posts"))).toBe(true);
    expect(executedQueries.some((q) => q.includes("INSERT INTO reviews"))).toBe(true);
    expect(executedQueries.some((q) => q.includes("INSERT INTO questions"))).toBe(true);
    expect(executedQueries.some((q) => q.includes("INSERT INTO answers"))).toBe(true);
    expect(executedQueries.some((q) => q.includes("INSERT INTO replies"))).toBe(true);
    expect(executedQueries.some((q) => q.includes("INSERT INTO likes"))).toBe(true);
    expect(executedQueries.some((q) => q.includes("INSERT INTO collections"))).toBe(true);
    expect(executedQueries.some((q) => q.includes("INSERT INTO library"))).toBe(true);
  });

  it("merges normalized D1 posts into state on readState", async () => {
    const seed = createSeed();
    const mockPost = {
      id: "p-d1-custom",
      title_id: "t-interstellar",
      user_id: "u-amara",
      category: "lesson" as const,
      body: "Written directly in D1!",
      quote_character: null,
      quote_note: null,
      spoiler: 0,
      season: null,
      episode: null,
      created_at: "2026-10-18T12:00:00.000Z",
      updated_at: null,
      removed: 0,
    };

    const mockDb: D1Database = {
      prepare: (query: string) => {
        return {
          bind: () => ({
            first: async () => {
              if (query.includes("app_state")) {
                return { payload: JSON.stringify(seed) };
              }
              return null;
            },
            run: async () => ({}),
            all: async () => {
              if (query.includes("FROM posts")) {
                return { results: [mockPost] };
              }
              return { results: [] };
            },
          }),
        };
      },
    };

    const state = await readState(mockDb);
    const found = state.posts.find((p) => p.id === "p-d1-custom");
    expect(found).toBeDefined();
    expect(found?.body).toBe("Written directly in D1!");
    expect(found?.titleId).toBe("t-interstellar");
  });

  it("serves direct D1 query endpoints for /api/posts and /api/reviews", async () => {
    const mockDb: D1Database = {
      prepare: vi.fn().mockImplementation((query: string) => ({
        bind: vi.fn().mockReturnValue({
          first: async () => null,
          run: async () => ({}),
          all: async () => {
            if (query.includes("FROM posts")) {
              return { results: [{ id: "p1", body: "D1 Post", category: "lesson" }] };
            }
            if (query.includes("FROM reviews")) {
              return { results: [{ id: "r1", body: "D1 Review" }] };
            }
            return { results: [] };
          },
        }),
      })),
    };

    const postsReq = new Request("https://inktella.example/api/posts?titleId=t-interstellar");
    const postsRes = await handleCloudflareApi(postsReq, { DB: mockDb });
    expect(postsRes?.status).toBe(200);
    const postsData = await postsRes?.json();
    expect(postsData).toEqual([{ id: "p1", body: "D1 Post", category: "lesson" }]);

    const reviewsReq = new Request("https://inktella.example/api/reviews");
    const reviewsRes = await handleCloudflareApi(reviewsReq, { DB: mockDb });
    expect(reviewsRes?.status).toBe(200);
    const reviewsData = await reviewsRes?.json();
    expect(reviewsData).toEqual([{ id: "r1", body: "D1 Review" }]);
  });
});

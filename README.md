# inktella

Build inktella. ### Product Development Brief

Movie & Series Community Platform · Version 1.0 · Cloudflare Deployment

### 1\. Product overview

Build a minimal, calm, and welcoming social platform where everyday people share their thoughts, lessons, memorable quotes, questions, reviews, and reactions to movies and television series.

The platform is not a movie rating website, a critic-focused publication, or a streaming service. It is a community where every movie and series becomes a place for meaningful, casual conversation.

Core philosophy: You don't have to be a critic to have something worth saying about a movie.

Product qualities: Simple, minimal, fun, peaceful, fast, accessible, and mobile-first.

The experience should feel like entering a quiet, thoughtfully designed social space, not a noisy entertainment website.

### 2\. Primary objectives

* Make it easy for ordinary viewers to contribute something about a movie or series.

* Give each movie and series a dedicated community page.

* Organize discussions by contribution type rather than mixing everything together.

* Support personal watched lists and publicly shareable collections.

* Make movie and series discovery fast through a powerful internal search engine.

* Allow anyone to browse and read content without creating an account.

* Require authentication for posting, replying, liking, saving, and other engagement.

* Keep the entire experience lightweight, responsive, and optimized for Cloudflare.

Absolute product rule: No ratings of any kind. No stars, numerical scores, percentages, audience scores, critic scores, or rating-based rankings anywhere in the interface.

### 3\. User roles and permissions

| Role            | Permissions                                                                                              |
| --------------- | -------------------------------------------------------------------------------------------------------- |
| Guest           | Browse, search, read movie pages, reviews, lessons, quotes, questions, and public collections            |
| Registered user | All guest permissions, plus posting, replying, liking, managing watched titles, and creating collections |
| Administrator   | Create and manage movie/series pages, moderate UGC, manage users, and configure the platform             |

Movie and series pages are created exclusively by administrators. Users cannot create, edit, or delete official movie records.

Users supply the community-generated content attached to those pages.

### 4\. Main platform structure

The primary navigation should be simple:

* Home: A discovery feed of community contributions from different movies and series.

* Explore: Browse movies, series, and public collections.

* Search: Search the movie and series catalog.

* Collections: Discover public lists created by members.

* Profile: Personal activity, watched titles, watchlist, and collections.

On mobile, use a compact bottom navigation with clear icons and accessible labels. On desktop, use a restrained header or sidebar.

Avoid unnecessary navigation destinations, complicated menus, and excessive UI elements.

### 5\. Movie and series pages

Each movie or series has a dedicated URL, such as:

`/movie/interstellar-2014`

`/series/breaking-bad-2008`

### Page header

Display:

* Official poster

* Title

* Release year

* Movie or series designation

* Genres

* Short synopsis

* Trailer, if available

* Creator/director and principal cast, where available

* Watched, Want to Watch, and Add to Collection actions

Do not overwhelm the page with metadata. Place secondary details inside an expandable About section.

### Community tabs

| Tab       | Purpose                           | Composer placeholder              |
| --------- | --------------------------------- | --------------------------------- |
| Lessons   | What viewers learned              | What did this movie teach you?    |
| Quotes    | Memorable dialogue                | What quote stayed with you?       |
| Reviews   | Longer personal opinions          | What did you think of this movie? |
| Questions | Questions and community answers   | What would you like to ask?       |
| Moments   | Memorable scenes and experiences  | Which moment stayed with you?     |
| Trailer   | First impressions and predictions | What do you think of the trailer? |

For series, change the wording to "series" where appropriate.

The active tab determines the composer, feed, and content format.

### Universal social feed behavior

Lessons, Quotes, Moments, and Trailer use a familiar X/Twitter-style feed.

Each tab must have:

* A composer positioned above the feed.

* A dynamic placeholder appropriate to that tab.

* A simple Post button.

* A reverse-chronological feed, newest first.

* Author name, avatar, timestamp, and post content.

* Like, Reply, and Share actions.

* An unobtrusive three-dot menu for permitted actions.

Do not open a separate page, modal, or complex form to create a normal contribution. The user writes directly in the composer and publishes from the same page.

The composer must be reusable across tabs. Switching tabs changes the placeholder and destination category, not the overall design.

The content should appear immediately after a successful post without requiring a page reload.

### 6\. Special format: Reviews

Reviews are different from short social contributions.

They should still be easy to create, but allow longer, more thoughtful writing.

### Review composer

Use an expanded version of the normal composer with:

* Optional review title

* Multiline review body

* Spoiler toggle

* Publish button

The title should never be mandatory.

### Review feed

Reviews should appear as compact previews rather than full-length posts.

Each review card displays:

* Author and publication date

* Optional review title

* A short introduction or excerpt

* Read More action

* Like and reply counts

Opening a review displays the full text and its discussion.

Users may edit or delete their own reviews. For the MVP, allow one primary review per user per movie or series, which can be updated.

Never ask for a rating during review creation.

### 7\. Special format: Questions and answers

The Questions tab should take light inspiration from Quora, without copying its complexity.

The purpose is to let people ask about confusing scenes, character decisions, story endings, interpretations, or other movie-related subjects.

### Question composer

Use a question-focused composer:

Placeholder: "What would you like to ask about this movie?"

Allow an optional description for additional context.

### Question feed

Display question-led cards with:

* Question text as the main heading

* Author and date

* Number of answers

* A short preview of the leading or most helpful answer, if available

* Answer action

* Follow Question action, if included in a later release

Selecting a question opens its dedicated answer thread.

### Answer experience

Answers should support paragraphs, likes, and replies. The question author can mark an answer as helpful, but should not have exclusive power to determine the correct interpretation of a movie.

Avoid downvotes, reputation scores, badges, and complicated contributor levels.

Provide a "Contains spoilers" option for questions and answers.

### 8\. Public collections

Registered users can create public collections of movies and series.

Each collection contains:

* Collection title

* Optional description

* Cover generated from included movie posters

* Ordered list of movies and series

* Creator name

* Date created and updated

* Save Collection action

Examples include "Movies That Taught Me Something," "My Favorite Mystery Stories," and "Series With Unforgettable Endings."

Collections should have shareable public URLs and appear in search results where relevant.

Users can edit, reorder, and remove titles from their own collections.

### 9\. Personal viewing library

Each registered user has three simple viewing states:

Watched: Movies or series they have completed or watched.

Want to Watch: Titles they intend to watch.

Collections: Their personally curated public lists.

Do not introduce viewing streaks, achievement systems, ratings, or gamification.

For series, the MVP can track the overall series as watched or not watched. Season and episode progress tracking can be introduced later.

### 10\. Authentication and onboarding

The platform must be publicly accessible without authentication.

Visitors can browse the catalog, open movie pages, read every public community tab, and view public profiles and collections.

Authentication is required when a visitor attempts to:

* Publish a contribution or review

* Ask or answer a question

* Like or reply

* Mark a title as watched

* Add a title to a watchlist or collection

* Create or save a collection

Show clear Get Started and Sign In actions in the header and appropriate guest-facing areas.

When an unauthenticated visitor clicks an engagement action, show a small, friendly authentication prompt. After successful authentication, return them to the page and action they were attempting.

Use a managed authentication provider compatible with Cloudflare Workers, such as Clerk, to reduce custom authentication work.

Do not force registration before visitors have experienced the platform.

### 11\. Search engine — a major priority

Search must be one of the strongest parts of the platform.

Users should be able to find a movie or series quickly, even when they only remember part of its title.

### Search requirements

* Search movies and series from one unified search interface.

* Instant suggestions as the user types.

* Support partial titles, alternate titles, and common spelling mistakes.

* Search by movie title, series title, release year, cast, director, and genre.

* Show posters, titles, years, and content type in search suggestions.

* Support keyboard navigation and a clear empty-results state.

* Allow filtering by Movies, Series, and Collections.

* Prioritize exact title matches, followed by close and relevant matches.

* Display helpful results without requiring authentication.

### Technical implementation

Use Cloudflare D1 as the authoritative movie database.

For the MVP, use a normalized search index and SQLite FTS5 full-text search, with prefix matching and a secondary fuzzy-search strategy for misspellings. Do not rely on basic SQL `LIKE` queries alone.

Search should be debounced on the client, use parameterized queries, and have a sensible minimum query length. Index searchable title variations, release years, and relevant contributor names.

If the catalog grows significantly, a dedicated search service can be considered later.

Important: Search must use the platform's own approved catalog. It must not automatically create movie pages from external search results.

### 12\. Administrator dashboard

The administrator controls the official movie and series catalog.

### Movie and series management

The admin dashboard must support:

* Create movie or series

* Search and import metadata from a movie database provider, such as TMDB

* Manually edit titles, descriptions, genres, release dates, cast, and crew

* Upload or associate posters and backdrop images

* Attach official trailer links

* Publish, unpublish, or archive pages

* Detect duplicate movie and series entries

* Manage URL slugs and redirects when titles change

TMDB integration should be used for metadata convenience, subject to its licensing and attribution requirements. External API results must not become public pages without admin approval.

### Community moderation

Administrators must be able to:

* Review reported contributions and replies

* Remove or restore content

* Suspend or ban abusive accounts

* Inspect moderation history

* Restrict spam accounts

* Manage reported questions and answers

The dashboard should be functional and minimal, not a complicated content management system.

### 13\. Design direction

Calm, editorial layout

Generous spacing and readable typography

Lightweight social feed

Content-first posts without heavy cards

The design must prioritize simplicity and comfort.

Visual rules

* Use a restrained neutral color palette.

* Provide light and dark modes.

* Prefer typography, whitespace, and subtle dividers over decorative cards.

* Use small, consistent icons.

* Avoid loud gradients, excessive animations, and distracting backgrounds.

* Maintain readable text sizes and accessible contrast.

* Use subtle transitions and respect reduced-motion preferences.

* Optimize mobile layouts first.

* Use skeleton loading only where it genuinely improves perceived performance.

The movie page should feel more like a peaceful reading and discussion space than an entertainment news portal.

Keep the composer and community feed visually consistent across tabs, while allowing Reviews and Questions to have their own content structures.

### 14\. Technical architecture — Cloudflare

Use a Cloudflare-native architecture designed for low operating costs, performance, and maintainability.

Frontend

React + TypeScript · Vite · Tailwind CSS

Cloudflare Workers

Hono API · Authentication · Business logic

D1

Database & search

R2

Media storage

KV

Optional cache

Recommended Cloudflare deployment architecture

| Component       | Technology                              |
| --------------- | --------------------------------------- |
| Frontend        | React, TypeScript, Vite                 |
| Styling         | Tailwind CSS                            |
| API             | Hono on Cloudflare Workers              |
| Database        | Cloudflare D1                           |
| Media storage   | Cloudflare R2                           |
| Authentication  | Clerk                                   |
| Search          | D1 SQLite FTS5 and fuzzy matching       |
| Cache           | Cloudflare Cache API; KV only if needed |
| Background jobs | Cloudflare Queues, when needed          |
| Deployment      | Cloudflare Workers with static assets   |

Use one Cloudflare Workers deployment for the frontend and API where practical. Avoid unnecessary microservices.

### Cloudflare bindings

Suggested resource names:

```toml
[[d1_databases]]
binding = "DB"
database_name = "movie-community-db"
database_id = "<database-id>"

[[r2_buckets]]
binding = "MEDIA"
bucket_name = "movie-community-media"
```

These are illustrative bindings. Actual identifiers must be configured during deployment.

Use separate development and production environments, with production secrets managed through Cloudflare rather than committed to source code.

### 15\. Database design

Create a relational D1 schema with appropriate foreign keys, indexes, and migration files.

### Core tables

| Table              | Responsibility                             |
| ------------------ | ------------------------------------------ |
| users              | Profiles and authentication-provider IDs   |
| titles             | Admin-approved movies and series           |
| title_people       | Cast, directors, creators, and roles       |
| title_genres       | Genre associations                         |
| posts              | Lessons, quotes, moments, trailer thoughts |
| reviews            | Long-form reviews                          |
| questions          | Movie and series questions                 |
| answers            | Answers to questions                       |
| replies            | Replies to posts and reviews               |
| likes              | Likes on supported contribution types      |
| collections        | User-created public collections            |
| collection_items   | Ordered movie and series references        |
| viewing_library    | Watched and Want to Watch states           |
| reports            | User-submitted moderation reports          |
| moderation_actions | Administrator actions and audit history    |

Use UUID or ULID identifiers consistently, UTC timestamps, and database-level uniqueness constraints where appropriate.

Posts must have an explicit category such as `lesson`, `quote`, `moment`, or `trailer_thought`. Do not mix reviews and questions into the generic posts table if their data and interaction requirements differ significantly.

Design the schema to support efficient pagination and feeds.

### 16\. Social feed and interaction requirements

### Feed behavior

* Paginate feeds using cursors rather than loading every contribution at once.

* Default to newest first.

* Preserve scroll position when navigating back.

* Support optimistic likes and posting, with rollback if the server rejects the action.

* Allow authors to edit and delete their own content.

* Show friendly empty states when a tab has no contributions.

* Use server-side authorization for every write operation.

### Spoiler handling

Spoiler protection is essential.

Allow users to mark posts, reviews, questions, answers, and replies as containing spoilers.

Spoiler-marked content should be visually concealed until the reader chooses to reveal it. Avoid exposing spoiler text in notification previews, search snippets, or social-sharing metadata.

For series, add optional season and episode references to contributions where appropriate, even if full episode pages are deferred.

### Quotes

Quotes should support a short dialogue excerpt, optional character attribution, and an optional personal explanation.

Because movie dialogue is copyrighted, provide clear community rules against posting lengthy scripts or substantial copyrighted passages. Include a copyright complaint and takedown process.

### 17\. Security, privacy, and reliability

Implement the following from the beginning:

* Validate all API inputs using a shared schema validation library.

* Enforce ownership and administrator permissions on the server.

* Sanitize or safely render all user-generated text to prevent XSS.

* Use prepared statements for D1 queries.

* Prevent duplicate likes and repeated submissions.

* Protect admin routes with role-based authorization.

* Verify authentication tokens server-side.

* Keep API credentials and secrets out of frontend bundles.

* Use secure upload validation for any user avatars or admin-managed media.

* Maintain database migrations and a backup/recovery procedure.

* Provide privacy policy, terms, community guidelines, and account deletion.

Text-first user contributions should be the default for the MVP. Do not introduce arbitrary image or video attachments to community posts.

### 18\. Main pages and routes

| Route              | Page                        |
| ------------------ | --------------------------- |
| /                  | Home/community feed         |
| /explore           | Movie and series discovery  |
| /search            | Search results              |
| /movie/:slug       | Movie page                  |
| /series/:slug      | Series page                 |
| /questions/:id     | Full question and answers   |
| /reviews/:id       | Full review and discussion  |
| /collections       | Public collection discovery |
| /collections/:slug | Individual collection       |
| /u/:username       | Public user profile         |
| /library           | Personal viewing library    |
| /settings          | Account settings            |
| /admin             | Administrator dashboard     |

Use clean, human-readable URLs and proper canonical metadata.

Public pages should be search-engine accessible. Prefer server-rendered or prerendered public movie pages and collection pages rather than relying entirely on client-side rendering for search engine indexing.


### 19\. Acceptance criteria

The MVP is ready for launch when:

* A guest can browse, search, and read all public content without signing in.

* A guest cannot perform any engagement action without authentication.

* An administrator can create and publish a movie or series page.

* Search returns relevant results quickly, including partial title matches.

* Every community tab has the correct dynamic composer placeholder.

* Lessons, Quotes, Moments, and Trailer tabs behave like simple social feeds.

* Reviews support optional titles, longer text, and preview-based feeds.

* Questions support dedicated answer threads and helpful-answer interactions.

* Posts, likes, replies, and viewing-library changes persist correctly in D1.

* Users can create and share public collections.

* Spoiler controls work consistently.

* Mobile navigation, typography, and interactions are polished.

* The platform deploys successfully to Cloudflare Workers using D1 and R2.

* No rating-related feature, field, or interface is exposed anywhere.

### 21\. Final product direction

This is a community built around what people take away from stories.

The movie or series is the shared subject. The people provide the meaning, memories, questions, and conversations.

Build for the person who finishes watching something and simply wants to say something about it.

Keep the experience as easy as opening a movie page, choosing a tab, typing a thought, and posting it.

No unnecessary steps. No pressure to sound like a critic. No ratings. Just people sharing what stayed with them.

Implementation instruction: Build this as a production-minded, mobile-first Cloudflare application. Prioritize the movie/series page, reusable dynamic social composer, separate review and question experiences, fast internal search, authentication gating, and a clean administrator workflow. Keep components modular, database migrations reproducible, and the interface deliberately minimal.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/86ed698c-ecc8-40a9-bd03-d9bab774391d).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

import type { DB, Title } from "./types";

// Static demo catalog and community content. No randomness here: this module
// is evaluated on the server and must render identically on the client.

const t = (x: Omit<Title, "status" | "createdAt"> & { status?: Title["status"] }): Title => ({
  status: "published",
  createdAt: "2026-09-01T10:00:00.000Z",
  ...x,
});

export const seedTitles: Title[] = [
  t({
    id: "t-interstellar", slug: "interstellar-2014", kind: "movie", name: "Interstellar", altNames: [],
    year: 2014, genres: ["Science Fiction", "Drama", "Adventure"], hue: 230,
    synopsis: "As Earth's crops fail, a former pilot leaves his children behind to travel through a wormhole in search of a new home for humanity.",
    runtime: "2h 49m", country: "United States", language: "English",
    trailerUrl: "https://www.youtube.com/embed/zSWdZVtXT7E",
    people: [
      { name: "Christopher Nolan", role: "director" },
      { name: "Matthew McConaughey", role: "cast", character: "Cooper" },
      { name: "Anne Hathaway", role: "cast", character: "Brand" },
      { name: "Jessica Chastain", role: "cast", character: "Murph" },
    ],
  }),
  t({
    id: "t-breaking-bad", slug: "breaking-bad-2008", kind: "series", name: "Breaking Bad", altNames: [],
    year: 2008, genres: ["Crime", "Drama", "Thriller"], hue: 95,
    synopsis: "A high school chemistry teacher facing a terminal diagnosis turns to making methamphetamine to secure his family's future.",
    country: "United States", language: "English",
    people: [
      { name: "Vince Gilligan", role: "creator" },
      { name: "Bryan Cranston", role: "cast", character: "Walter White" },
      { name: "Aaron Paul", role: "cast", character: "Jesse Pinkman" },
      { name: "Anna Gunn", role: "cast", character: "Skyler White" },
    ],
  }),
  t({
    id: "t-spirited-away", slug: "spirited-away-2001", kind: "movie", name: "Spirited Away", altNames: ["Sen to Chihiro no Kamikakushi", "千と千尋の神隠し"],
    year: 2001, genres: ["Animation", "Fantasy", "Family"], hue: 15,
    synopsis: "A ten-year-old girl wanders into a world of spirits and must find the courage to free her parents and herself.",
    runtime: "2h 5m", country: "Japan", language: "Japanese",
    people: [
      { name: "Hayao Miyazaki", role: "director" },
      { name: "Rumi Hiiragi", role: "cast", character: "Chihiro" },
      { name: "Miyu Irino", role: "cast", character: "Haku" },
    ],
  }),
  t({
    id: "t-arrival", slug: "arrival-2016", kind: "movie", name: "Arrival", altNames: ["Story of Your Life"],
    year: 2016, genres: ["Science Fiction", "Drama", "Mystery"], hue: 200,
    synopsis: "A linguist is recruited to communicate with mysterious visitors, and learning their language changes how she experiences time.",
    runtime: "1h 56m", country: "United States", language: "English",
    people: [
      { name: "Denis Villeneuve", role: "director" },
      { name: "Amy Adams", role: "cast", character: "Louise Banks" },
      { name: "Jeremy Renner", role: "cast", character: "Ian Donnelly" },
    ],
  }),
  t({
    id: "t-shawshank", slug: "the-shawshank-redemption-1994", kind: "movie", name: "The Shawshank Redemption", altNames: ["Shawshank"],
    year: 1994, genres: ["Drama"], hue: 55,
    synopsis: "Two imprisoned men form a lasting friendship over the years, finding small acts of hope inside a hard place.",
    runtime: "2h 22m", country: "United States", language: "English",
    people: [
      { name: "Frank Darabont", role: "director" },
      { name: "Tim Robbins", role: "cast", character: "Andy Dufresne" },
      { name: "Morgan Freeman", role: "cast", character: "Ellis 'Red' Redding" },
    ],
  }),
  t({
    id: "t-parasite", slug: "parasite-2019", kind: "movie", name: "Parasite", altNames: ["Gisaengchung", "기생충"],
    year: 2019, genres: ["Thriller", "Drama", "Comedy"], hue: 140,
    synopsis: "A struggling family schemes its way into the lives of a wealthy household, until a hidden secret upends everything.",
    runtime: "2h 12m", country: "South Korea", language: "Korean",
    people: [
      { name: "Bong Joon-ho", role: "director" },
      { name: "Song Kang-ho", role: "cast", character: "Kim Ki-taek" },
      { name: "Choi Woo-shik", role: "cast", character: "Kim Ki-woo" },
    ],
  }),
  t({
    id: "t-dark", slug: "dark-2017", kind: "series", name: "Dark", altNames: [],
    year: 2017, genres: ["Mystery", "Science Fiction", "Drama"], hue: 260,
    synopsis: "A child's disappearance in a small German town exposes the fractured relationships of four families across generations.",
    country: "Germany", language: "German",
    people: [
      { name: "Baran bo Odar", role: "creator" },
      { name: "Jantje Friese", role: "creator" },
      { name: "Louis Hofmann", role: "cast", character: "Jonas Kahnwald" },
      { name: "Lisa Vicari", role: "cast", character: "Martha Nielsen" },
    ],
  }),
  t({
    id: "t-fleabag", slug: "fleabag-2016", kind: "series", name: "Fleabag", altNames: [],
    year: 2016, genres: ["Comedy", "Drama"], hue: 350,
    synopsis: "A sharp, grieving woman navigates life and love in London while talking directly to us about all of it.",
    country: "United Kingdom", language: "English",
    people: [
      { name: "Phoebe Waller-Bridge", role: "creator" },
      { name: "Phoebe Waller-Bridge", role: "cast", character: "Fleabag" },
      { name: "Sian Clifford", role: "cast", character: "Claire" },
      { name: "Andrew Scott", role: "cast", character: "The Priest" },
    ],
  }),
  t({
    id: "t-eeaao", slug: "everything-everywhere-all-at-once-2022", kind: "movie", name: "Everything Everywhere All at Once", altNames: ["EEAAO"],
    year: 2022, genres: ["Science Fiction", "Comedy", "Action"], hue: 310,
    synopsis: "An exhausted laundromat owner discovers she must connect with versions of herself across the multiverse to save what matters.",
    runtime: "2h 19m", country: "United States", language: "English",
    people: [
      { name: "Daniel Kwan", role: "director" },
      { name: "Daniel Scheinert", role: "director" },
      { name: "Michelle Yeoh", role: "cast", character: "Evelyn Wang" },
      { name: "Ke Huy Quan", role: "cast", character: "Waymond Wang" },
    ],
  }),
  t({
    id: "t-coco", slug: "coco-2017", kind: "movie", name: "Coco", altNames: [],
    year: 2017, genres: ["Animation", "Family", "Music"], hue: 40,
    synopsis: "A young musician crosses into the Land of the Dead to uncover the story behind his family's ban on music.",
    runtime: "1h 45m", country: "United States", language: "English",
    people: [
      { name: "Lee Unkrich", role: "director" },
      { name: "Anthony Gonzalez", role: "cast", character: "Miguel" },
      { name: "Gael García Bernal", role: "cast", character: "Héctor" },
    ],
  }),
  t({
    id: "t-the-bear", slug: "the-bear-2022", kind: "series", name: "The Bear", altNames: [],
    year: 2022, genres: ["Drama", "Comedy"], hue: 25,
    synopsis: "A young fine-dining chef returns home to run his late brother's chaotic sandwich shop in Chicago.",
    country: "United States", language: "English",
    people: [
      { name: "Christopher Storer", role: "creator" },
      { name: "Jeremy Allen White", role: "cast", character: "Carmy Berzatto" },
      { name: "Ayo Edebiri", role: "cast", character: "Sydney Adamu" },
    ],
  }),
  t({
    id: "t-past-lives", slug: "past-lives-2023", kind: "movie", name: "Past Lives", altNames: [],
    year: 2023, genres: ["Romance", "Drama"], hue: 180,
    synopsis: "Two childhood friends separated by emigration reunite decades later and confront the lives they didn't live.",
    runtime: "1h 46m", country: "United States", language: "English, Korean",
    people: [
      { name: "Celine Song", role: "director" },
      { name: "Greta Lee", role: "cast", character: "Nora" },
      { name: "Teo Yoo", role: "cast", character: "Hae Sung" },
    ],
  }),
];

const users: DB["users"] = [
  { id: "u-admin", username: "inktella", displayName: "Inktella Team", email: "admin@inktella.app", password: "admin123", role: "admin", status: "active", createdAt: "2026-08-01T09:00:00.000Z", bio: "Keeping the lights low and the conversation kind." },
  { id: "u-amara", username: "amara", displayName: "Amara Okello", email: "amara@example.com", password: "demo1234", role: "user", status: "active", createdAt: "2026-08-10T09:00:00.000Z", bio: "Sunday matinee person. Cries at animation.", favoriteTitleIds: ["t-spirited-away", "t-coco", "t-past-lives", "t-fleabag"] },
  { id: "u-leo", username: "leo", displayName: "Leo Marquez", email: "leo@example.com", password: "demo1234", role: "user", status: "active", createdAt: "2026-08-12T09:00:00.000Z", bio: "Rewatcher. Mostly sci-fi.", favoriteTitleIds: ["t-interstellar", "t-arrival", "t-dark"] },
  { id: "u-sana", username: "sana", displayName: "Sana Iqbal", email: "sana@example.com", password: "demo1234", role: "user", status: "active", createdAt: "2026-08-20T09:00:00.000Z" },
  { id: "u-tom", username: "tomw", displayName: "Tom Whitfield", email: "tom@example.com", password: "demo1234", role: "user", status: "active", createdAt: "2026-09-02T09:00:00.000Z", bio: "I watch things slowly." },
];

const d = (day: number, h = 12) => `2026-10-${String(day).padStart(2, "0")}T${String(h).padStart(2, "0")}:00:00.000Z`;

const discoveryTags = [
  { id: "tag-former-pilots", name: "Former Pilots", slug: "former-pilots", description: "Stories about pilots who leave the cockpit behind.", aliases: ["ex-pilots", "retired aviators"], createdAt: d(1), updatedAt: d(1) },
  { id: "tag-family-separation", name: "Family Separation", slug: "family-separation", description: "Stories shaped by distance, absence, or the fear of losing family.", aliases: ["leaving children behind", "separated families"], createdAt: d(1), updatedAt: d(1) },
  { id: "tag-dangerous-missions", name: "Dangerous Missions", slug: "dangerous-missions", description: "Characters risking everything to complete an impossible mission.", aliases: ["perilous missions", "impossible missions"], createdAt: d(1), updatedAt: d(1) },
  { id: "tag-crossing-worlds", name: "Crossing Worlds", slug: "crossing-worlds", description: "Stories where a character steps into a strange or hidden world.", aliases: ["other worlds", "parallel worlds"], createdAt: d(1), updatedAt: d(1) },
];

export function createSeed(): DB {
  return {
    version: 1,
    users: structuredClone(users).map((user) => ({ ...user, isPro: user.id === "u-amara" || user.id === "u-admin" })),
    titles: structuredClone(seedTitles),
    discoveryTags: structuredClone(discoveryTags),
    titleDiscoveryTags: [
      { titleId: "t-interstellar", tagId: "tag-former-pilots", createdAt: d(1) },
      { titleId: "t-interstellar", tagId: "tag-family-separation", createdAt: d(1) },
      { titleId: "t-interstellar", tagId: "tag-dangerous-missions", createdAt: d(1) },
      { titleId: "t-arrival", tagId: "tag-dangerous-missions", createdAt: d(1) },
      { titleId: "t-spirited-away", tagId: "tag-crossing-worlds", createdAt: d(1) },
      { titleId: "t-eeaao", tagId: "tag-crossing-worlds", createdAt: d(1) },
      { titleId: "t-dark", tagId: "tag-family-separation", createdAt: d(1) },
    ],
    intentLinks: [
      { id: "intent-interstellar-pilot", titleId: "t-interstellar", tagId: "tag-former-pilots", selectedPhrase: "former pilot", startOffset: 39, endOffset: 51, blurbVersion: "seed", approvalStatus: "approved", createdAt: d(1), updatedAt: d(1) },
      { id: "intent-interstellar-family", titleId: "t-interstellar", tagId: "tag-family-separation", selectedPhrase: "leaves his children behind", startOffset: 52, endOffset: 78, blurbVersion: "seed", approvalStatus: "approved", createdAt: d(1), updatedAt: d(1) },
    ],
    posts: [
      { id: "p1", titleId: "t-interstellar", userId: "u-amara", category: "lesson", body: "Love isn't a distraction from the mission. Sometimes it is the mission.", spoiler: false, createdAt: d(15, 9) },
      { id: "p2", titleId: "t-interstellar", userId: "u-leo", category: "quote", body: "Do not go gentle into that good night.", quoteCharacter: "Professor Brand", quoteNote: "Hearing a poem read like a launch countdown never leaves you.", spoiler: false, createdAt: d(14, 18) },
      { id: "p3", titleId: "t-interstellar", userId: "u-sana", category: "moment", body: "The video messages scene. Twenty-three years of messages in a few minutes. I had to pause it.", spoiler: true, createdAt: d(13, 21) },
      { id: "p4", titleId: "t-interstellar", userId: "u-tom", category: "trailer_thought", body: "The cornfield shots alone sold me. Quiet trailers are the best trailers.", spoiler: false, createdAt: d(10, 8) },
      { id: "p5", titleId: "t-spirited-away", userId: "u-amara", category: "lesson", body: "Remembering your own name is a kind of freedom. Don't let work or other people take it from you.", spoiler: false, createdAt: d(15, 7) },
      { id: "p6", titleId: "t-spirited-away", userId: "u-sana", category: "moment", body: "The train across the flooded sea. No dialogue, just watching the world go by. Perfect stillness.", spoiler: false, createdAt: d(12, 15) },
      { id: "p7", titleId: "t-breaking-bad", userId: "u-leo", category: "lesson", body: "Pride is the most expensive thing a person can own.", spoiler: false, createdAt: d(14, 11) },
      { id: "p8", titleId: "t-breaking-bad", userId: "u-tom", category: "quote", body: "I am the one who knocks.", quoteCharacter: "Walter White", quoteNote: "The moment the mask fell off for good.", spoiler: false, season: 4, episode: 6, createdAt: d(11, 20) },
      { id: "p9", titleId: "t-arrival", userId: "u-sana", category: "lesson", body: "Knowing how something ends doesn't mean you shouldn't begin it.", spoiler: true, createdAt: d(15, 6) },
      { id: "p10", titleId: "t-shawshank", userId: "u-tom", category: "quote", body: "Get busy living, or get busy dying.", quoteCharacter: "Andy Dufresne", spoiler: false, createdAt: d(9, 13) },
      { id: "p11", titleId: "t-past-lives", userId: "u-amara", category: "lesson", body: "You can love who you were and still be grateful for who you became.", spoiler: false, createdAt: d(14, 22) },
      { id: "p12", titleId: "t-the-bear", userId: "u-leo", category: "moment", body: "The one-take kitchen episode made my heart rate genuinely go up. I needed a walk after.", spoiler: false, season: 1, episode: 7, createdAt: d(13, 10) },
      { id: "p13", titleId: "t-coco", userId: "u-sana", category: "lesson", body: "We stay alive in the stories people keep telling about us. Call your grandparents.", spoiler: false, createdAt: d(12, 9) },
      { id: "p14", titleId: "t-eeaao", userId: "u-amara", category: "quote", body: "Please, be kind. Especially when we don't know what's going on.", quoteCharacter: "Waymond Wang", spoiler: false, createdAt: d(11, 16) },
      { id: "p15", titleId: "t-dark", userId: "u-tom", category: "moment", body: "The first time the caves are opened. Pure dread, in the best way.", spoiler: false, season: 1, episode: 1, createdAt: d(10, 19) },
      { id: "p16", titleId: "t-fleabag", userId: "u-leo", category: "lesson", body: "Humour is often how people keep the door shut. Fleabag taught me to notice when I'm doing it.", spoiler: false, createdAt: d(9, 9) },
    ],
    reviews: [
      { id: "r1", titleId: "t-interstellar", userId: "u-leo", heading: "A film about time, really about parents", body: "I went in expecting a space movie and came out thinking about my dad.\n\nUnder all the physics, Interstellar is about the cost of leaving and the promise of coming back. The docking scene is spectacular, but what stayed with me was how much of the film is just people waiting for each other.\n\nNot every line of dialogue lands, and the third act asks you to go along with a lot. I didn't mind. It made me want to call home.", spoiler: false, createdAt: d(13, 12) },
      { id: "r2", titleId: "t-interstellar", userId: "u-amara", body: "The soundtrack carried me through the whole thing. The organ makes everything feel like a cathedral. I'm not a science person and I still followed the feelings perfectly.", spoiler: false, createdAt: d(12, 17) },
      { id: "r3", titleId: "t-parasite", userId: "u-sana", heading: "The staircase never stops going down", body: "Every set in Parasite is about height. Up the hill, down the stairs, below the basement. By the end, I was noticing every step.\n\nIt's funny for a long time, then it isn't, and the switch happens so smoothly you only notice after.", spoiler: true, createdAt: d(11, 14) },
      { id: "r4", titleId: "t-breaking-bad", userId: "u-tom", heading: "Slow, then all at once", body: "The first season is quieter than people remember. I loved that. It lets you believe Walt is a good man for just long enough.", spoiler: false, createdAt: d(10, 12) },
    ],
    questions: [
      { id: "q1", titleId: "t-interstellar", userId: "u-tom", text: "How did Cooper end up inside the tesseract?", details: "I understood the black hole part, but who built it, and why could he only reach that bookshelf?", spoiler: true, createdAt: d(14, 9) },
      { id: "q2", titleId: "t-arrival", userId: "u-amara", text: "Was Louise choosing her future, or just remembering it?", spoiler: true, createdAt: d(13, 8) },
      { id: "q3", titleId: "t-dark", userId: "u-leo", text: "Is there a good way to keep track of the family trees on a first watch?", details: "Three episodes in and I'm already lost. No spoilers please!", spoiler: false, createdAt: d(12, 20) },
    ],
    answers: [
      { id: "a1", questionId: "q1", userId: "u-leo", body: "The film suggests future humans built the tesseract so Cooper could communicate with Murph through gravity. The bookshelf is where his strongest connection to her lived, which is why that's where it opens.", spoiler: true, helpful: true, createdAt: d(14, 12) },
      { id: "a2", questionId: "q1", userId: "u-sana", body: "I read it as love being the thing that tunes him to the right moment. Not literally, but emotionally it's the bridge.", spoiler: true, helpful: false, createdAt: d(14, 15) },
      { id: "a3", questionId: "q3", userId: "u-sana", body: "Keep a little notebook with each family name at the top of a page. Write down who is related to whom as you learn it. Don't look up charts — they spoil things.", spoiler: false, helpful: false, createdAt: d(13, 9) },
    ],
    replies: [
      { id: "rp1", targetType: "post", targetId: "p1", userId: "u-leo", body: "This is the whole movie in one sentence.", spoiler: false, createdAt: d(15, 10) },
      { id: "rp2", targetType: "review", targetId: "r1", userId: "u-amara", body: "Same. I called my mum right after.", spoiler: false, createdAt: d(13, 19) },
      { id: "rp3", targetType: "answer", targetId: "a1", userId: "u-tom", body: "Ah, that makes the bookshelf make sense. Thank you.", spoiler: false, createdAt: d(14, 13) },
    ],
    likes: [
      { userId: "u-leo", targetType: "post", targetId: "p1" },
      { userId: "u-sana", targetType: "post", targetId: "p1" },
      { userId: "u-tom", targetType: "post", targetId: "p1" },
      { userId: "u-amara", targetType: "post", targetId: "p2" },
      { userId: "u-amara", targetType: "review", targetId: "r1" },
      { userId: "u-tom", targetType: "review", targetId: "r1" },
      { userId: "u-tom", targetType: "answer", targetId: "a1" },
      { userId: "u-amara", targetType: "answer", targetId: "a1" },
      { userId: "u-leo", targetType: "post", targetId: "p5" },
      { userId: "u-tom", targetType: "post", targetId: "p14" },
    ],
    collections: [
      { id: "c1", slug: "movies-that-taught-me-something", userId: "u-amara", name: "Movies That Taught Me Something", description: "Small lessons, big feelings.", titleIds: ["t-spirited-away", "t-coco", "t-past-lives", "t-interstellar", "t-shawshank"], createdAt: d(5), updatedAt: d(14) },
      { id: "c2", slug: "my-favorite-mystery-stories", userId: "u-leo", name: "My Favorite Mystery Stories", description: "Puzzles worth getting lost in.", titleIds: ["t-dark", "t-arrival", "t-parasite"], createdAt: d(6), updatedAt: d(12) },
      { id: "c3", slug: "series-with-unforgettable-endings", userId: "u-tom", name: "Series With Unforgettable Endings", titleIds: ["t-breaking-bad", "t-fleabag", "t-dark"], createdAt: d(7), updatedAt: d(11) },
    ],
    savedCollections: [{ userId: "u-sana", collectionId: "c1" }],
    follows: [],
    library: [
      { userId: "u-amara", titleId: "t-interstellar", state: "watched", updatedAt: d(12) },
      { userId: "u-amara", titleId: "t-dark", state: "want", updatedAt: d(12) },
    ],
    trail: [],
    reports: [
      { id: "rep1", targetType: "post", targetId: "p8", reporterId: "u-sana", reason: "Possible spoiler without a warning", status: "open", createdAt: d(12, 8) },
    ],
    modActions: [],
    recommendations: [],
    slugRedirects: {},
    sessionUserId: null,
  };
}

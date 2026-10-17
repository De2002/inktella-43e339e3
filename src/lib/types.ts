export type Kind = "movie" | "series";
export type TitleStatus = "published" | "unpublished" | "archived";
export type PersonRole = "director" | "creator" | "writer" | "cast";

export interface Person {
  name: string;
  role: PersonRole;
  character?: string;
}

export interface Title {
  id: string;
  slug: string;
  kind: Kind;
  name: string;
  altNames: string[];
  year: number;
  genres: string[];
  synopsis: string;
  runtime?: string;
  country?: string;
  language?: string;
  trailerUrl?: string;
  people: Person[];
  status: TitleStatus;
  hue: number;
  createdAt: string;
}

export type PostCategory = "lesson" | "quote" | "moment" | "trailer_thought";

export interface Post {
  id: string;
  titleId: string;
  userId: string;
  category: PostCategory;
  body: string;
  quoteCharacter?: string;
  quoteNote?: string;
  spoiler: boolean;
  season?: number;
  episode?: number;
  createdAt: string;
  updatedAt?: string;
  removed?: boolean;
}

export interface Review {
  id: string;
  titleId: string;
  userId: string;
  heading?: string;
  body: string;
  spoiler: boolean;
  createdAt: string;
  updatedAt?: string;
  removed?: boolean;
}

export interface Question {
  id: string;
  titleId: string;
  userId: string;
  text: string;
  details?: string;
  spoiler: boolean;
  season?: number;
  episode?: number;
  createdAt: string;
  updatedAt?: string;
  removed?: boolean;
}

export interface Answer {
  id: string;
  questionId: string;
  userId: string;
  body: string;
  spoiler: boolean;
  helpful: boolean;
  createdAt: string;
  updatedAt?: string;
  removed?: boolean;
}

export type ReplyTarget = "post" | "review" | "answer";
export type TargetType = "post" | "review" | "question" | "answer" | "reply";

export interface Reply {
  id: string;
  targetType: ReplyTarget;
  targetId: string;
  userId: string;
  body: string;
  spoiler: boolean;
  createdAt: string;
  removed?: boolean;
}

export interface Like {
  userId: string;
  targetType: TargetType;
  targetId: string;
}

export interface Collection {
  id: string;
  slug: string;
  userId: string;
  name: string;
  description?: string;
  titleIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface RecommendVote {
  userId: string;
  titleId: string;
  value: "yes" | "no";
  updatedAt: string;
}

export interface LibraryEntry {
  userId: string;
  titleId: string;
  state: "watched" | "want";
  updatedAt: string;
}

export interface User {
  id: string;
  username: string;
  displayName: string;
  email: string;
  password: string;
  bio?: string;
  role: "user" | "admin";
  status: "active" | "suspended" | "banned";
  createdAt: string;
}

export interface Report {
  id: string;
  targetType: TargetType;
  targetId: string;
  reporterId: string;
  reason: string;
  status: "open" | "resolved";
  createdAt: string;
}

export interface ModAction {
  id: string;
  adminId: string;
  action: string;
  targetType: string;
  targetId: string;
  note?: string;
  createdAt: string;
}

export interface DB {
  version: number;
  users: User[];
  titles: Title[];
  posts: Post[];
  reviews: Review[];
  questions: Question[];
  answers: Answer[];
  replies: Reply[];
  likes: Like[];
  collections: Collection[];
  savedCollections: { userId: string; collectionId: string }[];
  library: LibraryEntry[];
  recommendations: RecommendVote[];
  reports: Report[];
  modActions: ModAction[];
  slugRedirects: Record<string, string>;
  sessionUserId: string | null;
}

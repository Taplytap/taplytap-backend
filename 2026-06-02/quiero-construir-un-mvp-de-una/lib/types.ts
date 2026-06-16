export type PlanType = "free" | "premium";
export type ItemStatus = "disponible" | "pausado" | "intercambiado";
export type ItemCondition = "nuevo" | "usado bueno" | "usado regular";
export type SwipeDirection = "like" | "pass";

export type User = {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  city: string;
  avatarUrl: string;
  bio: string;
  verified: boolean;
  planType: PlanType;
  createdAt: string;
};

export type Item = {
  id: string;
  userId: string;
  title: string;
  description: string;
  category: string;
  city: string;
  estimatedValue: number;
  condition: ItemCondition;
  acceptsCashDifference: boolean;
  status: ItemStatus;
  images: string[];
  createdAt: string;
};

export type Match = {
  id: string;
  userAId: string;
  userBId: string;
  itemAId: string;
  itemBId: string;
  status: "active" | "closed";
  createdAt: string;
};

export type Message = {
  id: string;
  matchId: string;
  senderUserId: string;
  body: string;
  createdAt: string;
};

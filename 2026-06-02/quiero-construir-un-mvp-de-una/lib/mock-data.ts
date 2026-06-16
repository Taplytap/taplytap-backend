import type { Item, Match, Message, User } from "./types";

export const currentUser: User = {
  id: "user-me",
  name: "Isaac",
  email: "isaac@example.com",
  city: "Ciudad de Mexico",
  avatarUrl:
    "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80",
  bio: "Me laten los gadgets, muebles compactos y cosas utiles para casa.",
  verified: false,
  planType: "free",
  createdAt: "2026-06-02T14:00:00.000Z"
};

export const users: User[] = [
  currentUser,
  {
    id: "user-ana",
    name: "Ana",
    city: "Ciudad de Mexico",
    avatarUrl:
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=400&q=80",
    bio: "Intercambio objetos de cocina, libros y decoracion.",
    verified: true,
    planType: "free",
    createdAt: "2026-05-30T18:00:00.000Z"
  },
  {
    id: "user-luis",
    name: "Luis",
    city: "Ciudad de Mexico",
    avatarUrl:
      "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=400&q=80",
    bio: "Busco tecnologia en buen estado y juegos de mesa.",
    verified: false,
    planType: "premium",
    createdAt: "2026-05-28T18:00:00.000Z"
  },
  {
    id: "user-mar",
    name: "Mar",
    city: "Ciudad de Mexico",
    avatarUrl:
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80",
    bio: "Cosas bonitas, funcionales y bien cuidadas.",
    verified: true,
    planType: "free",
    createdAt: "2026-05-25T18:00:00.000Z"
  }
];

export const myItems: Item[] = [
  {
    id: "item-my-camera",
    userId: "user-me",
    title: "Camara instantanea",
    description: "Funciona perfecto, incluye una caja de papel fotografico.",
    category: "Tecnologia",
    city: "Ciudad de Mexico",
    estimatedValue: 1900,
    condition: "usado bueno",
    acceptsCashDifference: true,
    status: "disponible",
    images: [
      "https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?auto=format&fit=crop&w=900&q=80"
    ],
    createdAt: "2026-06-01T17:00:00.000Z"
  },
  {
    id: "item-my-chair",
    userId: "user-me",
    title: "Silla nordica",
    description: "Silla blanca para escritorio, poco uso.",
    category: "Hogar",
    city: "Ciudad de Mexico",
    estimatedValue: 750,
    condition: "usado bueno",
    acceptsCashDifference: false,
    status: "disponible",
    images: [
      "https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?auto=format&fit=crop&w=900&q=80"
    ],
    createdAt: "2026-05-31T17:00:00.000Z"
  }
];

export const feedItems: Item[] = [
  {
    id: "item-coffee",
    userId: "user-ana",
    title: "Cafetera espresso compacta",
    description: "Ideal para departamento, limpia y funcionando.",
    category: "Hogar",
    city: "Ciudad de Mexico",
    estimatedValue: 2300,
    condition: "usado bueno",
    acceptsCashDifference: true,
    status: "disponible",
    images: [
      "https://images.unsplash.com/photo-1517668808822-9ebb02f2a0e6?auto=format&fit=crop&w=1000&q=80"
    ],
    createdAt: "2026-06-01T12:00:00.000Z"
  },
  {
    id: "item-bike",
    userId: "user-luis",
    title: "Bicicleta urbana rodada 26",
    description: "Lista para usar, frenos ajustados hace poco.",
    category: "Deportes",
    city: "Ciudad de Mexico",
    estimatedValue: 3200,
    condition: "usado regular",
    acceptsCashDifference: false,
    status: "disponible",
    images: [
      "https://images.unsplash.com/photo-1485965120184-e220f721d03e?auto=format&fit=crop&w=1000&q=80"
    ],
    createdAt: "2026-05-30T12:00:00.000Z"
  },
  {
    id: "item-speaker",
    userId: "user-mar",
    title: "Bocina bluetooth JBL",
    description: "Bateria buena, trae cable y funda.",
    category: "Tecnologia",
    city: "Ciudad de Mexico",
    estimatedValue: 1450,
    condition: "usado bueno",
    acceptsCashDifference: true,
    status: "disponible",
    images: [
      "https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?auto=format&fit=crop&w=1000&q=80"
    ],
    createdAt: "2026-05-29T12:00:00.000Z"
  },
  {
    id: "item-records",
    userId: "user-ana",
    title: "Lote de vinilos clasicos",
    description: "Cinco discos en buen estado, rock y jazz.",
    category: "Coleccionables",
    city: "Ciudad de Mexico",
    estimatedValue: 1100,
    condition: "usado bueno",
    acceptsCashDifference: false,
    status: "disponible",
    images: [
      "https://images.unsplash.com/photo-1603048588665-791ca8aea617?auto=format&fit=crop&w=1000&q=80"
    ],
    createdAt: "2026-05-27T12:00:00.000Z"
  }
];

export const initialMatches: Match[] = [
  {
    id: "match-1",
    userAId: "user-me",
    userBId: "user-ana",
    itemAId: "item-my-chair",
    itemBId: "item-records",
    status: "active",
    createdAt: "2026-06-02T15:00:00.000Z"
  }
];

export const initialMessages: Message[] = [
  {
    id: "msg-1",
    matchId: "match-1",
    senderUserId: "user-ana",
    body: "Hola, me interesa tu silla. Te laten los vinilos?",
    createdAt: "2026-06-02T15:02:00.000Z"
  },
  {
    id: "msg-2",
    matchId: "match-1",
    senderUserId: "user-me",
    body: "Si, estan justo en el rango. Lo vemos?",
    createdAt: "2026-06-02T15:04:00.000Z"
  }
];

export const prohibitedItems = [
  "Armas",
  "Drogas",
  "Documentos oficiales",
  "Animales",
  "Medicamentos",
  "Contenido adulto",
  "Objetos robados, falsificados o ilegales"
];

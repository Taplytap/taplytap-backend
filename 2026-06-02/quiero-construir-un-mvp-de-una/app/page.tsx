"use client";

import { useMemo, useState, type ElementType } from "react";
import Image from "next/image";
import {
  ArrowLeft,
  Ban,
  BadgeCheck,
  Camera,
  ChevronRight,
  CircleDollarSign,
  Flag,
  Heart,
  LogIn,
  MessageCircle,
  Package,
  Plus,
  Send,
  ShieldAlert,
  Sparkles,
  X
} from "lucide-react";
import { AppFrame, Header, SafetyNotice, type View } from "@/components/AppShell";
import { ItemCard } from "@/components/ItemCard";
import { PrimaryButton } from "@/components/PrimaryButton";
import {
  currentUser,
  feedItems as seededFeedItems,
  initialMatches,
  initialMessages,
  myItems as seededMyItems,
  prohibitedItems,
  users
} from "@/lib/mock-data";
import type { Item, Match, Message, User } from "@/lib/types";
import { cn } from "@/lib/utils";

const categories = ["Tecnologia", "Hogar", "Moda", "Deportes", "Coleccionables", "Libros", "Otros"];

export default function Home() {
  const [view, setView] = useState<View>("landing");
  const [profile, setProfile] = useState<User>(currentUser);
  const [myItems, setMyItems] = useState<Item[]>(seededMyItems);
  const [feedItems, setFeedItems] = useState<Item[]>(seededFeedItems);
  const [matches, setMatches] = useState<Match[]>(initialMatches);
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [activeMatchId, setActiveMatchId] = useState(initialMatches[0]?.id ?? "");
  const [lastMatch, setLastMatch] = useState<Match | null>(null);
  const [swipesUsed, setSwipesUsed] = useState(7);

  const ownersById = useMemo(() => new Map(users.map((user) => [user.id, user])), []);
  const activeMatch = matches.find((match) => match.id === activeMatchId);

  function navigate(nextView: View) {
    setView(nextView);
  }

  function handleSwipe(direction: "pass" | "like") {
    const [item, ...rest] = feedItems;
    if (!item) return;

    setFeedItems(rest);
    setSwipesUsed((count) => count + 1);

    if (direction === "like") {
      const myTradeItem = myItems.find((candidate) => candidate.status === "disponible") ?? myItems[0];
      if (myTradeItem && (item.id === "item-coffee" || matches.length === 0)) {
        const match: Match = {
          id: `match-${Date.now()}`,
          userAId: profile.id,
          userBId: item.userId,
          itemAId: myTradeItem.id,
          itemBId: item.id,
          status: "active",
          createdAt: new Date().toISOString()
        };
        setMatches((list) => [match, ...list]);
        setActiveMatchId(match.id);
        setLastMatch(match);
      }
    }
  }

  function publishItem(formData: FormData) {
    const title = String(formData.get("title") ?? "").trim();
    if (!title) return;

    const item: Item = {
      id: `item-${Date.now()}`,
      userId: profile.id,
      title,
      description: String(formData.get("description") ?? ""),
      category: String(formData.get("category") ?? "Otros"),
      city: profile.city,
      estimatedValue: Number(formData.get("estimatedValue") ?? 0),
      condition: String(formData.get("condition") ?? "usado bueno") as Item["condition"],
      acceptsCashDifference: formData.get("acceptsCashDifference") === "on",
      status: "disponible",
      images: [
        "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1000&q=80"
      ],
      createdAt: new Date().toISOString()
    };

    setMyItems((items) => [item, ...items]);
    setView("my-items");
  }

  function sendMessage(body: string) {
    if (!activeMatchId || !body.trim()) return;
    setMessages((list) => [
      ...list,
      {
        id: `msg-${Date.now()}`,
        matchId: activeMatchId,
        senderUserId: profile.id,
        body: body.trim(),
        createdAt: new Date().toISOString()
      }
    ]);
  }

  return (
    <AppFrame activeView={view} onNavigate={navigate}>
      {view === "landing" ? <Landing onStart={() => setView("login")} /> : null}
      {view === "login" ? <Login onLogin={() => setView("onboarding")} /> : null}
      {view === "onboarding" ? (
        <Onboarding
          profile={profile}
          onComplete={(name, city) => {
            setProfile((user) => ({ ...user, name, city }));
            setView("feed");
          }}
        />
      ) : null}
      {view === "feed" ? (
        <Feed
          profile={profile}
          item={feedItems[0]}
          owner={feedItems[0] ? ownersById.get(feedItems[0].userId) : undefined}
          swipesUsed={swipesUsed}
          onSwipe={handleSwipe}
          onPublish={() => setView("publish")}
          lastMatch={lastMatch}
          onOpenMatch={() => {
            setLastMatch(null);
            setView("matches");
          }}
          onCloseMatch={() => setLastMatch(null)}
        />
      ) : null}
      {view === "publish" ? <Publish onPublish={publishItem} /> : null}
      {view === "matches" ? (
        activeMatch ? (
          <ChatView
            match={activeMatch}
            messages={messages.filter((message) => message.matchId === activeMatch.id)}
            usersById={ownersById}
            items={[...myItems, ...seededFeedItems]}
            currentUserId={profile.id}
            onBack={() => setActiveMatchId("")}
            onSend={sendMessage}
            onReport={() => setView("report")}
          />
        ) : (
          <Matches
            matches={matches}
            usersById={ownersById}
            items={[...myItems, ...seededFeedItems]}
            currentUserId={profile.id}
            onOpen={(id) => setActiveMatchId(id)}
          />
        )
      ) : null}
      {view === "profile" ? (
        <Profile profile={profile} myItems={myItems} onMyItems={() => setView("my-items")} onReport={() => setView("report")} />
      ) : null}
      {view === "my-items" ? <MyItems items={myItems} onPublish={() => setView("publish")} /> : null}
      {view === "report" ? <Report onBack={() => setView("profile")} /> : null}
    </AppFrame>
  );
}

function Landing({ onStart }: { onStart: () => void }) {
  return (
    <section className="flex min-h-screen flex-col px-5 pb-8 pt-5">
      <div className="flex items-center justify-between">
        <div className="text-2xl font-black text-[#13212f]">Trok</div>
        <span className="rounded-md bg-white px-3 py-1 text-xs font-black text-[#ff5a5f] shadow-sm">MVP</span>
      </div>
      <div className="mt-8 overflow-hidden rounded-lg border border-[#eadfd1] bg-white shadow-xl shadow-slate-900/10">
        <div className="relative aspect-[0.86]">
          <Image
            src="https://images.unsplash.com/photo-1607083206968-13611e3d76db?auto=format&fit=crop&w=1000&q=80"
            alt="Objetos listos para intercambio"
            fill
            priority
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#13212f]/85 via-[#13212f]/20 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 p-5 text-white">
            <h1 className="text-4xl font-black leading-none">Intercambia cosas con tu ciudad</h1>
            <p className="mt-3 text-sm leading-6 text-white/86">
              Sube un objeto, desliza productos cercanos y haz match para proponer un trueque.
            </p>
          </div>
        </div>
      </div>
      <div className="mt-auto space-y-3 pt-6">
        <PrimaryButton onClick={onStart} className="w-full">
          <LogIn size={18} />
          Entrar al MVP
        </PrimaryButton>
        <div className="grid grid-cols-3 gap-2 text-center text-xs font-bold text-slate-600">
          <span className="rounded-md bg-white p-3">20 swipes free</span>
          <span className="rounded-md bg-white p-3">3 objetos activos</span>
          <span className="rounded-md bg-white p-3">Chat por match</span>
        </div>
      </div>
    </section>
  );
}

function Login({ onLogin }: { onLogin: () => void }) {
  return (
    <section className="flex min-h-screen flex-col px-5 py-6">
      <Header title="Entrar" subtitle="Usaremos login mock en esta primera iteracion." />
      <div className="mt-8 space-y-4">
        <label className="block">
          <span className="text-sm font-bold text-[#13212f]">Email o telefono</span>
          <input className="mt-2 h-12 w-full rounded-md border border-[#eadfd1] bg-white px-3 outline-none focus:border-[#ff5a5f]" placeholder="tu@email.com" />
        </label>
        <PrimaryButton onClick={onLogin} className="w-full">
          Continuar
          <ChevronRight size={18} />
        </PrimaryButton>
      </div>
      <div className="mt-auto rounded-md bg-[#13212f] p-4 text-sm leading-6 text-white">
        Este MVP dejara listo el camino para Supabase Auth con email o telefono. Por ahora simula una sesion para probar el producto rapido.
      </div>
    </section>
  );
}

function Onboarding({ profile, onComplete }: { profile: User; onComplete: (name: string, city: string) => void }) {
  const [name, setName] = useState(profile.name);
  const [city, setCity] = useState(profile.city);

  return (
    <section className="flex min-h-screen flex-col px-5 py-6">
      <Header title="Tu perfil" subtitle="Nombre, ciudad y foto para arrancar." />
      <div className="mt-6 flex flex-col items-center gap-3">
        <Image src={profile.avatarUrl} alt={profile.name} width={116} height={116} className="h-28 w-28 rounded-full object-cover shadow-lg" />
        <button className="inline-flex items-center gap-2 rounded-md border border-[#eadfd1] bg-white px-3 py-2 text-sm font-bold">
          <Camera size={17} />
          Cambiar foto
        </button>
      </div>
      <div className="mt-8 space-y-4">
        <Field label="Nombre" value={name} onChange={setName} />
        <Field label="Ciudad" value={city} onChange={setCity} />
        <label className="block">
          <span className="text-sm font-bold text-[#13212f]">Bio corta</span>
          <textarea className="mt-2 min-h-24 w-full rounded-md border border-[#eadfd1] bg-white p-3 outline-none focus:border-[#ff5a5f]" defaultValue={profile.bio} />
        </label>
      </div>
      <PrimaryButton onClick={() => onComplete(name, city)} className="mt-auto w-full">
        Guardar y ver objetos
      </PrimaryButton>
    </section>
  );
}

function Feed({
  profile,
  item,
  owner,
  swipesUsed,
  onSwipe,
  onPublish,
  lastMatch,
  onOpenMatch,
  onCloseMatch
}: {
  profile: User;
  item?: Item;
  owner?: User;
  swipesUsed: number;
  onSwipe: (direction: "pass" | "like") => void;
  onPublish: () => void;
  lastMatch: Match | null;
  onOpenMatch: () => void;
  onCloseMatch: () => void;
}) {
  return (
    <section className="flex min-h-0 flex-1 flex-col">
      <Header
        title="Objetos cerca"
        subtitle={`${profile.city} · ${20 - swipesUsed} swipes free hoy`}
        action={
          <button onClick={onPublish} className="grid h-11 w-11 place-items-center rounded-md bg-[#13212f] text-white" aria-label="Publicar">
            <Plus size={22} />
          </button>
        }
      />
      <div className="min-h-0 flex-1 px-5 pb-4">
        {item && owner ? (
          <div className="flex h-full flex-col">
            <ItemCard item={item} owner={owner} />
            <div className="mt-4 grid grid-cols-2 gap-3">
              <PrimaryButton variant="ghost" onClick={() => onSwipe("pass")}>
                <X size={20} />
                No me interesa
              </PrimaryButton>
              <PrimaryButton onClick={() => onSwipe("like")}>
                <Heart size={20} />
                Me interesa
              </PrimaryButton>
            </div>
          </div>
        ) : (
          <div className="grid h-full place-items-center text-center">
            <div>
              <Package className="mx-auto text-slate-400" size={48} />
              <h2 className="mt-4 text-2xl font-black text-[#13212f]">No hay mas objetos</h2>
              <p className="mt-2 text-sm text-slate-500">Sube otro objeto o vuelve mas tarde para ver nuevos trueques.</p>
              <PrimaryButton className="mt-5" onClick={onPublish}>
                Publicar objeto
              </PrimaryButton>
            </div>
          </div>
        )}
      </div>
      {lastMatch ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-[#13212f]/70 p-5 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-lg bg-white p-5 text-center shadow-2xl">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-[#ff5a5f] text-white">
              <Sparkles size={28} />
            </div>
            <h2 className="mt-4 text-3xl font-black text-[#13212f]">Match!</h2>
            <p className="mt-2 text-sm text-slate-600">Hay interes cruzado entre tus objetos. Ya pueden abrir chat privado.</p>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <PrimaryButton variant="ghost" onClick={onCloseMatch}>
                Seguir
              </PrimaryButton>
              <PrimaryButton onClick={onOpenMatch}>
                Chat
              </PrimaryButton>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function Publish({ onPublish }: { onPublish: (formData: FormData) => void }) {
  return (
    <section className="min-h-0 flex-1 overflow-y-auto px-5 pb-5">
      <Header title="Publicar" subtitle="Crea un objeto activo para intercambiar." />
      <form
        onSubmit={(event) => {
          event.preventDefault();
          onPublish(new FormData(event.currentTarget));
        }}
        className="space-y-4"
      >
        <Field name="title" label="Titulo" placeholder="Ej. Monitor 24 pulgadas" />
        <label className="block">
          <span className="text-sm font-bold text-[#13212f]">Descripcion</span>
          <textarea name="description" className="mt-2 min-h-24 w-full rounded-md border border-[#eadfd1] bg-white p-3 outline-none focus:border-[#ff5a5f]" placeholder="Estado, accesorios incluidos, detalles utiles" />
        </label>
        <Select name="category" label="Categoria" options={categories} />
        <Field name="estimatedValue" label="Valor estimado MXN" type="number" placeholder="1500" />
        <Select name="condition" label="Condicion" options={["nuevo", "usado bueno", "usado regular"]} />
        <label className="flex items-center justify-between rounded-md border border-[#eadfd1] bg-white p-3 text-sm font-bold">
          <span>Acepto diferencia en efectivo</span>
          <input name="acceptsCashDifference" type="checkbox" className="h-5 w-5 accent-[#ff5a5f]" />
        </label>
        <div className="rounded-md border border-dashed border-[#eadfd1] bg-white p-5 text-center">
          <Camera className="mx-auto text-slate-400" />
          <p className="mt-2 text-sm font-bold text-[#13212f]">Fotos mock por ahora</p>
          <p className="text-xs text-slate-500">Supabase Storage se conectara en la siguiente fase.</p>
        </div>
        <PrimaryButton className="w-full" type="submit">
          Publicar objeto
        </PrimaryButton>
      </form>
    </section>
  );
}

function Matches({
  matches,
  usersById,
  items,
  currentUserId,
  onOpen
}: {
  matches: Match[];
  usersById: Map<string, User>;
  items: Item[];
  currentUserId: string;
  onOpen: (id: string) => void;
}) {
  return (
    <section className="min-h-0 flex-1 overflow-y-auto px-5 pb-5">
      <Header title="Matches" subtitle="Conversaciones abiertas por interes cruzado." />
      <div className="space-y-3">
        {matches.map((match) => {
          const otherUserId = match.userAId === currentUserId ? match.userBId : match.userAId;
          const user = usersById.get(otherUserId);
          const theirItem = items.find((item) => item.id === match.itemBId);
          const myItem = items.find((item) => item.id === match.itemAId);
          return (
            <button
              key={match.id}
              onClick={() => onOpen(match.id)}
              className="flex w-full items-center gap-3 rounded-lg border border-[#eadfd1] bg-white p-3 text-left shadow-sm"
            >
              {theirItem ? (
                <Image src={theirItem.images[0]} alt={theirItem.title} width={72} height={72} className="h-[72px] w-[72px] rounded-md object-cover" />
              ) : null}
              <div className="min-w-0 flex-1">
                <p className="font-black text-[#13212f]">{user?.name ?? "Usuario"}</p>
                <p className="truncate text-sm text-slate-500">{theirItem?.title} por {myItem?.title}</p>
                <p className="mt-1 text-xs font-bold text-[#ff5a5f]">Chat activo</p>
              </div>
              <MessageCircle className="text-slate-400" />
            </button>
          );
        })}
      </div>
    </section>
  );
}

function ChatView({
  match,
  messages,
  usersById,
  items,
  currentUserId,
  onBack,
  onSend,
  onReport
}: {
  match: Match;
  messages: Message[];
  usersById: Map<string, User>;
  items: Item[];
  currentUserId: string;
  onBack: () => void;
  onSend: (body: string) => void;
  onReport: () => void;
}) {
  const [draft, setDraft] = useState("");
  const otherUser = usersById.get(match.userBId);
  const myItem = items.find((item) => item.id === match.itemAId);
  const theirItem = items.find((item) => item.id === match.itemBId);

  return (
    <section className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center gap-3 border-b border-[#eadfd1] bg-white px-4 py-3">
        <button onClick={onBack} className="grid h-10 w-10 place-items-center rounded-md border border-[#eadfd1]" aria-label="Volver">
          <ArrowLeft size={20} />
        </button>
        {otherUser ? <Image src={otherUser.avatarUrl} alt={otherUser.name} width={42} height={42} className="h-10 w-10 rounded-full object-cover" /> : null}
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-base font-black text-[#13212f]">{otherUser?.name ?? "Chat"}</h1>
          <p className="truncate text-xs text-slate-500">{theirItem?.title} por {myItem?.title}</p>
        </div>
        <button onClick={onReport} className="grid h-10 w-10 place-items-center rounded-md bg-red-50 text-red-700" aria-label="Reportar">
          <Flag size={18} />
        </button>
      </div>
      <div className="space-y-3 p-4">
        <SafetyNotice />
      </div>
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 pb-4">
        {messages.map((message) => {
          const mine = message.senderUserId === currentUserId;
          return (
            <div key={message.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
              <div className={cn("max-w-[78%] rounded-lg px-3 py-2 text-sm leading-5", mine ? "bg-[#ff5a5f] text-white" : "bg-white text-[#13212f]")}>
                {message.body}
              </div>
            </div>
          );
        })}
      </div>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          onSend(draft);
          setDraft("");
        }}
        className="safe-bottom flex gap-2 border-t border-[#eadfd1] bg-white p-3"
      >
        <input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          className="h-12 min-w-0 flex-1 rounded-md border border-[#eadfd1] px-3 outline-none focus:border-[#ff5a5f]"
          placeholder="Escribe un mensaje"
        />
        <PrimaryButton className="h-12 w-12 px-0" aria-label="Enviar">
          <Send size={18} />
        </PrimaryButton>
      </form>
    </section>
  );
}

function Profile({ profile, myItems, onMyItems, onReport }: { profile: User; myItems: Item[]; onMyItems: () => void; onReport: () => void }) {
  return (
    <section className="min-h-0 flex-1 overflow-y-auto px-5 pb-5">
      <Header title="Mi perfil" subtitle="Cuenta free preparada para limites premium." />
      <div className="rounded-lg border border-[#eadfd1] bg-white p-4 shadow-sm">
        <div className="flex items-center gap-4">
          <Image src={profile.avatarUrl} alt={profile.name} width={82} height={82} className="h-20 w-20 rounded-full object-cover" />
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-black text-[#13212f]">{profile.name}</h2>
              {profile.verified ? <BadgeCheck className="text-emerald-600" size={19} /> : <ShieldAlert className="text-amber-500" size={19} />}
            </div>
            <p className="text-sm text-slate-500">{profile.city}</p>
            <p className="mt-1 rounded-md bg-[#f3f7f2] px-2 py-1 text-xs font-black uppercase text-emerald-900">{profile.planType}</p>
          </div>
        </div>
        <p className="mt-4 text-sm leading-6 text-slate-600">{profile.bio}</p>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2">
        <Stat label="Objetos" value={myItems.length} />
        <Stat label="Activos" value={myItems.filter((item) => item.status === "disponible").length} />
        <Stat label="Plan" value="Free" />
      </div>
      <div className="mt-4 space-y-2">
        <MenuButton icon={Package} label="Mis objetos" onClick={onMyItems} />
        <MenuButton icon={CircleDollarSign} label="Premium pendiente" caption="Sin pagos todavia" />
        <MenuButton icon={Ban} label="Reportes y bloqueos" caption="Seguridad MVP" onClick={onReport} />
      </div>
    </section>
  );
}

function MyItems({ items, onPublish }: { items: Item[]; onPublish: () => void }) {
  return (
    <section className="min-h-0 flex-1 overflow-y-auto px-5 pb-5">
      <Header
        title="Mis objetos"
        subtitle="Free permite 3 objetos activos."
        action={
          <button onClick={onPublish} className="grid h-11 w-11 place-items-center rounded-md bg-[#13212f] text-white" aria-label="Publicar">
            <Plus size={22} />
          </button>
        }
      />
      <div className="space-y-4">
        {items.map((item) => (
          <ItemCard key={item.id} item={item} compact />
        ))}
      </div>
    </section>
  );
}

function Report({ onBack }: { onBack: () => void }) {
  return (
    <section className="min-h-0 flex-1 overflow-y-auto px-5 pb-5">
      <Header
        title="Reportar"
        subtitle="Seguridad basica para el MVP."
        action={
          <button onClick={onBack} className="grid h-11 w-11 place-items-center rounded-md border border-[#eadfd1] bg-white" aria-label="Volver">
            <ArrowLeft size={20} />
          </button>
        }
      />
      <form className="space-y-4">
        <Select name="reason" label="Motivo" options={["Objeto prohibido", "Usuario sospechoso", "Fraude", "Acoso", "Otro"]} />
        <label className="block">
          <span className="text-sm font-bold text-[#13212f]">Descripcion</span>
          <textarea className="mt-2 min-h-28 w-full rounded-md border border-[#eadfd1] bg-white p-3 outline-none focus:border-[#ff5a5f]" placeholder="Cuéntanos que paso" />
        </label>
        <PrimaryButton type="button" variant="danger" className="w-full">
          <Flag size={18} />
          Enviar reporte mock
        </PrimaryButton>
      </form>
      <div className="mt-5 rounded-lg border border-[#eadfd1] bg-white p-4">
        <h2 className="font-black text-[#13212f]">Objetos prohibidos</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {prohibitedItems.map((item) => (
            <span key={item} className="rounded-md bg-red-50 px-2.5 py-1 text-xs font-bold text-red-700">
              {item}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

function Field({
  label,
  value,
  onChange,
  ...props
}: {
  label: string;
  value?: string;
  onChange?: (value: string) => void;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange">) {
  return (
    <label className="block">
      <span className="text-sm font-bold text-[#13212f]">{label}</span>
      <input
        {...props}
        value={value}
        onChange={onChange ? (event) => onChange(event.target.value) : undefined}
        className="mt-2 h-12 w-full rounded-md border border-[#eadfd1] bg-white px-3 outline-none focus:border-[#ff5a5f]"
      />
    </label>
  );
}

function Select({ label, options, name }: { label: string; options: string[]; name: string }) {
  return (
    <label className="block">
      <span className="text-sm font-bold text-[#13212f]">{label}</span>
      <select name={name} className="mt-2 h-12 w-full rounded-md border border-[#eadfd1] bg-white px-3 outline-none focus:border-[#ff5a5f]">
        {options.map((option) => (
          <option key={option}>{option}</option>
        ))}
      </select>
    </label>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-md bg-white p-3 text-center shadow-sm">
      <p className="text-lg font-black text-[#13212f]">{value}</p>
      <p className="text-xs font-bold text-slate-500">{label}</p>
    </div>
  );
}

function MenuButton({
  icon: Icon,
  label,
  caption,
  onClick
}: {
  icon: ElementType;
  label: string;
  caption?: string;
  onClick?: () => void;
}) {
  return (
    <button onClick={onClick} className="flex w-full items-center gap-3 rounded-md border border-[#eadfd1] bg-white p-3 text-left">
      <div className="grid h-10 w-10 place-items-center rounded-md bg-[#eef5fb] text-[#13212f]">
        <Icon size={19} />
      </div>
      <div className="flex-1">
        <p className="font-black text-[#13212f]">{label}</p>
        {caption ? <p className="text-xs text-slate-500">{caption}</p> : null}
      </div>
      <ChevronRight className="text-slate-400" />
    </button>
  );
}

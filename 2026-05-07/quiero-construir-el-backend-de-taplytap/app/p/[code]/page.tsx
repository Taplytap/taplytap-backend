import { redirect } from "next/navigation";
import { getProfileLinkLabel } from "@/lib/profile-links";
import { isValidCode, normalizeCode } from "@/lib/security";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { ProfileLink, ProfileLinkType } from "@/lib/types";

type ProfilePublicPageProps = {
  params: {
    code: string;
  };
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function ProfilePublicPage({ params }: ProfilePublicPageProps) {
  const code = normalizeCode(params.code);

  if (!isValidCode(code)) {
    return <ProfileShell title="Perfil no disponible" message="El enlace de esta placa no es válido." />;
  }

  const supabase = createSupabaseAdminClient();
  const { data: plate, error: plateError } = await supabase
    .from("profile_plates")
    .select("*")
    .eq("code", code)
    .maybeSingle();

  if (plateError) {
    throw new Error(plateError.message);
  }

  if (!plate) {
    return <ProfileShell title="Perfil no encontrado" message="No pudimos encontrar esta placa TaplyTap." />;
  }

  if (plate.status === "inactive") {
    redirect(`/activate/profile/${code}`);
  }

  if (plate.status === "blocked") {
    return (
      <ProfileShell
        title="Perfil no disponible"
        message="Esta placa requiere ayuda de soporte TaplyTap."
      />
    );
  }

  const { data: links, error: linksError } = await supabase
    .from("profile_links")
    .select("*")
    .eq("profile_plate_id", plate.id)
    .eq("enabled", true)
    .order("sort_order", { ascending: true });

  if (linksError) {
    throw new Error(linksError.message);
  }

  const visibleLinks = (links ?? []) as ProfileLink[];
  const profileImageUrl = getProfileImagePublicUrl(supabase, plate.profile_image_path);
  const businessName = plate.business_name ?? "TaplyTap";
  const initial = businessName.trim().charAt(0).toUpperCase() || "T";

  return (
    <main className="min-h-screen bg-[#F6F9FC] px-4 py-8 text-ink">
      <section className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-[480px] flex-col">
        <header className="pt-6 text-center">
          <div className="mx-auto flex h-32 w-32 items-center justify-center overflow-hidden rounded-full border-[6px] border-white bg-brandSoft text-5xl font-bold text-brand shadow-[0_18px_55px_rgba(15,23,42,0.12)]">
            {profileImageUrl ? (
              <span
                aria-label={`Logo de ${businessName}`}
                className="h-full w-full bg-cover bg-center"
                style={{ backgroundImage: `url(${profileImageUrl})` }}
              />
            ) : (
              initial
            )}
          </div>
          <h1 className="mt-7 text-4xl font-bold leading-tight tracking-tight text-ink">{businessName}</h1>
          {plate.description ? (
            <p className="mx-auto mt-3 max-w-sm text-xl leading-8 text-slateText">{plate.description}</p>
          ) : null}
        </header>

        <div className="mt-10 grid gap-4">
          {visibleLinks.length > 0 ? (
            visibleLinks.map((link) => (
              <a
                key={link.id}
                href={link.url}
                target="_blank"
                rel="noreferrer"
                className="group grid min-h-[88px] grid-cols-[64px_1fr_24px] items-center gap-4 rounded-[1.35rem] border border-white/80 bg-white px-4 py-3 text-left shadow-[0_12px_40px_rgba(15,23,42,0.07)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_16px_48px_rgba(15,23,42,0.10)]"
              >
                <PlatformLogo type={link.type} />
                <span className="min-w-0">
                  <span className="block text-xl font-bold tracking-tight text-ink">
                    {link.label || getProfileLinkLabel(link.type)}
                  </span>
                  <span className="mt-1 block text-base leading-6 text-slateText">
                    {profileLinkSecondaryText[link.type]}
                  </span>
                </span>
                <ChevronIcon />
              </a>
            ))
          ) : (
            <p className="rounded-[1.35rem] border border-white/80 bg-white px-5 py-5 text-center text-sm leading-6 text-slateText shadow-[0_12px_40px_rgba(15,23,42,0.07)]">
              Este perfil todavía no tiene enlaces visibles.
            </p>
          )}
        </div>

        <footer className="mt-auto pt-14 text-center">
          <p className="text-sm font-medium text-slateText">Creado con TaplyTap</p>
          <p className="mt-5 text-2xl font-extrabold italic tracking-tight text-slateText/75">TaplyTap</p>
        </footer>
      </section>
    </main>
  );
}

function ProfileShell({ title, message }: { title: string; message: string }) {
  return (
    <main className="min-h-screen bg-[#F8FAFC] px-4 py-8 sm:px-6">
      <section className="mx-auto max-w-xl rounded-2xl border border-line bg-white p-6 shadow-sm">
        <p className="text-sm font-bold tracking-tight text-brand">TaplyTap</p>
        <h1 className="mt-6 text-3xl font-bold tracking-tight text-ink">{title}</h1>
        <p className="mt-3 text-sm leading-6 text-slateText">{message}</p>
      </section>
    </main>
  );
}

const profileLinkSecondaryText: Record<ProfileLinkType, string> = {
  instagram: "Síguenos en Instagram",
  whatsapp: "Chatea con nosotros",
  facebook: "Síguenos en Facebook",
  google_reviews: "En Google",
  tiktok: "Mira nuestros videos",
  website: "Conoce más sobre nosotros"
};

function getProfileImagePublicUrl(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  profileImagePath: string | null
) {
  if (!profileImagePath) return null;

  return supabase.storage.from("profile-plate-images").getPublicUrl(profileImagePath).data.publicUrl;
}

function ChevronIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-6 w-6 text-slateText transition group-hover:translate-x-0.5">
      <path
        d="M9 5l7 7-7 7"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2.4"
      />
    </svg>
  );
}

function PlatformLogo({ type }: { type: ProfileLinkType }) {
  if (type === "website") {
    return (
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-600 text-white shadow-sm">
        <svg viewBox="0 0 24 24" aria-hidden="true" className="h-8 w-8">
          <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="1.8" />
          <path d="M3 12h18M12 3c2.4 2.5 3.6 5.5 3.6 9S14.4 18.5 12 21M12 3c-2.4 2.5-3.6 5.5-3.6 9S9.6 18.5 12 21" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
        </svg>
      </span>
    );
  }

  const logo = platformLogoAssets[type];

  return (
    <span className="flex h-14 w-14 items-center justify-center">
      <img
        src={logo.src}
        alt={logo.alt}
        width={300}
        height={300}
        className={`${logo.className} object-contain`}
        loading="eager"
        decoding="async"
      />
    </span>
  );
}

const platformLogoAssets: Record<Exclude<ProfileLinkType, "website">, { src: string; alt: string; className: string }> = {
  instagram: {
    src: "/profile-platforms/instagram.png",
    alt: "Instagram",
    className: "h-12 w-12"
  },
  whatsapp: {
    src: "/profile-platforms/whatsapp.png",
    alt: "WhatsApp",
    className: "h-12 w-12"
  },
  facebook: {
    src: "/profile-platforms/facebook.png",
    alt: "Facebook",
    className: "h-12 w-12"
  },
  google_reviews: {
    src: "/profile-platforms/google.png",
    alt: "Google",
    className: "h-12 w-12"
  },
  tiktok: {
    src: "/profile-platforms/tiktok.png",
    alt: "TikTok",
    className: "h-14 w-14"
  }
};

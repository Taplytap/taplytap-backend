type BoostLockedCardProps = {
  checkoutUrl?: string;
};

export function BoostLockedCard({ checkoutUrl }: BoostLockedCardProps) {
  return (
    <section className="mt-5 rounded-2xl border border-brandBorder bg-white p-5 shadow-[0_18px_55px_rgba(0,109,255,0.08)]">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-base font-bold text-ink">✨ TaplyTap Boost</h3>
          <p className="mt-3 text-sm font-semibold text-ink">
            Estado:
            <span className="ml-2 text-slateText">🔒 Bloqueado</span>
          </p>
          <p className="mt-2 text-sm leading-6 text-slateText">
            Activa Boost para filtrar reseñas y recibir comentarios privados.
          </p>
        </div>
        {checkoutUrl ? (
          <a
            href={checkoutUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-11 items-center justify-center rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brandHover"
          >
            Comprar ahora
          </a>
        ) : (
          <button
            type="button"
            disabled
            className="inline-flex min-h-11 items-center justify-center rounded-xl bg-slate-200 px-4 py-2.5 text-sm font-semibold text-slateText"
          >
            Comprar ahora
          </button>
        )}
      </div>
    </section>
  );
}

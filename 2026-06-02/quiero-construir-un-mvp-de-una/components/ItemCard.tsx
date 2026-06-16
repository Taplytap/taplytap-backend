"use client";

import Image from "next/image";
import { BadgeCheck, MapPin, ShieldAlert } from "lucide-react";
import type { Item, User } from "@/lib/types";
import { money } from "@/lib/utils";

export function ItemCard({
  item,
  owner,
  compact = false
}: {
  item: Item;
  owner?: User;
  compact?: boolean;
}) {
  return (
    <article className="overflow-hidden rounded-lg border border-[#eadfd1] bg-white shadow-sm">
      <div className={compact ? "relative aspect-[1.25]" : "relative aspect-[0.86]"}>
        <Image src={item.images[0]} alt={item.title} fill sizes="430px" className="object-cover" priority={!compact} />
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent p-4 text-white">
          <div className="flex items-end justify-between gap-3">
            <div>
              <h2 className={compact ? "text-lg font-black" : "text-3xl font-black"}>{item.title}</h2>
              <p className="mt-1 text-sm font-semibold">{money(item.estimatedValue)}</p>
            </div>
            <span className="rounded-md bg-white/18 px-2 py-1 text-xs font-bold backdrop-blur">{item.condition}</span>
          </div>
        </div>
      </div>
      <div className="space-y-3 p-4">
        <p className="text-sm leading-5 text-slate-600">{item.description}</p>
        <div className="flex flex-wrap gap-2 text-xs font-bold">
          <span className="rounded-md bg-[#eef5fb] px-2.5 py-1 text-[#13212f]">{item.category}</span>
          <span className="inline-flex items-center gap-1 rounded-md bg-[#f3f7f2] px-2.5 py-1 text-emerald-900">
            <MapPin size={13} />
            {item.city}
          </span>
          {item.acceptsCashDifference ? (
            <span className="rounded-md bg-[#fff0ed] px-2.5 py-1 text-[#b72d37]">Acepta diferencia</span>
          ) : null}
        </div>
        {owner ? (
          <div className="flex items-center justify-between border-t border-[#f0e7dc] pt-3">
            <div className="flex items-center gap-2">
              <Image src={owner.avatarUrl} alt={owner.name} width={34} height={34} className="h-8 w-8 rounded-full object-cover" />
              <div>
                <p className="text-sm font-bold text-[#13212f]">{owner.name}</p>
                <p className="text-xs text-slate-500">{owner.verified ? "Perfil verificado" : "Verificacion pendiente"}</p>
              </div>
            </div>
            {owner.verified ? <BadgeCheck className="text-emerald-600" size={20} /> : <ShieldAlert className="text-amber-500" size={20} />}
          </div>
        ) : null}
      </div>
    </article>
  );
}

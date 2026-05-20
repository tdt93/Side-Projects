import Link from "next/link";

export function TherapistCard({
  slug,
  displayName,
  title,
  officeCity,
  taglineQuote,
  avatarUrl,
  tags,
}: {
  slug: string;
  displayName: string;
  title: string | null;
  officeCity: string | null;
  taglineQuote: string | null;
  avatarUrl: string | null;
  tags: string[];
}) {
  return (
    <Link
      href={`/t/${slug}`}
      className="therapist-tile group flex flex-col gap-3 rounded-xl border border-slate-200 p-4 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-[#37B3D6] hover:shadow-md"
    >
      <div className="flex gap-4">
        <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-full bg-slate-100">
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatarUrl}
              alt=""
              width={80}
              height={80}
              className="h-full w-full object-cover"
            />
          ) : null}
        </div>
        <div>
          <h2 className="text-lg font-semibold text-[#1d4e5f] group-hover:text-[#37B3D6] group-hover:underline">
            {displayName}
          </h2>
          {title && <p className="text-sm text-slate-600">{title}</p>}
          {officeCity && (
            <p className="mt-1 text-sm text-slate-500">📍 {officeCity}</p>
          )}
        </div>
      </div>
      {taglineQuote && (
        <p className="text-sm italic text-slate-600 line-clamp-3">{taglineQuote}</p>
      )}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {tags.slice(0, 6).map((t) => (
            <span
              key={t}
              className="rounded-full bg-white px-2 py-0.5 text-xs text-[#1d4e5f]"
            >
              {t}
            </span>
          ))}
        </div>
      )}
    </Link>
  );
}

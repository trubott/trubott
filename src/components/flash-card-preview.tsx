"use client";

/**
 * Pre-mint visual preview of a flash card. Mirrors the styling of the public
 * recipient view at /c/[id] so the cardholder can see exactly what someone
 * with the link will see -- BEFORE paying and BEFORE burning the only view.
 *
 * This component is deliberately presentational: no fetches, no side effects.
 * The caller passes the same fields the API will store.
 */

type PreviewClaim = {
  field: string;
  value: string;
  label: "Supported" | "NotSupported" | "SelfDeclared";
};

type Props = {
  title: string;
  claims: PreviewClaim[];
  mode: "verified" | "selfDeclared";
};

export function FlashCardPreview({ title, claims, mode }: Props) {
  const persona = inferPersona(claims);
  const isSelfDeclared = mode === "selfDeclared";

  return (
    <section
      aria-label="Flash card preview"
      className="rounded-lg border bg-card p-6 shadow-sm"
    >
      <div className="mb-4 flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-widest text-primary">
          Preview · what the recipient will see
        </p>
        <span className="rounded-full bg-warning px-2 py-0.5 text-xs font-medium text-warning-foreground">
          One-time view
        </span>
      </div>

      <div className="rounded-md border bg-background p-5">
        <div className="mb-5 flex items-center gap-4 rounded-md border bg-card p-3">
          <div
            aria-hidden="true"
            className="grid h-14 w-14 place-items-center rounded-full border bg-muted text-2xl"
            title={`Persona silhouette (${persona.label})`}
          >
            {persona.icon}
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              {isSelfDeclared
                ? "Self-declared persona reveal"
                : "Selective profile reveal"}
            </p>
            <p className="text-sm font-medium text-foreground">{persona.label}</p>
          </div>
        </div>

        <h2 className="text-xl font-semibold tracking-tight">
          {title.trim().length ? title : "Trust Card"}
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          (Will show generated/expires timestamps and the AI model name once
          minted.)
        </p>

        {isSelfDeclared ? (
          <p className="mt-4 rounded-md border border-warning/40 bg-warning/10 p-3 text-xs text-foreground">
            <strong className="text-foreground">Self-declared.</strong> The
            cardholder typed these values themselves, anchored to a live face
            check.
          </p>
        ) : null}

        {claims.length === 0 ? (
          <p className="mt-6 rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
            Pick at least one field to reveal.
          </p>
        ) : (
          <ul className="mt-6 space-y-4">
            {claims.map((c, i) => (
              <li key={i} className="rounded-md border bg-card p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium">{c.field}</p>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      c.label === "Supported"
                        ? "bg-success text-success-foreground"
                        : c.label === "SelfDeclared"
                          ? "bg-accent text-accent-foreground"
                          : "bg-destructive text-destructive-foreground"
                    }`}
                  >
                    {c.label === "SelfDeclared" ? "Self-declared" : c.label}
                  </span>
                </div>
                <p className="mt-2 text-base text-foreground">{c.value}</p>
              </li>
            ))}
          </ul>
        )}
      </div>

      <p className="mt-4 text-xs text-muted-foreground">
        After payment, you&rsquo;ll get a single share link and OTP. The first
        person to open it sees this view, then it is burned forever &mdash;
        even you cannot retrieve it again.
      </p>
    </section>
  );
}

function inferPersona(claims: Array<{ field: string; value: string }>): {
  icon: string;
  label: string;
} {
  const joined = claims
    .map((c) => `${c.field} ${c.value}`.toLowerCase())
    .join(" ");
  if (/\b(female|woman|girl|she\/her)\b/.test(joined)) {
    return { icon: "👩", label: "Gender shared: female" };
  }
  if (/\b(male|man|boy|he\/him)\b/.test(joined)) {
    return { icon: "👨", label: "Gender shared: male" };
  }
  return { icon: "🕶", label: "Gender not disclosed" };
}

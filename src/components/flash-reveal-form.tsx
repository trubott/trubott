"use client";

import { useMemo } from "react";

/**
 * Structured persona-reveal form used by the flash-card flow. Each field has
 * a checkbox that controls whether the claim is included, plus its value.
 *
 * Design notes:
 * - We keep the field set deliberately small. Adding "interests" or "income"
 *   would tempt users to over-share.
 * - Free-text values are limited to the same MAX_CLAIM_VALUE_CHARS as the
 *   verified-claim path (see src/server/llm/claim.ts), so the safety
 *   reviewer never sees over-long input.
 */

export type RevealKey =
  | "age"
  | "gender"
  | "occupation"
  | "location"
  | "customNote";

export type RevealSelection = Record<
  RevealKey,
  { enabled: boolean; value: string }
>;

export const EMPTY_REVEAL_SELECTION: RevealSelection = {
  age: { enabled: false, value: "" },
  gender: { enabled: false, value: "" },
  occupation: { enabled: false, value: "" },
  location: { enabled: false, value: "" },
  customNote: { enabled: false, value: "" },
};

const FIELDS: Array<{
  key: RevealKey;
  label: string;
  hint: string;
  placeholder: string;
  fieldName: string;
  multiline?: boolean;
  maxLen?: number;
}> = [
  {
    key: "age",
    label: "Age",
    hint: "Exact age or a bracket (e.g. 28 or 25-30).",
    placeholder: "28",
    fieldName: "Age",
    maxLen: 16,
  },
  {
    key: "gender",
    label: "Gender",
    hint: "How you want to be referred to.",
    placeholder: "female / male / non-binary",
    fieldName: "Gender",
    maxLen: 32,
  },
  {
    key: "occupation",
    label: "Occupation",
    hint: "Your role, role family or industry.",
    placeholder: "software engineer",
    fieldName: "Occupation",
    maxLen: 64,
  },
  {
    key: "location",
    label: "Location",
    hint: "Country or city only -- never share your full address.",
    placeholder: "Berlin, Germany",
    fieldName: "Location",
    maxLen: 64,
  },
  {
    key: "customNote",
    label: "Custom note",
    hint: "One short line. The recipient will see this verbatim.",
    placeholder: "Looking for a co-founder",
    fieldName: "Note",
    multiline: true,
    maxLen: 200,
  },
];

export function selectionToClaims(
  s: RevealSelection,
): Array<{ field: string; value: string }> {
  const out: Array<{ field: string; value: string }> = [];
  for (const f of FIELDS) {
    const slot = s[f.key];
    const value = slot.value.trim();
    if (slot.enabled && value) {
      out.push({ field: f.fieldName, value });
    }
  }
  return out;
}

type Props = {
  selection: RevealSelection;
  onChange: (next: RevealSelection) => void;
  disabled?: boolean;
};

export function FlashRevealForm({ selection, onChange, disabled }: Props) {
  const enabledCount = useMemo(
    () => Object.values(selection).filter((s) => s.enabled && s.value.trim()).length,
    [selection],
  );

  function patch(key: RevealKey, slot: Partial<{ enabled: boolean; value: string }>) {
    onChange({ ...selection, [key]: { ...selection[key], ...slot } });
  }

  return (
    <div className="space-y-3">
      <div className="flex items-baseline justify-between">
        <p className="text-sm font-medium">What to reveal</p>
        <p className="text-xs text-muted-foreground">
          {enabledCount} of {FIELDS.length} fields selected
        </p>
      </div>

      {FIELDS.map((f) => {
        const slot = selection[f.key];
        return (
          <div key={f.key} className="rounded-md border bg-card p-3">
            <label className="flex items-start gap-3 text-sm">
              <input
                type="checkbox"
                checked={slot.enabled}
                onChange={(e) => patch(f.key, { enabled: e.target.checked })}
                disabled={disabled}
                aria-label={`Include ${f.label}`}
                className="mt-1 h-4 w-4 rounded border-input"
              />
              <div className="min-w-0 flex-1">
                <p className="font-medium">{f.label}</p>
                <p className="text-xs text-muted-foreground">{f.hint}</p>

                {f.multiline ? (
                  <textarea
                    value={slot.value}
                    onChange={(e) => patch(f.key, { value: e.target.value })}
                    placeholder={f.placeholder}
                    maxLength={f.maxLen}
                    disabled={disabled || !slot.enabled}
                    rows={2}
                    className="mt-2 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm disabled:opacity-50"
                  />
                ) : (
                  <input
                    type="text"
                    value={slot.value}
                    onChange={(e) => patch(f.key, { value: e.target.value })}
                    placeholder={f.placeholder}
                    maxLength={f.maxLen}
                    disabled={disabled || !slot.enabled}
                    className="mt-2 block h-10 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm disabled:opacity-50"
                  />
                )}
              </div>
            </label>
          </div>
        );
      })}

      <p className="text-xs text-muted-foreground">
        These values are <strong>self-declared</strong>. The recipient will see
        each value verbatim with a clear &ldquo;Self-declared&rdquo; tag, plus
        a note that the card was anchored to a live face check at mint time.
      </p>
    </div>
  );
}

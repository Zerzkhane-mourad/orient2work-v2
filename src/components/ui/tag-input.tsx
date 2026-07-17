"use client";

import { useState } from "react";
import { Icon } from "./icon";

interface TagInputProps {
  value: string[];
  onChange: (next: string[]) => void;
  label?: string;
  placeholder?: string;
  hint?: string;
  /** Optional quick-pick suggestions shown under the input. */
  suggestions?: string[];
}

/** Chip editor: type + Enter to add, click × to remove. Duplicates are ignored. */
export function TagInput({ value, onChange, label, placeholder, hint, suggestions }: TagInputProps) {
  const [draft, setDraft] = useState("");

  const add = (raw: string) => {
    const tag = raw.trim();
    if (!tag) return;
    if (value.some((v) => v.toLowerCase() === tag.toLowerCase())) {
      setDraft("");
      return;
    }
    onChange([...value, tag]);
    setDraft("");
  };

  const remove = (tag: string) => onChange(value.filter((v) => v !== tag));

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      add(draft);
    } else if (e.key === "Backspace" && !draft && value.length) {
      remove(value[value.length - 1]);
    }
  };

  const available = suggestions?.filter(
    (s) => !value.some((v) => v.toLowerCase() === s.toLowerCase()),
  );

  return (
    <div className="flex flex-col gap-1.5">
      {label && <label className="text-sm font-semibold text-on-surface">{label}</label>}

      <div className="flex flex-wrap gap-2 rounded-lg border border-outline-variant bg-surface-container-lowest p-2 focus-within:border-secondary focus-within:ring-1 focus-within:ring-secondary">
        {value.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 rounded-full bg-primary/10 py-1 pl-3 pr-1.5 text-sm font-medium text-primary"
          >
            {tag}
            <button
              type="button"
              onClick={() => remove(tag)}
              aria-label={`Retirer ${tag}`}
              className="rounded-full p-0.5 hover:bg-primary/15"
            >
              <Icon name="close" className="text-[14px]" />
            </button>
          </span>
        ))}
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKeyDown}
          onBlur={() => add(draft)}
          placeholder={value.length === 0 ? placeholder : ""}
          className="min-w-32 flex-1 border-0 bg-transparent p-1 text-sm focus:outline-none focus:ring-0"
        />
      </div>

      {available && available.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-1">
          {available.slice(0, 8).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => add(s)}
              className="inline-flex items-center gap-1 rounded-full border border-dashed border-outline px-2.5 py-0.5 text-xs text-on-surface-variant hover:border-secondary hover:text-primary"
            >
              <Icon name="add" className="text-[12px]" /> {s}
            </button>
          ))}
        </div>
      )}

      {hint && <p className="text-xs text-on-surface-variant">{hint}</p>}
    </div>
  );
}

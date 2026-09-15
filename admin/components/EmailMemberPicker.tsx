"use client";

import { useEffect, useId, useRef, useState, useTransition } from "react";
import { searchEmailMembers } from "@/lib/emailActions";
import type { EmailMember } from "@/lib/emailTypes";

export default function EmailMemberPicker({
  selected,
  multiple,
  onChange,
}: {
  selected: EmailMember[];
  multiple: boolean;
  onChange: (members: EmailMember[]) => void;
}) {
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [, startTransition] = useTransition();
  const [result, setResult] = useState<{
    query: string;
    members: EmailMember[];
    error?: string;
  }>({ query: "", members: [] });
  const search = query.trim();
  const atLimit = multiple && selected.length >= 500;
  const showResults = open && search.length >= 2 && !atLimit;
  const current = result.query === search;
  const matches = current
    ? result.members.filter(
        (member) =>
          !selected.some(
            (item) => item.email.toLowerCase() === member.email.toLowerCase()
          )
      )
    : [];
  const activeIndex = Math.max(0, Math.min(active, matches.length - 1));

  useEffect(() => {
    if (showResults) {
      document
        .getElementById(`${id}-option-${activeIndex}`)
        ?.scrollIntoView({ block: "nearest" });
    }
  }, [id, activeIndex, showResults]);

  useEffect(() => {
    if (search.length < 2 || atLimit) return;
    let cancelled = false;
    const timeout = window.setTimeout(() => {
      startTransition(async () => {
        try {
          const response = await searchEmailMembers(search);
          if (!cancelled)
            setResult({ query: search, members: response.members });
        } catch {
          if (!cancelled)
            setResult({
              query: search,
              members: [],
              error: "Couldn’t search members. Try typing again.",
            });
        }
      });
    }, 250);
    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [search, atLimit]);

  function select(member: EmailMember) {
    onChange(multiple ? [...selected, member] : [member]);
    setQuery("");
    setOpen(false);
    setActive(0);
    input.current?.focus();
  }

  return (
    <div
      className="relative"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
    >
      <label htmlFor={id} className="block text-sm font-medium">
        Find members
      </label>
      <div className="mt-2 flex flex-wrap items-center gap-2 rounded-lg border border-stone-300 bg-white p-2 focus-within:border-emerald-700 focus-within:ring-2 focus-within:ring-emerald-100">
        {selected.map((member) => (
          <span
            key={member.id}
            title={member.email}
            className="inline-flex max-w-full items-center gap-1 rounded-full bg-emerald-50 py-1 pl-3 pr-1 text-sm font-bold text-emerald-900"
          >
            <span className="truncate">
              {member.username ?? member.name ?? member.email}
            </span>
            <button
              type="button"
              aria-label={`Remove ${member.username ?? member.name ?? member.email}`}
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-lg leading-none hover:bg-emerald-200 focus-visible:outline-2 focus-visible:outline-emerald-700"
              onClick={() => {
                onChange(selected.filter((item) => item.id !== member.id));
                input.current?.focus();
              }}
            >
              <span aria-hidden="true">×</span>
            </button>
          </span>
        ))}
        <input
          ref={input}
          id={id}
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={showResults}
          aria-controls={`${id}-results`}
          aria-activedescendant={
            showResults && matches.length
              ? `${id}-option-${activeIndex}`
              : undefined
          }
          aria-describedby={`${id}-hint`}
          autoComplete="off"
          disabled={atLimit}
          value={query}
          placeholder={
            selected.length && !multiple
              ? "Search to replace member…"
              : "Type a name, username or email…"
          }
          className="min-w-40 flex-1 bg-transparent px-1 py-1.5 text-sm outline-none disabled:opacity-50"
          onFocus={() => setOpen(true)}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
            setActive(0);
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.preventDefault();
              setOpen(false);
            }
            if (event.key === "ArrowDown" || event.key === "ArrowUp") {
              event.preventDefault();
              setOpen(true);
              setActive(
                event.key === "ArrowDown"
                  ? Math.min(activeIndex + 1, matches.length - 1)
                  : Math.max(activeIndex - 1, 0)
              );
            }
            if (event.key === "Enter") {
              event.preventDefault();
              if (showResults && matches[activeIndex])
                select(matches[activeIndex]);
            }
          }}
        />
      </div>
      <p id={`${id}-hint`} className="mt-2 text-xs text-stone-500">
        {atLimit
          ? "500 members selected. Remove a member to add another, or choose All eligible members."
          : "Type at least 2 characters. Use ↑ ↓ and Enter to select."}
      </p>
      {showResults && (
        <div className="absolute left-0 right-0 z-20 mt-2 overflow-hidden rounded-lg border border-stone-200 bg-white shadow-lg">
          {!current ? (
            <p role="status" className="p-4 text-sm text-stone-500">
              Searching members…
            </p>
          ) : result.error ? (
            <p role="alert" className="p-4 text-sm text-red-700">
              {result.error}
            </p>
          ) : !matches.length ? (
            <p role="status" className="p-4 text-sm text-stone-500">
              No matching members to add.
            </p>
          ) : null}
          <ul
            id={`${id}-results`}
            role="listbox"
            aria-label="Matching members"
            className="max-h-64 overflow-y-auto"
          >
            {matches.map((member, index) => (
              <li
                id={`${id}-option-${index}`}
                key={member.id}
                role="option"
                aria-selected={activeIndex === index}
                className={`cursor-pointer px-4 py-3 text-sm ${activeIndex === index ? "bg-emerald-50 text-emerald-950" : "text-stone-900"}`}
                onMouseDown={(event) => event.preventDefault()}
                onMouseEnter={() => setActive(index)}
                onClick={() => select(member)}
              >
                <span className="block font-bold">
                  {member.username ?? member.name ?? "Member"}
                </span>
                <span className="block break-all text-xs text-stone-500">
                  {member.email}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

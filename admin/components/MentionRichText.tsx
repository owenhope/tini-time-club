import Link from "next/link";
import type { WebMentionSpan } from "@/lib/mentions";

export default function MentionRichText({
  text,
  mentions = [],
  mentionClassName = "font-semibold text-violet-700 dark:text-violet-300",
}: {
  text: string;
  mentions?: WebMentionSpan[];
  mentionClassName?: string;
}) {
  const valid = [...mentions]
    .sort((left, right) => left.start - right.start)
    .filter((mention, index, sorted) => {
      const token = `@${mention.username}`;
      const previous = sorted[index - 1];
      return (
        mention.start >= 0 &&
        mention.length === token.length &&
        text.slice(mention.start, mention.start + mention.length) === token &&
        (!previous || previous.start + previous.length <= mention.start)
      );
    });

  if (!valid.length) return text;

  const content: React.ReactNode[] = [];
  let cursor = 0;
  valid.forEach((mention, index) => {
    if (mention.start > cursor) content.push(text.slice(cursor, mention.start));
    const token = text.slice(mention.start, mention.start + mention.length);
    content.push(
      mention.href ? (
        <Link
          key={`${mention.profileId}:${mention.start}:${index}`}
          href={mention.href}
          className={`${mentionClassName} hover:underline`}
        >
          {token}
        </Link>
      ) : (
        <span
          key={`plain:${mention.start}:${index}`}
          className={mentionClassName}
        >
          {token}
        </span>
      )
    );
    cursor = mention.start + mention.length;
  });
  if (cursor < text.length) content.push(text.slice(cursor));
  return content;
}

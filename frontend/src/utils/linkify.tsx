/**
 * Linkify Utility
 * Detects URLs in text and converts them to clickable links
 */

import type { ReactNode } from 'react';

// URL regex pattern
const URL_REGEX =
  /(?:https?:\/\/)?(?:www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_+.~#?&/=]*)/gi;

/**
 * Convert URLs in text to clickable links
 * @param text - The text to linkify
 * @returns Array of React nodes (text and links)
 */
export function linkify(text: string): ReactNode[] {
  const parts: ReactNode[] = [];
  let lastIndex = 0;
  let linkId = 0;

  // Find all URL matches
  const matches = Array.from(text.matchAll(new RegExp(URL_REGEX)));

  for (const match of matches) {
    const url = match[0];
    const startIndex = match.index ?? 0;

    // Add text before the URL
    if (startIndex > lastIndex) {
      parts.push(text.substring(lastIndex, startIndex));
    }

    // Ensure URL has protocol
    let href = url;
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      href = `https://${url}`;
    }

    // Add the link with unique key based on position and URL
    parts.push(
      <a
        key={`link-${startIndex}-${linkId++}`}
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 underline"
        onClick={(e) => e.stopPropagation()}
      >
        {url}
      </a>,
    );

    lastIndex = startIndex + url.length;
  }

  // Add remaining text after last URL
  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }

  return parts.length > 0 ? parts : [text];
}

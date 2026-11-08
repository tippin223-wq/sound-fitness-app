"use client";

import NextLink from "next/link";
import { useState, type ComponentProps } from "react";

/** Dense menus should not run every destination's server work on page load.
 * Warm a destination when the user points to it or focuses it instead. */
export default function IntentLink({
  prefetch,
  onMouseEnter,
  onFocus,
  ...props
}: ComponentProps<typeof NextLink>) {
  const [intent, setIntent] = useState(false);
  return (
    <NextLink
      {...props}
      prefetch={prefetch === undefined ? (intent ? null : false) : prefetch}
      onMouseEnter={(event) => {
        onMouseEnter?.(event);
        if (!event.defaultPrevented) setIntent(true);
      }}
      onFocus={(event) => {
        onFocus?.(event);
        if (!event.defaultPrevented) setIntent(true);
      }}
    />
  );
}

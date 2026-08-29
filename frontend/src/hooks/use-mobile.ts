import * as React from "react"

const MOBILE_BREAKPOINT = 768
const QUERY = `(max-width: ${MOBILE_BREAKPOINT - 1}px)`

/**
 * Rewritten from the shadcn default, which set state inside an effect and tripped
 * react-hooks/set-state-in-effect. useSyncExternalStore is the idiomatic answer
 * for reading a browser API: it subscribes, reads synchronously on the client, and
 * takes a separate server snapshot so SSR and hydration agree.
 *
 * Server snapshot is false - desktop is the primary experience (planning section 6),
 * so the first paint assumes desktop and corrects on hydration if wrong.
 */
function subscribe(onChange: () => void) {
  const mql = window.matchMedia(QUERY)
  mql.addEventListener("change", onChange)
  return () => mql.removeEventListener("change", onChange)
}

function getSnapshot() {
  return window.matchMedia(QUERY).matches
}

function getServerSnapshot() {
  return false
}

export function useIsMobile() {
  return React.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}

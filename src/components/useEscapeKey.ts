import { useEffect, useRef } from 'react';

type EscapeHandler = () => void;

/**
 * Shared stack of every currently-active `useEscapeKey` registrant, ordered
 * oldest-first. A single `keydown` listener (attached lazily, once) fires only
 * the last (topmost) entry.
 *
 * ## Why a stack rather than a listener per overlay
 *
 * Every overlay in this package used to attach its own `document` keydown
 * listener and close itself on any Escape press. That is correct in isolation
 * and wrong the moment two overlays are open at once: one press reaches both
 * listeners, so a dropdown open inside a `Modal` closed the dropdown **and**
 * the modal under it, and the operator lost the dialog they were filling in.
 *
 * Nothing about the old shape made that visible. Each component's own story
 * and test opens exactly one overlay, so every listener behaves perfectly
 * until they are composed, which is the case no single component's tests
 * cover.
 *
 * Adapted from `mantsu-core/frontend/src/lib/useEscapeKey.ts`, which is where
 * the pattern was first written; the apps vendored it from there. This copy is
 * the one they should depend on from now on.
 */
const stack: EscapeHandler[] = [];
let listenerAttached = false;

function handleGlobalKeyDown(event: KeyboardEvent): void {
  if (event.key !== 'Escape') return;
  const topmost = stack[stack.length - 1];
  topmost?.();
}

function attachListenerIfNeeded(): void {
  if (!listenerAttached) {
    window.addEventListener('keydown', handleGlobalKeyDown);
    listenerAttached = true;
  }
}

function detachListenerIfIdle(): void {
  if (listenerAttached && stack.length === 0) {
    window.removeEventListener('keydown', handleGlobalKeyDown);
    listenerAttached = false;
  }
}

/**
 * Close-on-Escape for an overlay, cooperating with every other overlay that
 * uses this hook: only the topmost active registrant responds to a given
 * press.
 *
 * Registers only while `active` is true, and always cleans up. Pass the
 * overlay's own open state as `active` rather than mounting the hook
 * conditionally, so the registration order matches the visual stacking order.
 */
export function useEscapeKey(active: boolean, onEscape: () => void): void {
  // Keep the latest callback without re-registering on every render: the stack
  // position, not the callback identity, is what decides whether this
  // registrant is topmost. Re-registering on each render would move this entry
  // to the top and let a parent overlay steal Escape from its own child.
  const onEscapeRef = useRef(onEscape);
  onEscapeRef.current = onEscape;

  useEffect(() => {
    if (!active) return;
    const handler: EscapeHandler = () => onEscapeRef.current();
    stack.push(handler);
    attachListenerIfNeeded();
    return () => {
      const index = stack.lastIndexOf(handler);
      if (index !== -1) {
        stack.splice(index, 1);
      }
      detachListenerIfIdle();
    };
  }, [active]);
}

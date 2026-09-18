// Lets other screens hand work to the docked composer: the Android widget, the empty
// Beranda examples and "Catat …" from search. A request made before the composer mounts
// (e.g. right before navigating to Beranda) is kept until the composer picks it up.

const COMPOSER_FOCUS_EVENT = "sakuin:composer-focus";

export type ComposerFocusRequest = {
  /** Text to put in the field; leave undefined to keep what is already typed. */
  text?: string;
};

let pendingRequest: ComposerFocusRequest | null = null;

export function requestComposerFocus(request: ComposerFocusRequest = {}) {
  pendingRequest = request;

  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(COMPOSER_FOCUS_EVENT));
  }
}

export function takeComposerFocusRequest() {
  const request = pendingRequest;
  pendingRequest = null;
  return request;
}

export function subscribeComposerFocus(listener: () => void) {
  window.addEventListener(COMPOSER_FOCUS_EVENT, listener);

  return () => window.removeEventListener(COMPOSER_FOCUS_EVENT, listener);
}

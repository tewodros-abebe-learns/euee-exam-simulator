/**
 * One page-wide scroll lock, shared by every dialog.
 *
 * Three components used to write `document.body.style.overflow` themselves and
 * each reset it on unmount. With the folder manager open and an upload dialog
 * opened on top of it, closing the inner dialog set the page back to scrolling
 * while the outer one was still covering it — so the background moved under the
 * student. Counting the open dialogs fixes that without any component needing
 * to know about the others.
 */

let openCount = 0;
let previousOverflow: string | null = null;

export function lockScroll(): void {
  if (typeof document === 'undefined') return;
  if (openCount === 0) {
    previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
  }
  openCount += 1;
}

export function unlockScroll(): void {
  if (typeof document === 'undefined') return;
  if (openCount === 0) return;
  openCount -= 1;
  if (openCount === 0) {
    document.body.style.overflow = previousOverflow ?? '';
    previousOverflow = null;
  }
}

/** Test hook: the number of dialogs currently holding the lock. */
export function scrollLockCount(): number {
  return openCount;
}

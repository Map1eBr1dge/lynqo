import { animate, createTimeline, stagger } from "animejs";
import { ref, watch, type Ref } from "vue";

/**
 * Thin choreography layer over anime.js v4 (MIT, © Julian Garnier).
 *
 * API usage cross-checked against the official docs:
 *  - animation params: https://animejs.com/documentation/animation/
 *  - built-in eases (outExpo/outQuad/outBack): https://animejs.com/documentation/easings/
 *  - stagger:           https://animejs.com/documentation/utilities/stagger-grid/
 *  - timelines + rel.:  https://animejs.com/documentation/timeline/
 *
 * Division of labor (see spark-output/specs + board.json):
 *  - CSS transitions keep owning simple STATE transitions (hover/focus/
 *    dialogs/route fade) — they run on the compositor thread.
 *  - This module owns JS-driven CHOREOGRAPHY only: staggers, celebrations,
 *    count-ups, elastic pops.
 * Every helper is a no-op under prefers-reduced-motion.
 */

export function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

type TargetLike = string | Element | Element[] | NodeListOf<Element>;

function toElements(targets: TargetLike): Element[] {
  if (typeof targets === "string") {
    return Array.from(document.querySelectorAll(targets));
  }
  if (targets instanceof Element) return [targets];
  return Array.from(targets);
}

/**
 * Stagger children upward into view. Used after route enter and on first
 * list paint. Elements are left clean afterwards (opacity/transform end at
 * natural values).
 */
export function staggerIn(
  targets: TargetLike,
  opts: { gap?: number; distance?: number; duration?: number } = {}
): void {
  if (prefersReducedMotion()) return;
  const els = toElements(targets);
  if (els.length === 0) return;
  animate(els, {
    opacity: [0, 1],
    translateY: [opts.distance ?? 10, 0],
    duration: opts.duration ?? 420,
    ease: "outExpo",
    delay: stagger(opts.gap ?? 40),
  });
}

/**
 * Celebrate a completed transfer row: accent wash + tiny lift.
 * Two chained tweens instead of color keyframes keeps v4 usage conservative.
 */
export function celebrateRow(el?: Element | null): void {
  if (!el || prefersReducedMotion()) return;
  createTimeline({
    defaults: { ease: "outQuad" },
  })
    .add(el, {
      backgroundColor: "rgba(6, 182, 212, 0.16)",
      duration: 240,
    })
    .add(el, { scale: 1.008, duration: 200 })
    .add(el, {
      backgroundColor: "rgba(6, 182, 212, 0)",
      duration: 620,
    })
    .add(el, { scale: 1, duration: 260 }, "-=300");
}

/** Quick elastic acknowledgment (e.g. drag-enter on the drop zone). */
export function elasticPop(el?: Element | null, amount = 1.02): void {
  if (!el || prefersReducedMotion()) return;
  createTimeline({ defaults: { ease: "outQuad" } })
    .add(el, { scale: amount, duration: 150 })
    .add(el, { scale: 1, duration: 360, ease: "outBack" });
}

/**
 * Tween a numeric source into a formatted display ref.
 * Usage: const label = useCountUp(() => transfers.value.length, { format }).
 */
export function useCountUp(
  source: () => number,
  opts: { duration?: number; format?: (n: number) => string } = {}
): Readonly<Ref<string>> {
  const format = opts.format ?? ((n: number) => String(Math.round(n)));
  const display = ref(format(source())) as Ref<string>;
  let current = source();

  watch(source, (to) => {
    if (prefersReducedMotion() || to === current) {
      current = to;
      display.value = format(to);
      return;
    }
    const from = current;
    const proxy = { v: from };
    animate(proxy, {
      v: to,
      duration: opts.duration ?? 600,
      ease: "outExpo",
      onUpdate: () => {
        current = proxy.v;
        display.value = format(proxy.v);
      },
    });
  });

  return display;
}

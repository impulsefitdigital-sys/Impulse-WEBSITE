import { useEffect } from "react";

/**
 * Adds the `in` class to `.reveal` elements as they scroll into view.
 * Call once near the root of a marketing page (inside the `.imp` scope).
 * A MutationObserver picks up elements rendered later (async Supabase content).
 */
export function useScrollReveal() {
  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") {
      document.querySelectorAll(".imp .reveal").forEach((el) => el.classList.add("in"));
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e, i) => {
          if (e.isIntersecting) {
            const el = e.target as HTMLElement;
            window.setTimeout(() => el.classList.add("in"), (i % 6) * 60);
            io.unobserve(el);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
    );

    const observeAll = () =>
      document.querySelectorAll(".imp .reveal:not(.in)").forEach((el) => io.observe(el));

    observeAll();

    // Catch sections that mount after async data loads.
    const mo = new MutationObserver(() => observeAll());
    mo.observe(document.body, { childList: true, subtree: true });

    return () => {
      io.disconnect();
      mo.disconnect();
    };
  }, []);
}

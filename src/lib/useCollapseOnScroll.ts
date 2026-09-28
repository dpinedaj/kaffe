import { useEffect, useState } from "react";

/**
 * True once the page has scrolled past `down` px, false again only near the top (`up` px).
 * The gap between the two stops the header flickering when scrolling stops at the edge.
 */
export function useCollapseOnScroll(down = 50, up = 10): boolean {
  const [collapsed, setCollapsed] = useState(false);
  useEffect(() => {
    let frame = 0;
    const read = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const y = window.scrollY;
        setCollapsed((prev) => (prev ? y > up : y > down));
      });
    };
    read();
    window.addEventListener("scroll", read, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", read);
    };
  }, [down, up]);
  return collapsed;
}

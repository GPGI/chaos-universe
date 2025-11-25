import { useEffect, useRef } from "react";
import anime from "animejs";

export function useAnime() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Stagger animation for cards
    anime({
      targets: containerRef.current.querySelectorAll(".anime-card"),
      opacity: [0, 1],
      translateY: [30, 0],
      delay: anime.stagger(100),
      duration: 600,
      easing: "easeOutExpo",
    });
  }, []);

  return containerRef;
}

export function animateNumber(
  element: HTMLElement | null,
  from: number,
  to: number,
  duration: number = 2000,
  decimals: number = 2
) {
  if (!element) return;

  anime({
    targets: { value: from },
    value: to,
    duration,
    easing: "easeOutExpo",
    update: function(anim) {
      const val = (anim.animatables[0].target as any).value;
      element.textContent = val.toFixed(decimals);
    },
  });
}

export function animateCardHover(element: HTMLElement | null, isHovering: boolean) {
  if (!element) return;

  anime({
    targets: element,
    scale: isHovering ? 1.05 : 1,
    boxShadow: isHovering
      ? "0 10px 40px rgba(139, 92, 246, 0.3)"
      : "0 2px 10px rgba(139, 92, 246, 0.1)",
    duration: 300,
    easing: "easeOutQuad",
  });
}

export function animateGlow(element: HTMLElement | null, intensity: number = 1) {
  if (!element) return;

  anime({
    targets: element,
    boxShadow: [
      `0 0 ${10 * intensity}px rgba(139, 92, 246, ${0.3 * intensity})`,
      `0 0 ${20 * intensity}px rgba(139, 92, 246, ${0.5 * intensity})`,
      `0 0 ${10 * intensity}px rgba(139, 92, 246, ${0.3 * intensity})`,
    ],
    duration: 2000,
    easing: "easeInOutSine",
    loop: true,
  });
}


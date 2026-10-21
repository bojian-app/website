"use client";
import { useEffect } from "react";
import { gsap } from "gsap";

export function Motion() {
  useEffect(() => {
    const media = gsap.matchMedia();
    media.add("(prefers-reduced-motion: no-preference)", () => {
      const stage = document.querySelector<HTMLElement>(".minimal-home");
      if (!stage) return;
      let dispose = () => {};
      const context = gsap.context(() => {
        gsap.from(".landing-composition", {
          opacity: 0,
          y: 18,
          duration: 1.1,
          ease: "power3.out",
          clearProps: "all",
        });
        if (!matchMedia("(hover: hover) and (pointer: fine)").matches) return;
        const target = stage.querySelector(".landing-art-tilt");
        const x = gsap.quickTo(target, "rotationX", {
          duration: 1.1,
          ease: "power3.out",
        });
        const y = gsap.quickTo(target, "rotationY", {
          duration: 1.1,
          ease: "power3.out",
        });
        const move = (event: PointerEvent) => {
          if (event.pointerType !== "mouse") return;
          x(-(event.clientY / innerHeight - 0.5) * 12);
          y((event.clientX / innerWidth - 0.5) * 18);
        };
        const leave = () => {
          x(0);
          y(0);
        };
        stage.addEventListener("pointermove", move, { passive: true });
        stage.addEventListener("pointerleave", leave);
        dispose = () => {
          stage.removeEventListener("pointermove", move);
          stage.removeEventListener("pointerleave", leave);
        };
      });
      return () => {
        dispose();
        context.revert();
      };
    });
    return () => media.revert();
  }, []);
  return null;
}

// Shared GSAP setup — register plugins once, expose the instance + ScrollTrigger.
// Respects prefers-reduced-motion: animations are shortened to ~0s so layout
// still settles but no motion is perceived.
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const prefersReduced =
  typeof window !== 'undefined' &&
  window.matchMedia &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

if (prefersReduced) {
  gsap.defaults({ duration: 0.01, ease: 'none' });
  gsap.config({ nullTargetWarn: false });
}

export { gsap, ScrollTrigger, prefersReduced };
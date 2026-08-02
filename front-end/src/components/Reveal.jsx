import { useRef, useEffect } from 'react';
import { gsap, ScrollTrigger } from '../lib/gsap';

// Reveal — fades + slides its children into view on scroll.
// Props:
//   as: element/component to render (default 'div')
//   className, style: passthrough
//   delay: seconds (per-child stagger offset)
//   stagger: seconds between children (default 0.08)
//   y: starting vertical offset in px (default 24)
//   once: animate only the first time it enters (default true)
//   children: if provided, stagger animates direct children; otherwise the wrapper itself animates
export default function Reveal({
  as: Tag = 'div',
  className = '',
  style,
  delay = 0,
  stagger = 0.08,
  y = 24,
  once = true,
  children,
  ...rest
}) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const targets = el.hasChildNodes() ? el.children : el;
    if (!targets || (Array.isArray(targets) && targets.length === 0)) return;

    const ctx = gsap.context(() => {
      gsap.set(targets, { opacity: 0, y });
      const tween = gsap.to(targets, {
        opacity: 1,
        y: 0,
        duration: 0.7,
        delay,
        stagger,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: el,
          start: 'top 85%',
          once,
        },
      });
      // Make sure ScrollTrigger recalculates after layout/images settle.
      ScrollTrigger.refresh();
      return () => tween.scrollTrigger && tween.scrollTrigger.kill();
    }, ref);

    return () => ctx.revert();
  }, [delay, stagger, y, once]);

  return (
    <Tag ref={ref} className={className} style={style} {...rest}>
      {children}
    </Tag>
  );
}
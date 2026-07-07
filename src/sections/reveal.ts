import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export function initReveals(): void {
  gsap.matchMedia().add('(prefers-reduced-motion: no-preference)', () => {
    gsap.utils.toArray<HTMLElement>('[data-reveal]').forEach(el => {
      gsap.from(el, {
        y: 40, autoAlpha: 0, duration: 0.9, ease: 'power2.out',
        scrollTrigger: { trigger: el, start: 'top 80%' },
      });
    });
  });
}

export interface WorkItem { title: string; desc: string; href: string; }

const WORKS: WorkItem[] = [
  { title: 'typo3-builder-skills', desc: 'AI agents × CMS — skills & MCP workflows', href: 'https://github.com/AnastaCodes/typo3-builder-skills' },
  { title: 'ColorSwitcher', desc: 'palette generator · live demo ↗', href: 'https://anastacodes.github.io/ColorSwitcher/' },
  { title: 'DoDoPizzaOnReact', desc: 'React shop · real PR workflow', href: 'https://github.com/AnastaCodes/DoDoPizzaOnReact' },
  { title: 'Weather dashboard + PHP proxy', desc: 'fullstack pair · keys stay server-side', href: 'https://github.com/AnastaCodes/AdvancedWeatherFetcher' },
  { title: 'MemoryMatchGame', desc: 'vanilla JS · live demo ↗', href: 'https://github.com/AnastaCodes/MemoryMatchGame' },
];

export function renderWork(list: HTMLElement): void {
  list.innerHTML = WORKS.map((w, i) => `
    <li><a href="${w.href}" style="--row-c: var(--c${(i % 5) + 1})">
      <span class="t">${w.title}</span><span class="d">${w.desc}</span>
    </a></li>`).join('');
}

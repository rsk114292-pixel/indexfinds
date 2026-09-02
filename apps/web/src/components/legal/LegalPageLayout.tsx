'use client';

import { useState, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

interface Section {
  id: string;
  title: string;
}

interface LegalPageLayoutProps {
  title: string;
  lastUpdated: string;
  sections: Section[];
  children: React.ReactNode;
}

export default function LegalPageLayout({ title, lastUpdated, sections, children }: LegalPageLayoutProps) {
  const [activeSection, setActiveSection] = useState('');
  const [isTocOpen, setIsTocOpen] = useState(false);

  // Intersection Observer to track current section
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        });
      },
      { rootMargin: '-100px 0px -66%' }
    );
    sections.forEach((s) => {
      const el = document.getElementById(s.id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [sections]);

  const scrollToSection = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setIsTocOpen(false);
  };

  return (
    <div className="container mx-auto px-4 py-8 lg:py-12">
      <header className="mb-6 lg:mb-10">
        <h1 className="mb-1 text-2xl font-bold text-foreground lg:mb-2 lg:text-3xl">{title}</h1>
        <p className="text-xs text-muted lg:text-sm">Last updated: {lastUpdated}</p>
      </header>

      <div className="lg:flex lg:gap-12">
        <nav className="hidden w-64 shrink-0 lg:block" aria-label="Table of contents">
          <div className="sticky top-24">
            <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-muted">Table of Contents</h2>
            <ul className="space-y-1">
              {sections.map((s) => (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => scrollToSection(s.id)}
                    className={`w-full rounded-lg px-3 py-1.5 text-left text-sm transition-colors ${
                      activeSection === s.id
                        ? 'bg-primary/5 font-medium text-primary'
                        : 'text-muted hover:text-foreground'
                    }`}
                  >
                    {s.title}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </nav>

        <div className="mb-8 overflow-hidden rounded-xl border border-border bg-surface lg:hidden">
          <button
            type="button"
            aria-controls="mobile-legal-toc"
            aria-expanded={isTocOpen}
            onClick={() => setIsTocOpen(!isTocOpen)}
            className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium text-foreground"
          >
            <span>Table of Contents</span>
            <ChevronDown
              aria-hidden="true"
              className={`h-4 w-4 text-muted transition-transform ${isTocOpen ? 'rotate-180' : ''}`}
            />
          </button>
          {isTocOpen && (
            <div id="mobile-legal-toc" className="space-y-1 px-4 pb-3">
              {sections.map((s) => (
                <button
                  type="button"
                  key={s.id}
                  onClick={() => scrollToSection(s.id)}
                  className="w-full py-1.5 text-left text-sm text-muted hover:text-primary"
                >
                  {s.title}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1 lg:max-w-3xl">
          <div className="prose-like">{children}</div>
        </div>
      </div>
    </div>
  );
}

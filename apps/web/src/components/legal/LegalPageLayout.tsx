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
    <>
      {/* PC */}
      <div className="hidden lg:block">
        <div className="container mx-auto px-4 py-12">
          {/* Header */}
          <div className="mb-10">
            <h1 className="text-3xl font-bold text-foreground mb-2">{title}</h1>
            <p className="text-sm text-muted">Last updated: {lastUpdated}</p>
          </div>
          {/* 2-column layout */}
          <div className="flex gap-12">
            {/* Sidebar TOC */}
            <nav className="w-64 shrink-0">
              <div className="sticky top-24">
                <h3 className="text-xs font-semibold text-muted uppercase tracking-wider mb-4">Table of Contents</h3>
                <ul className="space-y-1">
                  {sections.map((s) => (
                    <li key={s.id}>
                      <button
                        onClick={() => scrollToSection(s.id)}
                        className={`w-full text-left text-sm py-1.5 px-3 rounded-lg transition-colors ${
                          activeSection === s.id
                            ? 'text-primary font-medium bg-primary/5'
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
            {/* Content */}
            <div className="flex-1 min-w-0 max-w-3xl">
              <div className="prose-like">
                {children}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile */}
      <div className="lg:hidden">
        <div className="px-4 py-8">
          <h1 className="text-2xl font-bold text-foreground mb-1">{title}</h1>
          <p className="text-xs text-muted mb-6">Last updated: {lastUpdated}</p>
          {/* Collapsible TOC */}
          <div className="mb-8 bg-surface border border-border rounded-xl overflow-hidden">
            <button
              onClick={() => setIsTocOpen(!isTocOpen)}
              className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-foreground"
            >
              <span>Table of Contents</span>
              <ChevronDown className={`w-4 h-4 text-muted transition-transform ${isTocOpen ? 'rotate-180' : ''}`} />
            </button>
            {isTocOpen && (
              <div className="px-4 pb-3 space-y-1">
                {sections.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => scrollToSection(s.id)}
                    className="w-full text-left text-sm py-1.5 text-muted hover:text-primary"
                  >
                    {s.title}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="prose-like">
            {children}
          </div>
        </div>
      </div>
    </>
  );
}

'use client';

import { useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { getContactEmail } from '@/lib/site-config';
import { buildWhatsAppHelpUrl, TELEGRAM_URL, WHATSAPP_NUMBER } from '@/lib/support-links';
import {
  ChevronDown,
  Rocket,
  ShoppingBag,
  Truck,
  Settings,
  Mail,
  MessageCircle,
  Send,
} from 'lucide-react';
import { FadeIn } from '@/components/ui/FadeIn';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface FaqItem {
  question: string;
  answer: string;
}

interface FaqCategory {
  id: string;
  icon: React.ReactNode;
  colorClass: string;
  bgClass: string;
  title: string;
  items: FaqItem[];
}

/* ------------------------------------------------------------------ */
/*  AccordionItem                                                      */
/* ------------------------------------------------------------------ */

function AccordionItem({
  question,
  answer,
}: {
  question: string;
  answer: string;
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="border-b border-border">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between py-4 text-left cursor-pointer"
      >
        <span className="font-medium text-foreground text-sm pr-4">
          {question}
        </span>
        <ChevronDown
          className={`w-4 h-4 shrink-0 text-muted transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>
      {isOpen && (
        <div className="pb-4 text-sm text-muted leading-relaxed">{answer}</div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  HelpPageClient                                                     */
/* ------------------------------------------------------------------ */

export default function HelpPageClient({
  siteName = 'IndexFinds',
}: {
  siteName?: string;
}) {
  const t = useTranslations('helpPage');
  const whatsappHelpUrl = buildWhatsAppHelpUrl(
    `Hello ${siteName}, I need help buying from China.`,
  );

  /* ---- Build FAQ data from translations ---- */
  const categories: FaqCategory[] = [
    {
      id: 'gettingStarted',
      icon: <Rocket className="w-5 h-5" />,
      colorClass: 'text-blue-500',
      bgClass: 'bg-blue-50',
      title: t('categories.gettingStarted.title'),
      items: [
        {
          question: t('categories.gettingStarted.q1.question', { siteName }),
          answer: t('categories.gettingStarted.q1.answer', { siteName }),
        },
        {
          question: t('categories.gettingStarted.q2.question'),
          answer: t('categories.gettingStarted.q2.answer'),
        },
        {
          question: t('categories.gettingStarted.q3.question'),
          answer: t('categories.gettingStarted.q3.answer'),
        },
        {
          question: t('categories.gettingStarted.q4.question', { siteName }),
          answer: t('categories.gettingStarted.q4.answer', { siteName }),
        },
      ],
    },
    {
      id: 'shoppingQc',
      icon: <ShoppingBag className="w-5 h-5" />,
      colorClass: 'text-primary',
      bgClass: 'bg-orange-50',
      title: t('categories.shoppingQc.title'),
      items: [
        {
          question: t('categories.shoppingQc.q1.question'),
          answer: t('categories.shoppingQc.q1.answer'),
        },
        {
          question: t('categories.shoppingQc.q2.question'),
          answer: t('categories.shoppingQc.q2.answer'),
        },
        {
          question: t('categories.shoppingQc.q3.question'),
          answer: t('categories.shoppingQc.q3.answer'),
        },
        {
          question: t('categories.shoppingQc.q4.question'),
          answer: t('categories.shoppingQc.q4.answer'),
        },
      ],
    },
    {
      id: 'agentsOrders',
      icon: <Truck className="w-5 h-5" />,
      colorClass: 'text-emerald-500',
      bgClass: 'bg-emerald-50',
      title: t('categories.agentsOrders.title'),
      items: [
        {
          question: t('categories.agentsOrders.q1.question'),
          answer: t('categories.agentsOrders.q1.answer'),
        },
        {
          question: t('categories.agentsOrders.q2.question'),
          answer: t('categories.agentsOrders.q2.answer'),
        },
        {
          question: t('categories.agentsOrders.q3.question'),
          answer: t('categories.agentsOrders.q3.answer', { siteName }),
        },
        {
          question: t('categories.agentsOrders.q4.question'),
          answer: t('categories.agentsOrders.q4.answer'),
        },
      ],
    },
    {
      id: 'accountSupport',
      icon: <Settings className="w-5 h-5" />,
      colorClass: 'text-purple-500',
      bgClass: 'bg-purple-50',
      title: t('categories.accountSupport.title'),
      items: [
        {
          question: t('categories.accountSupport.q1.question'),
          answer: t('categories.accountSupport.q1.answer'),
        },
        {
          question: t('categories.accountSupport.q2.question'),
          answer: t('categories.accountSupport.q2.answer'),
        },
        {
          question: t('categories.accountSupport.q3.question'),
          answer: t('categories.accountSupport.q3.answer'),
        },
        {
          question: t('categories.accountSupport.q4.question'),
          answer: t('categories.accountSupport.q4.answer'),
        },
      ],
    },
  ];

  /* ---- Scroll to category ---- */
  const scrollToCategory = useCallback((id: string) => {
    const element = document.getElementById(`faq-${id}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);

  /* ---- Shared: Hero Section ---- */
  const hero = (
    <section className="relative bg-secondary overflow-hidden">
      {/* Decorative glow */}
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-[300px] w-[300px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/10 blur-[80px] lg:h-[600px] lg:w-[600px] lg:blur-[120px]" />
      <div className="pointer-events-none absolute right-0 top-0 hidden h-[300px] w-[300px] rounded-full bg-blue-500/8 blur-[80px] lg:block" />

      <div className="container relative mx-auto px-4 py-10 text-center lg:py-20">
        <FadeIn>
          <h1 className="mb-2 text-2xl font-bold text-white md:text-4xl lg:mb-4 lg:text-5xl">
            {t('hero.title')}
          </h1>
          <p className="mx-auto max-w-2xl text-sm text-white/70 md:text-lg">
            {t('hero.subtitle', { siteName })}
          </p>
        </FadeIn>
      </div>
    </section>
  );

  /* ---- Shared: FAQ Section (accordion) ---- */
  const faqSection = (categoryId: string) => {
    const category = categories.find((c) => c.id === categoryId)!;
    return (
      <section
        key={category.id}
        id={`faq-${category.id}`}
        className="scroll-mt-20"
      >
        <div className="flex items-center gap-3 mb-4">
          <div
            className={`w-9 h-9 rounded-lg ${category.bgClass} ${category.colorClass} flex items-center justify-center shrink-0`}
          >
            {category.icon}
          </div>
          <h2 className="text-lg font-semibold text-foreground">
            {category.title}
          </h2>
        </div>
        <div className="bg-surface border border-border rounded-xl overflow-hidden px-5">
          {category.items.map((item, idx) => (
            <AccordionItem
              key={idx}
              question={item.question}
              answer={item.answer}
            />
          ))}
        </div>
      </section>
    );
  };

  /* ---- Shared: Contact Section ---- */
  const contactSection = (
    <FadeIn>
      <section className="bg-surface border border-border rounded-2xl p-8">
        <h2 className="text-xl font-bold text-foreground text-center mb-2">
          {t('contact.title')}
        </h2>
        <p className="text-sm text-muted text-center mb-8">
          {t('contact.subtitle')}
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Email */}
          <a
            href={`mailto:${getContactEmail()}`}
            className="flex flex-col items-center gap-3 p-6 rounded-xl border border-border hover:border-primary/30 hover:bg-primary/5 transition-colors"
          >
            <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center">
              <Mail className="w-5 h-5" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-foreground">
                {t('contact.email.label')}
              </p>
              <p className="text-xs text-muted mt-1">{getContactEmail()}</p>
            </div>
          </a>

          {/* WhatsApp */}
          <a
            href={whatsappHelpUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-col items-center gap-3 p-6 rounded-xl border border-border hover:border-primary/30 hover:bg-primary/5 transition-colors"
          >
            <div className="w-10 h-10 rounded-full bg-green-500/10 text-green-500 flex items-center justify-center">
              <MessageCircle className="w-5 h-5" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-foreground">
                {t('contact.whatsapp.label')}
              </p>
              <p className="text-xs text-muted mt-1">
                {t('contact.whatsapp.description')} · {WHATSAPP_NUMBER}
              </p>
            </div>
          </a>

          {/* Telegram */}
          <a
            href={TELEGRAM_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-col items-center gap-3 p-6 rounded-xl border border-border hover:border-primary/30 hover:bg-primary/5 transition-colors"
          >
            <div className="w-10 h-10 rounded-full bg-sky-500/10 text-sky-500 flex items-center justify-center">
              <Send className="w-5 h-5" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-foreground">
                {t('contact.telegram.label')}
              </p>
              <p className="text-xs text-muted mt-1">
                {t('contact.telegram.description')}
              </p>
            </div>
          </a>
        </div>
      </section>
    </FadeIn>
  );

  /* ================================================================ */
  /*  Render                                                           */
  /* ================================================================ */

  return (
    <>
      {hero}

      <div className="container mx-auto px-4 py-8 lg:py-12">
        <FadeIn>
          <div className="mb-12 hidden grid-cols-2 gap-4 lg:grid lg:grid-cols-4">
            {categories.map((category) => (
              <button
                key={category.id}
                type="button"
                onClick={() => scrollToCategory(category.id)}
                className="flex cursor-pointer flex-col items-center gap-3 rounded-xl border border-border bg-surface p-6 transition-all hover:border-primary/30 hover:shadow-md"
              >
                <div
                  className={`flex h-11 w-11 items-center justify-center rounded-xl ${category.bgClass} ${category.colorClass}`}
                >
                  {category.icon}
                </div>
                <div className="text-center">
                  <p className="text-sm font-semibold text-foreground">{category.title}</p>
                  <p className="mt-1 text-xs text-muted">
                    {t('categoryCardCount', { count: category.items.length })}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </FadeIn>

        <div className="mb-10 space-y-8 lg:mb-16 lg:space-y-10">
          {categories.map((category) => (
            <FadeIn key={category.id}>{faqSection(category.id)}</FadeIn>
          ))}
        </div>

        {contactSection}
      </div>
    </>
  );
}

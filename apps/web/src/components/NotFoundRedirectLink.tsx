'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

type NotFoundRedirectLinkProps = {
  href: string;
  className?: string;
  delayMs?: number;
  children: React.ReactNode;
};

export default function NotFoundRedirectLink({
  href,
  className,
  delayMs = 3000,
  children,
}: NotFoundRedirectLinkProps) {
  const { replace } = useRouter();
  const [secondsLeft, setSecondsLeft] = useState(Math.ceil(delayMs / 1000));

  useEffect(() => {
    setSecondsLeft(Math.ceil(delayMs / 1000));

    const countdown = window.setInterval(() => {
      setSecondsLeft((current) => (current > 1 ? current - 1 : current));
    }, 1000);

    const timer = window.setTimeout(() => {
      replace(href);
    }, delayMs);

    return () => {
      window.clearInterval(countdown);
      window.clearTimeout(timer);
    };
  }, [delayMs, href, replace]);

  return (
    <a href={href} className={className}>
      {children} ({secondsLeft}s)
    </a>
  );
}

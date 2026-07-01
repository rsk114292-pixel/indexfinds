'use client';

import { motion } from 'framer-motion';
import type { HTMLMotionProps } from 'framer-motion';

interface FadeInProps extends HTMLMotionProps<'div'> {
  /** Direction to slide from */
  direction?: 'up' | 'down' | 'left' | 'right' | 'none';
  /** Slide distance in pixels */
  distance?: number;
  /** Animation duration in seconds */
  duration?: number;
  /** Delay before animation starts in seconds */
  delay?: number;
  /** Only animate once when entering viewport */
  once?: boolean;
  children: React.ReactNode;
}

const directionOffset = {
  up: { y: 1, x: 0 },
  down: { y: -1, x: 0 },
  left: { x: 1, y: 0 },
  right: { x: -1, y: 0 },
  none: { x: 0, y: 0 },
};

export function FadeIn({
  direction = 'up',
  distance = 24,
  duration = 0.5,
  delay = 0,
  once = true,
  children,
  className,
  ...props
}: FadeInProps) {
  const offset = directionOffset[direction];

  return (
    <motion.div
      initial={{ opacity: 0, x: offset.x * distance, y: offset.y * distance }}
      whileInView={{ opacity: 1, x: 0, y: 0 }}
      viewport={{ once, margin: '-40px' }}
      transition={{ duration, delay, ease: 'easeOut' }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
}

interface StaggerChildrenProps extends HTMLMotionProps<'div'> {
  /** Delay between each child animation */
  staggerDelay?: number;
  children: React.ReactNode;
}

export function StaggerChildren({
  staggerDelay = 0.1,
  children,
  className,
  ...props
}: StaggerChildrenProps) {
  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-40px' }}
      variants={{
        visible: {
          transition: { staggerChildren: staggerDelay },
        },
      }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
}

export const staggerItemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: 'easeOut' as const },
  },
};

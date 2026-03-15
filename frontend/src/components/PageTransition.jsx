import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'react-router-dom';

/**
 * Transition variants:
 * - Landing page (/) gets a special dramatic exit: scale down + fade out
 * - All other pages slide up + fade in
 * - Coming back to landing: zoom in from small + fade
 */

const landingExit = {
  opacity: 0,
  scale: 0.96,
  filter: 'blur(8px)',
  transition: { duration: 0.45, ease: [0.4, 0, 0.2, 1] }
};

const pageEnterFromLanding = {
  initial: { opacity: 0, y: 32, filter: 'blur(6px)' },
  animate: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
  exit:    { opacity: 0, y: -16, filter: 'blur(4px)', transition: { duration: 0.3, ease: [0.4, 0, 1, 1] } }
};

const pageEnterFromPage = {
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.38, ease: [0.22, 1, 0.36, 1] } },
  exit:    { opacity: 0, y: -12, transition: { duration: 0.25, ease: [0.4, 0, 1, 1] } }
};

const landingEnter = {
  initial: { opacity: 0, scale: 1.03, filter: 'blur(6px)' },
  animate: { opacity: 1, scale: 1, filter: 'blur(0px)', transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] } },
  exit:    landingExit
};

export default function PageTransition({ children, prevPath }) {
  const location = useLocation();
  const isLanding = location.pathname === '/';
  const comingFromLanding = prevPath === '/';

  let variants;
  if (isLanding) {
    variants = landingEnter;
  } else if (comingFromLanding) {
    variants = pageEnterFromLanding;
  } else {
    variants = pageEnterFromPage;
  }

  return (
    <motion.div
      key={location.pathname}
      initial={variants.initial}
      animate={variants.animate}
      exit={variants.exit}
      style={{ width: '100%' }}
    >
      {children}
    </motion.div>
  );
}

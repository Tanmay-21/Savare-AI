import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface FieldErrorProps {
  message?: string;
}

export function FieldError({ message }: FieldErrorProps) {
  return (
    <AnimatePresence initial={false}>
      {message && (
        <motion.p
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.15 }}
          className="text-red-500 text-xs font-bold mt-1 ml-1"
          role="alert"
        >
          {message}
        </motion.p>
      )}
    </AnimatePresence>
  );
}

/** Apply to an input when a field has an error */
export const fieldErrorClass = 'border-red-400 focus:border-red-500 focus:ring-red-500/10';

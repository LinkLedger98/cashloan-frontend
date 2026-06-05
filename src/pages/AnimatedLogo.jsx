import { motion } from "framer-motion";

export default function AnimatedLogo() {
  return (
    <div className="animated-logo-wrap">

      <motion.div
        className="particle"
        initial={{
          x: -260,
          y: -140,
          opacity: 0,
          scale: 0.2
        }}
        animate={{
          x: -80,
          y: -20,
          opacity: 1,
          scale: 1
        }}
        transition={{
          duration: 1.2,
          ease: "easeOut"
        }}
      />

    </div>
  );
}

<motion.div
  className="draw-top"
  initial={{
    height: 0,
    opacity: 0
  }}
  animate={{
    height: 120,
    opacity: 1
  }}
  transition={{
    delay: 1,
    duration: 0.8,
    ease: "easeOut"
  }}
/>
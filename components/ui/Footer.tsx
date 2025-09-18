import { motion } from "framer-motion";
import Link from "next/link";
import Github from "./icons/Github";
import Filecoin from "./icons/Filecoin";

export default function Footer() {
  const footerVariants = {
    hidden: { opacity: 0, y: 50 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.8,
        ease: "easeOut",
        staggerChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        ease: "easeOut",
      },
    },
  };

  const heartAnimation = {
    scale: [1, 1.2, 1],
    transition: {
      duration: 1.5,
      repeat: Infinity,
      ease: "easeInOut",
    },
  };

  return (
    <motion.footer
      variants={footerVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.3 }}
      className="flex w-full items-center overflow-hidden justify-center overflow-y-auto rounded-t-lg bg-primary border-t"
    >
      <motion.div
        variants={itemVariants}
        className="mx-auto px-4 py-5 md:px-24 lg:px-8"
      >
        <motion.div
          variants={footerVariants}
          className="flex flex-col items-center gap-5"
        >
          <motion.div
            variants={itemVariants}
            className="flex items-center gap-3"
          >
            <motion.h1
              variants={itemVariants}
              whileHover={{ scale: 1.05 }}
              transition={{ duration: 0.3 }}
              className="text-3xl font-bold uppercase tracking-tighter text-foreground flex items-center gap-2"
            >
              <Filecoin />
              Filecoin onchain cloud demo
            </motion.h1>
          </motion.div>
          <motion.div
            variants={itemVariants}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            transition={{ duration: 0.2 }}
          >
            <Link
              className="text-center text-xl font-semibold transition-colors duration-200 hover:text-foreground flex items-center gap-2"
              href="https://github.com/FIL-Builders/fs-upload-dapp"
              target="_blank"
            >
              {"Fork me"}
              <Github />
            </Link>
          </motion.div>
          <motion.p variants={itemVariants} className="text-center text-lg">
            Build with{" "}
            <motion.span
              animate={heartAnimation}
              className="inline-block text-red-500"
            >
              ❤️
            </motion.span>{" "}
            for everyone
          </motion.p>
        </motion.div>
      </motion.div>
    </motion.footer>
  );
}

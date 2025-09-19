"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import { ThemeToggle } from "./ThemeToggle";
import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function Navbar() {
  const pathname = usePathname();
  const linkBase = "text-sm font-medium transition-colors";
  const isActive = (href: string) => pathname === href;

  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ type: "spring", stiffness: 100, damping: 20 }}
      className="flex items-center justify-between px-6 py-4  bg-white backdrop-blur supports-[backdrop-filter]:bg-white/50 "
    >
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.2 }}
        className="flex items-center gap-6"
      >
        <motion.div
          whileHover={{ scale: 1.05 }}
          className="flex items-center gap-2"
        >
          <Image src="/filecoin.svg" alt="Filecoin" width={30} height={30} />
          <h1 className="text-xl font-bold">KeyVault</h1>
        </motion.div>
        <nav className="hidden md:flex items-center gap-6">
          <Link
            href="/dashboard"
            className={`${linkBase} ${
              isActive("/dashboard")
                ? "text-[var(--primary)] border-b-2 border-[var(--primary)] pb-1"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            Dashboard
          </Link>
          <Link
            href="/backup"
            className={`${linkBase} ${
              isActive("/backup")
                ? "text-[var(--primary)] border-b-2 border-[var(--primary)] pb-1"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            Backup
          </Link>
          <Link
            href="/recover"
            className={`${linkBase} ${
              isActive("/recover")
                ? "text-[var(--primary)] border-b-2 border-[var(--primary)] pb-1"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            Recovery
          </Link>
        </nav>
      </motion.div>
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.3 }}
        className="flex items-center gap-4"
      >
        <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}>
          <ThemeToggle />
        </motion.div>
        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
          <ConnectButton />
        </motion.div>
      </motion.div>
    </motion.nav>
  );
}

// pages/index.tsx or app/page.tsx
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import Image from "next/image";

export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Floating header */}
      <header
        className={`fixed w-full transition-all duration-300 ${
          scrolled ? "bg-black/70 backdrop-blur-lg py-4" : "bg-transparent py-6"
        }`}
      >
        <div className="container mx-auto px-6 flex items-center justify-between">
          <div className="flex items-center">
            <div className="relative w-10 h-10 mr-3">
              <div className="absolute w-10 h-10 bg-blue-500 rounded-full opacity-70 animate-ping"></div>
              <div className="absolute w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  className="w-5 h-5 text-white"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                  />
                </svg>
              </div>
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              HoneyGuard
            </h1>
          </div>

          <nav className="hidden md:flex space-x-8">
            <Link
              href="/honeypots"
              className="text-white/80 hover:text-white transition"
            >
              Honeypots
            </Link>
            <Link
              href="/dashboard"
              className="text-white/80 hover:text-white transition"
            >
              Dashboard
            </Link>
            <Link
              href="/honeypots/new"
              className="text-white/80 hover:text-white transition"
            >
              New Honeypot
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero section */}
      <section className="pt-32 pb-20 px-6 md:px-10 lg:px-0 max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row items-center">
          <div className="md:w-1/2">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
            >
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-tight mb-4">
                Detect <span className="text-blue-400">Advanced Threats</span>{" "}
                with Honeypot Technology
              </h1>
              <p className="text-lg text-white/70 mb-8 max-w-lg">
                Monitor potential attacks in real-time with our advanced
                honeypot system. Deploy decoys, analyze attacker behavior, and
                strengthen your security.
              </p>

              <div className="flex flex-col sm:flex-row gap-4">
                <Link href="/honeypots/new">
                  <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full sm:w-auto px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium shadow-lg shadow-blue-600/30 flex items-center justify-center"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5 mr-2"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"
                        clipRule="evenodd"
                      />
                    </svg>
                    Deploy New Honeypot
                  </motion.button>
                </Link>

                <Link href="/dashboard">
                  <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full sm:w-auto px-8 py-4 bg-transparent hover:bg-white/10 text-white border border-white/30 rounded-lg font-medium flex items-center justify-center"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5 mr-2"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path d="M2 10a8 8 0 018-8v8h8a8 8 0 11-16 0z" />
                      <path d="M12 2.252A8.014 8.014 0 0117.748 8H12V2.252z" />
                    </svg>
                    View Dashboard
                  </motion.button>
                </Link>
              </div>
            </motion.div>
          </div>

          <motion.div
            className="md:w-1/2 mt-12 md:mt-0"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            <div className="relative">
              {/* Decorative background elements */}
              <div className="absolute -top-10 -right-10 w-64 h-64 bg-blue-500/20 rounded-full blur-3xl"></div>
              <div className="absolute bottom-10 -left-10 w-40 h-40 bg-purple-500/20 rounded-full blur-3xl"></div>

              {/* Security dashboard mockup */}
              <div className="relative   p-3 z-10 w-full md:min-h-[400px] lg:min-h-[600px] overflow-hidden">
                <div className="absolute inset-0 flex items-center justify-center">
                  <Image
                    src="/Hero.png"
                    alt="Security Dashboard Preview"
                    width={800}
                    height={500}
                    priority
                    className="rounded-md max-w-full max-h-full"
                    style={{ objectFit: "contain" }}
                  />
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features section */}
      <section className="py-16 px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-3xl font-bold text-white mb-4">Key Features</h2>
            <p className="text-white/70 max-w-2xl mx-auto">
              Our honeypot system provides comprehensive security monitoring
              with advanced threat detection capabilities.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6 hover:bg-white/10 transition"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
              >
                <div className="w-12 h-12 rounded-lg bg-blue-600/20 flex items-center justify-center mb-4">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-6 w-6 text-blue-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d={feature.icon}
                    />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">
                  {feature.title}
                </h3>
                <p className="text-white/60">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6">
        <motion.div
          className="max-w-4xl mx-auto bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl shadow-xl overflow-hidden"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <div className="md:flex">
            <div className="p-8 md:p-12 md:w-2/3">
              <h2 className="text-3xl font-bold text-white mb-4">
                Ready to strengthen your security?
              </h2>
              <p className="text-white/80 mb-8">
                Start monitoring potential threats today. Deploy a honeypot in
                minutes and gain valuable insights into attack patterns.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link href="/honeypots/new">
                  <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.98 }}
                    className="px-8 py-3 bg-white text-blue-600 rounded-lg font-medium shadow-lg"
                  >
                    Deploy New Honeypot
                  </motion.button>
                </Link>
                <Link href="/dashboard">
                  <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.98 }}
                    className="px-8 py-3 bg-blue-800/50 hover:bg-blue-800/70 text-white border border-white/20 rounded-lg font-medium"
                  >
                    View Dashboard
                  </motion.button>
                </Link>
              </div>
            </div>
            <div className="hidden md:block md:w-1/3 relative">
              <div className="absolute inset-0 bg-black/20"></div>
              <div className="absolute right-0 bottom-0 w-32 h-32 bg-white/20 rounded-full translate-x-1/3 translate-y-1/3 blur-2xl"></div>
              <div className="absolute left-0 top-0 w-16 h-16 bg-white/20 rounded-full -translate-x-1/2 -translate-y-1/2 blur-xl"></div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6 border-t border-white/10">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center">
          <div className="flex items-center mb-4 md:mb-0">
            <div className="w-8 h-8 mr-2 bg-blue-600 rounded-full flex items-center justify-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                className="w-4 h-4 text-white"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
            </div>
            <span className="text-white font-medium">HoneyGuard</span>
          </div>
          <div className="text-white/50 text-sm">
            © {new Date().getFullYear()} HoneyGuard. A Network Security Project.
          </div>
        </div>
      </footer>
    </div>
  );
}

// Sample feature data
const features = [
  {
    icon: "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z",
    title: "Real-Time Attack Simulator",
    description:
      "Simulate various types of attacks against a honeypot with different complexity levels and watch attack count update real-time.",
  },
  {
    icon: "M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
    title: "Detailed Analytics",
    description:
      "Gain insights into attack patterns with comprehensive analytics and visualization tools.",
  },
  {
    icon: "M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z",
    title: "Cloud Deployment",
    description:
      "Deploy honeypots across multiple cloud environments with just a few clicks.",
  },
];

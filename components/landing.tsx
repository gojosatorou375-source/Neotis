"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Persona } from "@/types/persona";

function ProviderMarquee() {
  const shouldReduceMotion = useReducedMotion();
  const providers = [
    { name: "ChatGPT", src: "/logos/chatgpt.png" },
    { name: "Claude AI", src: "/logos/claude.png" },
    { name: "Gemini", src: "/logos/gemini.png" },
    { name: "Perplexity", src: "/logos/perplexity.png" },
    { name: "Grok", src: "inline-grok" },
    { name: "DeepSeek", src: "/logos/deepseek.png" },
  ];
  
  // Duplicate twice (three lists total) for seamless looping on all screens
  const marqueeItems = [...providers, ...providers, ...providers];

  return (
    <section className="border-y border-black/10 py-10 bg-white overflow-hidden">
      <div className="max-w-7xl mx-auto px-6 sm:px-10">
        <div className="text-center text-[10px] font-black text-black/40 uppercase tracking-widest mb-8">
          Our service supports
        </div>
        
        {shouldReduceMotion ? (
          <div className="flex flex-wrap items-center justify-center gap-x-16 gap-y-6">
            {providers.map((prov, i) => {
              if (prov.src === "inline-grok") {
                return (
                  <span key={i} className="text-sm font-black text-black/40 hover:text-black uppercase tracking-widest transition-colors duration-200 cursor-default select-none font-mono">
                    GROK
                  </span>
                );
              }
              return (
                <img 
                  key={i} 
                  src={prov.src} 
                  alt={prov.name} 
                  className="h-7 object-contain opacity-40 hover:opacity-100 transition-all duration-200 filter grayscale hover:grayscale-0 select-none" 
                />
              );
            })}
          </div>
        ) : (
          <div 
            className="w-full relative overflow-hidden"
            style={{
              maskImage: "linear-gradient(to right, transparent, white 15%, white 85%, transparent)",
              WebkitMaskImage: "linear-gradient(to right, transparent, white 15%, white 85%, transparent)"
            }}
          >
            <div className="animate-marquee gap-x-20 items-center">
              {marqueeItems.map((prov, i) => {
                if (prov.src === "inline-grok") {
                  return (
                    <div key={i} className="h-7 flex items-center shrink-0 opacity-40 hover:opacity-100 hover:scale-105 transition-all duration-200 cursor-default select-none">
                      <svg className="h-4 text-black" viewBox="0 0 80 24" fill="currentColor">
                        <text x="0" y="17" fontFamily="monospace" fontWeight="900" fontSize="16" letterSpacing="1.5">GROK</text>
                      </svg>
                    </div>
                  );
                }
                return (
                  <img 
                    key={i} 
                    src={prov.src} 
                    alt={prov.name} 
                    className="h-7 object-contain opacity-40 hover:opacity-100 hover:scale-105 transition-all duration-200 filter grayscale hover:grayscale-0 select-none shrink-0" 
                  />
                );
              })}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

interface LandingProps {
  onStart: () => void;
  hasSavedProgress: boolean;
  personas: Persona[];
  onUsePersona: (persona: Persona) => void;
}

export function Landing({ onStart, hasSavedProgress, personas, onUsePersona }: LandingProps) {
  const shouldReduceMotion = useReducedMotion();

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.08 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: shouldReduceMotion ? 0 : 15 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { type: "spring", stiffness: 100, damping: 15 },
    },
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA] text-[#111111] font-sans selection:bg-[#B8FF33] selection:text-black">
      
      {/* 1. Header Navigation */}
      <nav className="w-full max-w-7xl mx-auto flex items-center justify-between px-6 py-6 sm:px-10 border-b border-black/5 bg-[#FAFAFA]">
        <div className="flex items-center gap-2 text-xl font-extrabold tracking-tight">
          <svg className="w-6 h-6 text-[#111111]" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="3" y="3" width="18" height="18" rx="4" stroke="currentColor" strokeWidth="2.5" />
            <path d="M7 8H17M7 12H13M7 16H17" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
          <span>Noetis</span>
        </div>
        <div className="hidden md:flex items-center gap-8 text-sm font-semibold">
          <a href="#capabilities" className="hover:text-black/60 transition-colors">Capabilities</a>
          <a href="#how-it-works" className="hover:text-black/60 transition-colors">Process</a>
          <a href="#use-cases" className="hover:text-black/60 transition-colors">Use Cases</a>
          <Link href="/" className="hover:text-black/60 transition-colors">Open Dashboard</Link>
        </div>
      </nav>

      {/* 2. Hero Section */}
      <section className="max-w-7xl mx-auto px-6 sm:px-10 py-16 lg:py-24 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
        <motion.div 
          className="lg:col-span-7 space-y-8"
          initial="hidden"
          animate="visible"
          variants={containerVariants}
        >
          <motion.h1 
            variants={itemVariants}
            className="text-4xl sm:text-6xl font-black tracking-tight leading-[1.1] text-[#111111]"
          >
            <span className="text-[#B8FF33] bg-black px-4 py-1 rounded-2xl inline-block rotate-[-2deg] border-2 border-black shadow-[3px_3px_0px_rgba(0,0,0,1)] text-xl sm:text-3xl mb-3 mr-3 select-none">Search.</span>
            <span className="bg-[#B8FF33] text-black px-4 py-1 rounded-2xl inline-block rotate-[3deg] border-2 border-black shadow-[3px_3px_0px_rgba(0,0,0,1)] text-xl sm:text-3xl mb-3 mr-3 select-none">Sync.</span>
            <span className="bg-white text-black px-4 py-1 rounded-2xl inline-block rotate-[-1deg] border-2 border-black shadow-[3px_3px_0px_rgba(0,0,0,1)] text-xl sm:text-3xl mb-3 select-none">Reuse.</span>
            <span className="block mt-4 text-3xl sm:text-5xl font-black leading-none">Every ChatGPT, Claude, and Gemini conversation.</span>
          </motion.h1>
          
          <motion.p 
            variants={itemVariants}
            className="text-base sm:text-lg text-black/70 leading-relaxed max-w-xl"
          >
            Noetis runs quietly in the background, capturing prompts, system instructions, and code blocks across ChatGPT, Claude, and Gemini. It organizes everything locally into searchable timelines and portable Markdown profiles, so your next AI session starts with full context instead of a blank page.
          </motion.p>
          
          <motion.div 
            variants={itemVariants}
            className="flex flex-col sm:flex-row items-center gap-4"
          >
            <Link href="/" className="w-full sm:w-auto">
              <button 
                className="w-full sm:w-auto border-2 border-black bg-black text-white hover:bg-black/90 px-8 py-4 rounded-full font-bold text-sm tracking-wide transition-all flex items-center justify-center gap-2 shadow-md hover:-translate-y-0.5 hover:shadow-[3px_3px_0px_rgba(0,0,0,1)] active:translate-y-0"
              >
                Open Dashboard
              </button>
            </Link>
          </motion.div>

          <motion.div variants={itemVariants} className="pt-4 grid grid-cols-1 sm:grid-cols-3 gap-4 border-t border-black/10">
            <div className="text-xs font-semibold text-black/60">
              <span className="font-black text-black block mb-0.5">🔒 Local-first storage</span>
              SQLite or self-hosted Supabase instance.
            </div>
            <div className="text-xs font-semibold text-black/60">
              <span className="font-black text-black block mb-0.5">⚡ Zero-latency capture</span>
              Runs in an isolated Shadow DOM layer.
            </div>
            <div className="text-xs font-semibold text-black/60">
              <span className="font-black text-black block mb-0.5">💻 Built for developers</span>
              Native MCP server support for VS Code & Cursor.
            </div>
          </motion.div>
        </motion.div>
        
        {/* Right Side: Illustrated Abstract Megaphone / Data Funnel Graphic */}
        <motion.div 
          className="lg:col-span-5 flex justify-center relative"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          <div className="w-full max-w-[380px] h-[340px] border-2 border-black rounded-[24px] bg-white relative flex items-center justify-center p-8 shadow-[8px_8px_0px_rgba(0,0,0,1)]">
            <svg className="w-full h-full text-black" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
              {/* Funnel Rings */}
              <circle cx="100" cy="100" r="75" stroke="currentColor" strokeWidth="2.5" strokeDasharray="6 6" />
              <circle cx="100" cy="100" r="50" stroke="currentColor" strokeWidth="2.5" />
              {/* Accent colored solid megaphone shape */}
              <path d="M60 85 L120 60 L140 100 L120 140 L60 115 Z" fill="#B8FF33" stroke="currentColor" strokeWidth="2.5" />
              <path d="M50 95 H70 V105 H50 Z" fill="currentColor" />
              {/* Converging nodes */}
              <circle cx="100" cy="30" r="8" fill="currentColor" />
              <circle cx="160" cy="70" r="10" fill="#B8FF33" stroke="currentColor" strokeWidth="2" />
              <circle cx="150" cy="140" r="6" fill="currentColor" />
              <circle cx="45" cy="150" r="9" fill="#B8FF33" stroke="currentColor" strokeWidth="2" />
            </svg>
            <div className="absolute top-4 left-4 bg-[#B8FF33] border-2 border-black rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider shadow-[2px_2px_0px_rgba(0,0,0,1)]">
              Local First
            </div>
            <div className="absolute bottom-4 right-4 bg-black text-white border-2 border-black rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider">
              Secure
            </div>
          </div>
        </motion.div>
      </section>

      <ProviderMarquee />

      {/* 4. Capabilities Grid Section */}
      <section id="capabilities" className="max-w-7xl mx-auto px-6 sm:px-10 py-24">
        <div className="mb-16 space-y-4">
          <span className="inline-block bg-[#B8FF33] text-black border-2 border-black px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest shadow-[3px_3px_0px_rgba(0,0,0,1)]">
            Capabilities
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            Four systems keeping your AI workflow organized.
          </h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Card 1: Seamless Capture (White) */}
          <div className="border-2 border-black bg-white rounded-[20px] p-8 shadow-[6px_6px_0px_rgba(0,0,0,1)] flex flex-col justify-between min-h-[280px] hover:-translate-y-1 hover:shadow-[10px_10px_0px_rgba(0,0,0,1)] transition-all group hover:border-[#B8FF33]">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="bg-[#B8FF33] text-black text-[10px] font-extrabold uppercase px-3 py-1 rounded-full border border-black">
                  Browser Extension
                </span>
                {/* Custom SVG Icon */}
                <svg className="w-8 h-8 text-black" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="currentColor" strokeWidth="2.5" />
                  <path d="M8 12H16M12 8V16" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                </svg>
              </div>
              <h3 className="text-xl font-bold tracking-tight">Capture every AI conversation automatically</h3>
              <p className="text-sm text-black/70 leading-relaxed">
                No more copy-pasting chat transcripts into a notes app. The Noetis browser extension injects a lightweight capture layer into ChatGPT, Claude, Gemini, Perplexity, DeepSeek, and Grok. A background observer detects new messages as they render, extracts clean text and code blocks, and stores them locally — automatically, in real time.
              </p>
            </div>
            <div className="pt-6 flex justify-between items-center">
              <span className="text-[10px] font-black uppercase tracking-wider text-black/40">Manifest V3 · Real-Time Capture · 6 AI Providers</span>
              <button className="w-10 h-10 rounded-full bg-black text-white flex items-center justify-center group-hover:bg-[#B8FF33] group-hover:text-black transition-colors border border-black">
                <ArrowUpRight className="w-5 h-5 group-hover:rotate-45 transition-transform" />
              </button>
            </div>
          </div>

          {/* Card 2: Portable AI Personas (Black) */}
          <div className="border-2 border-black bg-black text-white rounded-[20px] p-8 shadow-[6px_6px_0px_rgba(0,0,0,1)] flex flex-col justify-between min-h-[280px] hover:-translate-y-1 hover:shadow-[10px_10px_0px_rgba(0,0,0,1)] transition-all group">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="bg-white text-black text-[10px] font-extrabold uppercase px-3 py-1 rounded-full border border-black">
                  Profiles
                </span>
                {/* Custom SVG Icon */}
                <svg className="w-8 h-8 text-white" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M4 8H20M4 16H20" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                  <circle cx="8" cy="8" r="3" fill="#B8FF33" stroke="currentColor" strokeWidth="2" />
                  <circle cx="16" cy="16" r="3" fill="#B8FF33" stroke="currentColor" strokeWidth="2" />
                </svg>
              </div>
              <h3 className="text-xl font-bold tracking-tight">Teach every AI model your preferences once</h3>
              <p className="text-sm text-white/70 leading-relaxed">
                Instead of repeating your coding style, tone, and constraints in every new chat, answer a short guided interview and Noetis compiles it into a single portable <code className="text-[#B8FF33]">AI_PROFILE.md</code> file. Drop it into Claude&apos;s custom instructions, Cursor&apos;s rules file, or any model&apos;s system prompt to get consistent, personalized output from the first message.
              </p>
            </div>
            <div className="pt-6 flex justify-between items-center">
              <span className="text-[10px] font-black uppercase tracking-wider text-white/40">Markdown profiles · Cross-model compatible · Reusable</span>
              <button className="w-10 h-10 rounded-full bg-white text-black flex items-center justify-center group-hover:bg-[#B8FF33] transition-colors border border-black">
                <ArrowUpRight className="w-5 h-5 group-hover:rotate-45 transition-transform" />
              </button>
            </div>
          </div>

          {/* Card 3: Timeline & Graphs (White) */}
          <div className="border-2 border-black bg-white rounded-[20px] p-8 shadow-[6px_6px_0px_rgba(0,0,0,1)] flex flex-col justify-between min-h-[280px] hover:-translate-y-1 hover:shadow-[10px_10px_0px_rgba(0,0,0,1)] transition-all group hover:border-[#B8FF33]">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="bg-[#B8FF33] text-black text-[10px] font-extrabold uppercase px-3 py-1 rounded-full border border-black">
                  Knowledge Graph
                </span>
                {/* Custom SVG Icon */}
                <svg className="w-8 h-8 text-black" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                  <path d="M22 22L16 16" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                  <circle cx="12" cy="12" r="3" fill="#B8FF33" stroke="currentColor" strokeWidth="2" />
                </svg>
              </div>
              <h3 className="text-xl font-bold tracking-tight">Find any past conversation in seconds</h3>
              <p className="text-sm text-black/70 leading-relaxed">
                Every captured conversation is grouped by topic using a local similarity-matching engine, so related chats — even from different AI models — surface together. A visual knowledge graph shows how your projects and ideas connect over time, and semantic search means you can find a conversation by describing what you remember, not just the exact title.
              </p>
            </div>
            <div className="pt-6 flex justify-between items-center">
              <span className="text-[10px] font-black uppercase tracking-wider text-black/40">Local search · Duplicate detection · Visual mapping</span>
              <button className="w-10 h-10 rounded-full bg-black text-white flex items-center justify-center group-hover:bg-[#B8FF33] group-hover:text-black transition-colors border border-black">
                <ArrowUpRight className="w-5 h-5 group-hover:rotate-45 transition-transform" />
              </button>
            </div>
          </div>

          {/* Card 4: Proxima Desktop Sync (Black) */}
          <div className="border-2 border-black bg-black text-white rounded-[20px] p-8 shadow-[6px_6px_0px_rgba(0,0,0,1)] flex flex-col justify-between min-h-[280px] hover:-translate-y-1 hover:shadow-[10px_10px_0px_rgba(0,0,0,1)] transition-all group">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="bg-white text-black text-[10px] font-extrabold uppercase px-3 py-1 rounded-full border border-black">
                  Desktop Gateway
                </span>
                {/* Custom SVG Icon */}
                <svg className="w-8 h-8 text-white" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                  <path d="M12 1V5" stroke="currentColor" strokeWidth="2.5" />
                  <path d="M12 19V23" stroke="currentColor" strokeWidth="2.5" />
                  <circle cx="12" cy="12" r="2" fill="#B8FF33" />
                </svg>
              </div>
              <h3 className="text-xl font-bold tracking-tight">Bring your AI history into your code editor</h3>
              <p className="text-sm text-white/70 leading-relaxed">
                Noetis runs an internal MCP (Model Context Protocol) server that connects directly to Cursor, VS Code, and other MCP-compatible editors. Your coding assistant can search and recall past conversations, past decisions, and past code without you switching tabs or copy-pasting.
              </p>
            </div>
            <div className="pt-6 flex justify-between items-center">
              <span className="text-[10px] font-black uppercase tracking-wider text-white/40">Built-in MCP server · Editor-native context</span>
              <button className="w-10 h-10 rounded-full bg-white text-black flex items-center justify-center group-hover:bg-[#B8FF33] transition-colors border border-black">
                <ArrowUpRight className="w-5 h-5 group-hover:rotate-45 transition-transform" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 5. "Let's make things happen" Band */}
      <section className="max-w-7xl mx-auto px-6 sm:px-10 py-12">
        <div className="bg-[#F0F0F0] border-2 border-black rounded-[24px] p-8 md:p-12 flex flex-col md:flex-row items-center justify-between gap-8 relative overflow-hidden shadow-[6px_6px_0px_rgba(0,0,0,1)]">
          <div className="space-y-4 max-w-xl z-10">
            <h3 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Let&apos;s make things happen</h3>
            <p className="text-sm text-black/70 leading-relaxed">
              Start centralizing your conversations today to build a persistent local knowledge base for your coding projects and terminal agents.
            </p>
            <button 
              onClick={onStart}
              className="bg-black text-white hover:bg-black/90 px-6 py-3.5 rounded-full font-bold text-xs tracking-wide transition-all shadow-sm border border-black"
            >
              Get Started Free
            </button>
          </div>
          
          {/* Abstract Star cluster illustration */}
          <div className="relative w-36 h-36 shrink-0 flex items-center justify-center">
            <svg className="w-full h-full text-black" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M50 15 L58 38 L81 38 L62 52 L70 75 L50 60 L30 75 L38 52 L19 38 L42 38 Z" fill="#B8FF33" stroke="currentColor" strokeWidth="2" />
              <circle cx="50" cy="50" r="10" fill="currentColor" />
            </svg>
          </div>
        </div>
      </section>

      {/* 6. How it works (Process Row) */}
      <section id="how-it-works" className="max-w-7xl mx-auto px-6 sm:px-10 py-24 bg-[#FAFAFA]">
        <div className="text-center max-w-xl mx-auto mb-16 space-y-4">
          <span className="inline-block bg-[#B8FF33] text-black border-2 border-black px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest shadow-[3px_3px_0px_rgba(0,0,0,1)]">
            Process
          </span>
          <h2 className="text-3xl font-extrabold tracking-tight">Three steps to organized knowledge.</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 max-w-4xl mx-auto">
          {/* Step 1 */}
          <div className="space-y-4 text-center">
            <div className="w-16 h-16 rounded-full border-2 border-black bg-white flex items-center justify-center text-xl font-black text-black mx-auto shadow-[4px_4px_0px_rgba(0,0,0,1)]">
              1
            </div>
            <h4 className="text-lg font-bold tracking-tight">Automatic, silent capture</h4>
            <p className="text-xs text-black/60 leading-relaxed max-w-xs mx-auto">
              Start chatting on ChatGPT, Claude, or Gemini as usual. Noetis detects the session, extracts the full conversation — including code blocks and referenced files — and stores it locally without any manual export step.
            </p>
          </div>

          {/* Step 2 */}
          <div className="space-y-4 text-center">
            <div className="w-16 h-16 rounded-full border-2 border-black bg-white flex items-center justify-center text-xl font-black text-black mx-auto shadow-[4px_4px_0px_rgba(0,0,0,1)]">
              2
            </div>
            <h4 className="text-lg font-bold tracking-tight">Turn raw chats into structured knowledge</h4>
            <p className="text-xs text-black/60 leading-relaxed max-w-xs mx-auto">
              Noetis parses each conversation for reusable information: libraries used, decisions made, problems solved. This gets grouped into project-level memory so related work stays connected, even across different AI tools.
            </p>
          </div>

          {/* Step 3 */}
          <div className="space-y-4 text-center">
            <div className="w-16 h-16 rounded-full border-2 border-black bg-white flex items-center justify-center text-xl font-black text-black mx-auto shadow-[4px_4px_0px_rgba(0,0,0,1)]">
              3
            </div>
            <h4 className="text-lg font-bold tracking-tight">Bring context into every new session</h4>
            <p className="text-xs text-black/60 leading-relaxed max-w-xs mx-auto">
              Load your saved profile into a new chat, or let your code editor query your history directly through the MCP server. Either way, you stop repeating yourself and start where you left off.
            </p>
          </div>
        </div>
      </section>

      {/* 7. Use Cases / Case Studies */}
      <section id="use-cases" className="max-w-7xl mx-auto px-6 sm:px-10 py-24 border-t border-black/10">
        <div className="mb-16 space-y-4">
          <span className="inline-block bg-[#B8FF33] text-black border-2 border-black px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest shadow-[3px_3px_0px_rgba(0,0,0,1)]">
            Use Cases
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            Real workflows built on centralized AI context.
          </h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Use Case 1 */}
          <div className="border-2 border-black bg-black text-white rounded-[20px] p-6 shadow-[6px_6px_0px_rgba(0,0,0,1)] flex flex-col justify-between min-h-[240px]">
            <div className="space-y-3">
              <span className="text-[10px] font-black uppercase tracking-widest text-[#B8FF33] block">The Multi-Model Developer</span>
              <p className="text-xs font-bold text-white/50 leading-relaxed">
                <strong className="text-white block mb-1">Problem:</strong> Using Claude for coding, ChatGPT for brainstorming, and Gemini for long documents means your project context is split across three separate histories.
              </p>
              <p className="text-xs font-bold text-white/80 leading-relaxed">
                <strong className="text-[#B8FF33] block mb-1">How Noetis helps:</strong> All three streams merge into one timeline. When Claude writes a component and ChatGPT drafts the copy for it, Noetis links them under the same project, so you can search across every model at once.
              </p>
            </div>
            <div className="pt-4">
              <Link href="/recovery" className="text-xs font-black text-[#B8FF33] hover:underline uppercase tracking-wider flex items-center gap-1.5">
                Learn more
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* Use Case 2 */}
          <div className="border-2 border-black bg-black text-white rounded-[20px] p-6 shadow-[6px_6px_0px_rgba(0,0,0,1)] flex flex-col justify-between min-h-[240px]">
            <div className="space-y-3">
              <span className="text-[10px] font-black uppercase tracking-widest text-[#B8FF33] block">The Freelancer Juggling Multiple Clients</span>
              <p className="text-xs font-bold text-white/50 leading-relaxed">
                <strong className="text-white block mb-1">Problem:</strong> You agreed on a styling convention or API structure in an AI chat last week, and now you can&apos;t remember which conversation it was in.
              </p>
              <p className="text-xs font-bold text-white/80 leading-relaxed">
                <strong className="text-[#B8FF33] block mb-1">How Noetis helps:</strong> Use natural-language search to describe what you remember — for example, &quot;tailwind button styles&quot; — and Noetis surfaces the matching conversation and code block instantly.
              </p>
            </div>
            <div className="pt-4">
              <Link href="/recovery" className="text-xs font-black text-[#B8FF33] hover:underline uppercase tracking-wider flex items-center gap-1.5">
                Learn more
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* Use Case 3 */}
          <div className="border-2 border-black bg-black text-white rounded-[20px] p-6 shadow-[6px_6px_0px_rgba(0,0,0,1)] flex flex-col justify-between min-h-[240px]">
            <div className="space-y-3">
              <span className="text-[10px] font-black uppercase tracking-widest text-[#B8FF33] block">The AI-Assisted Engineering Team</span>
              <p className="text-xs font-bold text-white/50 leading-relaxed">
                <strong className="text-white block mb-1">Problem:</strong> A teammate&apos;s AI-assisted decisions from a browser chat never make it into the codebase&apos;s shared context.
              </p>
              <p className="text-xs font-bold text-white/80 leading-relaxed">
                <strong className="text-[#B8FF33] block mb-1">How Noetis helps:</strong> Through the MCP server, any team member&apos;s AI-enabled editor can query the shared conversation history, keeping architectural decisions and conventions consistent across the team.
              </p>
            </div>
            <div className="pt-4">
              <Link href="/recovery" className="text-xs font-black text-[#B8FF33] hover:underline uppercase tracking-wider flex items-center gap-1.5">
                Learn more
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 8. Comparison Table Section */}
      <section className="max-w-7xl mx-auto px-6 sm:px-10 py-24 border-t border-black/10 bg-white">
        <div className="mb-16 space-y-4">
          <span className="inline-block bg-[#B8FF33] text-black border-2 border-black px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest shadow-[3px_3px_0px_rgba(0,0,0,1)]">
            Comparison
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#111111]">
            Noetis vs. Manual Methods
          </h2>
          <p className="text-sm text-black/60 max-w-xl">
            See how a dedicated local AI conversation manager compares to traditional approaches.
          </p>
        </div>

        <div className="overflow-x-auto rounded-[20px] border-2 border-black shadow-[6px_6px_0px_rgba(0,0,0,1)]">
          <table className="w-full border-collapse text-left text-xs bg-white">
            <thead>
              <tr className="border-b-2 border-black bg-[#B8FF33] text-black font-black uppercase tracking-wider">
                <th className="p-4 sm:p-5 border-r border-black">Capability</th>
                <th className="p-4 sm:p-5 border-r border-black">Manual Copy-Paste</th>
                <th className="p-4 sm:p-5 border-r border-black">Browser History</th>
                <th className="p-4 sm:p-5">Noetis</th>
              </tr>
            </thead>
            <tbody className="divide-y border-black font-bold text-black/75">
              <tr className="border-b border-black/15">
                <td className="p-4 sm:p-5 border-r border-black/15 font-black uppercase tracking-wide text-black">Multi-Model Search</td>
                <td className="p-4 sm:p-5 border-r border-black/15 text-black/40">Not possible</td>
                <td className="p-4 sm:p-5 border-r border-black/15 text-black/40">Model-locked only</td>
                <td className="p-4 sm:p-5 bg-[#B8FF33]/5 text-black font-black">Unified search across all providers</td>
              </tr>
              <tr className="border-b border-black/15">
                <td className="p-4 sm:p-5 border-r border-black/15 font-black uppercase tracking-wide text-black">Automatic Context Extraction</td>
                <td className="p-4 sm:p-5 border-r border-black/15 text-black/40">Not available</td>
                <td className="p-4 sm:p-5 border-r border-black/15 text-black/40">Not available</td>
                <td className="p-4 sm:p-5 bg-[#B8FF33]/5 text-black font-black">Automatic, structured by project</td>
              </tr>
              <tr className="border-b border-black/15">
                <td className="p-4 sm:p-5 border-r border-black/15 font-black uppercase tracking-wide text-black">Data Storage location</td>
                <td className="p-4 sm:p-5 border-r border-black/15 text-black/40">Not applicable</td>
                <td className="p-4 sm:p-5 border-r border-black/15 text-black/40">Not applicable</td>
                <td className="p-4 sm:p-5 bg-[#B8FF33]/5 text-black font-black">Fully local-first storage</td>
              </tr>
              <tr className="border-b border-black/15">
                <td className="p-4 sm:p-5 border-r border-black/15 font-black uppercase tracking-wide text-black">IDE Editor Integration</td>
                <td className="p-4 sm:p-5 border-r border-black/15 text-black/40">Not available</td>
                <td className="p-4 sm:p-5 border-r border-black/15 text-black/40">Not available</td>
                <td className="p-4 sm:p-5 bg-[#B8FF33]/5 text-black font-black">Native MCP server support</td>
              </tr>
              <tr className="border-b border-black/15">
                <td className="p-4 sm:p-5 border-r border-black/15 font-black uppercase tracking-wide text-black">Portable AI Persona Profiles</td>
                <td className="p-4 sm:p-5 border-r border-black/15 text-black/40">Not available</td>
                <td className="p-4 sm:p-5 border-r border-black/15 text-black/40">Not available</td>
                <td className="p-4 sm:p-5 bg-[#B8FF33]/5 text-black font-black">Generates a reusable AI_PROFILE.md</td>
              </tr>
              <tr>
                <td className="p-4 sm:p-5 border-r border-black/15 font-black uppercase tracking-wide text-black">Data Privacy</td>
                <td className="p-4 sm:p-5 border-r border-black/15 text-black/40">Depends on destination</td>
                <td className="p-4 sm:p-5 border-r border-black/15 text-black/40">Tied to browser vendor</td>
                <td className="p-4 sm:p-5 bg-[#B8FF33]/5 text-black font-black">Local-only, no cloud tracking</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Extension Installation Guide */}
      <section className="max-w-4xl mx-auto px-6 sm:px-10 py-16 border-t border-black/10">
        <div className="text-center mb-12 space-y-4">
          <span className="inline-block bg-[#B8FF33] text-black border-2 border-black px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest shadow-[3px_3px_0px_rgba(0,0,0,1)]">
            Setup Guide
          </span>
          <h2 className="text-3xl font-extrabold tracking-tight text-[#111111]">
            How to Install & Use the Extension
          </h2>
          <p className="text-sm text-black/70 max-w-lg mx-auto">
            Get started by installing the Noetis browser extension to automatically capture all your conversations with user queries and assistant responses.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center border-2 border-black rounded-2xl p-8 bg-white shadow-[6px_6px_0px_rgba(0,0,0,1)]">
          <div className="space-y-6">
            <div className="flex gap-4">
              <div className="w-8 h-8 shrink-0 rounded-full border-2 border-black bg-[#B8FF33] flex items-center justify-center font-black text-sm">1</div>
              <div>
                <h4 className="font-bold text-sm text-black mb-1">Download & Extract</h4>
                <p className="text-xs text-black/60 leading-relaxed">
                  Download the extension package below and unzip the archive on your local machine.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="w-8 h-8 shrink-0 rounded-full border-2 border-black bg-[#B8FF33] flex items-center justify-center font-black text-sm">2</div>
              <div>
                <h4 className="font-bold text-sm text-black mb-1">Load into Chrome</h4>
                <p className="text-xs text-black/60 leading-relaxed">
                  Navigate to <code className="bg-black/5 px-1 py-0.5 rounded font-mono text-[11px]">chrome://extensions/</code>, enable <strong>Developer mode</strong> (top right), and click <strong>Load unpacked</strong> (top left). Select the extracted folder.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="w-8 h-8 shrink-0 rounded-full border-2 border-black bg-[#B8FF33] flex items-center justify-center font-black text-sm">3</div>
              <div>
                <h4 className="font-bold text-sm text-black mb-1">Start Capturing</h4>
                <p className="text-xs text-black/60 leading-relaxed">
                  Open ChatGPT, Claude, or Perplexity. The floating Noetis widget will capture both your inputs and the LLM&apos;s responses, streaming them straight to your local dashboard.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-black/20 rounded-xl bg-[#FAFAFA] text-center">
            <svg className="w-12 h-12 text-black/60 mb-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="4" y="4" width="16" height="16" rx="3" stroke="currentColor" strokeWidth="2" strokeDasharray="4 4" />
              <path d="M12 8V16M8 12L12 16L16 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <h5 className="font-extrabold text-sm text-black mb-2">Extension Package Ready</h5>
            <p className="text-[11px] text-black/50 leading-relaxed mb-6 max-w-xs">
              Includes real-time conversation parsers, MV3 service workers, and local host synchronization.
            </p>
            <a href="/extension.zip" download="noetis-extension.zip" className="w-full">
              <Button className="w-full bg-[#B8FF33] hover:bg-[#B8FF33]/90 text-black border-2 border-black shadow-[3px_3px_0px_rgba(0,0,0,1)] py-3 font-black text-xs uppercase tracking-wider">
                Download Extension .zip
              </Button>
            </a>
          </div>
        </div>
      </section>

      {/* 9. FAQ Section */}
      <section className="max-w-4xl mx-auto px-6 sm:px-10 py-24 border-t border-black/10">
        <div className="text-center mb-16 space-y-4">
          <span className="inline-block bg-[#B8FF33] text-black border-2 border-black px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest shadow-[3px_3px_0px_rgba(0,0,0,1)]">
            FAQ
          </span>
          <h2 className="text-3xl font-extrabold tracking-tight text-[#111111]">
            Frequently Asked Questions
          </h2>
        </div>

        <div className="space-y-6">
          <div className="border-2 border-black rounded-2xl p-6 bg-white shadow-[3px_3px_0px_rgba(0,0,0,1)]">
            <h4 className="text-sm font-black uppercase tracking-wide text-black mb-2">Does Noetis need API keys to capture conversations?</h4>
            <p className="text-xs font-semibold leading-relaxed text-black/60">
              No. Noetis captures conversations directly from the browser interface using a lightweight observer, so there&apos;s no API key setup and no risk of hitting provider rate limits.
            </p>
          </div>

          <div className="border-2 border-black rounded-2xl p-6 bg-white shadow-[3px_3px_0px_rgba(0,0,0,1)]">
            <h4 className="text-sm font-black uppercase tracking-wide text-black mb-2">Is my conversation data sent to Noetis&apos;s servers?</h4>
            <p className="text-xs font-semibold leading-relaxed text-black/60">
              No. Noetis is local-first by design. Conversations, summaries, and generated profiles are stored in a local database on your machine or your own Supabase instance — never on a third-party cloud service you don&apos;t control.
            </p>
          </div>

          <div className="border-2 border-black rounded-2xl p-6 bg-white shadow-[3px_3px_0px_rgba(0,0,0,1)]">
            <h4 className="text-sm font-black uppercase tracking-wide text-black mb-2">Which AI platforms does Noetis support?</h4>
            <p className="text-xs font-semibold leading-relaxed text-black/60">
              Noetis currently supports ChatGPT, Claude, Gemini, Perplexity, DeepSeek, and Grok, with high-precision capture on ChatGPT and Claude.
            </p>
          </div>

          <div className="border-2 border-black rounded-2xl p-6 bg-white shadow-[3px_3px_0px_rgba(0,0,0,1)]">
            <h4 className="text-sm font-black uppercase tracking-wide text-black mb-2">What is an MCP server, and why does it matter?</h4>
            <p className="text-xs font-semibold leading-relaxed text-black/60">
              Model Context Protocol (MCP) is an open standard that lets AI-enabled applications securely read data from local tools. Noetis includes an internal MCP server so editors like Cursor and VS Code can search and reference your past AI conversations directly, without leaving the editor.
            </p>
          </div>

          <div className="border-2 border-black rounded-2xl p-6 bg-white shadow-[3px_3px_0px_rgba(0,0,0,1)]">
            <h4 className="text-sm font-black uppercase tracking-wide text-black mb-2">Do I need to install anything extra to use the MCP server?</h4>
            <p className="text-xs font-semibold leading-relaxed text-black/60">
              No. The internal MCP server is built into Noetis and runs alongside the browser extension and web dashboard. Once enabled, any MCP-compatible editor can connect to it directly — no separate desktop app required.
            </p>
          </div>
        </div>
      </section>

      {/* 10. Persona Quick selection block (if any saved) */}
      {personas.length > 0 && (
        <section className="max-w-7xl mx-auto px-6 sm:px-10 pb-24">
          <div className="border-t border-black/10 pt-16 mb-8 flex items-center justify-between">
            <h3 className="text-xl font-bold tracking-tight">Resume Saved Personas</h3>
            <Link href="/personas" className="text-xs font-bold hover:underline">
              View All Personas
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {personas.slice(0, 3).map((persona) => (
              <button
                key={persona.id}
                onClick={() => onUsePersona(persona)}
                className="p-5 text-left border-2 border-black rounded-xl bg-white shadow-[4px_4px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 transition-all flex items-center justify-between group"
              >
                <div>
                  <div className="font-extrabold text-sm text-black mb-0.5">{persona.name}</div>
                  <div className="text-[10px] text-black/50 font-mono">ID: {persona.id.slice(0, 8)}</div>
                </div>
                <ArrowUpRight className="w-4 h-4 text-black/40 group-hover:text-black transition-colors" />
              </button>
            ))}
          </div>
        </section>
      )}

      {/* 11. Footer */}
      <footer className="w-full bg-[#111111] text-white/60 py-16 border-t border-black/20 text-xs font-medium">
        <div className="max-w-7xl mx-auto px-6 sm:px-10 flex flex-col md:flex-row items-center justify-between gap-8">
          <div>
            <div className="flex items-center gap-2 text-white font-extrabold tracking-tight text-sm mb-2">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="3" y="3" width="18" height="18" rx="4" stroke="currentColor" strokeWidth="2.5" />
              </svg>
              <span>Noetis</span>
            </div>
            <p className="text-white/40">Local-first conversation capture and AI profile manager.</p>
          </div>
          <div className="flex gap-8 text-white/80">
            <Link href="/recovery" className="hover:text-[#B8FF33] transition-colors">Dashboard</Link>
            <Link href="/personas" className="hover:text-[#B8FF33] transition-colors">Personas</Link>
            <Link href="/skills" className="hover:text-[#B8FF33] transition-colors">Skills</Link>
          </div>
        </div>
      </footer>

    </div>
  );
}

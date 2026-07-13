"use client";

import { Sparkles, User, Briefcase, Database } from "lucide-react";
import { GlassPanel } from "@/components/glass-panel";

interface ProductivityDashboardProps {
  stats: {
    recoveredConversations: number;
    activePersonas: number;
    activeSkills: number;
    extractedFacts: number;
  };
}

import { motion } from "framer-motion";

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08
    }
  }
};

const cardVariants = {
  hidden: { opacity: 0, y: 15 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 100 } }
};

export function ProductivityDashboard({ stats }: ProductivityDashboardProps) {
  const items = [
    { icon: Sparkles, label: "Recovered Conversations", value: stats.recoveredConversations, color: "bg-[#B8FF33]" },
    { icon: User, label: "Active Personas (.md)", value: stats.activePersonas, color: "bg-[#E9D5FF]" },
    { icon: Briefcase, label: "Project Contexts (.md)", value: stats.activeSkills, color: "bg-[#FED7AA]" },
    { icon: Database, label: "Extracted Facts", value: stats.extractedFacts, color: "bg-[#99F6E4]" },
  ];

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
    >
      {items.map((item) => (
        <motion.div
          key={item.label}
          variants={cardVariants}
          className="flex flex-row items-center gap-4 p-4 bg-white border-2 border-black rounded-2xl shadow-[4px_4px_0px_rgba(0,0,0,1)] hover:-translate-y-1 hover:shadow-[6px_6px_0px_rgba(0,0,0,1)] transition-all duration-200 cursor-default"
        >
          <div className={`w-9 h-9 rounded-full flex items-center justify-center border-2 border-black ${item.color} shadow-[1px_1px_0px_rgba(0,0,0,1)]`}>
            <item.icon className="h-4 w-4 text-black" strokeWidth={2.5} />
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-2xl font-black text-black leading-none">{item.value}</span>
            <span className="text-[10px] font-black uppercase tracking-widest text-black/50 leading-tight">{item.label}</span>
          </div>
        </motion.div>
      ))}
    </motion.div>
  );
}

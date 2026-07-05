import type { Platform } from "@/types/recovery";
import {
  Bot,
  Braces,
  Compass,
  FileText,
  Feather,
  Gem,
  Sparkles,
  Terminal,
  Wind,
  Zap,
} from "lucide-react";

export const PLATFORM_META: Record<
  Platform,
  { icon: typeof Bot; color: string }
> = {
  ChatGPT: { icon: Sparkles, color: "#10A37F" },
  Claude: { icon: Feather, color: "#D97757" },
  Gemini: { icon: Gem, color: "#4285F4" },
  Grok: { icon: Zap, color: "#000000" },
  DeepSeek: { icon: Compass, color: "#4D6BFE" },
  Perplexity: { icon: Bot, color: "#20808D" },
  Llama: { icon: Bot, color: "#6D4AFF" },
  Cursor: { icon: Terminal, color: "#111111" },
  Windsurf: { icon: Wind, color: "#00B4D8" },
  Markdown: { icon: FileText, color: "#6E6E73" },
  JSON: { icon: Braces, color: "#6E6E73" },
  PlainText: { icon: FileText, color: "#6E6E73" },
};

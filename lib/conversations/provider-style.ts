// One color per provider, shared between the Conversations list, Timeline,
// and Knowledge Graph so a given provider always reads the same way.
export const PROVIDER_COLORS: Record<string, string> = {
  chatgpt: "#10a37f", // OpenAI green
  claude: "#d97757", // Anthropic orange
  gemini: "#4285f4", // Google blue
  grok: "#8b5cf6", // violet (no single obvious xAI brand color to borrow)
  perplexity: "#20808d", // teal
  other: "#9a9a9e", // neutral gray
};

export const PROVIDER_LABEL: Record<string, string> = {
  chatgpt: "ChatGPT",
  claude: "Claude",
  gemini: "Gemini",
  grok: "Grok",
  perplexity: "Perplexity",
  other: "Other",
};

export function providerColor(provider: string): string {
  return PROVIDER_COLORS[provider] ?? PROVIDER_COLORS.other;
}

export function providerLabel(provider: string): string {
  return PROVIDER_LABEL[provider] ?? provider;
}

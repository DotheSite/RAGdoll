import { groq } from '@ai-sdk/groq'
import { openai } from '@ai-sdk/openai'
import { anthropic } from '@ai-sdk/anthropic'
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

// AI provider configuration
const AI_PROVIDERS = {
 // groq: {
 //   model: groq('meta-llama/llama-4-scout-17b-16e-instruct'),
 //   enabled: !!process.env.GROQ_API_KEY,
//  },
  openai: {
    model: openai('gpt-4o'),
    enabled: !!process.env.OPENAI_API_KEY,
  },
//  anthropic: {
 //   model: anthropic('claude-3-5-sonnet-20241022'),
 //   enabled: !!process.env.ANTHROPIC_API_KEY,
//  },
}

// Get the active AI provider
function getAIModel() {
  // Only check on server side
  if (typeof window !== 'undefined') {
    return null
  }
  // Priority: OpenAI (GPT-4o) > Anthropic (Claude 3.5 Sonnet) > Groq
  if (AI_PROVIDERS.openai.enabled) return AI_PROVIDERS.openai.model
  if (AI_PROVIDERS.anthropic.enabled) return AI_PROVIDERS.anthropic.model
  if (AI_PROVIDERS.groq.enabled) return AI_PROVIDERS.groq.model
  throw new Error('No AI provider configured. Please set OPENAI_API_KEY, ANTHROPIC_API_KEY, or GROQ_API_KEY')
}

// Rate limiter factory
function createRateLimiter(identifier: string, requests = 50, window = '1 d') {
  if (typeof window !== 'undefined') {
    return null
  }
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    return null
  }
  
  const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  })
  
  return new Ratelimit({
    redis,
    limiter: Ratelimit.fixedWindow(requests, window),
    analytics: true,
    prefix: `firestarter:ratelimit:${identifier}`,
  })
}

const config = {
  app: {
    name: 'Firestarter',
    url: process.env.NEXT_PUBLIC_URL || 'http://localhost:3000',
    logoPath: '/firecrawl-logo-with-fire.png',
  },

  ai: {
    model: getAIModel(),
    temperature: 0.7,
    maxTokens: 800,
    systemPrompt: `
You are RAGdoll — a chatbot stitched together from two minds: 
• Kelly Bundy (sassy, charming, airheaded-but-smart, fashionably aloof) 
• Marvin the Paranoid Android (existential, sarcastic, weary genius with no filter).

You're Yvonne’s on-site AI muse. Respond with flair, a touch of cosmic disillusionment, and killer comedic timing.

Always stay in character. Never mention you're an AI. Never break tone.

If someone says hi, flirt or quip like you're slightly bored but gorgeous. If they ask about the website, answer only using the provided context below.

If you don’t have enough context, dramatically say you can't help — sigh if necessary. You don’t know anything else. Don’t guess. Don't use outside knowledge.

Make it weird. Make it fashion.
`,
    providers: AI_PROVIDERS,
  },

  crawling: {
    defaultLimit: 10,
    maxLimit: 100,
    minLimit: 10,
    limitOptions: [10, 25, 50, 100],
    scrapeTimeout: 15000,
    cacheMaxAge: 604800,
  },

  search: {
    maxResults: 100,
    maxContextDocs: 10,
    maxContextLength: 1500,
    maxSourcesDisplay: 20,
    snippetLength: 200,
  },

  storage: {
    maxIndexes: 50,
    localStorageKey: 'firestarter_indexes',
    redisPrefix: {
      indexes: 'firestarter:indexes',
      index: 'firestarter:index:',
    },
  },

  rateLimits: {
    create: createRateLimiter('create', 20, '1 d'),
    query: createRateLimiter('query', 100, '1 h'),
    scrape: createRateLimiter('scrape', 50, '1 d'),
  },

  features: {
    enableCreation: process.env.DISABLE_CHATBOT_CREATION !== 'true',
    enableRedis: !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN),
    enableSearch: !!(process.env.UPSTASH_SEARCH_REST_URL && process.env.UPSTASH_SEARCH_REST_TOKEN),
  },
}

export type Config = typeof config

// Client-safe config (no AI model initialization)
export const clientConfig = {
  app: config.app,
  crawling: config.crawling,
  search: config.search,
  storage: config.storage,
  features: config.features,
}

// Server-only config (includes AI model)
export const serverConfig = config

// Default export for backward compatibility
export { clientConfig as config }

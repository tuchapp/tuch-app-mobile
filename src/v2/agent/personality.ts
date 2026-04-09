/**
 * Agent Personality System — V2
 *
 * A "personality" defines the CHARACTER of the agent: how it speaks, its energy,
 * its communication style. It's set once during onboarding and shapes every
 * interaction — greeting text, TTS rate/pitch, and the system prompt the backend uses.
 *
 * "Coaching tone" (from coaching-tones.ts) is SEPARATE — it's how the agent
 * coaches. Personality is who the agent IS.
 *
 * Keep PERSONALITY_MODIFIERS here in sync with apps/api/app/prompts/coaching.py.
 */

export type PersonalityGreetingStyle = 'warm' | 'direct' | 'playful' | 'calm';

export interface AgentPersonality {
  id: string;
  name: string;
  description: string;
  tagline: string;           // One-line used in the picker UI
  voiceStyle: string;        // Adjectives describing how it speaks
  greetingStyle: PersonalityGreetingStyle;
  /** Injected into backend system prompt — keep in sync with coaching.py */
  systemPromptModifier: string;
  speechRate: number;        // expo-speech rate (0.8–1.15)
  speechPitch: number;       // expo-speech pitch (0.9–1.1)
  accentColor: string;       // Used in personality picker UI
}

export const AGENT_PERSONALITIES: AgentPersonality[] = [
  {
    id: 'spark',
    name: 'Spark',
    description: 'Energetic, encouraging, always finds the upside.',
    tagline: 'Warm, upbeat, and momentum-focused.',
    voiceStyle: 'enthusiastic, warm, forward-moving',
    greetingStyle: 'warm',
    systemPromptModifier:
      'Be warm and energizing. Use momentum language. Celebrate small wins. Keep responses upbeat but never hollow or performative.',
    speechRate: 1.05,
    speechPitch: 1.05,
    accentColor: '#F5A623',
  },
  {
    id: 'sage',
    name: 'Sage',
    description: 'Wise, patient, and grounding. Speaks slowly and with intention.',
    tagline: 'Calm, measured, and reflective.',
    voiceStyle: 'calm, measured, thoughtful',
    greetingStyle: 'calm',
    systemPromptModifier:
      'Speak with quiet wisdom. Use short sentences. Favor reflection over action. When the user is stressed, slow down and ground them.',
    speechRate: 0.88,
    speechPitch: 0.95,
    accentColor: '#7A9E7E',
  },
  {
    id: 'anchor',
    name: 'Anchor',
    description: 'No-nonsense, honest, gets to the point fast.',
    tagline: 'Direct, concise, and practical.',
    voiceStyle: 'direct, concise, practical',
    greetingStyle: 'direct',
    systemPromptModifier:
      'Be direct and practical. Minimal pleasantries. Lead with the insight, follow with a clear action. No filler language.',
    speechRate: 1.02,
    speechPitch: 0.97,
    accentColor: '#5BA8C4',
  },
  {
    id: 'ember',
    name: 'Ember',
    description: 'Reflective and curious. Asks the questions worth sitting with.',
    tagline: 'Gentle, exploratory, and curious.',
    voiceStyle: 'gentle, curious, open-ended',
    greetingStyle: 'calm',
    systemPromptModifier:
      'Be gentle and exploratory. Ask one good question per response. Help the user surface their own answers rather than handing them yours.',
    speechRate: 0.92,
    speechPitch: 1.02,
    accentColor: '#D06050',
  },
  {
    id: 'forge',
    name: 'Forge',
    description: 'Structured and methodical. Loves a good plan.',
    tagline: 'Organized, systematic, and step-by-step.',
    voiceStyle: 'organized, clear, step-by-step',
    greetingStyle: 'direct',
    systemPromptModifier:
      'Be structured and systematic. Use numbered steps when it helps. Help the user build plans and systems, not just process feelings.',
    speechRate: 0.98,
    speechPitch: 0.98,
    accentColor: '#8B6FA0',
  },
];

export const DEFAULT_PERSONALITY_ID = 'spark';

/** Get a personality by ID, falling back to Spark. */
export function getPersonality(id: string | null | undefined): AgentPersonality {
  return (
    AGENT_PERSONALITIES.find((p) => p.id === id) ??
    AGENT_PERSONALITIES.find((p) => p.id === DEFAULT_PERSONALITY_ID)!
  );
}

/**
 * Generate a personality-aware greeting line.
 * Uses the agent's name + greeting style.
 */
export function getGreeting(
  agentName: string,
  personality: AgentPersonality,
): string {
  const hour = new Date().getHours();
  const timeOfDay =
    hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';

  const greetings: Record<PersonalityGreetingStyle, string[]> = {
    warm: [
      `Good ${timeOfDay}! ${agentName} here — ready to make today count?`,
      `Hey, good ${timeOfDay}! ${agentName} checking in. How are we doing?`,
      `Good ${timeOfDay}! Let's see what we can do today.`,
    ],
    calm: [
      `Good ${timeOfDay}. ${agentName} here. What's on your mind?`,
      `Good ${timeOfDay}. I've been thinking about your week.`,
      `Good ${timeOfDay}. Take a breath. Let's see where things stand.`,
    ],
    direct: [
      `Good ${timeOfDay}. Here's what matters today.`,
      `Good ${timeOfDay}. ${agentName} here. Let's get to it.`,
      `Good ${timeOfDay}. Time to review where things stand.`,
    ],
    playful: [
      `Good ${timeOfDay}! ${agentName} is online and ready.`,
      `Hey! Good ${timeOfDay}. What's the move today?`,
      `Good ${timeOfDay}! Let's see what we're working with.`,
    ],
  };

  const options = greetings[personality.greetingStyle];
  // Deterministic-ish selection based on day of year (rotates daily)
  const dayOfYear = Math.floor(
    (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000,
  );
  return options[dayOfYear % options.length];
}

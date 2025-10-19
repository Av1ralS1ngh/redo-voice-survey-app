/**
 * AI Demo Personas - Three distinct participant types
 * Ideal, Typical (not-so-ideal), and Difficult
 */

import { Persona } from './types';

export const PERSONAS: Record<string, Persona> = {
  ideal: {
    id: 'ideal',
    name: 'Ideal Participant',
    description: 'Engaged, articulate, and cooperative participant who understands questions and provides thoughtful responses',
    traits: [
      'Highly attentive',
      'Thoughtful responses',
      'Asks for clarification when needed',
      'Stays on topic',
      'Patient and cooperative'
    ],
    behaviorModel: {
      comprehension: 'high',
      cooperativeness: 95,
      tangentRate: 0.05, // 5% chance of mild tangent
      fatigueRate: 0.02, // minimal fatigue
      frustrationThreshold: 90,
      clarificationLikelihood: 0.3 // asks when genuinely confused
    },
    responsePatterns: {
      averageWordCount: 80,
      detailLevel: 'high',
      responseTime: 15 // seconds per response
    }
  },

  typical: {
    id: 'typical',
    name: 'Typical Participant',
    description: 'Average participant with occasional comprehension issues, some tangents, and varying detail levels',
    traits: [
      'Moderately engaged',
      'Sometimes misunderstands',
      'Occasional tangents',
      'Variable response quality',
      'Mild fatigue over time'
    ],
    behaviorModel: {
      comprehension: 'medium',
      cooperativeness: 70,
      tangentRate: 0.25, // 25% chance of tangent
      fatigueRate: 0.08, // noticeable fatigue
      frustrationThreshold: 60,
      clarificationLikelihood: 0.15 // sometimes confused but doesn't always ask
    },
    responsePatterns: {
      averageWordCount: 45,
      detailLevel: 'medium',
      responseTime: 12
    }
  },

  difficult: {
    id: 'difficult',
    name: 'Difficult Participant',
    description: 'Challenging participant who may misunderstand, go off-topic, become frustrated, or be uncooperative',
    traits: [
      'Easily distracted',
      'Frequent misunderstandings',
      'Goes off-topic frequently',
      'Short responses',
      'Gets frustrated easily',
      'May use profanity or refuse questions'
    ],
    behaviorModel: {
      comprehension: 'low',
      cooperativeness: 40,
      tangentRate: 0.5, // 50% chance of tangent
      fatigueRate: 0.15, // high fatigue
      frustrationThreshold: 30,
      clarificationLikelihood: 0.05 // rarely asks for help, just guesses
    },
    responsePatterns: {
      averageWordCount: 25,
      detailLevel: 'low',
      responseTime: 8
    }
  }
};

/**
 * Get persona by ID with type safety
 */
export function getPersona(id: string): Persona {
  const persona = PERSONAS[id];
  if (!persona) {
    throw new Error(`Persona not found: ${id}`);
  }
  return persona;
}

/**
 * Get all personas
 */
export function getAllPersonas(): Persona[] {
  return Object.values(PERSONAS);
}


/**
 * Rate Limiter for AI Demo Generation
 * Simple in-memory rate limiting for demo feature
 * 
 * Since product is not charging customers yet, we'll use generous limits
 * to prevent abuse while allowing adequate testing
 */

interface RateLimitEntry {
  count: number;
  resetAt: number; // timestamp
}

// In-memory store (will reset on server restart - fine for demo)
const rateLimitStore = new Map<string, RateLimitEntry>();

// Configuration
const RATE_LIMIT_CONFIG = {
  // Per project limits
  maxDemosPerProject: 10, // 10 demos per project per day
  projectWindowMs: 24 * 60 * 60 * 1000, // 24 hours

  // Global limits (to prevent abuse)
  maxDemosPerHour: 50, // 50 demos total per hour
  globalWindowMs: 60 * 60 * 1000, // 1 hour
};

/**
 * Check if a demo generation request should be allowed
 */
export function checkRateLimit(projectId: string): {
  allowed: boolean;
  reason?: string;
  resetAt?: number;
} {
  const now = Date.now();

  // Check project-level limit
  const projectKey = `project:${projectId}`;
  const projectEntry = rateLimitStore.get(projectKey);

  if (projectEntry) {
    if (now < projectEntry.resetAt) {
      if (projectEntry.count >= RATE_LIMIT_CONFIG.maxDemosPerProject) {
        return {
          allowed: false,
          reason: `Project limit reached: ${RATE_LIMIT_CONFIG.maxDemosPerProject} demos per 24 hours`,
          resetAt: projectEntry.resetAt
        };
      }
    } else {
      // Window expired, reset
      rateLimitStore.delete(projectKey);
    }
  }

  // Check global limit
  const globalKey = 'global:demos';
  const globalEntry = rateLimitStore.get(globalKey);

  if (globalEntry) {
    if (now < globalEntry.resetAt) {
      if (globalEntry.count >= RATE_LIMIT_CONFIG.maxDemosPerHour) {
        return {
          allowed: false,
          reason: 'System capacity reached. Please try again in an hour.',
          resetAt: globalEntry.resetAt
        };
      }
    } else {
      // Window expired, reset
      rateLimitStore.delete(globalKey);
    }
  }

  return { allowed: true };
}

/**
 * Increment rate limit counters after successful demo generation
 */
export function incrementRateLimit(projectId: string): void {
  const now = Date.now();

  // Increment project counter
  const projectKey = `project:${projectId}`;
  const projectEntry = rateLimitStore.get(projectKey);

  if (projectEntry && now < projectEntry.resetAt) {
    projectEntry.count++;
  } else {
    rateLimitStore.set(projectKey, {
      count: 1,
      resetAt: now + RATE_LIMIT_CONFIG.projectWindowMs
    });
  }

  // Increment global counter
  const globalKey = 'global:demos';
  const globalEntry = rateLimitStore.get(globalKey);

  if (globalEntry && now < globalEntry.resetAt) {
    globalEntry.count++;
  } else {
    rateLimitStore.set(globalKey, {
      count: 1,
      resetAt: now + RATE_LIMIT_CONFIG.globalWindowMs
    });
  }
}

/**
 * Get current rate limit status for a project
 */
export function getRateLimitStatus(projectId: string): {
  remaining: number;
  limit: number;
  resetAt: number;
} {
  const now = Date.now();
  const projectKey = `project:${projectId}`;
  const projectEntry = rateLimitStore.get(projectKey);

  if (projectEntry && now < projectEntry.resetAt) {
    return {
      remaining: Math.max(0, RATE_LIMIT_CONFIG.maxDemosPerProject - projectEntry.count),
      limit: RATE_LIMIT_CONFIG.maxDemosPerProject,
      resetAt: projectEntry.resetAt
    };
  }

  return {
    remaining: RATE_LIMIT_CONFIG.maxDemosPerProject,
    limit: RATE_LIMIT_CONFIG.maxDemosPerProject,
    resetAt: now + RATE_LIMIT_CONFIG.projectWindowMs
  };
}

/**
 * Clean up expired entries (optional, for memory management)
 */
export function cleanupExpiredEntries(): void {
  const now = Date.now();
  
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now >= entry.resetAt) {
      rateLimitStore.delete(key);
    }
  }
}

// Optional: Run cleanup every hour
if (typeof setInterval !== 'undefined') {
  setInterval(cleanupExpiredEntries, 60 * 60 * 1000);
}


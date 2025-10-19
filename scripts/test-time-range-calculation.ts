// scripts/test-time-range-calculation.ts
// Test the time range calculation logic with mock data

import { calculateTurnTimeRanges, validateTurnTimestamps } from '../src/lib/audio-extraction-service';
import { ConversationTurn } from '../src/lib/conversation-manager';

console.log('🧪 Testing Turn Time Range Calculation\n');

// Mock conversation data
const conversationStart = new Date('2025-09-30T10:00:00.000Z');

const mockTurns: ConversationTurn[] = [
  {
    speaker: 'user',
    message: 'Hello, how are you?',
    timestamp: '2025-09-30T10:00:02.500Z', // 2.5 seconds after start
    turn_number: 1,
    prosody: {
      duration: 1.8 // 1.8 seconds
    }
  },
  {
    speaker: 'agent',
    message: 'I am doing well, thank you for asking!',
    timestamp: '2025-09-30T10:00:05.000Z', // 5 seconds after start
    turn_number: 2,
    prosody: {
      duration: 2.3 // 2.3 seconds
    }
  },
  {
    speaker: 'user',
    message: 'What can you help me with today?',
    timestamp: '2025-09-30T10:00:08.000Z', // 8 seconds after start
    turn_number: 3,
    prosody: {
      duration: 2.1 // 2.1 seconds
    }
  },
  {
    speaker: 'agent',
    message: 'I can help you with many things. What would you like to know?',
    timestamp: '2025-09-30T10:00:11.500Z', // 11.5 seconds after start
    turn_number: 4,
    prosody: {
      duration: 3.2 // 3.2 seconds (last turn)
    }
  }
];

// Test 1: Validate timestamps
console.log('📋 Test 1: Validate Turn Timestamps\n');
const validation = validateTurnTimestamps(mockTurns);
if (validation.valid) {
  console.log('✅ All timestamps are valid and properly ordered\n');
} else {
  console.log('❌ Timestamp validation failed:');
  validation.issues.forEach(issue => console.log(`  - ${issue}`));
  console.log('');
}

// Test 2: Calculate time ranges
console.log('📋 Test 2: Calculate Time Ranges\n');
const timeRanges = calculateTurnTimeRanges(mockTurns, conversationStart);

console.log('\n📊 Summary:');
console.log(`Total turns: ${mockTurns.length}`);
console.log(`Segments calculated: ${timeRanges.length}`);
console.log(`Conversation duration: ${timeRanges[timeRanges.length - 1]?.endMs / 1000}s\n`);

// Test 3: Verify calculations
console.log('📋 Test 3: Verify Calculations\n');

const expectedRanges = [
  { turn: 1, startMs: 2500, endMs: 4300, durationMs: 1800 }, // Start at 2.5s, duration 1.8s
  { turn: 2, startMs: 5000, endMs: 7300, durationMs: 2300 }, // Start at 5s, duration 2.3s
  { turn: 3, startMs: 8000, endMs: 10100, durationMs: 2100 }, // Start at 8s, duration 2.1s
  { turn: 4, startMs: 11500, endMs: 14700, durationMs: 3200 } // Start at 11.5s, duration 3.2s
];

let allMatch = true;
expectedRanges.forEach((expected, idx) => {
  const actual = timeRanges[idx];
  const matches = 
    actual.turn_number === expected.turn &&
    actual.startMs === expected.startMs &&
    actual.endMs === expected.endMs &&
    actual.durationMs === expected.durationMs;

  if (matches) {
    console.log(`✅ Turn ${expected.turn}: Calculated correctly`);
  } else {
    console.log(`❌ Turn ${expected.turn}: Mismatch!`);
    console.log(`   Expected: ${expected.startMs}ms - ${expected.endMs}ms (${expected.durationMs}ms)`);
    console.log(`   Actual:   ${actual.startMs}ms - ${actual.endMs}ms (${actual.durationMs}ms)`);
    allMatch = false;
  }
});

console.log('');
if (allMatch) {
  console.log('🎉 All tests passed! Time range calculation is working correctly.\n');
} else {
  console.log('⚠️  Some tests failed. Review the calculations.\n');
  process.exit(1);
}

// Test 4: Edge case - Turn without prosody duration
console.log('📋 Test 4: Turn Without Prosody Duration\n');

const turnsWithoutDuration: ConversationTurn[] = [
  {
    speaker: 'user',
    message: 'First message',
    timestamp: '2025-09-30T10:00:01.000Z',
    turn_number: 1
  },
  {
    speaker: 'agent',
    message: 'Second message',
    timestamp: '2025-09-30T10:00:04.000Z',
    turn_number: 2
  },
  {
    speaker: 'user',
    message: 'Third message (no next turn)',
    timestamp: '2025-09-30T10:00:07.000Z',
    turn_number: 3
  }
];

const rangesWithoutDuration = calculateTurnTimeRanges(turnsWithoutDuration, conversationStart);

console.log('\n📊 Edge Case Results:');
rangesWithoutDuration.forEach(segment => {
  console.log(`  Turn ${segment.turn_number}: ${segment.startMs}ms - ${segment.endMs}ms (${segment.durationMs}ms)`);
});

// Turn 1: Should use next turn timestamp (4000ms - 1000ms = 3000ms duration)
// Turn 2: Should use next turn timestamp (7000ms - 4000ms = 3000ms duration)
// Turn 3: Should use default 2s duration (7000ms + 2000ms = 9000ms end)

const turn1Match = rangesWithoutDuration[0].durationMs === 3000;
const turn2Match = rangesWithoutDuration[1].durationMs === 3000;
const turn3Match = rangesWithoutDuration[2].durationMs === 2000;

console.log('');
if (turn1Match && turn2Match && turn3Match) {
  console.log('✅ Edge case handled correctly (fallback to next timestamp / default 2s)\n');
} else {
  console.log('❌ Edge case failed:');
  console.log(`   Turn 1 duration: ${rangesWithoutDuration[0].durationMs}ms (expected 3000ms)`);
  console.log(`   Turn 2 duration: ${rangesWithoutDuration[1].durationMs}ms (expected 3000ms)`);
  console.log(`   Turn 3 duration: ${rangesWithoutDuration[2].durationMs}ms (expected 2000ms)\n`);
  process.exit(1);
}

console.log('🎉 All edge case tests passed!\n');
console.log('✅ Time range calculation service is ready for integration!');

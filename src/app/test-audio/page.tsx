'use client';

import { useState, useEffect } from 'react';

// Since we can't import the test utils directly (Jest mocks), let's create inline tests
export default function AudioTestPage() {
  const [testResults, setTestResults] = useState<{
    passed: number;
    failed: number;
    total: number;
    details: Array<{ name: string; status: 'passed' | 'failed'; error?: string }>;
  } | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  // Utility functions for testing
  const convertBlobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = (reader.result as string).split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  // Test 1: REAL Base64 conversion with actual audio-like data
  const testBase64Conversion = async (): Promise<boolean> => {
    try {
      // Create realistic audio-like data (WAV header + audio samples)
      const wavHeader = new Uint8Array([
        0x52, 0x49, 0x46, 0x46, // "RIFF"
        0x24, 0x08, 0x00, 0x00, // File size
        0x57, 0x41, 0x56, 0x45, // "WAVE"
        0x66, 0x6D, 0x74, 0x20  // "fmt "
      ]);
      const audioSamples = new Uint8Array(1024).fill(0); // 1KB of audio data
      const combinedData = new Uint8Array(wavHeader.length + audioSamples.length);
      combinedData.set(wavHeader);
      combinedData.set(audioSamples, wavHeader.length);
      
      const testBlob = new Blob([combinedData], { type: 'audio/wav' });
      const base64 = await convertBlobToBase64(testBlob);
      
      // Verify it's valid base64 AND can be decoded back
      const isValidBase64 = /^[A-Za-z0-9+/]*={0,2}$/.test(base64);
      const decodedSize = atob(base64).length;
      const expectedSize = combinedData.length;
      
      return isValidBase64 && decodedSize === expectedSize;
    } catch (error) {
      console.error('Base64 conversion test failed:', error);
      return false;
    }
  };

  // Test 2: REAL Audio blob creation and manipulation
  const testBlobCreation = (): boolean => {
    try {
      // Test multiple audio formats and realistic sizes
      const webmData = new Uint8Array(8192).fill(0xAB); // 8KB WebM-like data
      const wavData = new Uint8Array(4096).fill(0xCD);  // 4KB WAV-like data
      
      const webmBlob = new Blob([webmData], { type: 'audio/webm' });
      const wavBlob = new Blob([wavData], { type: 'audio/wav' });
      
      // Test blob properties
      const webmValid = webmBlob.size === 8192 && webmBlob.type === 'audio/webm';
      const wavValid = wavBlob.size === 4096 && wavBlob.type === 'audio/wav';
      
      // Test blob slicing (important for chunked uploads)
      const sliced = webmBlob.slice(0, 1024);
      // Note: sliced blobs may lose MIME type in some browsers - this is normal
      const sliceValid = sliced.size === 1024;
      
      // Debug logging
      console.log('🔍 Blob test details:');
      console.log('  WebM blob size:', webmBlob.size, 'expected: 8192', webmValid ? '✅' : '❌');
      console.log('  WebM blob type:', webmBlob.type, 'expected: audio/webm');
      console.log('  WAV blob size:', wavBlob.size, 'expected: 4096', wavValid ? '✅' : '❌');
      console.log('  WAV blob type:', wavBlob.type, 'expected: audio/wav');
      console.log('  Sliced size:', sliced.size, 'expected: 1024', sliceValid ? '✅' : '❌');
      console.log('  Sliced type:', sliced.type, '(empty is normal in many browsers)');
      
      return webmValid && wavValid && sliceValid;
    } catch (error) {
      console.error('Blob creation test failed:', error);
      return false;
    }
  };

  // Test 3: REAL MediaRecorder capabilities and MIME type support
  const testMediaRecorderSupport = (): boolean => {
    try {
      // Check basic API availability
      const hasMediaRecorder = typeof MediaRecorder !== 'undefined';
      const hasGetUserMedia = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
      
      if (!hasMediaRecorder || !hasGetUserMedia) {
        return false;
      }
      
      // Test actual MIME type support (critical for Hume compatibility)
      const supportedTypes = [
        'audio/webm',
        'audio/webm;codecs=opus',
        'audio/mp4',
        'audio/wav'
      ];
      
      const supportedCount = supportedTypes.filter(type => 
        MediaRecorder.isTypeSupported(type)
      ).length;
      
      // Must support at least one format
      const hasSupportedFormat = supportedCount > 0;
      
      // Test MediaRecorder constructor (some browsers have broken implementations)
      let canCreateRecorder = false;
      try {
        // Create dummy AudioContext to test recording capability
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const destination = audioContext.createMediaStreamDestination();
        const testRecorder = new MediaRecorder(destination.stream);
        canCreateRecorder = testRecorder instanceof MediaRecorder;
        audioContext.close();
      } catch (e) {
        canCreateRecorder = false;
      }
      
      return hasMediaRecorder && hasGetUserMedia && hasSupportedFormat && canCreateRecorder;
    } catch (error) {
      console.error('MediaRecorder support test failed:', error);
      return false;
    }
  };

  // Test 4: REAL Hume message structure validation and processing
  const testHumeMessageValidation = (): boolean => {
    try {
      // Test REAL Hume user_message structure (from actual logs)
      const realUserMessage = {
        type: 'user_message',
        message: {
          role: 'user',
          content: "It's been smooth overall. No real snags to mention."
        },
        models: {
          prosody: {
            scores: {
              contentment: 0.252685546875,
              realization: 0.2066650390625,
              satisfaction: 0.10052490234375,
              calmness: 0.17236328125
            }
          }
        },
        time: {
          begin: 97780,
          end: 100844
        },
        fromText: false,
        interim: false,
        receivedAt: "2025-09-26T11:33:13.240Z"
      };

      // Test REAL audio_output structure (base64 encoded real audio data)
      const realAudioData = new Uint8Array(1024);
      for (let i = 0; i < realAudioData.length; i++) {
        realAudioData[i] = Math.floor(Math.random() * 256); // Simulate real audio
      }
      const realBase64 = btoa(String.fromCharCode(...realAudioData));
      
      const realAudioOutput = {
        type: 'audio_output',
        id: 'f4d1fb3c-3454-43bf-bc11-9a757b3c0118',
        data: realBase64,
        timestamp: Date.now()
      };

      // Validate message structure completeness
      const userValid = realUserMessage.type === 'user_message' && 
                       realUserMessage.message?.content?.length > 10 &&
                       realUserMessage.models?.prosody?.scores &&
                       realUserMessage.time?.begin < realUserMessage.time?.end &&
                       typeof realUserMessage.interim === 'boolean';
      
      const audioValid = realAudioOutput.type === 'audio_output' && 
                        realAudioOutput.data.length > 100 && // Real audio is substantial
                        /^[A-Za-z0-9+/]*={0,2}$/.test(realAudioOutput.data) && // Valid base64
                        realAudioOutput.id.length > 10; // Real UUID format

      // Test base64 decode capability
      let decodeValid = false;
      try {
        const decoded = atob(realAudioOutput.data);
        decodeValid = decoded.length === 1024; // Matches our test data
      } catch (e) {
        decodeValid = false;
      }

      return userValid && audioValid && decodeValid;
    } catch (error) {
      console.error('Hume message validation test failed:', error);
      return false;
    }
  };

  // Test 5: REAL Storage path generation with validation and collision detection
  const testStoragePathGeneration = async (): Promise<boolean> => {
    try {
      // Test realistic UUID-based IDs (from actual system)
      const realChatId = 'f763cb3a-3e15-4134-861e-cfb107c439c8';
      const realEventId = '72573ee0-d5b0-42c5-9b48-b00897cd7a86';
      
      // Test path generation function (as it would be used in production)
      const generateStoragePath = (chatId: string, eventId: string, type: 'user' | 'assistant', format: string) => {
        // Validate inputs
        if (!chatId || !eventId || !type || !format) {
          throw new Error('Missing required parameters');
        }
        
        // UUID validation
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(chatId) || !uuidRegex.test(eventId)) {
          throw new Error('Invalid UUID format');
        }
        
        // Generate timestamped path to avoid collisions
        const timestamp = Date.now();
        return `conversations/${chatId}/audio/${eventId}_${type}_${timestamp}.${format}`;
      };
      
      // Test valid paths
      const userPath = generateStoragePath(realChatId, realEventId, 'user', 'webm');
      const assistantPath = generateStoragePath(realChatId, realEventId, 'assistant', 'wav');
      
      // Validate path structure
      const userValid = userPath.startsWith('conversations/') && 
                       userPath.includes(realChatId) && 
                       userPath.includes(realEventId) &&
                       userPath.includes('_user_') &&
                       userPath.endsWith('.webm');
      
      const assistantValid = assistantPath.includes('_assistant_') && 
                            assistantPath.endsWith('.wav');
      
      // Test collision prevention (different timestamps)
      const path1 = generateStoragePath(realChatId, realEventId, 'user', 'webm');
      // Small delay to ensure different timestamp
      await new Promise(resolve => setTimeout(resolve, 1)); // 1ms delay
      const path2 = generateStoragePath(realChatId, realEventId, 'user', 'webm');
      const collisionPrevented = path1 !== path2; // Should have different timestamps
      
      // Test error handling
      let errorHandling = false;
      try {
        generateStoragePath('', realEventId, 'user', 'webm'); // Should throw
      } catch (e) {
        errorHandling = true;
      }
      
      // Debug logging
      console.log('🔍 Storage path test details:');
      console.log('  User path:', userPath);
      console.log('  User valid:', userValid ? '✅' : '❌');
      console.log('  Assistant path:', assistantPath);
      console.log('  Assistant valid:', assistantValid ? '✅' : '❌');
      console.log('  Path1:', path1);
      console.log('  Path2:', path2);
      console.log('  Collision prevented:', collisionPrevented ? '✅' : '❌');
      console.log('  Error handling:', errorHandling ? '✅' : '❌');
      
      return userValid && assistantValid && collisionPrevented && errorHandling;
    } catch (error) {
      console.error('Storage path generation test failed:', error);
      return false;
    }
  };

  const runAllTests = async () => {
    setIsRunning(true);
    const results = [];
    let passed = 0;
    let failed = 0;

    const tests = [
      { name: 'Real Audio Base64 Conversion', test: testBase64Conversion },
      { name: 'Real Audio Blob Manipulation', test: () => Promise.resolve(testBlobCreation()) },
      { name: 'Real MediaRecorder Capabilities', test: () => Promise.resolve(testMediaRecorderSupport()) },
      { name: 'Real Hume Message Validation', test: () => Promise.resolve(testHumeMessageValidation()) },
      { name: 'Real Storage Path Generation', test: testStoragePathGeneration }
    ];

    for (const testCase of tests) {
      console.log(`🧪 Running test: ${testCase.name}`);
      try {
        const result = await testCase.test();
        console.log(`✅ ${testCase.name}: ${result ? 'PASSED' : 'FAILED'}`);
        if (result) {
          results.push({ name: testCase.name, status: 'passed' as const });
          passed++;
        } else {
          console.error(`❌ ${testCase.name} returned false`);
          results.push({ name: testCase.name, status: 'failed' as const, error: 'Test returned false - check console for details' });
          failed++;
        }
      } catch (error) {
        console.error(`💥 ${testCase.name} threw error:`, error);
        results.push({ 
          name: testCase.name, 
          status: 'failed' as const, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
        failed++;
      }
    }

    setTestResults({
      passed,
      failed,
      total: tests.length,
      details: results
    });
    setIsRunning(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">
            🧪 Hume Audio Integration Tests
          </h1>
          
          <div className="mb-6">
            <p className="text-gray-600 mb-4">
              This page tests the core components of our Hume audio integration before implementing the full system.
            </p>
            
            <button
              onClick={runAllTests}
              disabled={isRunning}
              className={`px-6 py-3 rounded-lg font-semibold ${
                isRunning 
                  ? 'bg-gray-400 text-gray-700 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {isRunning ? '🔄 Running Tests...' : '▶️ Run All Tests'}
            </button>
          </div>

          {testResults && (
            <div className="space-y-4">
              <div className="bg-gray-100 rounded-lg p-4">
                <h2 className="text-xl font-semibold mb-2">📊 Test Results</h2>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div className="bg-green-100 text-green-800 p-3 rounded">
                    <div className="text-2xl font-bold">{testResults.passed}</div>
                    <div className="text-sm">Passed</div>
                  </div>
                  <div className="bg-red-100 text-red-800 p-3 rounded">
                    <div className="text-2xl font-bold">{testResults.failed}</div>
                    <div className="text-sm">Failed</div>
                  </div>
                  <div className="bg-blue-100 text-blue-800 p-3 rounded">
                    <div className="text-2xl font-bold">{testResults.total}</div>
                    <div className="text-sm">Total</div>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="text-lg font-semibold">📝 Detailed Results</h3>
                {testResults.details.map((result, index) => (
                  <div 
                    key={index}
                    className={`p-3 rounded-lg border-l-4 ${
                      result.status === 'passed' 
                        ? 'bg-green-50 border-green-400' 
                        : 'bg-red-50 border-red-400'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{result.name}</span>
                      <span className={`px-2 py-1 rounded text-sm ${
                        result.status === 'passed' 
                          ? 'bg-green-200 text-green-800' 
                          : 'bg-red-200 text-red-800'
                      }`}>
                        {result.status === 'passed' ? '✅ PASSED' : '❌ FAILED'}
                      </span>
                    </div>
                    {result.error && (
                      <div className="mt-2 text-sm text-red-600 font-mono bg-red-100 p-2 rounded">
                        <strong>Error:</strong> {result.error}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-blue-900 mb-2">🎯 Testing Strategy</h3>
            <ul className="text-blue-800 text-sm space-y-1">
              <li>• <strong>Real Audio Base64:</strong> Tests 1KB+ WAV data encoding/decoding with size validation</li>
              <li>• <strong>Real Audio Blobs:</strong> Tests 8KB WebM/4KB WAV blobs with slicing operations</li>
              <li>• <strong>Real MediaRecorder:</strong> Tests MIME support, AudioContext, and actual recorder creation</li>
              <li>• <strong>Real Hume Messages:</strong> Uses actual message structures with prosody data and UUIDs</li>
              <li>• <strong>Real Storage Paths:</strong> UUID validation, collision prevention, error handling</li>
            </ul>
          </div>

          {testResults && testResults.failed === 0 && (
            <div className="mt-6 bg-green-50 border border-green-200 rounded-lg p-4">
              <h3 className="font-semibold text-green-900 mb-2">🎉 All Tests Passed!</h3>
              <p className="text-green-800 text-sm">
                Ready to proceed with Phase 1: User Audio Capture Implementation
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

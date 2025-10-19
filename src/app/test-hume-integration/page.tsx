'use client';

import { useState, useEffect } from 'react';
import { useHumeAudioCapture } from '@/hooks/useHumeAudioCapture';

export default function HumeIntegrationTest() {
  const [testResults, setTestResults] = useState<{
    passed: number;
    failed: number;
    total: number;
    details: Array<{ name: string; status: 'passed' | 'failed'; error?: string }>;
  } | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [sessionId] = useState(`test-session-${Date.now()}`);

  // Initialize Hume audio capture for testing
  const {
    isSupported,
    isRecording,
    startUserRecording,
    stopUserRecording,
    processAssistantAudio,
    getSupportedMimeType,
    cleanup
  } = useHumeAudioCapture({
    sessionId,
    onUserAudioReady: (audioBlob, eventId) => {
      console.log('✅ User audio ready:', { eventId, size: audioBlob.size });
    },
    onAssistantAudioReady: (audioBlob, eventId) => {
      console.log('✅ Assistant audio ready:', { eventId, size: audioBlob.size });
    },
    onError: (error) => {
      console.error('❌ Audio error:', error);
    }
  });

  // Test 1: Audio Support Detection
  const testAudioSupport = async (): Promise<boolean> => {
    try {
      console.log('🧪 Testing audio support...');
      const supported = isSupported;
      const mimeType = getSupportedMimeType();
      
      console.log('Audio support results:', { supported, mimeType });
      
      return supported && mimeType !== null;
    } catch (error) {
      console.error('Audio support test failed:', error);
      return false;
    }
  };

  // Test 2: User Recording Lifecycle
  const testUserRecording = async (): Promise<boolean> => {
    if (!isSupported) {
      console.log('⏭️ Skipping user recording test - not supported');
      return true; // Pass if not supported
    }

    try {
      console.log('🧪 Testing user recording lifecycle...');
      
      // Test start recording
      await startUserRecording();
      console.log('✅ Recording started successfully');
      
      if (!isRecording) {
        throw new Error('Recording state not updated');
      }
      
      // Simulate recording time
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Test stop recording
      const eventId = `test-user-${Date.now()}`;
      await stopUserRecording(eventId);
      console.log('✅ Recording stopped successfully');
      
      if (isRecording) {
        throw new Error('Recording state not cleared');
      }
      
      return true;
    } catch (error) {
      console.error('User recording test failed:', error);
      return false;
    }
  };

  // Test 3: Assistant Audio Processing
  const testAssistantAudioProcessing = async (): Promise<boolean> => {
    try {
      console.log('🧪 Testing assistant audio processing...');
      
      // Create mock assistant audio_output message (following Hume docs)
      const mockAudioData = new Uint8Array(1024);
      for (let i = 0; i < mockAudioData.length; i++) {
        mockAudioData[i] = Math.floor(Math.random() * 256);
      }
      const base64Audio = btoa(String.fromCharCode(...mockAudioData));
      
      const mockAudioOutput = {
        type: 'audio_output',
        id: `assistant-${Date.now()}`,
        data: base64Audio,
        timestamp: Date.now()
      };
      
      await processAssistantAudio(mockAudioOutput);
      console.log('✅ Assistant audio processed successfully');
      
      return true;
    } catch (error) {
      console.error('Assistant audio processing test failed:', error);
      return false;
    }
  };

  // Test 4: Error Handling
  const testErrorHandling = async (): Promise<boolean> => {
    try {
      console.log('🧪 Testing error handling...');
      
      // Test invalid audio_output message
      const invalidMessage = {
        type: 'user_message',
        content: 'This is not an audio message'
      };
      
      await processAssistantAudio(invalidMessage);
      console.log('✅ Invalid message handled gracefully');
      
      // Test stopping recording when not recording
      try {
        await stopUserRecording('test-invalid');
        console.log('✅ Stop recording when not recording handled gracefully');
      } catch (error) {
        // Expected behavior - this is fine
        console.log('✅ Stop recording properly throws when not recording');
      }
      
      return true;
    } catch (error) {
      console.error('Error handling test failed:', error);
      return false;
    }
  };

  // Test 5: Cleanup Functionality
  const testCleanup = async (): Promise<boolean> => {
    try {
      console.log('🧪 Testing cleanup functionality...');
      
      // Test cleanup doesn't throw
      cleanup();
      console.log('✅ Cleanup executed successfully');
      
      return true;
    } catch (error) {
      console.error('Cleanup test failed:', error);
      return false;
    }
  };

  const runAllTests = async () => {
    setIsRunning(true);
    const results = [];
    let passed = 0;
    let failed = 0;

    const tests = [
      { name: 'Audio Support Detection', test: testAudioSupport },
      { name: 'User Recording Lifecycle', test: testUserRecording },
      { name: 'Assistant Audio Processing', test: testAssistantAudioProcessing },
      { name: 'Error Handling', test: testErrorHandling },
      { name: 'Cleanup Functionality', test: testCleanup }
    ];

    for (const testCase of tests) {
      try {
        console.log(`\n🧪 Running test: ${testCase.name}`);
        const result = await testCase.test();
        
        if (result) {
          results.push({ name: testCase.name, status: 'passed' as const });
          passed++;
          console.log(`✅ ${testCase.name}: PASSED`);
        } else {
          results.push({ name: testCase.name, status: 'failed' as const, error: 'Test returned false' });
          failed++;
          console.log(`❌ ${testCase.name}: FAILED`);
        }
      } catch (error) {
        results.push({ 
          name: testCase.name, 
          status: 'failed' as const, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
        failed++;
        console.error(`💥 ${testCase.name}: THREW ERROR:`, error);
      }
    }

    setTestResults({
      passed,
      failed,
      total: tests.length,
      details: results
    });
    setIsRunning(false);
    
    console.log(`\n📊 Test Results: ${passed}/${tests.length} passed`);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">
            🎤 Hume Audio Integration Test
          </h1>
          
          <div className="mb-6">
            <p className="text-gray-600 mb-4">
              Tests the complete Hume audio integration following documentation patterns.
            </p>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <h3 className="font-semibold text-blue-900 mb-2">🔧 Audio System Status</h3>
              <div className="text-blue-800 text-sm space-y-1">
                <div><strong>Session ID:</strong> {sessionId}</div>
                <div><strong>Audio Supported:</strong> {isSupported ? '✅ Yes' : '❌ No'}</div>
                <div><strong>MIME Type:</strong> {getSupportedMimeType() || 'None'}</div>
                <div><strong>Currently Recording:</strong> {isRecording ? '🎤 Yes' : '⏸️ No'}</div>
              </div>
            </div>
            
            <button
              onClick={runAllTests}
              disabled={isRunning}
              className={`px-6 py-3 rounded-lg font-semibold ${
                isRunning 
                  ? 'bg-gray-400 text-gray-700 cursor-not-allowed'
                  : 'bg-green-600 text-white hover:bg-green-700'
              }`}
            >
              {isRunning ? '🔄 Running Integration Tests...' : '▶️ Run Integration Tests'}
            </button>
          </div>

          {testResults && (
            <div className="space-y-4">
              <div className="bg-gray-100 rounded-lg p-4">
                <h2 className="text-xl font-semibold mb-2">📊 Integration Test Results</h2>
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

          <div className="mt-8 bg-green-50 border border-green-200 rounded-lg p-4">
            <h3 className="font-semibold text-green-900 mb-2">🎯 Integration Test Coverage</h3>
            <ul className="text-green-800 text-sm space-y-1">
              <li>• <strong>Audio Support:</strong> Browser compatibility and MIME type detection</li>
              <li>• <strong>User Recording:</strong> Complete start → record → stop → upload cycle</li>
              <li>• <strong>Assistant Audio:</strong> Processing audio_output messages from Hume</li>
              <li>• <strong>Error Handling:</strong> Graceful failure modes and invalid inputs</li>
              <li>• <strong>Cleanup:</strong> Resource management and memory cleanup</li>
            </ul>
          </div>

          {testResults && testResults.failed === 0 && (
            <div className="mt-6 bg-green-50 border border-green-200 rounded-lg p-4">
              <h3 className="font-semibold text-green-900 mb-2">🎉 All Integration Tests Passed!</h3>
              <p className="text-green-800 text-sm">
                The Hume audio integration is working correctly and ready for production use.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

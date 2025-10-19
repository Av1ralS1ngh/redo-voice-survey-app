import { notFound } from "next/navigation";

interface AnalyticsPageProps {
  params: Promise<{ sessionId: string }>;
}

async function getSessionAnalytics(sessionId: string) {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/analytics/${sessionId}`, {
      cache: 'no-store' // Always get fresh data
    });
    
    if (!response.ok) {
      return null;
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching analytics:', error);
    return null;
  }
}

export default async function AnalyticsPage({ params }: AnalyticsPageProps) {
  const { sessionId } = await params;
  const analytics = await getSessionAnalytics(sessionId);
  
  if (!analytics) {
    notFound();
  }

  const { transcripts, summary, analytics: analyticsData } = analytics;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">
            Conversation Analytics
          </h1>
          
          {/* Session Overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="text-sm font-medium text-blue-600">Total Turns</h3>
              <p className="text-2xl font-bold text-blue-900">{transcripts.metrics.totalTurns}</p>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <h3 className="text-sm font-medium text-green-600">User Messages</h3>
              <p className="text-2xl font-bold text-green-900">{transcripts.metrics.userTurns}</p>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg">
              <h3 className="text-sm font-medium text-purple-600">Agent Messages</h3>
              <p className="text-2xl font-bold text-purple-900">{transcripts.metrics.agentTurns}</p>
            </div>
            <div className="bg-yellow-50 p-4 rounded-lg">
              <h3 className="text-sm font-medium text-yellow-600">Duration</h3>
              <p className="text-2xl font-bold text-yellow-900">
                {transcripts.metrics.conversationDuration 
                  ? `${Math.round(transcripts.metrics.conversationDuration / 1000)}s`
                  : 'N/A'
                }
              </p>
            </div>
          </div>

          {/* Summary Insights */}
          {summary && (
            <div className="mb-8">
              <h2 className="text-xl font-semibold mb-4">Summary Insights</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-medium mb-2">Key Topics</h3>
                  <div className="flex flex-wrap gap-2">
                    {summary.keyTopics.map((topic: string, index: number) => (
                      <span key={index} className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                        {topic}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-medium mb-2">Sentiment</h3>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    summary.sentiment === 'positive' ? 'bg-green-100 text-green-800' :
                    summary.sentiment === 'negative' ? 'bg-red-100 text-red-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {summary.sentiment}
                  </span>
                  <p className="mt-2 text-sm text-gray-600">
                    Satisfaction Score: {summary.userSatisfaction}/10
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Conversation Flow */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4">Conversation Flow</h2>
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {analyticsData.separatedTranscripts.chronologicalFlow.map((message: any, index: number) => (
                <div
                  key={index}
                  className={`p-4 rounded-lg ${
                    message.role === 'user' 
                      ? 'bg-blue-50 border-l-4 border-blue-400 ml-8' 
                      : 'bg-gray-50 border-l-4 border-gray-400 mr-8'
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-medium text-sm">
                      {message.role === 'user' ? '👤 User' : '🤖 Agent'} (Turn {message.turn})
                    </span>
                    <span className="text-xs text-gray-500">
                      {new Date(message.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="text-gray-800">{message.text}</p>
                  {message.messageType && (
                    <span className="text-xs text-gray-500 mt-1 block">
                      Type: {message.messageType}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Separated Analysis */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* User Messages */}
            <div>
              <h2 className="text-xl font-semibold mb-4">User Responses Analysis</h2>
              <div className="bg-blue-50 p-4 rounded-lg mb-4">
                <p className="text-sm text-blue-600">
                  Average Length: {transcripts.metrics.averageUserResponseLength.toFixed(1)} words
                </p>
                <p className="text-sm text-blue-600">
                  Total Messages: {transcripts.metrics.userTurns}
                </p>
              </div>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {transcripts.userMessages.map((message, index) => (
                  <div key={index} className="bg-white p-3 rounded border">
                    <p className="text-sm">{message.text}</p>
                    <span className="text-xs text-gray-500">
                      Turn {message.turn} • {message.text.split(' ').length} words
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Agent Messages */}
            <div>
              <h2 className="text-xl font-semibold mb-4">Agent Responses Analysis</h2>
              <div className="bg-gray-50 p-4 rounded-lg mb-4">
                <p className="text-sm text-gray-600">
                  Average Length: {transcripts.metrics.averageAgentResponseLength.toFixed(1)} words
                </p>
                <p className="text-sm text-gray-600">
                  Total Messages: {transcripts.metrics.agentTurns}
                </p>
              </div>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {transcripts.agentMessages.map((message, index) => (
                  <div key={index} className="bg-white p-3 rounded border">
                    <p className="text-sm">{message.text}</p>
                    <span className="text-xs text-gray-500">
                      Turn {message.turn} • {message.text.split(' ').length} words
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Raw Data Export */}
          <div className="mt-8 pt-6 border-t">
            <h2 className="text-xl font-semibold mb-4">Export Data</h2>
            <div className="flex gap-4">
              <button 
                onClick={() => {
                  const dataStr = JSON.stringify(analytics, null, 2);
                  const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
                  const exportFileDefaultName = `conversation-analytics-${sessionId}.json`;
                  const linkElement = document.createElement('a');
                  linkElement.setAttribute('href', dataUri);
                  linkElement.setAttribute('download', exportFileDefaultName);
                  linkElement.click();
                }}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Download JSON
              </button>
              <button 
                onClick={() => {
                  const csv = [
                    'Turn,Role,Text,Timestamp,Word Count',
                    ...analyticsData.separatedTranscripts.chronologicalFlow.map((msg: any) => 
                      `${msg.turn},"${msg.role}","${msg.text.replace(/"/g, '""')}","${msg.timestamp}",${msg.text.split(' ').length}`
                    )
                  ].join('\n');
                  const dataUri = 'data:text/csv;charset=utf-8,'+ encodeURIComponent(csv);
                  const exportFileDefaultName = `conversation-transcripts-${sessionId}.csv`;
                  const linkElement = document.createElement('a');
                  linkElement.setAttribute('href', dataUri);
                  linkElement.setAttribute('download', exportFileDefaultName);
                  linkElement.click();
                }}
                className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
              >
                Download CSV
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

import { getHumeAccessToken } from "@/utils/getHumeAccessToken";
import { VoiceSurveyClient } from "./VoiceSurveyClient";
import { supabaseService } from "@/lib/supabase";

interface PageProps {
  params: Promise<{ uid: string }>;
  searchParams: Promise<{ project_id?: string }>;
}

export default async function SurveyPage({ params, searchParams }: PageProps) {
  const { uid } = await params;
  const { project_id } = await searchParams;

  try {
    // Get Hume access token on server side
    const accessToken = await getHumeAccessToken();

    if (!accessToken) {
      throw new Error('Unable to get Hume access token');
    }

    // Fetch user data
    const supabase = supabaseService();
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('name, first_name, last_name, email')
      .eq('uid', uid)
      .single();

    if (userError) {
      console.error('Error fetching user data:', userError);
      throw new Error('User not found');
    }

    // Fetch interview data if project_id is provided
    let interviewData = null;
    let systemPrompt = null;

    if (project_id) {
      const { data: interview, error: interviewError } = await supabase
        .from('interviews')
        .select('id, name, hume_system_prompt, research_brief, interview_type')
        .eq('project_id', project_id)
        .single();

      if (!interviewError && interview) {
        interviewData = interview;
        systemPrompt = interview.hume_system_prompt;
      }
    }

    const recipientName = userData.first_name
      ? `${userData.first_name} ${userData.last_name || ''}`.trim()
      : userData.name;

    return (
      <main className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex flex-col items-center justify-center p-6">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-200 dark:bg-blue-900/30 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-pulse"></div>
          <div className="absolute top-3/4 right-1/4 w-96 h-96 bg-purple-200 dark:bg-purple-900/30 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-pulse delay-1000"></div>
          <div className="absolute bottom-1/4 left-1/3 w-96 h-96 bg-pink-200 dark:bg-pink-900/30 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-pulse delay-2000"></div>
        </div>

        <div className="relative z-10 text-center">
          {recipientName && (
            <h1 className="text-4xl font-bold text-gray-800 dark:text-white mb-6 animate-fade-in-down">
              Welcome, {recipientName}!
            </h1>
          )}

          <VoiceSurveyClient
            uid={uid}
            accessToken={accessToken}
            systemPrompt={systemPrompt}
            interviewData={interviewData}
          />
        </div>
      </main>
    );

  } catch (error) {
    console.error('Survey page error:', error);

    return (
      <main className="min-h-screen bg-gradient-to-br from-red-50 via-orange-50 to-yellow-50 flex flex-col items-center justify-center p-6">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Survey Unavailable</h1>
          <p className="text-gray-600 mb-4">
            There was an error setting up the survey. This might be due to missing API credentials or invalid survey link.
          </p>
          <div className="bg-gray-100 rounded p-4 text-sm text-gray-700">
            <strong>Error:</strong> {error instanceof Error ? error.message : 'Unknown error'}
          </div>
          <p className="text-sm text-gray-500 mt-4">
            Please check that HUME_API_KEY and HUME_SECRET_KEY are set in your environment variables.
          </p>
        </div>
      </main>
    );
  }
}

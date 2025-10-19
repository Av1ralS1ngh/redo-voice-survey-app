import 'server-only';

import { fetchAccessToken } from "hume";

export const getHumeAccessToken = async () => {
  const apiKey = process.env.HUME_API_KEY;
  const secretKey = process.env.HUME_SECRET_KEY;

  console.log('🔑 Checking Hume API credentials...');
  console.log('API Key exists:', !!apiKey);
  console.log('Secret Key exists:', !!secretKey);

  if (!apiKey || !secretKey) {
    console.error('❌ Missing Hume API credentials');
    throw new Error('Missing required environment variables (HUME_API_KEY or HUME_SECRET_KEY)');
  }

  try {
    console.log('🔄 Fetching Hume access token...');
    const accessToken = await fetchAccessToken({
      apiKey: String(process.env.HUME_API_KEY),
      secretKey: String(process.env.HUME_SECRET_KEY),
    });

    console.log('✅ Access token received:', !!accessToken);

    if (!accessToken || accessToken === "undefined") {
      throw new Error('Unable to get access token from Hume API');
    }

    return accessToken;
  } catch (error) {
    console.error('❌ Error fetching Hume access token:', error);
    throw new Error(`Failed to get Hume access token: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

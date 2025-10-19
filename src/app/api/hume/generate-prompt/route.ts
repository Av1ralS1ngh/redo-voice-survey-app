/**
 * Hume Prompt Generation API
 * Generates Hume AI system prompts from research briefs
 */

import { NextRequest, NextResponse } from 'next/server';
import { generateHumePrompt, validatePrompt } from '@/lib/hume/prompt-generator';
import { createHumeConfigWithPrompt } from '@/lib/hume/config-builder';
import type { ResearchBrief } from '@/lib/interview-types/types';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { brief, interviewType, options, createConfig } = body;

    // Validate required fields
    if (!brief || !interviewType) {
      return NextResponse.json(
        { error: 'Brief and interviewType are required' },
        { status: 400 }
      );
    }

    // Generate the prompt
    const prompt = generateHumePrompt(
      brief as ResearchBrief,
      interviewType,
      options
    );

    // Validate prompt quality
    const validation = validatePrompt(prompt);

    // If requested, create full Hume config
    let configData = null;
    if (createConfig) {
      try {
        configData = await createHumeConfigWithPrompt(prompt, {
          name: options?.productName || `${interviewType} Interview`,
          userName: options?.userName,
          voice: options?.voice,
          languageModel: options?.languageModel,
          enableOnNewChat: options?.enableOnNewChat,
        });
      } catch (error) {
        console.error('Failed to create Hume config:', error);
        // Don't fail the whole request if config creation fails
        // Still return the prompt
      }
    }

    return NextResponse.json({
      success: true,
      prompt,
      validation,
      config: configData,
    });
  } catch (error) {
    console.error('Error generating Hume prompt:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate prompt',
      },
      { status: 500 }
    );
  }
}

// GET endpoint to retrieve existing prompt stats
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const promptId = searchParams.get('promptId');

    if (!promptId) {
      return NextResponse.json(
        { error: 'promptId is required' },
        { status: 400 }
      );
    }

    const apiKey = process.env.HUME_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'HUME_API_KEY not configured' },
        { status: 500 }
      );
    }

    // Fetch prompt from Hume API
    const response = await fetch(
      `https://api.hume.ai/v0/evi/prompts/${promptId}`,
      {
        headers: {
          'X-Hume-Api-Key': apiKey,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch prompt: ${await response.text()}`);
    }

    const promptData = await response.json();

    return NextResponse.json({
      success: true,
      prompt: promptData,
    });
  } catch (error) {
    console.error('Error fetching prompt:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch prompt',
      },
      { status: 500 }
    );
  }
}

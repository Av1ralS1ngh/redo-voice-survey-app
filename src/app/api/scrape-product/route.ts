/**
 * Product URL Scraper API
 * Scrapes product URLs using Jina AI Reader
 */

import { NextRequest, NextResponse } from 'next/server';
import { scrapeProductUrl, isValidProductUrl } from '@/lib/scrapers/product-scraper';

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();

    if (!url) {
      return NextResponse.json(
        { error: 'URL is required' },
        { status: 400 }
      );
    }

    // Validate URL
    if (!isValidProductUrl(url)) {
      return NextResponse.json(
        { error: 'Invalid URL format' },
        { status: 400 }
      );
    }

    // Scrape the URL
    const scrapedData = await scrapeProductUrl(url);

    return NextResponse.json({
      success: true,
      data: scrapedData,
    });
  } catch (error) {
    console.error('Error scraping product URL:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to scrape URL',
      },
      { status: 500 }
    );
  }
}

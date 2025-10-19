/**
 * Product URL Scraper
 * Uses Jina AI Reader to extract product information from URLs
 */

export interface ScrapedProductData {
  url: string;
  title?: string;
  description?: string;
  content: string; // Full markdown content
  summary: string; // AI-generated summary
  features: string[]; // Extracted features
  keywords: string[]; // Key terms
  scrapedAt: Date;
}

/**
 * Scrape a product URL using multiple fallback methods
 */
export async function scrapeProductUrl(url: string): Promise<ScrapedProductData> {
  try {
    console.log(`🔍 Scraping product URL: ${url}`);

    // Try Method 1: Jina AI Reader (no auth required for most URLs)
    try {
      const jinaUrl = `https://r.jina.ai/${url}`;
      const response = await fetch(jinaUrl, {
        headers: {
          'Accept': 'text/plain',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'X-With-Generated-Alt': 'true',
        },
      });

      if (response.ok) {
        const markdown = await response.text();
        return parseMarkdownContent(url, markdown);
      }
      
      console.warn(`Jina AI failed with ${response.status}, trying alternative method...`);
    } catch (jinaError) {
      console.warn('Jina AI error:', jinaError);
    }

    // Method 2: r.jina.ai alternative endpoint (sometimes works better)
    try {
      const response = await fetch(`https://r.jina.ai/${encodeURIComponent(url)}`, {
        method: 'GET',
      });

      if (response.ok) {
        const markdown = await response.text();
        return parseMarkdownContent(url, markdown);
      }
    } catch (altError) {
      console.warn('Alternative Jina endpoint failed:', altError);
    }

    // Method 3: Basic metadata fetch (og:tags, meta description)
    const metadataUrl = `https://api.microlink.io/?url=${encodeURIComponent(url)}`;
    const metaResponse = await fetch(metadataUrl);
    
    if (!metaResponse.ok) {
      throw new Error(`All scraping methods failed for ${url}`);
    }

    const metaData = await metaResponse.json();
    const data = metaData.data || {};

    const markdown = `Title: ${data.title || 'Unknown'}\n\n${data.description || ''}\n\nURL: ${url}`;
    return parseMarkdownContent(url, markdown);
  } catch (error) {
    console.error(`❌ Error scraping ${url}:`, error);
    throw new Error(
      `Failed to scrape product URL: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Parse markdown content into structured data
 */
function parseMarkdownContent(url: string, markdown: string): ScrapedProductData {
  // Extract title (looks for "Title:" line first, then # heading)
  const titleLineMatch = markdown.match(/^Title:\s*(.+)$/m);
  const headingMatch = markdown.match(/^#\s+(.+)$/m);
  const title = titleLineMatch?.[1]?.trim() || headingMatch?.[1]?.trim() || 'Unknown Product';

  // Extract description (first paragraph after title/heading)
  const lines = markdown.split('\n').filter(l => l.trim());
  let description = '';
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line.startsWith('#') && !line.startsWith('Title:') && 
        !line.startsWith('URL') && !line.startsWith('Markdown') &&
        line.length > 20) {
      description = line.trim();
      break;
    }
  }

  // Generate summary (first 500 chars of content)
  const contentText = markdown.replace(/[#*`]/g, '').trim();
  const summary = contentText.substring(0, 500) + (contentText.length > 500 ? '...' : '');

  // Extract features (bullet points)
  const features = extractFeatures(markdown);

  // Extract keywords
  const keywords = extractKeywords(markdown);

  console.log(`✅ Scraped ${url}: Title="${title}", ${features.length} features found`);

  return {
    url,
    title,
    description,
    content: markdown,
    summary,
    features,
    keywords,
    scrapedAt: new Date(),
  };
}

/**
 * Extract features from markdown content
 * Looks for bullet points, numbered lists, and common feature patterns
 */
function extractFeatures(markdown: string): string[] {
  const features: string[] = [];

  // Extract bullet points
  const bulletPoints = markdown.match(/^[•\-*]\s+(.+)$/gm);
  if (bulletPoints) {
    features.push(...bulletPoints.map((line) => line.replace(/^[•\-*]\s+/, '').trim()));
  }

  // Extract numbered lists
  const numberedPoints = markdown.match(/^\d+\.\s+(.+)$/gm);
  if (numberedPoints) {
    features.push(...numberedPoints.map((line) => line.replace(/^\d+\.\s+/, '').trim()));
  }

  // Look for "Features" section
  const featuresSection = markdown.match(
    /(?:features|capabilities|what (?:we|you) (?:offer|provide|do)|key features)[:\s]+(.+?)(?=\n\n|$)/is
  );
  if (featuresSection) {
    const sectionFeatures = featuresSection[1]
      .split(/\n/)
      .filter((line) => line.trim().length > 0)
      .map((line) => line.replace(/^[•\-*\d.]\s*/, '').trim());
    features.push(...sectionFeatures);
  }

  // Deduplicate and clean
  const uniqueFeatures = Array.from(new Set(features))
    .filter((f) => f.length > 10 && f.length < 200) // Remove too short or too long
    .slice(0, 10); // Limit to top 10

  return uniqueFeatures;
}

/**
 * Extract keywords from content
 */
function extractKeywords(markdown: string): string[] {
  const text = markdown.toLowerCase().replace(/[#*`]/g, '');

  // Common product-related keywords to look for
  const productTerms = [
    'collaboration',
    'real-time',
    'design',
    'feedback',
    'analytics',
    'dashboard',
    'integration',
    'automation',
    'workflow',
    'team',
    'project',
    'task',
    'communication',
    'sharing',
    'version',
    'control',
    'ai',
    'machine learning',
    'data',
    'cloud',
    'mobile',
    'web',
    'app',
    'platform',
    'api',
    'security',
  ];

  const foundKeywords = productTerms.filter((term) => text.includes(term));

  // Also extract capitalized terms (likely product names or features)
  const capitalizedTerms = markdown.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g) || [];
  const uniqueCapitalized = Array.from(new Set(capitalizedTerms))
    .filter((term) => term.length > 3)
    .slice(0, 5);

  return [...new Set([...foundKeywords, ...uniqueCapitalized.map((t) => t.toLowerCase())])];
}

/**
 * Format scraped data for AI context
 */
export function formatScrapedDataForAI(data: ScrapedProductData): string {
  const parts = [
    `Product: ${data.title}`,
    data.description ? `Description: ${data.description}` : '',
    data.features.length > 0
      ? `Key Features:\n${data.features.map((f) => `- ${f}`).join('\n')}`
      : '',
    data.keywords.length > 0 ? `Keywords: ${data.keywords.join(', ')}` : '',
  ];

  return parts.filter(Boolean).join('\n\n');
}

/**
 * Validate URL before scraping
 */
export function isValidProductUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Extract URLs from text
 */
export function extractUrlsFromText(text: string): string[] {
  const urlPattern = /(https?:\/\/[^\s]+)/g;
  const matches = text.match(urlPattern) || [];
  return matches.filter(isValidProductUrl);
}

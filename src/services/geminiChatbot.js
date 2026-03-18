/**
 * Gemini AI Chatbot Service
 * Provides intelligent ISP recommendations using Google Gemini AI
 */

import { GoogleGenerativeAI } from "@google/generative-ai";
import { getGeminiKey } from '../utils/env';

let genAI = null;
let model = null;

/**
 * Initialize Gemini AI
 * @returns {object} Gemini model instance
 */
const initializeGemini = () => {
  if (!genAI) {
    try {
      const apiKey = getGeminiKey();
      genAI = new GoogleGenerativeAI(apiKey);
      model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
      console.log('Gemini AI initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Gemini AI:', error);
      throw error;
    }
  }
  return model;
};

/**
 * Map technology codes to readable names
 */
const techCodeToName = (code) => {
  const map = { 50: 'Fiber', 40: 'Cable', 10: 'DSL' };
  return map[code] || (code ? `Tech ${code}` : null);
};

/**
 * Generate system prompt with context about offerings, reviews, and pipeline metadata
 * @param {Array} offerings - Available ISP offerings
 * @param {string} userAddress - User's address
 * @param {object} reviews - Provider reviews map
 * @param {object} pipelineMetadata - FCC pipeline metadata (may be null)
 * @param {string} dataSource - Data source identifier
 * @returns {string} System prompt
 */
const generateSystemPrompt = (offerings, userAddress, reviews, pipelineMetadata, dataSource) => {
  // Build data source context (compact)
  let dataSourceContext = '';
  if (dataSource === 'fcc-bdc-database' && pipelineMetadata) {
    dataSourceContext = `\n**Data Source**: FCC Broadband Data Collection | ${pipelineMetadata.stateName || pipelineMetadata.state} | Data as of ${pipelineMetadata.dataAsOf || 'unknown'} | ${pipelineMetadata.totalProviders} providers, ${pipelineMetadata.totalServices} services
Note: FCC data shows what providers report at the census-block level. Prices are estimated (FCC doesn't include pricing).`;
  } else if (dataSource) {
    const sourceName = dataSource === 'zip-based' ? 'ZIP code lookup' : dataSource === 'fcc-api' ? 'FCC API' : 'Provider APIs';
    dataSourceContext = `\n**Data Source**: ${sourceName} (FCC database unavailable for this location)`;
  }

  // Cap offerings to prevent prompt bloat (keep top 10 by download speed)
  const cappedOfferings = offerings.length > 10
    ? [...offerings].sort((a, b) => (b.maxDownloadMbps || 0) - (a.maxDownloadMbps || 0)).slice(0, 10)
    : offerings;

  // Format offerings — reviews listed once per provider, not per offering
  const offeringsText = cappedOfferings.map((offering, idx) => {
    const techName = techCodeToName(offering.technologyCode);
    const rawDownload = offering.maxDownloadMbps ? `${offering.maxDownloadMbps} Mbps` : offering.speed;
    const rawUpload = offering.maxUploadMbps ? `${offering.maxUploadMbps} Mbps` : (offering.uploadSpeed || 'N/A');

    let lines = `${idx + 1}. ${offering.name} (${offering.provider})`;
    lines += `\n   Speed: ${rawDownload} down / ${rawUpload} up`;
    if (techName) lines += ` | ${techName}`;
    if (offering.lowLatency) lines += ` | Low Latency`;
    lines += `\n   Price: $${offering.price}/month | ${offering.availability}`;

    return lines;
  }).join('\n');

  // Build a separate, deduplicated reviews section (one entry per provider)
  const seenProviders = new Set();
  let reviewsText = '';
  const hasAnyReviews = Object.values(reviews).some(r => r.reviews?.length > 0);

  if (hasAnyReviews) {
    const reviewEntries = [];
    for (const offering of cappedOfferings) {
      if (seenProviders.has(offering.provider)) continue;
      seenProviders.add(offering.provider);

      const info = reviews[offering.provider];
      if (!info || !info.reviews || info.reviews.length === 0) continue;

      let entry = `${offering.provider}: ${info.overallRating}/5 (${info.totalReviews} reviews)`;
      // Include up to 3 reviews, truncated to 150 chars each
      const snippets = info.reviews.slice(0, 3).map((r, i) => {
        const text = r.text.length > 150 ? r.text.slice(0, 147) + '...' : r.text;
        return `  ${i + 1}. "${text}" — ${r.author} (${r.rating}/5, ${r.relativeTime})`;
      });
      entry += '\n' + snippets.join('\n');
      reviewEntries.push(entry);
    }
    if (reviewEntries.length > 0) {
      reviewsText = `\n\n**Customer Reviews**:\n${reviewEntries.join('\n\n')}`;
    }
  }

  return `You are an ISP recommendation assistant for NetConnect AI.

**Location**: ${userAddress}${dataSourceContext}

**Available Plans** (${offerings.length} total${cappedOfferings.length < offerings.length ? `, showing top ${cappedOfferings.length}` : ''}):
${offeringsText}${reviewsText}

**Guidelines**:
- Ask about usage (streaming/gaming/WFH), household size, budget, and latency needs
- Recommend plans based on user needs: gamers need low latency + fiber; streamers need high download; WFH needs reliability + upload
- Connection types: Fiber (best, symmetric speeds) > Cable (good download, weak upload) > DSL (slowest)${hasAnyReviews ? '\n- Reference customer reviews when relevant — cite specific feedback' : '\n- No reviews available — focus on technical specs'}
- Be concise (3-5 sentences). Only reference data provided above.
- If prices say "est.", explain FCC data doesn't include exact pricing.

Start by asking what matters most to the user.`;
};

/**
 * Create a new chat session
 * @param {Array} offerings - Available ISP offerings
 * @param {string} userAddress - User's address
 * @param {object} reviews - Provider reviews map
 * @param {object} pipelineMetadata - FCC pipeline metadata (may be null)
 * @param {string} dataSource - Data source identifier
 * @returns {Promise<object>} Chat session
 */
export const createChatSession = async (offerings, userAddress, reviews, pipelineMetadata, dataSource) => {
  try {
    const model = initializeGemini();
    const systemPrompt = generateSystemPrompt(offerings, userAddress, reviews, pipelineMetadata, dataSource);

    const hasReviews = reviews && Object.values(reviews).some(r => r.reviews?.length > 0);
    const reviewAck = hasReviews
      ? "I have access to real customer reviews and will use them to support my recommendations with specific feedback from actual customers."
      : "Customer reviews are not available right now, so I'll focus on technical specifications like speed, technology type, latency, and pricing to help the user choose.";

    // Start chat with system context
    const chat = model.startChat({
      history: [
        {
          role: "user",
          parts: [{ text: systemPrompt }],
        },
        {
          role: "model",
          parts: [{ text: `I understand. I'm ready to help users choose the best internet provider based on their needs. ${reviewAck} I'll be conversational, ask relevant questions, and make data-driven recommendations tailored to each user's specific requirements (streaming, gaming, WFH, budget, etc.).` }],
        },
      ],
      generationConfig: {
        temperature: 0.7,
        topP: 0.95,
        maxOutputTokens: 800,
      },
    });

    console.log('Chat session created successfully');
    return chat;

  } catch (error) {
    console.error('Error creating chat session:', error);
    throw error;
  }
};

/**
 * Send a message to the chatbot
 * @param {object} chatSession - Active chat session
 * @param {string} message - User message
 * @returns {Promise<string>} AI response
 */
export const sendMessage = async (chatSession, message) => {
  try {
    console.log('Sending message:', message);

    const result = await chatSession.sendMessage(message);
    const response = result.response;

    // Check for blocked responses
    if (!response) {
      console.warn('Empty response from Gemini');
      return "I wasn't able to generate a response. Please try rephrasing your question.";
    }

    // Check if response was blocked by safety filters
    if (response.promptFeedback?.blockReason) {
      console.warn('Response blocked:', response.promptFeedback.blockReason);
      return "I wasn't able to answer that question due to content restrictions. Please try a different question about your broadband options.";
    }

    const text = response.text();
    if (!text || text.trim().length === 0) {
      return "I wasn't able to generate a response. Could you try asking in a different way?";
    }

    console.log('Received response:', text.substring(0, 100) + '...');
    return text;

  } catch (error) {
    console.error('Error sending message:', error?.message || error);
    console.error('Full error:', JSON.stringify(error, Object.getOwnPropertyNames(error || {}), 2));

    // Return helpful error message
    if (error.message?.includes('API key') || error.message?.includes('API_KEY')) {
      return "I'm having trouble connecting to the AI service. Please check your API configuration.";
    } else if (error.message?.includes('quota') || error.message?.includes('RATE_LIMIT')) {
      return "I've reached my usage limit for now. Please try again in a minute.";
    } else if (error.message?.includes('SAFETY')) {
      return "I wasn't able to answer that due to content restrictions. Please try a different question about your broadband options.";
    } else if (error.message?.includes('not found') || error.message?.includes('404')) {
      return "The AI model is temporarily unavailable. Please try again later.";
    } else {
      return `I encountered a temporary issue (${error.message?.substring(0, 80) || 'unknown error'}). Please try again.`;
    }
  }
};

/**
 * Check if Gemini is available (API key configured)
 * @returns {boolean} True if Gemini is available
 */
export const isGeminiAvailable = () => {
  try {
    getGeminiKey();
    return true;
  } catch {
    return false;
  }
};

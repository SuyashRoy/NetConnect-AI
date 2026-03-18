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
      model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
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
  // Build data source context
  let dataSourceContext = '';
  if (dataSource === 'fcc-bdc-database' && pipelineMetadata) {
    dataSourceContext = `
**Data Source**: FCC Broadband Data Collection (official government data)
- State: ${pipelineMetadata.stateName || pipelineMetadata.state}
${pipelineMetadata.county ? `- County: ${pipelineMetadata.county}` : ''}
- Census Block: ${pipelineMetadata.censusBlock}
- Data as of: ${pipelineMetadata.dataAsOf || 'unknown'}
- Total providers found: ${pipelineMetadata.totalProviders || 'N/A'}
- Total service tiers: ${pipelineMetadata.totalServices || 'N/A'}
- Note: FCC data reflects what providers REPORT they can offer at the census-block level. Actual availability at the exact address may vary. Prices are estimated ranges (FCC data does not include pricing).`;
  } else if (dataSource) {
    dataSourceContext = `
**Data Source**: ${dataSource === 'zip-based' ? 'ZIP code lookup' : dataSource === 'fcc-api' ? 'FCC Broadband Map API' : 'Provider APIs'} (FCC database was not available for this location)
- Note: This data may be less precise than FCC census-block-level data.`;
  }

  // Format offerings information with detailed reviews
  const offeringsText = offerings.map((offering, idx) => {
    const reviewInfo = reviews[offering.provider];

    // Technology info
    const techName = techCodeToName(offering.technologyCode);
    const techLine = techName ? `   - Connection Type: ${techName}` : '';
    const latencyLine = offering.lowLatency ? '   - Low Latency: Yes (good for gaming/video calls)' : '';

    // Speed details
    const rawDownload = offering.maxDownloadMbps ? `${offering.maxDownloadMbps} Mbps` : offering.speed;
    const rawUpload = offering.maxUploadMbps ? `${offering.maxUploadMbps} Mbps` : (offering.uploadSpeed || 'N/A');

    // Reviews section
    let reviewSection = '   Customer Reviews: No reviews available for this provider';

    if (reviewInfo && reviewInfo.reviews && reviewInfo.reviews.length > 0) {
      const reviewSummary = `Overall Rating: ${reviewInfo.overallRating}/5 stars (${reviewInfo.totalReviews} total reviews)`;

      // Include actual review text for AI analysis
      const customerReviews = reviewInfo.reviews.map((review, rIdx) =>
        `      Review ${rIdx + 1}: "${review.text}" - ${review.author} (${review.rating}/5 stars, ${review.relativeTime})`
      ).join('\n');

      reviewSection = `   Customer Reviews:\n      ${reviewSummary}\n${customerReviews}`;
    }

    return `${idx + 1}. ${offering.name}
   - Provider: ${offering.provider}
   - Download Speed: ${rawDownload}
   - Upload Speed: ${rawUpload}
${techLine}${latencyLine}
   - Price: $${offering.price}/month
   - Features: ${offering.features.join(', ')}
   - Availability: ${offering.availability}
   - Data Source: ${offering.source || dataSource || 'unknown'}
${reviewSection}`;
  }).join('\n\n');

  // Determine if we have any reviews at all
  const hasAnyReviews = Object.values(reviews).some(r => r.reviews?.length > 0);

  return `You are a helpful and knowledgeable ISP (Internet Service Provider) recommendation assistant for NetConnect AI, a broadband comparison platform.

**User's Location**: ${userAddress}
${dataSourceContext}

**Available Internet Providers in this area** (${offerings.length} plans):

${offeringsText}

**Your Role and Guidelines**:

1. **Be Conversational and Friendly**: Use a warm, helpful tone. Ask clarifying questions to understand the user's needs.

2. **Ask About Usage Patterns**: Inquire about:
   - Primary internet usage (streaming, gaming, work from home, general browsing)
   - Number of people/devices in household
   - Budget constraints
   - Need for high upload speeds (for video calls, content creation, etc.)
   - Whether low latency matters (gaming, real-time video)
   - Contract preferences (month-to-month vs. annual)

3. **Make Smart Recommendations Based on User Needs**:
   - For gamers: Prioritize low-latency connections (Fiber > Cable > DSL) and upload speed
   - For streamers/large households: Prioritize high download speeds
   - For work from home: Prioritize reliability, upload speed, and low latency
   - For budget-conscious: Find the best value at needed speed tiers
   - For general browsing: Most plans will work, focus on price and reliability
   - Always explain WHY a plan is a good fit for their specific use case

4. **Understand Connection Types**:
   - Fiber (tech code 50): Fastest, lowest latency, symmetric upload/download, best for gaming and WFH
   - Cable (tech code 40): Good speeds, higher latency than fiber, upload speeds much lower than download
   - DSL (tech code 10): Slowest, uses phone lines, but widely available${hasAnyReviews ? `

5. **Analyze Customer Reviews Deeply**:
   - Read through the actual customer review text above
   - Identify common complaints or praise for each provider
   - Notice patterns in customer feedback (reliability, customer service, installation, etc.)
   - Use real customer quotes to support your recommendations
   - Be aware of recent vs. old reviews (check the relative time)
   - If customers report frequent outages, mention it even if speeds look good
   - Balance star ratings with the content of reviews

6. **Cite Specific Evidence**:
   - Reference actual customer quotes from reviews when relevant
   - Example: "Based on customer reviews, AT&T customers mention [specific feedback]"
   - Be transparent about what real customers are saying` : `

5. **No Customer Reviews Available**:
   - Customer reviews have not been loaded for these providers
   - Focus your recommendations on technical specifications (speed, technology type, latency)
   - Be transparent that you don't have customer experience data to reference`}

${hasAnyReviews ? '7' : '6'}. **Don't Make Things Up**: Only reference information from the offerings and reviews above. If you don't have certain information (like exact pricing from FCC data), say so honestly.

${hasAnyReviews ? '8' : '7'}. **Keep Responses Concise**: Aim for 3-5 sentences per response unless the user asks for detailed comparisons.

Start by greeting the user and asking what's most important to them when choosing an internet provider.`;
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
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 800, // Increased to allow for citing reviews
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
    const text = response.text();

    console.log('Received response:', text.substring(0, 100) + '...');

    return text;

  } catch (error) {
    console.error('Error sending message:', error);

    // Return helpful error message
    if (error.message?.includes('API key')) {
      return "I'm having trouble connecting to the AI service. Please check your API configuration.";
    } else if (error.message?.includes('quota')) {
      return "I've reached my usage limit for now. Please try again later or contact support.";
    } else {
      return "Sorry, I encountered an error. Please try rephrasing your question.";
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

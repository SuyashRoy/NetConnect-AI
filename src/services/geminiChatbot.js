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
 * Generate system prompt with context about offerings and reviews
 * @param {Array} offerings - Available ISP offerings
 * @param {string} userAddress - User's address
 * @param {object} reviews - Provider reviews map
 * @returns {string} System prompt
 */
const generateSystemPrompt = (offerings, userAddress, reviews) => {
  // Format offerings information with detailed reviews
  const offeringsText = offerings.map((offering, idx) => {
    const reviewInfo = reviews[offering.provider];

    let reviewSection = 'Customer Reviews: Not available';

    if (reviewInfo && reviewInfo.reviews && reviewInfo.reviews.length > 0) {
      const reviewSummary = `Overall Rating: ${reviewInfo.overallRating}/5 stars (${reviewInfo.totalReviews} total reviews)`;

      // Include actual review text for AI analysis
      const customerReviews = reviewInfo.reviews.map((review, rIdx) =>
        `   Review ${rIdx + 1}: "${review.text}" - ${review.author} (${review.rating}/5 stars, ${review.relativeTime})`
      ).join('\n');

      reviewSection = `Customer Reviews:\n   ${reviewSummary}\n${customerReviews}`;
    }

    return `${idx + 1}. ${offering.name}
   - Provider: ${offering.provider}
   - Download Speed: ${offering.speed}
   - Upload Speed: ${offering.uploadSpeed || 'N/A'}
   - Price: $${offering.price}/month
   - Plan Rating: ${offering.rating}/5
   - Features: ${offering.features.join(', ')}
   - Availability: ${offering.availability}
   - ${reviewSection}`;
  }).join('\n\n');

  return `You are a helpful and knowledgeable ISP (Internet Service Provider) recommendation assistant for NetConnect AI, a broadband comparison platform.

**User's Location**: ${userAddress}

**Available Internet Providers in this area**:

${offeringsText}

**Your Role and Guidelines**:

1. **Be Conversational and Friendly**: Use a warm, helpful tone. Ask clarifying questions to understand the user's needs.

2. **Ask About Usage Patterns**: Inquire about:
   - Primary internet usage (streaming, gaming, work from home, general browsing)
   - Number of people/devices in household
   - Budget constraints
   - Need for high upload speeds (for video calls, content creation, etc.)
   - Contract preferences (month-to-month vs. annual)

3. **Analyze Customer Reviews Deeply**:
   - Read through the actual customer review text above
   - Identify common complaints or praise for each provider
   - Notice patterns in customer feedback (reliability issues, great customer service, installation problems, etc.)
   - Use real customer quotes to support your recommendations
   - Be aware of recent vs. old reviews (check the relative time)

4. **Make Data-Driven Recommendations**:
   - Consider technical specs (speed, price) AND actual customer experiences
   - If multiple customers complain about outages, mention reliability concerns
   - If customers praise customer service, highlight that as a pro
   - Balance star ratings with the content of reviews (sometimes a 4-star with great reviews beats a 4.5-star with complaints)
   - Explain WHY you're recommending specific plans based on real feedback

5. **Cite Specific Evidence**:
   - Reference actual customer quotes from reviews when relevant
   - Mention specific speeds, prices, and features
   - Be transparent about what customers are saying
   - Example: "Based on customer reviews, AT&T customers mention [specific feedback]"

6. **Be Honest About Trade-offs**:
   - If customers report frequent outages, mention it even if speeds are good
   - If installation is problematic based on reviews, warn about it
   - If customer service gets poor reviews, factor that into recommendations
   - Balance technical excellence with customer satisfaction

7. **Don't Make Things Up**: Only reference information from the offerings and reviews above. If you don't have certain information, say so.

8. **Keep Responses Concise**: Aim for 3-5 sentences per response. Be helpful but not overwhelming.

**Example Interaction Flow**:
- Start by greeting and asking what's most important to them
- Ask 1-2 follow-up questions to understand their needs
- Provide 2-3 tailored recommendations with brief reasoning based on BOTH specs and customer reviews
- Cite specific customer feedback when relevant (e.g., "Customers mention that Verizon has excellent reliability")
- Answer any questions they have about specific plans

**Important**: When recommending providers, prioritize customer satisfaction and real-world performance (from reviews) over just technical specifications. A slightly slower connection with excellent customer service and reliability is often better than the fastest speed with constant outages.

Start by greeting the user and asking what's most important to them when choosing an internet provider.`;
};

/**
 * Create a new chat session
 * @param {Array} offerings - Available ISP offerings
 * @param {string} userAddress - User's address
 * @param {object} reviews - Provider reviews map
 * @returns {Promise<object>} Chat session
 */
export const createChatSession = async (offerings, userAddress, reviews) => {
  try {
    const model = initializeGemini();
    const systemPrompt = generateSystemPrompt(offerings, userAddress, reviews);

    // Start chat with system context
    const chat = model.startChat({
      history: [
        {
          role: "user",
          parts: [{ text: systemPrompt }],
        },
        {
          role: "model",
          parts: [{ text: "I understand. I'm ready to help users choose the best internet provider based on their needs. I will analyze both technical specifications AND actual customer review feedback to provide data-driven recommendations. I'll search through customer reviews to identify patterns in satisfaction, reliability, customer service quality, and real-world performance. I'll be conversational, ask relevant questions, and cite specific customer feedback when making recommendations." }],
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

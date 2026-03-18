/**
 * Chatbot Widget Component
 * AI-powered assistant to help users choose the best ISP
 */

import { useState, useEffect, useRef } from 'react';
import { MessageCircle, X, Send, Minimize2, Bot } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent, CardHeader, CardFooter } from './ui/card';
import { createChatSession, sendMessage, isGeminiAvailable } from '../services/geminiChatbot';

const ChatbotWidget = ({ offerings, reviews, reviewsLoading, userAddress, pipelineMetadata, dataSource }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [chatSession, setChatSession] = useState(null);
  const [error, setError] = useState(null);
  const [reviewsIncorporated, setReviewsIncorporated] = useState(false);
  const messagesEndRef = useRef(null);
  const initAttempted = useRef(false);

  // Check if Gemini is available
  const geminiAvailable = isGeminiAvailable();

  // Auto-open chatbot when offerings are loaded
  useEffect(() => {
    if (offerings.length > 0 && geminiAvailable) {
      setIsOpen(true);
    }
  }, [offerings, geminiAvailable]);

  // Scroll to bottom when messages change
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Initialize chat when widget opens AND reviews are done loading
  useEffect(() => {
    if (isOpen && !chatSession && !isLoading && !initAttempted.current && offerings.length > 0 && geminiAvailable && !reviewsLoading) {
      initializeChat();
    }
  }, [isOpen, offerings, geminiAvailable, reviewsLoading]);

  // Re-initialize chat session when reviews arrive after initial creation
  useEffect(() => {
    if (chatSession && !reviewsLoading && !reviewsIncorporated && reviews && Object.keys(reviews).length > 0) {
      console.log('Reviews loaded after chat init — reinitializing session with full context');
      setReviewsIncorporated(true);
      reinitializeWithReviews();
    }
  }, [reviews, reviewsLoading, chatSession, reviewsIncorporated]);

  const reinitializeWithReviews = async () => {
    try {
      const session = await createChatSession(offerings, userAddress, reviews || {}, pipelineMetadata, dataSource);
      setChatSession(session);
      // Keep existing messages but add a note
      setMessages(prev => [...prev, {
        text: "I've now loaded real customer reviews for the providers in your area. Ask me anything about what customers are saying!",
        isUser: false,
        timestamp: new Date()
      }]);
    } catch (err) {
      console.error('Failed to reinitialize with reviews:', err);
    }
  };

  const initializeChat = async () => {
    if (initAttempted.current) return;
    initAttempted.current = true;
    setIsLoading(true);
    setError(null);

    try {
      const hasReviews = reviews && Object.keys(reviews).length > 0;
      if (hasReviews) setReviewsIncorporated(true);

      // Timeout protection — abort if Gemini takes too long
      const sessionPromise = createChatSession(offerings, userAddress, reviews || {}, pipelineMetadata, dataSource);
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Chat initialization timed out')), 30000)
      );
      const session = await Promise.race([sessionPromise, timeoutPromise]);
      setChatSession(session);

      // Add welcome message with context awareness
      const hasReviewData = reviews && Object.values(reviews).some(r => r.reviews?.length > 0);
      const reviewNote = hasReviewData
        ? " I also have real customer reviews to help guide my recommendations."
        : "";
      setMessages([{
        text: `Hi! I'm your ISP assistant powered by AI. I can see ${offerings.length} broadband plans available at your location.${reviewNote} What's most important to you — speed, price, reliability, or something else?`,
        isUser: false,
        timestamp: new Date()
      }]);

    } catch (error) {
      console.error('Failed to initialize chatbot:', error);
      setError('Unable to start chat. Please try again.');

      setMessages([{
        text: "Sorry, I'm having trouble connecting right now. Please make sure your Gemini API key is configured in the .env file.",
        isUser: false,
        timestamp: new Date()
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim() || !chatSession || isLoading) return;

    const userMessage = inputValue.trim();
    setInputValue('');

    // Add user message
    setMessages(prev => [...prev, {
      text: userMessage,
      isUser: true,
      timestamp: new Date()
    }]);

    setIsLoading(true);

    try {
      // Timeout protection for message responses (30s — Gemini can be slow)
      const responsePromise = sendMessage(chatSession, userMessage);
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('timeout')), 30000)
      );
      const response = await Promise.race([responsePromise, timeoutPromise]);

      // Add AI response
      setMessages(prev => [...prev, {
        text: response,
        isUser: false,
        timestamp: new Date()
      }]);

    } catch (error) {
      console.error('Error in chat widget:', error);
      const errorText = error.message === 'timeout'
        ? "The AI assistant is taking too long to respond. Please try again."
        : "Sorry, I encountered an error processing your message. Please try again.";
      setMessages(prev => [...prev, {
        text: errorText,
        isUser: false,
        timestamp: new Date()
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Don't render if Gemini is not available
  if (!geminiAvailable) {
    return null;
  }

  // Closed state - floating button
  if (!isOpen) {
    return (
      <Button
        onClick={() => {
          // Reset init guard so re-opening can retry if previous attempt failed
          if (!chatSession) initAttempted.current = false;
          setIsOpen(true);
        }}
        className="fixed bottom-6 right-6 rounded-full h-14 px-6 shadow-lg hover:shadow-xl transition-all duration-300 z-[1000] bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 dark:from-sky-400 dark:to-indigo-400 dark:hover:from-sky-500 dark:hover:to-indigo-500 dark:text-gray-900 dark:font-semibold"
      >
        <MessageCircle className="h-5 w-5 mr-2" />
        Ask AI Assistant
      </Button>
    );
  }

  // Open state - chat window
  return (
    <Card className="fixed bottom-6 right-6 w-96 h-[600px] flex flex-col shadow-2xl z-[1000] border-2 border-blue-200 dark:border-blue-800">
      {/* Header */}
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-t-lg">
        <div className="flex items-center space-x-2">
          <div className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center">
            <Bot className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-semibold">ISP Assistant</h3>
            <p className="text-xs opacity-90">Powered by Gemini AI</p>
          </div>
        </div>
        <div className="flex items-center space-x-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsOpen(false)}
            className="h-8 w-8 p-0 text-white hover:bg-white/20"
          >
            <Minimize2 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsOpen(false)}
            className="h-8 w-8 p-0 text-white hover:bg-white/20"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      {/* Messages */}
      <CardContent className="flex-1 overflow-y-auto space-y-4 py-4">
        {/* Show preparing message while waiting for reviews to load */}
        {!chatSession && reviewsLoading && (
          <div className="flex justify-start">
            <div className="max-w-[85%] rounded-lg px-4 py-2.5 bg-gray-100 dark:bg-gray-800 text-foreground border border-gray-200 dark:border-gray-700">
              <p className="text-sm text-muted-foreground">Preparing assistant — loading customer reviews...</p>
            </div>
          </div>
        )}

        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex ${msg.isUser ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] rounded-lg px-4 py-2.5 ${
                msg.isUser
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-foreground border border-gray-200 dark:border-gray-700'
              }`}
            >
              <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.text}</p>
              <p className={`text-xs mt-1 ${msg.isUser ? 'text-blue-100' : 'text-muted-foreground'}`}>
                {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
        ))}

        {/* Loading indicator */}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 dark:bg-gray-800 rounded-lg px-4 py-3 border border-gray-200 dark:border-gray-700">
              <div className="flex space-x-2">
                <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </CardContent>

      {/* Input */}
      <CardFooter className="flex space-x-2 border-t pt-4">
        <Input
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Ask me anything..."
          disabled={isLoading || !chatSession}
          className="flex-1"
        />
        <Button
          onClick={handleSendMessage}
          disabled={isLoading || !chatSession || !inputValue.trim()}
          size="icon"
          className="bg-blue-600 hover:bg-blue-700"
        >
          <Send className="h-4 w-4" />
        </Button>
      </CardFooter>

      {/* Error message */}
      {error && (
        <div className="absolute bottom-20 left-4 right-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
          <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}
    </Card>
  );
};

export default ChatbotWidget;

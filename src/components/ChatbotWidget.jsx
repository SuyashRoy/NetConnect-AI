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

const ChatbotWidget = ({ offerings, reviews, userAddress }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [chatSession, setChatSession] = useState(null);
  const [error, setError] = useState(null);
  const messagesEndRef = useRef(null);

  // Check if Gemini is available
  const geminiAvailable = isGeminiAvailable();

  // Scroll to bottom when messages change
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Initialize chat when widget opens
  useEffect(() => {
    if (isOpen && !chatSession && offerings.length > 0 && geminiAvailable) {
      initializeChat();
    }
  }, [isOpen, offerings, geminiAvailable]);

  const initializeChat = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const session = await createChatSession(offerings, userAddress, reviews || {});
      setChatSession(session);

      // Add welcome message
      setMessages([{
        text: "Hi! I'm your ISP assistant powered by AI. I can help you choose the best internet provider for your needs. What's most important to you - speed, price, reliability, or something else?",
        isUser: false,
        timestamp: new Date()
      }]);

    } catch (error) {
      console.error('Failed to initialize chatbot:', error);
      setError('Unable to start chat. Please check your internet connection.');

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
      const response = await sendMessage(chatSession, userMessage);

      // Add AI response
      setMessages(prev => [...prev, {
        text: response,
        isUser: false,
        timestamp: new Date()
      }]);

    } catch (error) {
      console.error('Error sending message:', error);
      setMessages(prev => [...prev, {
        text: "Sorry, I encountered an error processing your message. Please try again.",
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
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 rounded-full h-14 px-6 shadow-lg hover:shadow-xl transition-all duration-300 z-50 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
      >
        <MessageCircle className="h-5 w-5 mr-2" />
        Ask AI Assistant
      </Button>
    );
  }

  // Open state - chat window
  return (
    <Card className="fixed bottom-6 right-6 w-96 h-[600px] flex flex-col shadow-2xl z-50 border-2 border-blue-200 dark:border-blue-800">
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

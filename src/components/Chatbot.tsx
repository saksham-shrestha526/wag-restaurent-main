import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MessageCircle, X, Send, Bot, User, Loader2, Maximize2, Minimize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/lib/auth-context';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import 'highlight.js/styles/github-dark.css'; // or any other theme

const Chatbot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [messages, setMessages] = useState<{ role: string; content: string }[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const { user } = useAuth();
  const scrollRef = useRef<HTMLDivElement>(null);

  const toggleFullscreen = () => setIsFullscreen(!isFullscreen);

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      const greeting = user
        ? `Welcome to WAG, ${user.name}. I am your AI Concierge. How may I assist you tonight?`
        : "Welcome to WAG. I am your luxury culinary assistant. How may I help you explore our exquisite menu tonight?";
      setMessages([{ role: 'assistant', content: greeting }]);
    }
  }, [user, isOpen, messages.length]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const handleSend = async (text?: string) => {
    const messageText = text || input;
    if (!messageText.trim()) return;

    const userMsg = { role: 'user', content: messageText };
    setMessages(prev => [...prev, userMsg]);
    if (!text) setInput('');
    setIsTyping(true);

    try {
      const res = await fetch('/api/concierge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          messages: [...messages, userMsg],
          userName: user?.name || 'Guest'
        })
      });

      if (!res.ok) throw new Error('Concierge offline');

      const data = await res.json();
      const aiMsg = { role: 'assistant', content: data.reply };
      setMessages(prev => [...prev, aiMsg]);
    } catch (error) {
      console.error('Concierge error:', error);
      const localReply = getLocalResponse(messageText);
      setMessages(prev => [...prev, { role: 'assistant', content: localReply }]);
    } finally {
      setIsTyping(false);
    }
  };

  const getLocalResponse = (msg: string): string => {
    const lower = msg.toLowerCase();
    if (lower.includes('menu')) return "Our menu features Wagyu steak, truffle pasta, saffron risotto, and more. View full menu on our Menu page.";
    if (lower.includes('reserv')) return "You can book a table through our Reservations page or call +977 1 4235678.";
    if (lower.includes('hour')) return "We are open daily 5 PM – 11 PM. Last seating at 10 PM.";
    if (lower.includes('price')) return "Appetizers $15–35, mains $35–120, tasting menu $85. 13% VAT and 10% service charge apply.";
    if (lower.includes('parking')) return "Valet parking $5 (5–11 PM). Street parking available.";
    if (lower.includes('dress')) return "Smart casual: collared shirts, dress shoes. No athletic wear or flip-flops.";
    if (lower.includes('veg')) return "Yes, we have vegetarian, vegan, and gluten-free options. Please inform your server.";
    return "I'm here to help with menu, reservations, hours, events, and more. What would you like to know?";
  };

  const suggestedQuestions = [
    "What's the chef's special?",
    "Do you have vegetarian options?",
    "How do I make a reservation?"
  ];

  // Custom component to render code blocks without className error
  const components = {
    code({ node, inline, className, children, ...props }: any) {
      const match = /language-(\w+)/.exec(className || '');
      return !inline && match ? (
        <pre className="bg-black/50 p-3 rounded-lg overflow-x-auto my-2">
          <code className={className} {...props}>
            {children}
          </code>
        </pre>
      ) : (
        <code className="bg-black/30 px-1 rounded" {...props}>
          {children}
        </code>
      );
    },
    // Override pre to avoid extra className issues
    pre({ children }: any) {
      return <pre className="bg-black/50 p-3 rounded-lg overflow-x-auto my-2">{children}</pre>;
    }
  };

  return (
    <>
      <motion.div
        className="fixed bottom-6 right-6 z-[60]"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
      >
        <Button
          onClick={() => setIsOpen(!isOpen)}
          className="h-14 w-14 rounded-full gold-gradient shadow-2xl flex items-center justify-center p-0"
        >
          {isOpen ? <X className="h-6 w-6 text-primary-foreground" /> : <MessageCircle className="h-6 w-6 text-primary-foreground" />}
        </Button>
      </motion.div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.1 }}
            className={`fixed bottom-24 right-6 z-[60] flex flex-col overflow-hidden border-white/10 shadow-2xl rounded-3xl bg-black/95 backdrop-blur-xl ${
              isFullscreen
                ? 'fixed inset-0 w-full h-full bottom-0 right-0 rounded-none'
                : 'w-[85vw] md:w-[450px] h-[550px]'
            }`}
          >
            {/* Header */}
            <div className="p-5 gold-gradient flex items-center justify-between shrink-0">
              <div className="flex items-center space-x-3">
                <div className="h-9 w-9 rounded-full bg-white/20 flex items-center justify-center">
                  <Bot className="h-5 w-5 text-white" />
                </div>
                <div>
                  <div className="font-bold text-white text-sm">WAG Assistant</div>
                  <div className="text-[9px] text-white/80 uppercase tracking-widest flex items-center">
                    <span className="h-1.5 w-1.5 rounded-full bg-green-400 mr-2 animate-pulse" />
                    Online
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleFullscreen}
                  className="h-8 w-8 text-white hover:bg-white/10"
                >
                  {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsOpen(false)}
                  className="h-8 w-8 text-white hover:bg-white/10"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Messages with Markdown rendering */}
            <div className="flex-grow overflow-y-auto p-6 no-scrollbar" ref={scrollRef}>
              <div className="space-y-6">
                {messages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === 'assistant' ? 'justify-start' : 'justify-end'}`}>
                    <div className={`flex max-w-[85%] space-x-2 ${msg.role === 'assistant' ? '' : 'flex-row-reverse space-x-reverse'}`}>
                      <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${msg.role === 'assistant' ? 'bg-primary/20 text-primary' : 'bg-white/10 text-white'}`}>
                        {msg.role === 'assistant' ? <Bot size={16} /> : <User size={16} />}
                      </div>
                      <div
                        className={`p-4 rounded-2xl text-sm leading-relaxed overflow-x-auto ${
                          msg.role === 'assistant'
                            ? 'bg-white/5 border border-white/5 text-white'
                            : 'gold-gradient text-primary-foreground font-medium'
                        }`}
                      >
                        {msg.role === 'assistant' ? (
                          <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            rehypePlugins={[rehypeHighlight]}
                            components={components}
                          >
                            {msg.content}
                          </ReactMarkdown>
                        ) : (
                          <div style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                {isTyping && (
                  <div className="flex justify-start">
                    <div className="flex space-x-2">
                      <div className="h-8 w-8 rounded-full bg-primary/20 text-primary flex items-center justify-center">
                        <Bot size={16} />
                      </div>
                      <div className="bg-white/5 p-4 rounded-2xl flex space-x-1">
                        <span className="w-1.5 h-1.5 bg-primary/40 rounded-full animate-bounce" />
                        <span className="w-1.5 h-1.5 bg-primary/40 rounded-full animate-bounce delay-100" />
                        <span className="w-1.5 h-1.5 bg-primary/40 rounded-full animate-bounce delay-200" />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {messages.length < 3 && (
              <div className="px-6 pb-4 flex flex-wrap gap-2 shrink-0">
                {suggestedQuestions.map((q, i) => (
                  <button
                    key={i}
                    onClick={() => handleSend(q)}
                    className="text-[10px] bg-white/5 border border-white/10 px-3 py-1.5 rounded-full hover:bg-primary/10 hover:border-primary/30 transition-all text-white"
                  >
                    {q}
                  </button>
                ))}
              </div>
            )}

            <div className="p-4 border-t border-white/10 bg-black/20 shrink-0">
              <form
                className="flex space-x-2"
                onSubmit={(e) => { e.preventDefault(); handleSend(); }}
              >
                <Input
                  placeholder="Ask WAG..."
                  className="bg-white/5 border-white/10 focus:border-primary h-10 text-sm text-white"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                />
                <Button type="submit" className="gold-gradient text-primary-foreground h-10 w-10" size="icon">
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default Chatbot;
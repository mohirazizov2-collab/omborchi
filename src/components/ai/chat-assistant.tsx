'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, X, Send, Bot, User, Loader2, Minimize2, AlertCircle, RefreshCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { chatWithAI } from '@/ai/flows/chat-flow';
import { cn } from '@/lib/utils';

interface Message {
  role: 'user' | 'model';
  content: string;
  isError?: boolean;
}

export function ChatAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: 'model', content: "Assalomu alaykum! Men Omborchi AI yordamchisiman. Sizga qanday yordam bera olaman?" }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      const response = await chatWithAI({
        message: userMessage,
        history: messages.filter(m => !m.isError).map(m => ({ role: m.role, content: m.content }))
      });
      setMessages(prev => [...prev, { role: 'model', content: response.response }]);
    } catch (error: any) {
      console.error('Chat error:', error);
      
      let errorMessage = "Xatolik yuz berdi.";
      const errorStr = String(error?.message || "").toLowerCase();
      
      if (errorStr.includes('429')) {
        errorMessage = "AI limiti tugadi. Iltimos, 1 daqiqa kuting.";
      } else if (errorStr.includes('key') || errorStr.includes('api') || errorStr.includes('valid')) {
        errorMessage = "API kaliti xato yoki ruxsat berilmagan. Kalitni Google AI Studio-da tekshiring.";
      } else {
        errorMessage = `Xato: ${error.message || 'Server bilan aloqa uzildi'}`;
      }

      setMessages(prev => [...prev, { 
        role: 'model', 
        content: errorMessage,
        isError: true
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <motion.div
        className="fixed bottom-6 right-6 z-[100]"
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
      >
        <Button
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            "w-14 h-14 rounded-full shadow-2xl premium-button transition-all duration-500",
            isOpen ? "bg-destructive text-white" : "bg-primary text-white"
          )}
        >
          {isOpen ? <X className="w-6 h-6" /> : <Sparkles className="w-6 h-6 animate-pulse" />}
        </Button>
      </motion.div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 100, scale: 0.8, transformOrigin: 'bottom right' }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 100, scale: 0.8 }}
            className="fixed bottom-24 right-6 z-[100] w-[400px] max-w-[calc(100vw-3rem)]"
          >
            <Card className="border-none glass-card shadow-2xl overflow-hidden flex flex-col h-[550px]">
              <CardHeader className="bg-primary/10 border-b border-white/5 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-white">
                      <Bot className="w-6 h-6" />
                    </div>
                    <div>
                      <CardTitle className="text-sm font-black tracking-tight">Omborchi AI</CardTitle>
                      <div className="flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Online</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={() => setMessages([{ role: 'model', content: "Suhbat tozalandi. Sizga yana qanday yordam bera olaman?" }])}>
                      <RefreshCcw className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={() => setIsOpen(false)}>
                      <Minimize2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="flex-1 p-0 bg-background/20 overflow-hidden">
                <ScrollArea className="h-full p-6">
                  <div className="space-y-6">
                    {messages.map((m, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: m.role === 'user' ? 20 : -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className={cn(
                          "flex gap-3",
                          m.role === 'user' ? "flex-row-reverse" : "flex-row"
                        )}
                      >
                        <div className={cn(
                          "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                          m.role === 'user' ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
                        )}>
                          {m.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                        </div>
                        <div className={cn(
                          "p-4 rounded-2xl text-sm max-w-[80%] shadow-sm",
                          m.role === 'user' 
                            ? "bg-primary text-white rounded-tr-none" 
                            : cn("bg-card border border-white/5 text-foreground rounded-tl-none", m.isError && "border-destructive/30 bg-destructive/5 text-destructive")
                        )}>
                          {m.isError && <AlertCircle className="w-4 h-4 mb-2 inline-block mr-2" />}
                          <p className="leading-relaxed font-medium inline">{m.content}</p>
                        </div>
                      </motion.div>
                    ))}
                    {isLoading && (
                      <div className="flex gap-3">
                        <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-muted-foreground">
                          <Bot className="w-4 h-4" />
                        </div>
                        <div className="bg-card border border-white/5 p-4 rounded-2xl rounded-tl-none">
                          <Loader2 className="w-4 h-4 animate-spin text-primary" />
                        </div>
                      </div>
                    )}
                    <div ref={scrollRef} />
                  </div>
                </ScrollArea>
              </CardContent>

              <CardFooter className="p-4 bg-background/40 border-t border-white/5">
                <form 
                  onSubmit={(e) => { e.preventDefault(); handleSend(); }}
                  className="flex w-full gap-2 items-center"
                >
                  <Input
                    placeholder="Savol kiring..."
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    className="flex-1 h-11 rounded-xl bg-background border-white/10 focus:ring-primary/50"
                    disabled={isLoading}
                  />
                  <Button 
                    type="submit" 
                    size="icon" 
                    className="h-11 w-11 rounded-xl bg-primary text-white shadow-lg shadow-primary/20"
                    disabled={isLoading || !input.trim()}
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </form>
              </CardFooter>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

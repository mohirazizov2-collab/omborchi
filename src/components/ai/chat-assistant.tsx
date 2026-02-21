'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, X, Send, Bot, User, Loader2, Minimize2, AlertCircle, RefreshCcw, ArrowRight } from 'lucide-react';
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

  const suggestedQuestions = [
    "Omborni qanday samarali boshqarish mumkin?",
    "Zaxiralarni kamaytirish bo'yicha tavsiyalar bering.",
    "Tizimda qanday qilib yangi kirim qilish mumkin?",
    "Eng ko'p sotilgan mahsulotlar tahlili kerak."
  ];

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleSend = async (customMessage?: string) => {
    const messageToSend = customMessage || input.trim();
    if (!messageToSend || isLoading) return;

    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: messageToSend }]);
    setIsLoading(true);

    try {
      const response = await chatWithAI({
        message: messageToSend,
        history: messages.filter(m => !m.isError).map(m => ({ role: m.role, content: m.content }))
      });
      setMessages(prev => [...prev, { role: 'model', content: response.response }]);
    } catch (error: any) {
      console.error('Chat error:', error);
      let errorMessage = "Xatolik yuz berdi.";
      const errorStr = String(error?.message || "").toLowerCase();
      if (errorStr.includes('429')) errorMessage = "AI limiti tugadi. Iltimos, 1 daqiqa kuting.";
      else errorMessage = `Xato: ${error.message || 'Server bilan aloqa uzildi'}`;

      setMessages(prev => [...prev, { role: 'model', content: errorMessage, isError: true }]);
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
            isOpen ? "bg-rose-500 text-white" : "bg-primary text-white"
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
            className="fixed bottom-24 right-6 z-[100] w-[420px] max-w-[calc(100vw-3rem)]"
          >
            <Card className="border-none glass-card shadow-[0_32px_64px_-16px_rgba(0,0,0,0.2)] dark:shadow-[0_32px_64px_-16px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col h-[600px] rounded-[2.5rem] bg-card/80 backdrop-blur-3xl">
              <CardHeader className="bg-primary/10 border-b border-white/5 py-5 px-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-primary flex items-center justify-center text-white shadow-lg shadow-primary/20">
                      <Bot className="w-6 h-6" />
                    </div>
                    <div>
                      <CardTitle className="text-sm font-black tracking-tight">Omborchi AI</CardTitle>
                      <div className="flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60">Expert Assistant</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl hover:bg-white/10" onClick={() => setMessages([{ role: 'model', content: "Assalomu alaykum! Men Omborchi AI yordamchisiman. Sizga qanday yordam bera olaman?" }])}>
                      <RefreshCcw className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl hover:bg-white/10" onClick={() => setIsOpen(false)}>
                      <Minimize2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="flex-1 p-0 overflow-hidden relative">
                <ScrollArea className="h-full p-6">
                  <div className="space-y-6 pb-4">
                    {messages.map((m, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={cn("flex gap-3", m.role === 'user' ? "flex-row-reverse" : "flex-row")}
                      >
                        <div className={cn(
                          "w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-sm",
                          m.role === 'user' ? "bg-primary text-white" : "bg-muted text-muted-foreground"
                        )}>
                          {m.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                        </div>
                        <div className={cn(
                          "p-4 rounded-2xl text-sm max-w-[85%] shadow-sm leading-relaxed font-medium",
                          m.role === 'user' 
                            ? "bg-primary text-white rounded-tr-none" 
                            : cn("bg-card border border-white/5 text-foreground rounded-tl-none", m.isError && "border-rose-500/30 bg-rose-500/5 text-rose-500")
                        )}>
                          {m.isError && <AlertCircle className="w-4 h-4 mb-2 inline-block mr-2" />}
                          {m.content}
                        </div>
                      </motion.div>
                    ))}
                    {isLoading && (
                      <div className="flex gap-3">
                        <div className="w-8 h-8 rounded-xl bg-muted flex items-center justify-center text-muted-foreground animate-pulse">
                          <Bot className="w-4 h-4" />
                        </div>
                        <div className="bg-muted/30 p-4 rounded-2xl rounded-tl-none">
                          <Loader2 className="w-4 h-4 animate-spin text-primary" />
                        </div>
                      </div>
                    )}

                    {/* Suggested Questions */}
                    {!isLoading && messages.length < 3 && (
                      <div className="pt-4 space-y-2">
                        <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/40 px-2 mb-3">Tavsiya etilgan savollar</p>
                        {suggestedQuestions.map((q, idx) => (
                          <motion.button
                            key={idx}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.1 * idx }}
                            onClick={() => handleSend(q)}
                            className="w-full text-left p-3 rounded-2xl bg-primary/5 hover:bg-primary/10 border border-primary/10 text-[11px] font-bold text-primary transition-all flex items-center justify-between group"
                          >
                            {q}
                            <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </motion.button>
                        ))}
                      </div>
                    )}
                    <div ref={scrollRef} />
                  </div>
                </ScrollArea>
              </CardContent>

              <CardFooter className="p-4 bg-background/60 border-t border-white/5 backdrop-blur-md">
                <form 
                  onSubmit={(e) => { e.preventDefault(); handleSend(); }}
                  className="flex w-full gap-2 items-center"
                >
                  <Input
                    placeholder="Xabar yozing..."
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    className="flex-1 h-12 rounded-2xl bg-background/50 border-white/10 focus:ring-primary/40 focus:border-primary/40 text-sm font-medium"
                    disabled={isLoading}
                  />
                  <Button 
                    type="submit" 
                    size="icon" 
                    className="h-12 w-12 rounded-2xl bg-primary text-white shadow-xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all"
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
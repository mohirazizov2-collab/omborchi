'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, 
  X, 
  Send, 
  Bot, 
  User, 
  Loader2, 
  Minimize2, 
  AlertCircle, 
  RefreshCcw, 
  ArrowRight,
  Zap,
  Package,
  Warehouse
} from 'lucide-react';
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
    { role: 'model', content: "Assalomu alaykum! Men Omborchi GPT - sizning aqlli yordamchingizman. Qaysi mahsulotni tekshiramiz yoki qanday yordam kerak?" }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const suggestedQuestions = [
    { text: "Stol qoldig'ini tekshir", icon: Package },
    { text: "Omborlar ro'yxatini ber", icon: Warehouse },
    { text: "Zaxiralarni kamaytirish bo'yicha maslahat", icon: Zap },
    { text: "Yangi kirim qanday qilinadi?", icon: ArrowRight }
  ];

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isLoading]);

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
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <Button
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            "w-16 h-16 rounded-full shadow-[0_20px_50px_rgba(59,130,246,0.3)] transition-all duration-500 p-0 border-none group",
            isOpen ? "bg-rose-500" : "bg-primary"
          )}
        >
          {isOpen ? (
            <X className="w-7 h-7 text-white" />
          ) : (
            <div className="relative">
              <Bot className="w-8 h-8 text-white animate-bounce" />
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border-2 border-primary animate-pulse" />
            </div>
          )}
        </Button>
      </motion.div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 100, scale: 0.9, transformOrigin: 'bottom right' }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 100, scale: 0.9 }}
            className="fixed bottom-24 right-6 z-[100] w-[440px] max-w-[calc(100vw-3rem)]"
          >
            <Card className="border-none shadow-[0_32px_120px_-20px_rgba(0,0,0,0.3)] dark:shadow-[0_32px_120px_-20px_rgba(0,0,0,0.6)] overflow-hidden flex flex-col h-[650px] rounded-[3rem] bg-card/95 backdrop-blur-2xl">
              <CardHeader className="bg-primary/5 border-b border-white/5 py-6 px-8">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-[1.25rem] bg-primary flex items-center justify-center text-white shadow-xl shadow-primary/20">
                      <Zap className="w-6 h-6 fill-white" />
                    </div>
                    <div>
                      <CardTitle className="text-base font-black tracking-tight">Omborchi GPT</CardTitle>
                      <div className="flex items-center gap-1.5">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                        </span>
                        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Tizimga bog'langan</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" className="h-10 w-10 rounded-2xl hover:bg-white/10" onClick={() => setMessages([{ role: 'model', content: "Xush kelibsiz! Men sizga yordam berishga tayyorman." }])}>
                      <RefreshCcw className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-10 w-10 rounded-2xl hover:bg-rose-500/10 text-rose-500" onClick={() => setIsOpen(false)}>
                      <X className="w-5 h-5" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="flex-1 p-0 overflow-hidden relative">
                <ScrollArea className="h-full p-8">
                  <div className="space-y-8 pb-6">
                    {messages.map((m, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={cn("flex gap-4", m.role === 'user' ? "flex-row-reverse" : "flex-row")}
                      >
                        <div className={cn(
                          "w-9 h-9 rounded-2xl flex items-center justify-center shrink-0 shadow-lg",
                          m.role === 'user' ? "bg-primary text-white" : "bg-muted text-muted-foreground"
                        )}>
                          {m.role === 'user' ? <User className="w-5 h-5" /> : <Zap className="w-5 h-5" />}
                        </div>
                        <div className={cn(
                          "p-5 rounded-[1.75rem] text-sm max-w-[85%] shadow-sm leading-relaxed font-bold",
                          m.role === 'user' 
                            ? "bg-primary text-white rounded-tr-none" 
                            : cn("bg-muted/30 border border-white/5 text-foreground rounded-tl-none", m.isError && "border-rose-500/30 bg-rose-500/5 text-rose-500")
                        )}>
                          {m.isError && <AlertCircle className="w-4 h-4 mb-2 inline-block mr-2" />}
                          {m.content}
                        </div>
                      </motion.div>
                    ))}
                    {isLoading && (
                      <div className="flex gap-4">
                        <div className="w-9 h-9 rounded-2xl bg-muted flex items-center justify-center text-muted-foreground animate-pulse">
                          <Bot className="w-5 h-5" />
                        </div>
                        <div className="bg-muted/20 p-5 rounded-[1.75rem] rounded-tl-none border border-white/5 flex items-center gap-3">
                          <Loader2 className="w-4 h-4 animate-spin text-primary" />
                          <span className="text-xs font-black uppercase tracking-widest opacity-40">GPT o'ylamoqda...</span>
                        </div>
                      </div>
                    )}

                    {!isLoading && messages.length < 3 && (
                      <div className="pt-6 space-y-3">
                        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground/40 px-2">Tezkor amallar</p>
                        <div className="grid grid-cols-1 gap-2">
                          {suggestedQuestions.map((q, idx) => (
                            <motion.button
                              key={idx}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: 0.1 * idx }}
                              onClick={() => handleSend(q.text)}
                              className="w-full text-left p-4 rounded-2xl bg-primary/[0.03] hover:bg-primary/10 border border-primary/10 text-[11px] font-black text-primary transition-all flex items-center justify-between group"
                            >
                              <div className="flex items-center gap-3">
                                <q.icon className="w-4 h-4 opacity-60" />
                                {q.text}
                              </div>
                              <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0" />
                            </motion.button>
                          ))}
                        </div>
                      </div>
                    )}
                    <div ref={scrollRef} />
                  </div>
                </ScrollArea>
              </CardContent>

              <CardFooter className="p-6 bg-background/40 border-t border-white/5 backdrop-blur-xl">
                <form 
                  onSubmit={(e) => { e.preventDefault(); handleSend(); }}
                  className="flex w-full gap-3 items-center"
                >
                  <div className="relative flex-1">
                    <Input
                      placeholder="GPT-dan so'rang..."
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      className="h-14 pl-6 pr-12 rounded-2xl bg-background/50 border-white/10 focus:ring-primary/40 focus:border-primary/40 text-sm font-bold shadow-inner"
                      disabled={isLoading}
                    />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[8px] font-black uppercase tracking-widest opacity-20 hidden md:block">
                      Enter
                    </div>
                  </div>
                  <Button 
                    type="submit" 
                    size="icon" 
                    className="h-14 w-14 rounded-2xl bg-primary text-white shadow-2xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all flex-shrink-0"
                    disabled={isLoading || !input.trim()}
                  >
                    <Send className="w-5 h-5" />
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


'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Send, 
  Bot, 
  User, 
  Loader2, 
  AlertCircle, 
  RefreshCcw, 
  ArrowRight,
  Zap,
  Package,
  Warehouse,
  ChevronDown,
  Sparkles,
  Info
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
    { role: 'model', content: "Assalomu alaykum! Men Omborchi GPT - sizning aqlli yordamchingizman. Qanday yordam bera olaman?" }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const suggestedActions = [
    { text: "Mahsulot qoldig'ini bilish", icon: Package },
    { text: "Omborlar ro'yxati", icon: Warehouse },
    { text: "Tizim qanday ishlaydi?", icon: Sparkles }
  ];

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isLoading]);

  const handleSend = async (customMessage?: string) => {
    const text = customMessage || input.trim();
    if (!text || isLoading) return;

    setInput('');
    const userMsg: Message = { role: 'user', content: text };
    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);

    try {
      const response = await chatWithAI({
        message: text,
        history: messages.filter(m => !m.isError).map(m => ({ role: m.role, content: m.content }))
      });
      setMessages(prev => [...prev, { role: 'model', content: response.response }]);
    } catch (error: any) {
      console.error('AI Chat Error:', error);
      let errMsg = "AI bilan bog'lanib bo'lmadi. Kalit yoki ulanishni tekshiring.";
      const errorStr = String(error?.message || "").toLowerCase();
      
      if (errorStr.includes('expired')) {
        errMsg = "API kalitining muddati tugagan. Iltimos, Google AI Studiodan yangi kalit oling.";
      } else if (errorStr.includes('429')) {
        errMsg = "AI so'rovlar limiti tugadi. Bir ozdan keyin urinib ko'ring.";
      } else if (errorStr.includes('404')) {
        errMsg = "Model topilmadi yoki API kalit noto'g'ri kiritilgan.";
      }

      setMessages(prev => [...prev, { role: 'model', content: errMsg, isError: true }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <motion.div
        className="fixed bottom-8 right-8 z-[100]"
        initial={{ scale: 0, rotate: -20 }}
        animate={{ scale: 1, rotate: 0 }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
      >
        <Button
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            "w-16 h-16 rounded-[2rem] shadow-2xl shadow-primary/40 transition-all duration-500 p-0 border-none group",
            isOpen ? "bg-rose-500" : "bg-primary"
          )}
        >
          {isOpen ? (
            <ChevronDown className="w-8 h-8 text-white" />
          ) : (
            <div className="relative">
              <Bot className="w-8 h-8 text-white" />
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border-2 border-primary animate-pulse" />
            </div>
          )}
        </Button>
      </motion.div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 100, scale: 0.8, transformOrigin: 'bottom right' }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 100, scale: 0.8 }}
            className="fixed bottom-28 right-8 z-[100] w-[450px] max-w-[calc(100vw-4rem)]"
          >
            <Card className="border-none shadow-[0_40px_120px_-20px_rgba(0,0,0,0.4)] overflow-hidden flex flex-col h-[680px] rounded-[3rem] bg-card/90 backdrop-blur-3xl border border-white/5">
              <CardHeader className="bg-gradient-to-br from-primary/10 to-transparent py-8 px-8 border-b border-white/5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center text-white shadow-xl shadow-primary/20">
                      <Zap className="w-7 h-7 fill-white" />
                    </div>
                    <div>
                      <CardTitle className="text-xl font-black tracking-tight">Omborchi GPT</CardTitle>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Tizimga bog'langan</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl hover:bg-white/10" onClick={() => setMessages([{ role: 'model', content: "Suhbat tozalandi. Qanday yordam berishim mumkin?" }])}>
                      <RefreshCcw className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl hover:bg-rose-500/10 text-rose-500" onClick={() => setIsOpen(false)}>
                      <X className="w-5 h-5" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="flex-1 p-0 overflow-hidden relative bg-gradient-to-b from-transparent to-primary/[0.02]">
                <ScrollArea className="h-full p-8 scrollbar-hide">
                  <div className="space-y-8 pb-6">
                    {messages.map((m, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 20, x: m.role === 'user' ? 20 : -20 }}
                        animate={{ opacity: 1, y: 0, x: 0 }}
                        className={cn("flex gap-4", m.role === 'user' ? "flex-row-reverse" : "flex-row")}
                      >
                        <div className={cn(
                          "w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-lg",
                          m.role === 'user' ? "bg-primary text-white" : "bg-muted text-muted-foreground"
                        )}>
                          {m.role === 'user' ? <User className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
                        </div>
                        <div className={cn(
                          "p-5 rounded-[2rem] text-sm max-w-[80%] shadow-sm leading-relaxed font-bold",
                          m.role === 'user' 
                            ? "bg-primary text-white rounded-tr-none" 
                            : cn("bg-muted/40 border border-white/5 text-foreground rounded-tl-none", m.isError && "border-rose-500/30 bg-rose-500/5 text-rose-500")
                        )}>
                          {m.isError && <AlertCircle className="w-4 h-4 mb-2 inline-block mr-2" />}
                          {m.content}
                        </div>
                      </motion.div>
                    ))}
                    
                    {isLoading && (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-4">
                        <div className="w-10 h-10 rounded-2xl bg-muted flex items-center justify-center text-muted-foreground animate-pulse">
                          <Bot className="w-5 h-5" />
                        </div>
                        <div className="bg-muted/20 p-5 rounded-[2rem] rounded-tl-none border border-white/5 flex items-center gap-3">
                          <Loader2 className="w-4 h-4 animate-spin text-primary" />
                          <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40">GPT o'ylamoqda...</span>
                        </div>
                      </motion.div>
                    )}

                    {!isLoading && messages.length < 3 && (
                      <div className="pt-6 space-y-3">
                        <p className="text-[10px] font-black uppercase tracking-[0.4em] text-muted-foreground/40 px-2">Tezkor savollar</p>
                        <div className="grid grid-cols-1 gap-2">
                          {suggestedActions.map((act, idx) => (
                            <motion.button
                              key={idx}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: 0.1 * idx }}
                              onClick={() => handleSend(act.text)}
                              className="w-full text-left p-4 rounded-2xl bg-primary/[0.03] hover:bg-primary/10 border border-primary/10 text-[11px] font-black text-primary transition-all flex items-center justify-between group"
                            >
                              <div className="flex items-center gap-3">
                                <act.icon className="w-4 h-4 opacity-60" />
                                {act.text}
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

              <CardFooter className="p-8 bg-background/60 border-t border-white/5 backdrop-blur-3xl">
                <form 
                  onSubmit={(e) => { e.preventDefault(); handleSend(); }}
                  className="flex w-full gap-3 items-center"
                >
                  <div className="relative flex-1">
                    <Input
                      placeholder="Savolingizni yozing..."
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      className="h-16 pl-6 pr-12 rounded-[1.5rem] bg-background/50 border-white/10 focus:ring-primary/40 focus:border-primary/40 text-sm font-bold shadow-inner"
                      disabled={isLoading}
                    />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[8px] font-black uppercase tracking-widest opacity-20 hidden md:block">
                      Enter
                    </div>
                  </div>
                  <Button 
                    type="submit" 
                    size="icon" 
                    className="h-16 w-16 rounded-2xl bg-primary text-white shadow-2xl shadow-primary/30 hover:scale-105 active:scale-95 transition-all flex-shrink-0"
                    disabled={isLoading || !input.trim()}
                  >
                    <Send className="w-6 h-6" />
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

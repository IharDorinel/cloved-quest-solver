import { useState, useRef, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Send, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
}

interface ChatProps {
  className?: string;
}

export function Chat({ className }: ChatProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: 'Привет! Я ваш AI-помощник. Как дела? О чём хотите поговорить?',
      isUser: false,
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const simulateAIResponse = async (userMessage: string): Promise<string> => {
    // Простая симуляция AI ответа для демо
    const responses = [
      'Интересно! Расскажите мне больше об этом.',
      'Понимаю вас. Это действительно важная тема.',
      'Отличный вопрос! Давайте разберём это подробнее.',
      'Я думаю, что вы правы. Что вы об этом думаете?',
      'Это fascinating! Какие у вас есть идеи по этому поводу?',
      'Хороший момент. Можете привести пример?',
    ];
    
    // Имитируем задержку API
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
    
    return responses[Math.floor(Math.random() * responses.length)];
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputValue,
      isUser: true,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsTyping(true);

    try {
      const aiResponse = await simulateAIResponse(inputValue);
      
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: aiResponse,
        isUser: false,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error('Error getting AI response:', error);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Chat Header */}
      <div className="flex items-center gap-3 p-4 border-b border-border bg-background-secondary/50 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gradient-primary flex items-center justify-center glow">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div>
            <h2 className="font-semibold text-foreground">Universal Chat AI</h2>
            <p className="text-xs text-foreground-muted">Всегда готов помочь</p>
          </div>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
          <span className="text-xs text-foreground-muted">Онлайн</span>
        </div>
      </div>

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={cn(
              'flex gap-3 max-w-[80%]',
              message.isUser 
                ? 'ml-auto flex-row-reverse animate-slide-in-right' 
                : 'animate-slide-in-left'
            )}
          >
            {/* Avatar */}
            <div className={cn(
              'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0',
              message.isUser 
                ? 'bg-user-message glow' 
                : 'bg-gradient-primary glow'
            )}>
              {message.isUser ? (
                <div className="w-4 h-4 bg-white rounded-full" />
              ) : (
                <Sparkles className="w-4 h-4 text-white" />
              )}
            </div>

            {/* Message Bubble */}
            <div className={cn(
              'rounded-2xl px-4 py-3 glass transition-all duration-300 hover:scale-[1.02]',
              message.isUser
                ? 'bg-user-message text-user-message-foreground ml-2'
                : 'bg-ai-message text-ai-message-foreground mr-2'
            )}>
              <p className="text-sm leading-relaxed">{message.text}</p>
              <p className="text-xs opacity-60 mt-1">
                {message.timestamp.toLocaleTimeString('ru-RU', { 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })}
              </p>
            </div>
          </div>
        ))}

        {/* Typing Indicator */}
        {isTyping && (
          <div className="flex gap-3 max-w-[80%] animate-slide-in-left">
            <div className="w-8 h-8 rounded-full bg-gradient-primary glow flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div className="rounded-2xl px-4 py-3 glass bg-ai-message text-ai-message-foreground mr-2">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-primary rounded-full typing-dot"></div>
                <div className="w-2 h-2 bg-primary rounded-full typing-dot"></div>
                <div className="w-2 h-2 bg-primary rounded-full typing-dot"></div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 border-t border-border bg-background-secondary/50 backdrop-blur-sm">
        <div className="flex gap-2 items-end">
          <div className="flex-1">
            <Input
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Напишите сообщение..."
              className="bg-input text-input-foreground border-border hover:border-border-hover focus:border-primary focus:ring-primary transition-all duration-300 resize-none"
              disabled={isTyping}
            />
          </div>
          <Button
            onClick={handleSendMessage}
            disabled={!inputValue.trim() || isTyping}
            className="bg-gradient-primary hover:bg-gradient-primary hover:scale-105 transition-all duration-300 glow-strong p-3"
            size="icon"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
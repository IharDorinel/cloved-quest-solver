import { useState, useRef, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Send, Sparkles, Cpu, Bot, Volume2, Mic } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';
import ReactMarkdown from 'react-markdown';

const BACKEND_URL = 'https://cloved-quest-solver.onrender.com';

interface Message {
  id: string;
  text: string;
  isUser: boolean;
}

interface ChatProps {
  className?: string;
  pageContext: Record<string, any>;
}

export function Chat({ className, pageContext }: ChatProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: 'Привет! Я ваш AI-помощник. Выберите модель и задайте вопрос.',
      isUser: false,
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [currentModel, setCurrentModel] = useState('gpt-4.1');
  const [currentlyPlaying, setCurrentlyPlaying] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;
    const currentInput = inputValue;
    const userMessage: Message = { id: Date.now().toString(), text: currentInput, isUser: true };
    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsTyping(true);
    
    try {
      // Обращаемся к новому эндпоинту-оркестратору
      const response = await fetch(`${BACKEND_URL}/api/orchestrate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: currentInput, model: currentModel, context: pageContext }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ data: 'Сетевая ошибка' }));
        throw new Error(errorData.data || 'Не удалось получить ответ.');
      }

      const result = await response.json();

      // Обрабатываем ответ в зависимости от его типа
      switch (result.type) {
        case 'chat': {
          const aiMessage: Message = { id: (Date.now() + 1).toString(), text: result.data, isUser: false };
          setMessages(prev => [...prev, aiMessage]);
          break;
        }
        case 'conversation': {
          const conversationMessages: Message[] = result.data.map((msg: any, index: number) => ({
            id: `autogen-${Date.now()}-${index}`,
            text: `**${msg.sender}:**\n\n${msg.text}`,
            isUser: msg.sender === 'Product_Manager',
          }));
          setMessages(prev => [...prev, ...conversationMessages]);
          break;
        }
        case 'report': {
          const data = result.data;
          const reportMessage: Message = {
            id: `improve-${Date.now()}`,
            text: `
### 🤖 Цикл Самосовершенствования Завершен
**Задача:** *${currentInput}*
---
**Изначальный Промпт:**
\`\`\`
${data.initial_prompt}
\`\`\`
---
**Результат Работы "Worker"-а:**
*${data.worker_result}*
---
**Оценка от "Critic"-а:**
*${data.critic_feedback}*
---
**✨ Новый, Улучшенный Промпт:**
\`\`\`
${data.new_prompt}
\`\`\`
            `,
            isUser: false,
          };
          const resultMessage: Message = {
            id: `result-${Date.now()}`,
            text: data.worker_result,
            isUser: false,
          };
          setMessages(prev => [...prev, reportMessage, resultMessage]);
          break;
        }
        case 'error':
          throw new Error(result.data);
        default:
          throw new Error('Получен неизвестный тип ответа от сервера.');
      }

    } catch (error) {
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        text: error instanceof Error ? error.message : 'Произошла ошибка.',
        isUser: false,
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  const handlePlayAudio = async (text: string, messageId: string) => {
    if (currentlyPlaying === messageId) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
        setCurrentlyPlaying(null);
      }
      return;
    }

    if (audioRef.current) {
      audioRef.current.pause();
    }

    setCurrentlyPlaying(messageId);

    try {
      const response = await fetch(`${BACKEND_URL}/api/text-to-speech`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });

      if (!response.ok) {
        throw new Error('Не удалось сгенерировать речь.');
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audioRef.current = audio;

      audio.play();

      audio.onended = () => {
        setCurrentlyPlaying(null);
        URL.revokeObjectURL(url);
      };
      
    } catch (error) {
      console.error("Ошибка воспроизведения аудио:", error);
      setCurrentlyPlaying(null);
    }
  };

  const handleToggleRecording = async () => {
    if (isRecording) {
      // Останавливаем запись
      if (mediaRecorderRef.current) {
        mediaRecorderRef.current.stop();
      }
    } else {
      // Начинаем запись
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorderRef.current = new MediaRecorder(stream);
        audioChunksRef.current = [];

        mediaRecorderRef.current.ondataavailable = (event) => {
          audioChunksRef.current.push(event.data);
        };

        mediaRecorderRef.current.onstop = async () => {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          const formData = new FormData();
          formData.append('audio_file', audioBlob, 'recording.webm');
          
          setIsRecording(false);
          setIsTyping(true); // Показываем индикатор "печати" пока идет распознавание

          try {
            const response = await fetch(`${BACKEND_URL}/api/speech-to-text`, {
              method: 'POST',
              body: formData,
            });

            if (!response.ok) {
              throw new Error('Не удалось распознать речь.');
            }

            const result = await response.json();
            if (result.error) {
              throw new Error(result.error);
            }
            
            setInputValue(prev => prev + result.text);

          } catch (error) {
            console.error('Ошибка распознавания речи:', error);
            // Можно добавить сообщение об ошибке для пользователя
          } finally {
            setIsTyping(false);
            // Останавливаем все аудиотреки
            stream.getTracks().forEach(track => track.stop());
          }
        };

        mediaRecorderRef.current.start();
        setIsRecording(true);

      } catch (error) {
        console.error("Ошибка доступа к микрофону:", error);
        // Можно показать пользователю сообщение, что доступ к микрофону не был предоставлен
      }
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
        <div className="ml-auto flex items-center gap-4">
          <Select value={currentModel} onValueChange={setCurrentModel}>
            <SelectTrigger className="w-[180px] glow">
              <SelectValue placeholder="Выберите модель" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="gpt-4.1">
                <div className="flex items-center gap-2"><Bot className="w-4 h-4" /><span>GPT-4.1</span></div>
              </SelectItem>
              <SelectItem value="gpt-4o">
                <div className="flex items-center gap-2"><Cpu className="w-4 h-4" /><span>GPT-4o</span></div>
              </SelectItem>
            </SelectContent>
          </Select>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            <span className="text-xs text-foreground-muted">Онлайн</span>
          </div>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div key={message.id} className={cn('flex gap-3 max-w-[80%]', message.isUser ? 'ml-auto flex-row-reverse animate-slide-in-right' : 'animate-slide-in-left')}>
            <div className={cn('w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0', message.isUser ? 'bg-user-message glow' : 'bg-gradient-primary glow')}>
              {message.isUser ? <div className="w-4 h-4 bg-white rounded-full" /> : <Sparkles className="w-4 h-4 text-white" />}
            </div>
            <div className="flex-1">
              <div className={cn('rounded-2xl px-4 py-3 glass transition-all duration-300 hover:scale-[1.02]', message.isUser ? 'bg-user-message text-user-message-foreground ml-2' : 'bg-ai-message text-ai-message-foreground mr-2')}>
                <div className="text-sm leading-relaxed"><ReactMarkdown>{message.text}</ReactMarkdown></div>
              </div>
              {!message.isUser && (
                <div className="flex justify-start px-2 py-1">
                  <Button
                    onClick={() => handlePlayAudio(message.text, message.id)}
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 text-foreground-muted hover:text-foreground"
                  >
                    <Volume2 className={cn("h-4 w-4", currentlyPlaying === message.id && "text-blue-500 animate-pulse")} />
                  </Button>
                </div>
              )}
            </div>
          </div>
        ))}
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
      <div className="p-4 border-t border-border bg-background-secondary/50 backdrop-blur-sm">
        <div className="flex gap-2 items-end">
          <div className="flex-1">
            <Input
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Введите задачу для AI..."
              className="bg-input text-input-foreground border-border hover:border-border-hover focus:border-primary focus:ring-primary transition-all duration-300 resize-none"
              disabled={isTyping}
            />
          </div>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                onClick={handleToggleRecording} 
                disabled={isTyping && !isRecording} 
                className={cn(
                  "bg-orange-600 hover:bg-orange-700 hover:scale-105 transition-all duration-300 glow p-3",
                  isRecording && "animate-pulse bg-red-600"
                )} 
                size="icon"
              >
                <Mic className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent><p>{isRecording ? 'Остановить запись' : 'Начать запись'}</p></TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button onClick={handleSendMessage} disabled={!inputValue.trim() || isTyping} className="bg-gradient-primary hover:bg-gradient-primary hover:scale-105 transition-all duration-300 glow-strong p-3" size="icon">
                <Send className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent><p>Отправить сообщение</p></TooltipContent>
          </Tooltip>
        </div>
      </div>
    </div>
  );
}
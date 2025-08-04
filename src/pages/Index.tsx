import { useState } from 'react';
import { Chat } from '@/components/Chat';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const Index = () => {
  const [formContext, setFormContext] = useState({
    name: '',
    email: '',
    about: '',
  });

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormContext(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  return (
    <div className="h-screen bg-background overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-gradient-secondary opacity-50" />
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      {/* Main Content Grid */}
      <div className="relative z-10 h-full flex items-center justify-center p-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 w-full max-w-7xl h-[80vh] max-h-[800px]">
          
          {/* Left Side: Resume Form */}
          <Card className="glass glow-strong overflow-hidden flex flex-col">
            <CardHeader>
              <CardTitle>Создайте ваше резюме</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col gap-4 overflow-y-auto">
              <div className="grid w-full items-center gap-1.5">
                <Label htmlFor="name">Имя</Label>
                <Input type="text" id="name" name="name" placeholder="Анатолий" value={formContext.name} onChange={handleFormChange} />
              </div>
              <div className="grid w-full items-center gap-1.5">
                <Label htmlFor="email">Email</Label>
                <Input type="email" id="email" name="email" placeholder="example@mail.com" value={formContext.email} onChange={handleFormChange} />
              </div>
              <div className="grid w-full flex-1 items-stretch gap-1.5">
                <Label htmlFor="about">О себе</Label>
                <Textarea id="about" name="about" placeholder="Расскажите немного о вашем опыте..." className="flex-1" value={formContext.about} onChange={handleFormChange} />
              </div>
            </CardContent>
          </Card>

          {/* Right Side: Chat */}
          <div className="w-full h-full glass rounded-3xl overflow-hidden shadow-2xl glow-strong">
            <Chat pageContext={formContext} />
          </div>
        </div>
      </div>

      {/* Floating Header */}
      <div className="absolute top-8 left-8 text-foreground-secondary">
        <h1 className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
          Universal Chat
        </h1>
        <p className="text-sm text-foreground-muted">Powered by AI • Hackathon Demo</p>
      </div>
    </div>
  );
};

export default Index;

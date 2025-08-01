import { Chat } from '@/components/Chat';

const Index = () => {
  return (
    <div className="h-screen bg-background overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-gradient-secondary opacity-50" />
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      {/* Main Chat Container */}
      <div className="relative z-10 h-full flex items-center justify-center p-4">
        <div className="w-full max-w-4xl h-[600px] glass rounded-3xl overflow-hidden shadow-2xl glow-strong">
          <Chat />
        </div>
      </div>

      {/* Floating Elements */}
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

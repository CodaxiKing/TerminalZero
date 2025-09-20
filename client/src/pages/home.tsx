import { useLocation } from "wouter";
import StarField from "@/components/star-field";

export default function Home() {
  const [, setLocation] = useLocation();

  const startGame = () => {
    setLocation("/game");
  };

  return (
    <div className="min-h-screen overflow-hidden relative">
      <StarField />
      
      <div className="min-h-screen flex flex-col items-center justify-center text-center px-4">
        <div className="bg-card border-4 border-border p-8 rounded-lg shadow-2xl max-w-2xl mx-auto">
          {/* Hero mountain landscape background */}
          <div className="mb-8 h-32 bg-gradient-to-b from-secondary to-primary rounded opacity-20 relative overflow-hidden">
            <div className="absolute bottom-0 left-0 right-0 h-16 bg-secondary rounded-b"></div>
            <div className="absolute bottom-4 left-8 w-4 h-8 bg-secondary"></div>
            <div className="absolute bottom-4 right-12 w-6 h-12 bg-secondary"></div>
          </div>
          
          <h1 className="text-primary text-2xl md:text-4xl mb-6 leading-relaxed font-pixel">
            Bem-vindo ao<br />
            <span className="text-accent">CodeQuest!</span>
          </h1>
          
          <p className="text-muted-foreground text-sm md:text-base mb-8 leading-relaxed font-pixel">
            Sua jornada para se tornar um<br />
            mestre da programação começa aqui.
          </p>
          
          <button 
            onClick={startGame}
            className="pixel-button text-primary-foreground px-8 py-4 text-sm md:text-base font-pixel rounded"
            data-testid="button-start-adventure"
          >
            🚀 Iniciar Aventura!
          </button>
        </div>
      </div>
    </div>
  );
}

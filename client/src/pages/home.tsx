import { useLocation } from "wouter";
import codingValleyLogo from "../assets/coding-valley-logo-float.png";
import comecarAgoraBtn from "../assets/comecar-agora-btn.png";
import cloudBg from "../assets/cloud-bg.png";

export default function Home() {
  const [, setLocation] = useLocation();

  const goToTrails = () => {
    setLocation("/trails");
  };

  return (
    <div className="min-h-screen relative pt-16">
      {/* Background cloud decorations */}
      <div className="absolute top-8 left-0 z-0 opacity-20">
        <img 
          src={cloudBg} 
          alt="" 
          className="w-48 h-auto pixelated cloud-float-1"
        />
      </div>
      <div className="absolute top-20 left-0 z-0 opacity-25">
        <img 
          src={cloudBg} 
          alt="" 
          className="w-32 h-auto pixelated cloud-float-2"
        />
      </div>
      <div className="absolute top-32 left-0 z-0 opacity-30">
        <img 
          src={cloudBg} 
          alt="" 
          className="w-56 h-auto pixelated cloud-float-3"
        />
      </div>
      <div className="absolute top-44 left-0 z-0 opacity-20">
        <img 
          src={cloudBg} 
          alt="" 
          className="w-40 h-auto pixelated cloud-float-4"
        />
      </div>
      <div className="absolute top-56 left-0 z-0 opacity-35">
        <img 
          src={cloudBg} 
          alt="" 
          className="w-64 h-auto pixelated cloud-float-5"
        />
      </div>
      
      {/* Semi-transparent overlay for better text readability */}
      <div className="absolute inset-0 bg-black/10 z-0"></div>
      
      <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center text-center px-4 py-16 relative z-10">
        {/* Hero Section */}
        <div className="max-w-4xl">
          <div className="mb-8 flex justify-center">
            <img 
              src={codingValleyLogo} 
              alt="Coding Valley" 
              className="w-96 h-auto pixelated float-animation"
            />
          </div>
          
          <p className="text-lg md:text-xl text-muted-foreground mb-8 leading-relaxed max-w-2xl mx-auto">
            A plataforma completa para você aprender programação do zero no seu ritmo, 
            se tornar Full Stack e se especializar em diversas tecnologias.
          </p>
          
          <div className="flex justify-center">
            <img
              src={comecarAgoraBtn}
              alt="Começar Agora"
              onClick={goToTrails}
              className="pixelated cursor-pointer transition-all duration-300 transform hover:scale-105 hover:glow-primary w-auto h-16"
              data-testid="hero-cta"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

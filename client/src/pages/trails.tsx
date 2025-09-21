import { useLocation } from "wouter";
import frontendCard from "../assets/frontend-card.png";
import backendCard from "../assets/backend-card.png";
import fullstackCard from "../assets/fullstack-card.png";
import iniciarBtn from "../assets/iniciar-btn.png";

export default function Trails() {
  const [, setLocation] = useLocation();

  const startTech = (tech: string) => {
    setLocation(`/game?trilha=${tech}`);
  };

  const getCardImage = (roadmapId: string) => {
    switch (roadmapId) {
      case "frontend":
        return frontendCard;
      case "backend":
        return backendCard;
      case "fullstack":
        return fullstackCard;
      default:
        return frontendCard;
    }
  };

  const roadmaps = [
    {
      id: "frontend",
      title: "Desenvolvedor Front-end",
      icon: "💻",
      technologies: [
        { name: "HTML5", key: "html" },
        { name: "CSS3", key: "css" },
        { name: "JavaScript", key: "javascript" },
        { name: "React", key: "react" },
        { name: "Git & GitHub", key: "git" }
      ]
    },
    {
      id: "backend", 
      title: "Desenvolvedor Back-end",
      icon: "⚙️",
      technologies: [
        { name: "JavaScript (Node.js)", key: "nodejs" },
        { name: "Express.js", key: "express" },
        { name: "Bancos de Dados", key: "database" },
        { name: "APIs RESTful", key: "api" },
        { name: "Autenticação", key: "auth" }
      ]
    },
    {
      id: "fullstack",
      title: "Desenvolvedor Full-stack", 
      icon: "🚀",
      description: "Combine o poder do Front-end e do Back-end para se tornar um desenvolvedor completo.",
      technologies: [
        { name: "Front-end + Back-end", key: "fullstack" },
        { name: "Deployment", key: "deploy" },
        { name: "DevOps", key: "devops" }
      ]
    }
  ];

  return (
    <div className="min-h-screen relative pt-16">
      {/* Semi-transparent overlay for better text readability */}
      <div className="absolute inset-0 bg-black/10 z-0"></div>
      
      <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center text-center px-4 py-16 relative z-10">
        {/* Roadmaps Section */}
        <div className="w-full max-w-6xl mx-auto px-4">
          <h1 className="text-3xl md:text-4xl font-pixel font-bold mb-4 text-center">
            Trilhas de <span className="text-primary drop-shadow-md">Aprendizado</span>
          </h1>
          
          <p className="text-lg md:text-xl text-muted-foreground mb-12 leading-relaxed max-w-2xl mx-auto">
            Escolha sua trilha e comece sua jornada na programação. Cada trilha foi cuidadosamente 
            projetada para te levar do iniciante ao profissional.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
            {roadmaps.map((roadmap) => (
              <div key={roadmap.id} className="flex flex-col items-center space-y-4">
                <img
                  src={getCardImage(roadmap.id)}
                  alt={roadmap.title}
                  className="pixelated w-auto h-auto max-w-full transition-all duration-300 transform hover:scale-105"
                  data-testid={`card-roadmap-${roadmap.id}`}
                />
                <img
                  src={iniciarBtn}
                  alt="Iniciar"
                  onClick={() => startTech(roadmap.technologies[0].key)}
                  className="pixelated cursor-pointer transition-all duration-300 transform hover:scale-105 hover:glow-primary w-auto h-12"
                  data-testid={`button-start-${roadmap.id}`}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
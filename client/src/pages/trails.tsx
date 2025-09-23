import { useState } from "react";
import { useLocation } from "wouter";
import frontendCard from "../assets/frontend-card.png";
import backendCard from "../assets/backend-card.png";
import fullstackCard from "../assets/fullstack-card.png";
import iniciarBtn from "../assets/iniciar-btn.png";

type Technology = {
  name: string;
  key: string;
};

type Roadmap = {
  id: string;
  title: string;
  icon: string;
  description?: string;
  technologies: Technology[];
};

export default function Trails() {
  const [, setLocation] = useLocation();
  const [selectedRoadmap, setSelectedRoadmap] = useState<Roadmap | null>(null);
  const [showTechModal, setShowTechModal] = useState(false);

  const startTech = (tech: string) => {
    setLocation(`/game?trilha=${tech}`);
    setShowTechModal(false);
    setSelectedRoadmap(null);
  };

  const openTechSelection = (roadmap: Roadmap) => {
    setSelectedRoadmap(roadmap);
    setShowTechModal(true);
  };

  const closeTechModal = () => {
    setShowTechModal(false);
    setSelectedRoadmap(null);
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
                <div className="relative transition-all duration-300 transform hover:scale-105">
                  <img
                    src={getCardImage(roadmap.id)}
                    alt={roadmap.title}
                    className="pixelated w-auto h-auto max-w-full"
                    data-testid={`card-roadmap-${roadmap.id}`}
                  />
                  <img
                    src={iniciarBtn}
                    alt="Iniciar"
                    onClick={() => openTechSelection(roadmap)}
                    className="pixelated cursor-pointer hover:glow-primary w-auto h-16 absolute bottom-4 left-1/2 transform -translate-x-1/2"
                    data-testid={`button-start-${roadmap.id}`}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Modal de Seleção de Tecnologias */}
      {showTechModal && selectedRoadmap && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto shadow-2xl">
            {/* Header do Modal */}
            <div className="p-6 border-b border-border">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-pixel font-bold text-foreground flex items-center gap-3">
                    {selectedRoadmap.icon} {selectedRoadmap.title}
                  </h2>
                  <p className="text-muted-foreground mt-2">
                    Escolha uma tecnologia para começar seus desafios
                  </p>
                </div>
                <button
                  onClick={closeTechModal}
                  className="text-muted-foreground hover:text-foreground transition-colors p-2 hover:bg-muted rounded-lg"
                  data-testid="close-modal"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Lista de Tecnologias */}
            <div className="p-6">
              <div className="grid gap-4">
                {selectedRoadmap.technologies.map((tech, index) => (
                  <button
                    key={tech.key}
                    onClick={() => startTech(tech.key)}
                    className="group flex items-center justify-between p-4 bg-muted/50 hover:bg-muted border border-border rounded-xl transition-all duration-200 hover:scale-[1.02] hover:shadow-lg"
                    data-testid={`tech-option-${tech.key}`}
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex items-center justify-center w-10 h-10 bg-primary/10 text-primary rounded-lg font-pixel font-bold">
                        {index + 1}
                      </div>
                      <div className="text-left">
                        <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                          {tech.name}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          Clique para começar os desafios
                        </p>
                      </div>
                    </div>
                    <div className="text-primary group-hover:translate-x-1 transition-transform">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </button>
                ))}
              </div>

              {/* Descrição da trilha se disponível */}
              {selectedRoadmap.description && (
                <div className="mt-6 p-4 bg-primary/5 border border-primary/20 rounded-xl">
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {selectedRoadmap.description}
                  </p>
                </div>
              )}
            </div>

            {/* Footer do Modal */}
            <div className="p-6 border-t border-border bg-muted/30">
              <div className="flex justify-between items-center">
                <p className="text-sm text-muted-foreground">
                  💡 Dica: Você pode alternar entre tecnologias a qualquer momento
                </p>
                <button
                  onClick={closeTechModal}
                  className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                  data-testid="cancel-selection"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
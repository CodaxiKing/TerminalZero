import { useLocation } from "wouter";
import { DialogueBox } from "@/components/stardew";

export default function Home() {
  const [, setLocation] = useLocation();

  const startTech = (tech: string) => {
    setLocation(`/game?trilha=${tech}`);
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
    <div className="min-h-screen relative">
      {/* Stardew Valley Farm Background */}
      <div className="bg-sky"></div>
      <div className="bg-mountains"></div>
      <div className="bg-trees"></div>
      
      <div className="min-h-screen flex flex-col items-center justify-center text-center px-4 py-16">
        {/* Hero Section */}
        <div className="mb-16 max-w-4xl">
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-pixel font-bold mb-6 leading-tight">
            Comece ou especialize-se em
            <span className="block text-primary drop-shadow-lg">
              programação
            </span>
          </h1>
          
          <p className="text-lg md:text-xl text-muted-foreground mb-8 leading-relaxed max-w-2xl mx-auto">
            A plataforma completa para você aprender programação do zero no seu ritmo, 
            se tornar Full Stack e se especializar em diversas tecnologias.
          </p>
          
          <button
            onClick={() => startTech("javascript")}
            className="pixel-btn-brown text-lg font-pixel px-8 py-4 hover:glow-primary transition-all duration-300 transform hover:scale-105"
            data-testid="hero-cta"
          >
            🌱 Começar Agora
          </button>
        </div>

        {/* Roadmaps Section */}
        <div className="w-full max-w-6xl mx-auto px-4">
          <h2 className="text-2xl md:text-3xl font-pixel font-bold mb-12 text-center">
            Escolha sua <span className="text-primary drop-shadow-md">trilha de aprendizado</span>
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
            {roadmaps.map((roadmap) => (
              <DialogueBox 
                key={roadmap.id}
                title={roadmap.title}
                speaker="Instrutor"
              >
                <div className="space-y-4" data-testid={`card-roadmap-${roadmap.id}`}>
                  <div className="text-4xl mb-3 text-center float-bob">
                    {roadmap.icon}
                  </div>
                  
                  {roadmap.description && (
                    <p className="text-foreground text-sm leading-relaxed mb-4">
                      {roadmap.description}
                    </p>
                  )}
                  
                  <div>
                    <h4 className="text-xs font-pixel font-semibold text-accent mb-2">Tecnologias:</h4>
                    <div className="flex flex-wrap gap-1 mb-4">
                      {roadmap.technologies.slice(0, 3).map((tech) => (
                        <span
                          key={tech.key}
                          className="inline-flex items-center px-2 py-1 text-xs font-pixel bg-muted/30 border border-border rounded"
                          data-testid={`badge-tech-${tech.key}`}
                        >
                          {tech.name}
                        </span>
                      ))}
                      {roadmap.technologies.length > 3 && (
                        <span className="inline-flex items-center px-2 py-1 text-xs font-pixel text-muted-foreground">
                          +{roadmap.technologies.length - 3}
                        </span>
                      )}
                    </div>
                    
                    <button
                      onClick={() => startTech(roadmap.technologies[0].key)}
                      className="pixel-btn-brown text-sm font-pixel w-full hover:glow-primary/50"
                      data-testid={`button-start-${roadmap.id}`}
                    >
                      Começar trilha →
                    </button>
                  </div>
                </div>
              </DialogueBox>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

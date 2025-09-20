import { useLocation } from "wouter";
import StarField from "@/components/star-field";

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
    <div className="min-h-screen relative bg-gradient-to-br from-background via-background to-background/95">
      <StarField />
      
      <div className="min-h-screen flex flex-col items-center justify-center text-center px-4 py-16">
        {/* Hero Section */}
        <div className="mb-16 max-w-4xl">
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold mb-6 leading-tight">
            Comece ou especialize-se em
            <span className="block bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              programação
            </span>
          </h1>
          
          <p className="text-lg md:text-xl text-muted-foreground mb-8 leading-relaxed max-w-2xl mx-auto">
            A plataforma completa para você aprender programação do zero no seu ritmo, 
            se tornar Full Stack e se especializar em diversas tecnologias.
          </p>
          
          <button
            onClick={() => startTech("javascript")}
            className="gradient-primary text-primary-foreground px-8 py-4 rounded-lg font-semibold text-lg hover:shadow-xl hover:glow-primary transition-all duration-300 transform hover:scale-105"
            data-testid="hero-cta"
          >
            🚀 Começar Agora
          </button>
        </div>

        {/* Roadmaps Section */}
        <div className="w-full max-w-6xl mx-auto px-4">
          <h2 className="text-2xl md:text-3xl font-bold mb-12 text-center">
            Escolha sua <span className="text-primary">trilha de aprendizado</span>
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
            {roadmaps.map((roadmap) => (
              <div 
                key={roadmap.id} 
                className="gradient-border group hover:glow-primary transition-all duration-300 touch-manipulation"
                data-testid={`card-roadmap-${roadmap.id}`}
              >
                <div className="p-6 md:p-8 h-full flex flex-col">
                  <div className="text-4xl md:text-5xl mb-4 group-hover:scale-110 transition-transform duration-300">
                    {roadmap.icon}
                  </div>
                  
                  <h3 className="text-xl md:text-2xl font-bold mb-4 text-foreground group-hover:text-primary transition-colors duration-300">
                    {roadmap.title}
                  </h3>
                  
                  {roadmap.description && (
                    <p className="text-muted-foreground text-sm md:text-base mb-6 leading-relaxed flex-1">
                      {roadmap.description}
                    </p>
                  )}
                  
                  <div className="mt-auto">
                    <h4 className="text-sm font-semibold text-accent mb-4">Tecnologias principais:</h4>
                    <div className="flex flex-wrap gap-2">
                      {roadmap.technologies.slice(0, 3).map((tech, index) => (
                        <button
                          key={tech.key}
                          onClick={() => startTech(tech.key)}
                          className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-muted/50 hover:bg-primary/20 hover:text-primary border border-border hover:border-primary/50 transition-all duration-200 touch-manipulation"
                          data-testid={`badge-tech-${tech.key}`}
                        >
                          {tech.name}
                        </button>
                      ))}
                      {roadmap.technologies.length > 3 && (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium text-muted-foreground">
                          +{roadmap.technologies.length - 3} mais
                        </span>
                      )}
                    </div>
                    
                    <button
                      onClick={() => startTech(roadmap.technologies[0].key)}
                      className="w-full mt-6 px-4 py-2 text-sm font-medium text-primary border border-primary/50 hover:bg-primary hover:text-primary-foreground rounded-lg transition-all duration-200 hover:shadow-lg hover:glow-primary/50"
                      data-testid={`button-start-${roadmap.id}`}
                    >
                      Começar trilha →
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

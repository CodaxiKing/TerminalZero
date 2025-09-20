import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import StarField from "@/components/star-field";
import LessonModal from "@/components/lesson-modal";
import { trilhasDeAprendizado, javascriptRoadmap, Lesson } from "@/data/javascript-roadmap";
import { useIsMobile } from "@/hooks/use-mobile";

export default function Game() {
  const [, setLocation] = useLocation();
  const [currentLessonIndex, setCurrentLessonIndex] = useState<number | null>(null);
  const [completedLessons, setCompletedLessons] = useState<Set<number>>(new Set());
  const [currentRoadmap, setCurrentRoadmap] = useState<Lesson[]>(javascriptRoadmap);
  const [currentTech, setCurrentTech] = useState<string>("javascript");

  // Função para ler parâmetros da URL
  const getURLParams = () => {
    const params = new URLSearchParams(window.location.search);
    return params.get('trilha') || 'javascript';
  };

  // Função para renderizar o mapa dinamicamente
  const renderizarMapa = (trilha: string) => {
    const roadmapKey = trilha as keyof typeof trilhasDeAprendizado;
    const roadmap = trilhasDeAprendizado[roadmapKey] || trilhasDeAprendizado.javascript;
    setCurrentRoadmap(roadmap);
    setCurrentTech(trilha);
    // Reset estado quando muda a trilha
    setCurrentLessonIndex(null);
    setCompletedLessons(new Set());
  };

  // Inicialização: ler parâmetro da URL e carregar trilha apropriada
  useEffect(() => {
    const trilha = getURLParams();
    renderizarMapa(trilha);
  }, []);

  const backToMenu = () => {
    setLocation("/");
  };

  const openLesson = (lessonIndex: number) => {
    setCurrentLessonIndex(lessonIndex);
  };

  const closeModal = () => {
    setCurrentLessonIndex(null);
  };

  const markLessonCompleted = (lessonIndex: number) => {
    setCompletedLessons(prev => new Set([...Array.from(prev), lessonIndex]));
  };

  const navigateLesson = (direction: number) => {
    if (currentLessonIndex === null) return;
    
    const newIndex = currentLessonIndex + direction;
    if (newIndex >= 0 && newIndex < currentRoadmap.length) {
      if (direction > 0 && currentLessonIndex !== null) {
        markLessonCompleted(currentLessonIndex);
      }
      setCurrentLessonIndex(newIndex);
    }
  };

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (currentLessonIndex === null) return;
      
      switch (e.key) {
        case 'Escape':
          closeModal();
          break;
        case 'ArrowLeft':
          if (currentLessonIndex > 0) navigateLesson(-1);
          break;
        case 'ArrowRight':
          if (currentLessonIndex < currentRoadmap.length - 1) navigateLesson(1);
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [currentLessonIndex]);

  // Mobile-responsive level positions
  const levelPositions = [
    { left: 85, top: 485, mobileLeft: 50, mobileTop: 450 },
    { left: 285, top: 435, mobileLeft: 150, mobileTop: 400 },
    { left: 485, top: 385, mobileLeft: 250, mobileTop: 350 },
    { left: 685, top: 335, mobileLeft: 350, mobileTop: 300 },
    { left: 885, top: 285, mobileLeft: 50, mobileTop: 250 },
    { left: 1065, top: 235, mobileLeft: 150, mobileTop: 200 },
  ];

  // Use responsive mobile hook
  const isMobile = useIsMobile();

  // Gerar labels dinamicamente baseado na trilha atual
  const generateLevelLabels = (roadmap: Lesson[]) => {
    return roadmap.map(lesson => {
      if (lesson.type === 'boss') {
        return "Chefão";
      }
      return lesson.title.substring(0, 12) + (lesson.title.length > 12 ? "..." : "");
    });
  };

  const levelLabels = generateLevelLabels(currentRoadmap);

  // Mapeamento de tecnologias para títulos
  const techTitles: { [key: string]: string } = {
    javascript: "JavaScript",
    html: "HTML5",
    css: "CSS3", 
    react: "React",
    nodejs: "Node.js",
    express: "Express.js",
    database: "Bancos de Dados",
    api: "APIs RESTful",
    auth: "Autenticação",
    git: "Git & GitHub",
    fullstack: "Full-stack",
    deploy: "Deployment",
    devops: "DevOps"
  };

  return (
    <div className="min-h-screen relative overflow-auto bg-gradient-to-br from-background via-background to-background/95">
      <StarField />
      
      {/* Game header */}
      <div className="absolute top-2 md:top-4 left-2 md:left-4 right-2 md:right-4 z-10">
        <div className="glass rounded-xl p-4 md:p-6 shadow-xl">
          <h2 className="text-primary text-lg md:text-xl font-bold">🗺️ Roadmap {techTitles[currentTech] || currentTech}</h2>
          <p className="text-muted-foreground text-sm mt-2">Clique nos pontos para começar sua jornada!</p>
        </div>
      </div>

      {/* Game Map */}
      <div className="relative w-full h-screen pt-16 md:pt-24 overflow-hidden" data-testid="game-map">
        {/* Forest background elements */}
        <div className="absolute inset-0 overflow-hidden">
          {/* Trees */}
          <div className="absolute bottom-20 left-10 w-16 h-20 bg-secondary rounded-t-full opacity-60"></div>
          <div className="absolute bottom-32 right-20 w-12 h-16 bg-secondary rounded-t-full opacity-60"></div>
          <div className="absolute top-40 left-1/4 w-14 h-18 bg-secondary rounded-t-full opacity-60"></div>
          
          {/* Hills */}
          <div className="absolute bottom-0 left-0 w-1/3 h-32 bg-secondary rounded-t-full opacity-40"></div>
          <div className="absolute bottom-0 right-0 w-1/4 h-24 bg-secondary rounded-t-full opacity-40"></div>
        </div>

        {/* Adventure path - simplified for mobile */}
        <svg className="absolute inset-0 w-full h-full" style={{ zIndex: 1 }}>
          <path 
            className="game-path" 
            d={isMobile 
              ? "M 60 460 Q 120 400 180 420 T 280 380 T 380 340 T 60 280 T 180 240" 
              : "M 100 500 Q 200 400 300 450 T 500 400 T 700 350 T 900 300 T 1100 250"
            }
          />
        </svg>

        {/* Level Nodes */}
        {currentRoadmap.map((lesson, index) => {
          const basePosition = levelPositions[index] || { left: 100 + (index * 150), top: 400 - (index * 30), mobileLeft: 50 + (index * 80), mobileTop: 400 - (index * 40) };
          const position = isMobile 
            ? { left: basePosition.mobileLeft || basePosition.left, top: basePosition.mobileTop || basePosition.top }
            : { left: basePosition.left, top: basePosition.top };
          const isCompleted = completedLessons.has(index);
          const isBoss = lesson.type === 'boss';
          
          return (
            <button
              key={lesson.id}
              className={`absolute rounded cursor-pointer focus:outline-none focus:ring-4 focus:ring-primary focus:ring-opacity-50 ${
                isBoss ? 'boss-node' : 'level-node'
              } ${isCompleted ? 'completed' : ''}`}
              style={{ 
                left: `${position.left}px`, 
                top: `${position.top}px`, 
                zIndex: 2 
              }}
              onClick={() => openLesson(index)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  openLesson(index);
                }
              }}
              aria-label={`${lesson.type === 'boss' ? 'Chefão' : 'Lição'}: ${lesson.title}`}
              tabIndex={0}
              data-testid={`node-level-${index + 1}`}
            >
              <div className="node-label font-pixel">{levelLabels[index]}</div>
            </button>
          );
        })}
      </div>

      {/* Back to menu button */}
      <button 
        onClick={backToMenu}
        className="absolute top-2 md:top-4 right-2 md:right-4 z-20 glass px-4 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground transition-all duration-200 hover:shadow-lg touch-manipulation"
        data-testid="button-back-to-menu"
      >
        ← Voltar
      </button>

      {/* Lesson Modal */}
      {currentLessonIndex !== null && (
        <LessonModal
          lesson={currentRoadmap[currentLessonIndex]}
          isOpen={currentLessonIndex !== null}
          onClose={closeModal}
          onNavigate={navigateLesson}
          canNavigatePrev={currentLessonIndex > 0}
          canNavigateNext={currentLessonIndex < currentRoadmap.length - 1}
        />
      )}
    </div>
  );
}

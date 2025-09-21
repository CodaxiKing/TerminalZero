import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import LessonModal from "@/components/lesson-modal";
import { Hotbar, StatusBars, CurrencyBox } from "@/components/stardew";
import { trilhasDeAprendizado, javascriptRoadmap, Lesson } from "@/data/javascript-roadmap";
import { useIsMobile } from "@/hooks/use-mobile";

export default function Game() {
  const [, setLocation] = useLocation();
  const [currentLessonIndex, setCurrentLessonIndex] = useState<number | null>(null);
  const [completedLessons, setCompletedLessons] = useState<Set<number>>(new Set());
  const [currentRoadmap, setCurrentRoadmap] = useState<Lesson[]>(javascriptRoadmap);
  const [currentTech, setCurrentTech] = useState<string>("javascript");
  const [timeOfDay, setTimeOfDay] = useState<'dawn' | 'day' | 'dusk' | 'night'>('day');

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

  // Sistema de tempo do dia (muda a cada 30 segundos para demonstração)
  useEffect(() => {
    const times: Array<'dawn' | 'day' | 'dusk' | 'night'> = ['dawn', 'day', 'dusk', 'night'];
    let currentIndex = 1; // Inicia no dia
    
    const interval = setInterval(() => {
      currentIndex = (currentIndex + 1) % times.length;
      setTimeOfDay(times[currentIndex]);
    }, 30000); // Muda a cada 30 segundos

    return () => clearInterval(interval);
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
    <div className={`min-h-screen relative overflow-auto time-${timeOfDay}`}>
      {/* Stardew Valley Farm Background */}
      <div className="bg-sky"></div>
      <div className="bg-mountains"></div>
      <div className="bg-trees"></div>
      
      {/* Game header */}
      <div className="absolute top-2 md:top-4 left-2 md:left-4 right-2 md:right-4 z-10">
        <div className="wood-frame px-shadow-2">
          <div className="flex items-center justify-between p-4">
            <div>
              <h2 className="text-primary text-lg md:text-xl font-pixel font-bold">🌳 Roadmap {techTitles[currentTech] || currentTech}</h2>
              <p className="text-muted-foreground text-sm mt-1 font-sans">Clique nos pontos para começar sua jornada!</p>
            </div>
            <CurrencyBox amount={completedLessons.size * 100} type="xp" label="XP" animated />
          </div>
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
            className="dirt-path" 
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
              className={`absolute cursor-pointer focus:outline-none focus:ring-4 focus:ring-primary focus:ring-opacity-50 signpost px-shadow-2 ${
                isBoss ? 'w-20 h-16' : 'w-16 h-12'
              } ${isCompleted ? 'px-outline-gold' : ''}`}
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
              <div className="node-label font-pixel px-shadow-1">{levelLabels[index]}</div>
              {/* Dust effect on hover/click */}
              <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <span className="text-xs">💨</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Status Bars and Hotbar */}
      <div className="absolute bottom-4 left-4 z-20">
        <StatusBars 
          health={{ current: Math.max(50, 100 - (currentRoadmap.length - completedLessons.size) * 10), max: 100 }}
          energy={{ current: Math.max(30, 100 - (currentRoadmap.length - completedLessons.size) * 8), max: 100 }}
        />
      </div>

      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-20">
        <Hotbar 
          items={[
            { name: "Lição", icon: "📚", count: completedLessons.size },
            { name: "Certificado", icon: "🏆" },
            { name: "Dica", icon: "💡" },
            { name: "Progresso", icon: "📊" },
            { name: "Conquista", icon: "🎖️" },
          ]}
          selectedIndex={0}
        />
      </div>

      {/* Back to menu button */}
      <button 
        onClick={backToMenu}
        className="absolute top-2 md:top-4 right-2 md:right-4 z-20 pixel-btn-brown text-sm font-pixel hover:glow-primary transition-all duration-200 touch-manipulation px-shadow-1"
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

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
    setLocation("/trails");
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

  // Mobile-responsive level positions (using percentages for better responsiveness)
  const levelPositions = [
    { left: 5, top: 75, mobileLeft: 10, mobileTop: 85 },
    { left: 20, top: 65, mobileLeft: 30, mobileTop: 75 },
    { left: 35, top: 55, mobileLeft: 50, mobileTop: 65 },
    { left: 50, top: 45, mobileLeft: 70, mobileTop: 55 },
    { left: 65, top: 35, mobileLeft: 10, mobileTop: 45 },
    { left: 80, top: 25, mobileLeft: 30, mobileTop: 35 },
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
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0">
        {/* Floating Particles */}
        <div className="absolute inset-0 overflow-hidden">
          {Array.from({ length: 20 }).map((_, i) => (
            <div
              key={i}
              className="absolute rounded-full bg-white/10 animate-float"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                width: `${4 + Math.random() * 8}px`,
                height: `${4 + Math.random() * 8}px`,
                animationDelay: `${Math.random() * 4}s`,
                animationDuration: `${4 + Math.random() * 4}s`
              }}
            />
          ))}
        </div>
        
        {/* Grid Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="h-full w-full" style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`,
            backgroundSize: '40px 40px'
          }} />
        </div>
      </div>

      {/* Main Container */}
      <div className="relative z-10 min-h-screen flex flex-col">
        
        {/* Header */}
        <header className="p-6">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <button 
                onClick={backToMenu}
                className="flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 text-white hover:bg-white/20 transition-all duration-300 group"
                data-testid="button-back-to-menu"
              >
                <svg className="w-4 h-4 transition-transform group-hover:-translate-x-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
                </svg>
                Voltar
              </button>

              <div className="flex items-center gap-4">
                <CurrencyBox amount={completedLessons.size * 100} type="xp" label="XP" animated />
                <div className="px-4 py-2 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 text-white">
                  <span className="text-sm opacity-80">Progresso:</span>
                  <span className="ml-2 font-bold">{Math.round((completedLessons.size / currentRoadmap.length) * 100)}%</span>
                </div>
              </div>
            </div>

            {/* Title Section */}
            <div className="text-center mb-8">
              <h1 className="text-4xl md:text-6xl font-bold text-white mb-4">
                {techTitles[currentTech] || currentTech}
              </h1>
              <p className="text-xl text-white/80 max-w-2xl mx-auto">
                Sua jornada de aprendizado - clique nas lições para progredir
              </p>
            </div>
          </div>
        </header>

        {/* Learning Path */}
        <main className="flex-1 px-6 pb-8">
          <div className="max-w-7xl mx-auto">
            
            {/* Progress Bar */}
            <div className="mb-12">
              <div className="relative w-full h-3 bg-white/10 rounded-full overflow-hidden backdrop-blur-sm">
                <div 
                  className="absolute inset-y-0 left-0 bg-gradient-to-r from-green-400 to-blue-500 rounded-full transition-all duration-1000 ease-out"
                  style={{ width: `${(completedLessons.size / currentRoadmap.length) * 100}%` }}
                />
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse" />
              </div>
              <div className="flex justify-between mt-2 text-sm text-white/60">
                <span>Início</span>
                <span>{completedLessons.size} de {currentRoadmap.length} concluídas</span>
                <span>Certificação</span>
              </div>
            </div>

            {/* Lessons Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6" data-testid="game-map">
              {currentRoadmap.map((lesson, index) => {
                const isCompleted = completedLessons.has(index);
                const isBoss = lesson.type === 'boss';
                const isLocked = index > 0 && !completedLessons.has(index - 1);
                
                return (
                  <div
                    key={lesson.id}
                    className={`group relative transition-all duration-300 ${
                      isLocked ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:scale-105'
                    }`}
                  >
                    <button
                      className={`w-full p-6 rounded-2xl border transition-all duration-300 ${
                        isCompleted
                          ? 'bg-gradient-to-br from-green-500/20 to-blue-500/20 border-green-400/50 shadow-lg shadow-green-500/25'
                          : isLocked
                          ? 'bg-white/5 border-white/10'
                          : isBoss
                          ? 'bg-gradient-to-br from-purple-500/20 to-pink-500/20 border-purple-400/50 hover:shadow-lg hover:shadow-purple-500/25'
                          : 'bg-white/10 border-white/20 hover:bg-white/15 hover:shadow-lg hover:shadow-blue-500/25'
                      } backdrop-blur-sm`}
                      onClick={() => !isLocked && openLesson(index)}
                      disabled={isLocked}
                      aria-label={`${lesson.type === 'boss' ? 'Chefão' : 'Lição'}: ${lesson.title}`}
                      data-testid={`node-level-${index + 1}`}
                    >
                      {/* Lesson Number */}
                      <div className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold mb-4 ${
                        isCompleted
                          ? 'bg-green-500 text-white'
                          : isBoss
                          ? 'bg-purple-500 text-white'
                          : isLocked
                          ? 'bg-gray-600 text-gray-400'
                          : 'bg-blue-500 text-white'
                      }`}>
                        {isCompleted ? '✓' : index + 1}
                      </div>

                      {/* Lesson Title */}
                      <h3 className={`text-lg font-bold mb-2 ${
                        isLocked ? 'text-gray-400' : 'text-white'
                      }`}>
                        {isBoss && '👑 '}
                        {lesson.title}
                      </h3>

                      {/* Lesson Description */}
                      <p className={`text-sm leading-relaxed ${
                        isLocked ? 'text-gray-500' : 'text-white/70'
                      }`}>
                        Clique para começar esta lição
                      </p>

                      {/* Status Indicator */}
                      <div className="flex items-center justify-between mt-4">
                        <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                          isCompleted
                            ? 'bg-green-500/20 text-green-300'
                            : isLocked
                            ? 'bg-gray-600/20 text-gray-400'
                            : isBoss
                            ? 'bg-purple-500/20 text-purple-300'
                            : 'bg-blue-500/20 text-blue-300'
                        }`}>
                          {isCompleted ? 'Concluída' : isLocked ? 'Bloqueada' : isBoss ? 'Boss Fight' : 'Disponível'}
                        </span>

                        {lesson.type === 'boss' && (
                          <div className="text-2xl">🏆</div>
                        )}
                      </div>

                      {/* Completion Glow Effect */}
                      {isCompleted && (
                        <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-green-400/20 to-blue-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      )}
                    </button>

                    {/* Lock Icon for Locked Lessons */}
                    {isLocked && (
                      <div className="absolute top-4 right-4 text-gray-400">
                        🔒
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </main>

        {/* Bottom Stats */}
        <footer className="p-6">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-wrap justify-center gap-4">
              <div className="flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 text-white">
                <span>📚</span>
                <span className="text-sm">Lições: {completedLessons.size}/{currentRoadmap.length}</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 text-white">
                <span>⭐</span>
                <span className="text-sm">XP: {completedLessons.size * 100}</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 text-white">
                <span>🎯</span>
                <span className="text-sm">Meta: Certificação</span>
              </div>
            </div>
          </div>
        </footer>
      </div>

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

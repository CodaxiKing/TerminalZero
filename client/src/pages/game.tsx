import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import StarField from "@/components/star-field";
import LessonModal from "@/components/lesson-modal";
import { javascriptRoadmap } from "@/data/javascript-roadmap";

export default function Game() {
  const [, setLocation] = useLocation();
  const [currentLessonIndex, setCurrentLessonIndex] = useState<number | null>(null);
  const [completedLessons, setCompletedLessons] = useState<Set<number>>(new Set());

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
    if (newIndex >= 0 && newIndex < javascriptRoadmap.length) {
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
          if (currentLessonIndex < javascriptRoadmap.length - 1) navigateLesson(1);
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [currentLessonIndex]);

  const levelPositions = [
    { left: 85, top: 485 },
    { left: 285, top: 435 },
    { left: 485, top: 385 },
    { left: 685, top: 335 },
    { left: 885, top: 285 },
    { left: 1065, top: 235 },
  ];

  const levelLabels = ["Introdução", "Variáveis", "Funções", "Arrays", "Objetos", "Chefão Final"];

  return (
    <div className="min-h-screen relative overflow-auto">
      <StarField />
      
      {/* Game header */}
      <div className="absolute top-4 left-4 right-4 z-10">
        <div className="bg-card border-2 border-border rounded p-4 shadow-lg">
          <h2 className="text-primary text-lg font-pixel">🗺️ Roadmap JavaScript</h2>
          <p className="text-muted-foreground text-xs mt-2 font-pixel">Clique nos pontos para começar sua jornada!</p>
        </div>
      </div>

      {/* Game Map */}
      <div className="relative w-full h-screen pt-24" data-testid="game-map">
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

        {/* Adventure path */}
        <svg className="absolute inset-0 w-full h-full" style={{ zIndex: 1 }}>
          <path 
            className="game-path" 
            d="M 100 500 Q 200 400 300 450 T 500 400 T 700 350 T 900 300 T 1100 250" 
          />
        </svg>

        {/* Level Nodes */}
        {javascriptRoadmap.map((lesson, index) => {
          const position = levelPositions[index];
          const isCompleted = completedLessons.has(index);
          const isBoss = lesson.type === 'boss';
          
          return (
            <div
              key={lesson.id}
              className={`absolute rounded cursor-pointer ${
                isBoss ? 'boss-node' : 'level-node'
              } ${isCompleted ? 'completed' : ''}`}
              style={{ 
                left: `${position.left}px`, 
                top: `${position.top}px`, 
                zIndex: 2 
              }}
              onClick={() => openLesson(index)}
              data-testid={`node-level-${index + 1}`}
            >
              <div className="node-label font-pixel">{levelLabels[index]}</div>
            </div>
          );
        })}
      </div>

      {/* Back to menu button */}
      <button 
        onClick={backToMenu}
        className="absolute top-4 right-4 bg-destructive text-destructive-foreground px-4 py-2 rounded text-xs font-pixel border-2 border-destructive hover:bg-opacity-80"
        data-testid="button-back-to-menu"
      >
        ← Menu
      </button>

      {/* Lesson Modal */}
      {currentLessonIndex !== null && (
        <LessonModal
          lesson={javascriptRoadmap[currentLessonIndex]}
          isOpen={currentLessonIndex !== null}
          onClose={closeModal}
          onNavigate={navigateLesson}
          canNavigatePrev={currentLessonIndex > 0}
          canNavigateNext={currentLessonIndex < javascriptRoadmap.length - 1}
        />
      )}
    </div>
  );
}

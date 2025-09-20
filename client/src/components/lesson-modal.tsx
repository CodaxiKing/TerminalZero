import { useState, useEffect } from "react";
import type { Lesson } from "@/data/javascript-roadmap";
import { executeJavaScript, validateBossChallenge } from "@/lib/code-executor";

interface LessonModalProps {
  lesson: Lesson;
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (direction: number) => void;
  canNavigatePrev: boolean;
  canNavigateNext: boolean;
}

export default function LessonModal({
  lesson,
  isOpen,
  onClose,
  onNavigate,
  canNavigatePrev,
  canNavigateNext,
}: LessonModalProps) {
  const [codeInput, setCodeInput] = useState('');
  const [showOutput, setShowOutput] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [executionResult, setExecutionResult] = useState<string>('');
  const [challengeCompleted, setChallengeCompleted] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);

  // Reset state when lesson changes
  useEffect(() => {
    setCodeInput('');
    setShowOutput(false);
    setShowHint(false);
    setExecutionResult('');
    setChallengeCompleted(false);
    setIsExecuting(false);
  }, [lesson.id]);

  if (!isOpen) return null;

  const executeCode = async () => {
    if (!codeInput.trim()) {
      setExecutionResult('Por favor, digite algum código JavaScript.');
      setShowOutput(true);
      return;
    }

    setIsExecuting(true);
    setChallengeCompleted(false);
    setExecutionResult('Executando código...');
    setShowOutput(true);

    try {
      const result = await executeJavaScript(codeInput);
      setExecutionResult(result.output);

      // Check if it's a boss challenge and validate
      if (lesson.type === 'boss') {
        const validation = validateBossChallenge(result, codeInput, lesson.id);
        if (validation.isValid) {
          setChallengeCompleted(true);
          setExecutionResult(prev => prev + '\n\n' + validation.feedback);
        } else {
          setExecutionResult(prev => prev + '\n\n' + validation.feedback);
        }
      }
    } catch (error) {
      setExecutionResult(`Erro inesperado: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsExecuting(false);
    }
  };

  const handleShowHint = () => {
    setShowHint(!showHint);
  };

  const getHint = () => {
    if (lesson.type === 'boss') {
      return "Dica: Use let ou const para declarar variáveis. Exemplo: let nome = 'Seu Nome';";
    }
    return "Continue lendo o conteúdo para entender melhor o conceito!";
  };

  return (
    <div 
      className="fixed inset-0 z-50 modal-backdrop flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      data-testid="lesson-modal"
    >
      <div className="modal-content rounded-lg max-w-2xl w-full max-h-[90vh] overflow-auto">
        <div className="p-6">
          <div className="flex justify-between items-start mb-4">
            <h3 className="text-primary text-lg font-pixel" data-testid="modal-title">
              {lesson.title}
            </h3>
            <button 
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground text-xl font-pixel"
              data-testid="button-close-modal"
            >
              ✕
            </button>
          </div>
          
          <div className="text-foreground text-sm leading-relaxed mb-6 font-pixel" data-testid="modal-content">
            {lesson.content}
          </div>
          
          {lesson.type === 'boss' && lesson.challenge && (
            <div data-testid="challenge-section">
              <h4 className="text-accent text-base font-pixel mb-3">🎯 Desafio:</h4>
              <div className="text-foreground text-sm mb-4 font-pixel" data-testid="challenge-text">
                {lesson.challenge}
              </div>
              
              <div className="mb-4">
                <label className="block text-muted-foreground text-xs mb-2 font-pixel">
                  Seu código JavaScript:
                </label>
                <textarea 
                  value={codeInput}
                  onChange={(e) => setCodeInput(e.target.value)}
                  className="w-full h-32 bg-input border-2 border-border rounded p-3 text-foreground font-mono text-sm resize-none"
                  placeholder="// Digite seu código JavaScript aqui..."
                  data-testid="input-code"
                />
              </div>
              
              <div className="flex gap-3 mb-4">
                <button 
                  onClick={executeCode}
                  disabled={isExecuting}
                  className="pixel-button text-primary-foreground px-4 py-2 text-xs rounded font-pixel disabled:opacity-50"
                  data-testid="button-execute-code"
                >
                  {isExecuting ? '⏳ Executando...' : '⚡ Executar Código'}
                </button>
                <button 
                  onClick={handleShowHint}
                  className="bg-accent text-accent-foreground px-4 py-2 text-xs rounded font-pixel border-2 border-accent hover:bg-opacity-80"
                  data-testid="button-show-hint"
                >
                  💡 Dica
                </button>
              </div>

              {showHint && (
                <div className="mb-4 p-3 bg-muted border-2 border-border rounded" data-testid="hint-section">
                  <h5 className="text-muted-foreground text-xs mb-2 font-pixel">Dica:</h5>
                  <div className="text-foreground text-xs font-pixel">{getHint()}</div>
                </div>
              )}
              
              {showOutput && (
                <div className={`mb-4 p-3 border-2 rounded ${challengeCompleted ? 'bg-green-900 border-green-600' : 'bg-muted border-border'}`} data-testid="code-output">
                  <h5 className="text-muted-foreground text-xs mb-2 font-pixel">
                    {challengeCompleted ? '🎉 Desafio Concluído!' : 'Resultado:'}
                  </h5>
                  <pre className="text-foreground text-xs font-mono whitespace-pre-wrap">
                    {executionResult}
                  </pre>
                </div>
              )}
            </div>
          )}
          
          <div className="flex justify-between mt-6">
            <button 
              onClick={() => onNavigate(-1)}
              disabled={!canNavigatePrev}
              className="bg-secondary text-secondary-foreground px-4 py-2 text-xs rounded font-pixel border-2 border-secondary hover:bg-opacity-80 disabled:opacity-50"
              data-testid="button-previous-lesson"
            >
              ← Anterior
            </button>
            <button 
              onClick={() => onNavigate(1)}
              disabled={!canNavigateNext}
              className="pixel-button text-primary-foreground px-4 py-2 text-xs rounded font-pixel disabled:opacity-50"
              data-testid="button-next-lesson"
            >
              Próximo →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

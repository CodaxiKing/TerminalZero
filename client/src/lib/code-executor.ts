interface ExecutionResult {
  success: boolean;
  output: string;
  error?: string;
  logs?: string[];
}

export function executeJavaScript(code: string): Promise<ExecutionResult> {
  return new Promise((resolve) => {
    try {
      // Create Web Worker for safe execution
      const workerBlob = new Blob([`
        const ctx = self;
        
        ctx.onmessage = function(e) {
          const { code, timeout } = e.data;
          
          try {
            let hasTimedOut = false;
            const timeoutId = setTimeout(() => {
              hasTimedOut = true;
              ctx.postMessage({
                success: false,
                output: 'Erro: Tempo limite de execução excedido (2 segundos)',
                error: 'Timeout',
                logs: []
              });
            }, timeout);

            const logs = [];
            
            const mockConsole = {
              log: (...args) => {
                logs.push(args.map(arg => 
                  typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
                ).join(' '));
              },
              error: (...args) => {
                logs.push('ERROR: ' + args.map(arg => String(arg)).join(' '));
              },
              warn: (...args) => {
                logs.push('WARN: ' + args.map(arg => String(arg)).join(' '));
              }
            };

            const restrictedGlobals = {
              console: mockConsole,
              Math,
              Date,
              String,
              Number,
              Boolean,
              Array,
              Object,
              JSON,
              parseInt,
              parseFloat,
              isNaN,
              isFinite,
              RegExp,
              Error,
              TypeError,
              ReferenceError,
              SyntaxError
            };

            const func = new Function(
              ...Object.keys(restrictedGlobals),
              '"use strict"; ' + code
            );

            const result = func(...Object.values(restrictedGlobals));
            
            if (!hasTimedOut) {
              clearTimeout(timeoutId);
              
              let output = '';
              if (logs.length > 0) {
                output = logs.join('\\n');
              }
              if (result !== undefined) {
                if (output) output += '\\n';
                output += 'Resultado: ' + (typeof result === 'object' ? JSON.stringify(result, null, 2) : result);
              }
              if (!output) {
                output = 'Código executado com sucesso (sem saída)';
              }

              ctx.postMessage({
                success: true,
                output,
                logs
              });
            }

          } catch (error) {
            ctx.postMessage({
              success: false,
              output: 'Erro: ' + (error instanceof Error ? error.message : String(error)),
              error: error instanceof Error ? error.message : String(error),
              logs: []
            });
          }
        };
      `], { type: 'application/javascript' });

      const workerUrl = URL.createObjectURL(workerBlob);
      const worker = new Worker(workerUrl);
      
      worker.onmessage = (e) => {
        worker.terminate();
        URL.revokeObjectURL(workerUrl);
        resolve(e.data);
      };

      worker.onerror = (error) => {
        worker.terminate();
        URL.revokeObjectURL(workerUrl);
        resolve({
          success: false,
          output: `Erro no worker: ${error.message}`,
          error: error.message
        });
      };

      // Start execution with 2 second timeout
      worker.postMessage({ code, timeout: 2000 });

    } catch (error) {
      resolve({
        success: false,
        output: `Erro: ${error instanceof Error ? error.message : String(error)}`,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });
}

export function validateBossChallenge(result: ExecutionResult, code: string, challengeId: number): { isValid: boolean; feedback: string } {
  if (!result.success) {
    return {
      isValid: false,
      feedback: `Erro na execução: ${result.error}`
    };
  }

  // Challenge-specific validation
  switch (challengeId) {
    case 6: // Boss das Variáveis
      const hasNome = /let\s+nome|const\s+nome|var\s+nome/.test(code);
      const hasIdade = /let\s+idade|const\s+idade|var\s+idade/.test(code);
      const hasCidade = /let\s+cidade|const\s+cidade|var\s+cidade/.test(code);
      const hasConsoleLog = /console\.log/.test(code);
      
      if (!hasNome || !hasIdade || !hasCidade) {
        return {
          isValid: false,
          feedback: 'Certifique-se de criar as três variáveis: nome, idade e cidade.'
        };
      }
      
      if (!hasConsoleLog) {
        return {
          isValid: false,
          feedback: 'Não esqueça de usar console.log() para exibir o resultado!'
        };
      }
      
      return {
        isValid: true,
        feedback: '🎉 Parabéns! Você completou o desafio das variáveis!'
      };
      
    default:
      return {
        isValid: true,
        feedback: 'Código executado com sucesso!'
      };
  }
}
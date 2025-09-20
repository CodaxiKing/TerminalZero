// Web Worker for safe JavaScript execution
const ctx: Worker = self as any;

interface ExecutionMessage {
  type: 'execute';
  code: string;
  timeout: number;
}

interface ExecutionResult {
  success: boolean;
  output: string;
  error?: string;
  logs: string[];
}

ctx.onmessage = function(e: MessageEvent<ExecutionMessage>) {
  const { code, timeout } = e.data;
  
  try {
    // Set up execution timeout
    const timeoutId = setTimeout(() => {
      ctx.postMessage({
        success: false,
        output: 'Erro: Tempo limite de execução excedido (2 segundos)',
        error: 'Timeout',
        logs: []
      } as ExecutionResult);
    }, timeout);

    // Capture console output
    const logs: string[] = [];
    
    // Create sandboxed console
    const mockConsole = {
      log: (...args: any[]) => {
        logs.push(args.map(arg => 
          typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
        ).join(' '));
      },
      error: (...args: any[]) => {
        logs.push('ERROR: ' + args.map(arg => String(arg)).join(' '));
      },
      warn: (...args: any[]) => {
        logs.push('WARN: ' + args.map(arg => String(arg)).join(' '));
      }
    };

    // Create restricted global environment
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

    // Execute code in restricted scope
    const func = new Function(
      ...Object.keys(restrictedGlobals),
      `
      "use strict";
      ${code}
      `
    );

    const result = func(...Object.values(restrictedGlobals));
    
    clearTimeout(timeoutId);
    
    // Format output
    let output = '';
    if (logs.length > 0) {
      output = logs.join('\n');
    }
    if (result !== undefined) {
      if (output) output += '\n';
      output += `Resultado: ${typeof result === 'object' ? JSON.stringify(result, null, 2) : result}`;
    }
    if (!output) {
      output = 'Código executado com sucesso (sem saída)';
    }

    ctx.postMessage({
      success: true,
      output,
      logs
    } as ExecutionResult);

  } catch (error) {
    ctx.postMessage({
      success: false,
      output: `Erro: ${error instanceof Error ? error.message : String(error)}`,
      error: error instanceof Error ? error.message : String(error),
      logs: []
    } as ExecutionResult);
  }
};
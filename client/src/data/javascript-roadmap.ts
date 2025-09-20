export interface Lesson {
  id: number;
  type: 'lesson' | 'boss';
  title: string;
  content: string;
  challenge?: string;
}

export const trilhasDeAprendizado = {
  javascript: [
    {
      id: 1,
      type: 'lesson' as const,
      title: 'Introdução ao JavaScript',
      content: 'JavaScript é uma linguagem de programação versátil e poderosa que permite criar páginas web interativas. Originalmente criada para adicionar comportamento dinâmico aos sites, hoje é usada tanto no front-end quanto no back-end. JavaScript é interpretada pelos navegadores web e permite manipular elementos HTML, responder a eventos do usuário e comunicar-se com servidores.',
    },
    {
      id: 2,
      type: 'lesson' as const,
      title: 'Variáveis',
      content: 'Variáveis são como caixas que guardam valores na memória do computador. Em JavaScript, você pode declarar variáveis usando as palavras-chave var, let ou const. Por exemplo: let nome = "Maria"; const idade = 25; var cidade = "São Paulo"; Use const para valores que não mudam, let para valores que podem mudar, e evite var em código moderno.',
    },
    {
      id: 3,
      type: 'lesson' as const,
      title: 'Funções',
      content: 'Funções são blocos de código reutilizáveis que executam uma tarefa específica. Elas ajudam a organizar seu código e evitar repetições. Você pode criar uma função usando a palavra-chave function: function saudar(nome) { return "Olá, " + nome + "!"; } As funções podem receber parâmetros (dados de entrada) e retornar valores (dados de saída).',
    },
    {
      id: 4,
      type: 'lesson' as const,
      title: 'Arrays',
      content: 'Arrays são listas ordenadas que podem armazenar múltiplos valores em uma única variável. Em JavaScript, arrays são muito flexíveis e podem conter diferentes tipos de dados. Exemplo: let frutas = ["maçã", "banana", "laranja"]; Você pode acessar elementos usando índices: frutas[0] retorna "maçã". Arrays têm muitos métodos úteis como push(), pop(), slice() e forEach().',
    },
    {
      id: 5,
      type: 'lesson' as const,
      title: 'Objetos',
      content: 'Objetos são estruturas de dados que permitem agrupar propriedades e métodos relacionados. Eles são fundamentais em JavaScript e representam entidades do mundo real. Exemplo: let pessoa = { nome: "João", idade: 30, falar: function() { console.log("Olá!"); } }; Você acessa propriedades usando notação de ponto: pessoa.nome ou colchetes: pessoa["nome"].',
    },
    {
      id: 6,
      type: 'boss' as const,
      title: 'Chefão das Variáveis',
      content: 'Parabéns por chegar até aqui! Agora é hora de testar seus conhecimentos em um desafio prático. Este chefão vai avaliar sua compreensão sobre variáveis, tipos de dados e operações básicas em JavaScript.',
      challenge: 'Crie três variáveis: uma chamada "nome" com seu nome, uma chamada "idade" com sua idade, e uma chamada "cidade" com sua cidade. Depois, crie uma variável "apresentacao" que combine todas essas informações em uma frase e exiba o resultado usando console.log().'
    }
  ],

  html: [
    {
      id: 1,
      type: 'lesson' as const,
      title: 'O que é HTML?',
      content: 'HTML (HyperText Markup Language) é a linguagem de marcação padrão para criar páginas web. HTML descreve a estrutura de uma página web usando elementos e tags. Cada elemento HTML é representado por tags, que são palavras-chave cercadas por colchetes angulares, como <h1>, <p>, <div>. HTML é a espinha dorsal de qualquer página web.',
    },
    {
      id: 2,
      type: 'lesson' as const,
      title: 'Tags e Elementos',
      content: 'Tags HTML são os blocos de construção básicos. Elas vêm em pares: tag de abertura <tag> e tag de fechamento </tag>. Exemplos: <h1>Título</h1>, <p>Parágrafo</p>. Algumas tags são auto-fechadas como <img>, <br>, <hr>. Elementos podem ter atributos que fornecem informações adicionais: <img src="foto.jpg" alt="Minha foto">.',
    },
    {
      id: 3,
      type: 'lesson' as const,
      title: 'Estrutura Básica',
      content: 'Todo documento HTML tem uma estrutura básica: <!DOCTYPE html> declara o tipo de documento, <html> é o elemento raiz, <head> contém metadados, e <body> contém o conteúdo visível. Exemplo básico: <!DOCTYPE html><html><head><title>Título</title></head><body><h1>Olá Mundo!</h1></body></html>',
    },
    {
      id: 4,
      type: 'boss' as const,
      title: 'Chefão da Estrutura',
      content: 'Teste seus conhecimentos sobre a estrutura HTML básica! Este desafio vai verificar se você entende como criar uma página HTML válida e bem estruturada.',
      challenge: 'Crie uma página HTML básica com: DOCTYPE, elemento html, head com título "Minha Primeira Página", e body com um header, main e footer. Adicione conteúdo apropriado em cada seção.'
    }
  ],

  css: [
    {
      id: 1,
      type: 'lesson' as const,
      title: 'Introdução ao CSS',
      content: 'CSS (Cascading Style Sheets) é a linguagem usada para estilizar páginas HTML. Enquanto HTML define a estrutura, CSS define a aparência: cores, fontes, layouts, animações. CSS usa seletores para identificar elementos HTML e aplicar estilos. Exemplo: h1 { color: blue; font-size: 24px; }',
    },
    {
      id: 2,
      type: 'lesson' as const,
      title: 'Seletores',
      content: 'Seletores CSS identificam quais elementos estilizar. Tipos principais: elemento (h1), classe (.minha-classe), ID (#meu-id), atributo ([type="text"]). Você pode combinar seletores para maior especificidade: .container h1 seleciona h1 dentro de elementos com classe container.',
    },
    {
      id: 3,
      type: 'lesson' as const,
      title: 'Box Model',
      content: 'O Box Model é fundamental no CSS. Cada elemento é uma caixa com: content (conteúdo), padding (espaçamento interno), border (borda), margin (espaçamento externo). Width e height afetam apenas o content por padrão. Use box-sizing: border-box para incluir padding e border no tamanho total.',
    },
    {
      id: 4,
      type: 'boss' as const,
      title: 'Chefão do Layout',
      content: 'Teste seus conhecimentos sobre CSS e layout! Este desafio vai verificar sua compreensão sobre seletores, box model e posicionamento.',
      challenge: 'Crie um CSS que estilize uma página com: um cabeçalho com background azul, um container central com width máxima de 800px e margin automática, e cards com padding, border radius e shadow.'
    }
  ],

  react: [
    {
      id: 1,
      type: 'lesson' as const,
      title: 'O que é React?',
      content: 'React é uma biblioteca JavaScript para construir interfaces de usuário. Criada pelo Facebook, React permite criar aplicações web dinâmicas usando componentes reutilizáveis. React usa JSX (JavaScript XML) que permite escrever HTML dentro do JavaScript, tornando o código mais legível e eficiente.',
    },
    {
      id: 2,
      type: 'lesson' as const,
      title: 'Componentes',
      content: 'Componentes são os blocos de construção do React. Eles são como funções JavaScript que retornam JSX. Componentes podem receber props (propriedades) como parâmetros. Exemplo: function Saudacao({nome}) { return <h1>Olá, {nome}!</h1>; } Componentes promovem reutilização e organização do código.',
    },
    {
      id: 3,
      type: 'lesson' as const,
      title: 'Estado (State)',
      content: 'Estado é como o React gerencia dados que podem mudar ao longo do tempo. Use o hook useState para adicionar estado aos componentes funcionais. Exemplo: const [contador, setContador] = useState(0); Quando o estado muda, React re-renderiza o componente automaticamente.',
    },
    {
      id: 4,
      type: 'boss' as const,
      title: 'Chefão dos Componentes',
      content: 'Teste seus conhecimentos sobre React! Este desafio vai verificar sua compreensão sobre componentes, props e estado.',
      challenge: 'Crie um componente Contador que: aceite um valor inicial via props, use useState para gerenciar o contador, tenha botões para incrementar e decrementar, e exiba o valor atual.'
    }
  ],

  nodejs: [
    {
      id: 1,
      type: 'lesson' as const,
      title: 'O que é Node.js?',
      content: 'Node.js é um ambiente de execução JavaScript no servidor. Permite usar JavaScript para desenvolvimento back-end, criando APIs, servidores web, e aplicações de linha de comando. Node.js é assíncrono e orientado a eventos, tornando-o eficiente para aplicações que fazem muitas operações de I/O.',
    },
    {
      id: 2,
      type: 'lesson' as const,
      title: 'Módulos e NPM',
      content: 'Node.js usa o sistema CommonJS para módulos. Use require() para importar e module.exports para exportar. NPM (Node Package Manager) gerencia dependências. Exemplo: const express = require("express"); npm install express instala pacotes. package.json lista dependências do projeto.',
    },
    {
      id: 3,
      type: 'lesson' as const,
      title: 'Servidor HTTP',
      content: 'Node.js pode criar servidores HTTP nativamente. Exemplo básico: const http = require("http"); const server = http.createServer((req, res) => { res.writeHead(200, {"Content-Type": "text/plain"}); res.end("Olá Mundo!"); }); server.listen(3000); Frameworks como Express simplificam muito esse processo.',
    },
    {
      id: 4,
      type: 'boss' as const,
      title: 'Chefão do Servidor',
      content: 'Teste seus conhecimentos sobre Node.js! Este desafio vai verificar sua compreensão sobre módulos, NPM e criação de servidores.',
      challenge: 'Crie um servidor Node.js que: escute na porta 3000, responda "Hello World" na rota /, responda com JSON na rota /api, e use o módulo fs para ler um arquivo na rota /file.'
    }
  ]
};

// Manter compatibilidade com código existente
export const javascriptRoadmap: Lesson[] = trilhasDeAprendizado.javascript;

export interface Lesson {
  id: number;
  type: 'lesson' | 'boss';
  title: string;
  content: string;
  challenge?: string;
}

export const javascriptRoadmap: Lesson[] = [
  {
    id: 1,
    type: 'lesson',
    title: 'Introdução ao JavaScript',
    content: 'JavaScript é uma linguagem de programação versátil e poderosa que permite criar páginas web interativas. Originalmente criada para adicionar comportamento dinâmico aos sites, hoje é usada tanto no front-end quanto no back-end. JavaScript é interpretada pelos navegadores web e permite manipular elementos HTML, responder a eventos do usuário e comunicar-se com servidores.',
  },
  {
    id: 2,
    type: 'lesson',
    title: 'Variáveis',
    content: 'Variáveis são como caixas que guardam valores na memória do computador. Em JavaScript, você pode declarar variáveis usando as palavras-chave var, let ou const. Por exemplo: let nome = "Maria"; const idade = 25; var cidade = "São Paulo"; Use const para valores que não mudam, let para valores que podem mudar, e evite var em código moderno.',
  },
  {
    id: 3,
    type: 'lesson',
    title: 'Funções',
    content: 'Funções são blocos de código reutilizáveis que executam uma tarefa específica. Elas ajudam a organizar seu código e evitar repetições. Você pode criar uma função usando a palavra-chave function: function saudar(nome) { return "Olá, " + nome + "!"; } As funções podem receber parâmetros (dados de entrada) e retornar valores (dados de saída).',
  },
  {
    id: 4,
    type: 'lesson',
    title: 'Arrays',
    content: 'Arrays são listas ordenadas que podem armazenar múltiplos valores em uma única variável. Em JavaScript, arrays são muito flexíveis e podem conter diferentes tipos de dados. Exemplo: let frutas = ["maçã", "banana", "laranja"]; Você pode acessar elementos usando índices: frutas[0] retorna "maçã". Arrays têm muitos métodos úteis como push(), pop(), slice() e forEach().',
  },
  {
    id: 5,
    type: 'lesson',
    title: 'Objetos',
    content: 'Objetos são estruturas de dados que permitem agrupar propriedades e métodos relacionados. Eles são fundamentais em JavaScript e representam entidades do mundo real. Exemplo: let pessoa = { nome: "João", idade: 30, falar: function() { console.log("Olá!"); } }; Você acessa propriedades usando notação de ponto: pessoa.nome ou colchetes: pessoa["nome"].',
  },
  {
    id: 6,
    type: 'boss',
    title: 'Chefão das Variáveis',
    content: 'Parabéns por chegar até aqui! Agora é hora de testar seus conhecimentos em um desafio prático. Este chefão vai avaliar sua compreensão sobre variáveis, tipos de dados e operações básicas em JavaScript.',
    challenge: 'Crie três variáveis: uma chamada "nome" com seu nome, uma chamada "idade" com sua idade, e uma chamada "cidade" com sua cidade. Depois, crie uma variável "apresentacao" que combine todas essas informações em uma frase e exiba o resultado usando console.log().'
  }
];

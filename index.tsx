/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { useState, useCallback, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { GoogleGenAI, Type } from '@google/genai';

// --- Reusable Components ---
const FooterNav = ({ active }) => (
  <footer className="sticky bottom-0 z-20 w-full border-t border-gray-800 bg-background-dark/80 pb-safe backdrop-blur-sm">
    <nav className="flex items-center justify-around p-2">
      <a href="#diagnostico" className={`flex flex-col items-center justify-center rounded-lg px-4 py-2 transition-colors ${active === 'diagnostico' ? 'bg-primary/10 text-primary' : 'text-gray-400'}`}>
        <span className="material-symbols-outlined">home</span>
        <span className="text-xs">Inicio</span>
      </a>
      <a href="#niveles" className={`flex flex-col items-center justify-center rounded-lg px-4 py-2 transition-colors ${active === 'niveles' ? 'bg-primary/10 text-primary' : 'text-gray-400'}`}>
        <span className="material-symbols-outlined">school</span>
        <span className="text-xs">Niveles</span>
      </a>
      <a href="#practica" className={`flex flex-col items-center justify-center rounded-lg px-4 py-2 transition-colors ${active === 'practica' ? 'bg-primary/10 text-primary' : 'text-gray-400'}`}>
        <span className="material-symbols-outlined">timer</span>
        <span className="text-xs">Práctica</span>
      </a>
      <a href="#tecnica" className={`flex flex-col items-center justify-center rounded-lg px-4 py-2 transition-colors ${active === 'tecnica' ? 'bg-primary/10 text-primary' : 'text-gray-400'}`}>
        <span className="material-symbols-outlined">construction</span>
        <span className="text-xs">Técnica</span>
      </a>
      <a href="#partituras" className={`flex flex-col items-center justify-center rounded-lg px-4 py-2 transition-colors ${active === 'partituras' ? 'bg-primary/10 text-primary' : 'text-gray-400'}`}>
        <span className="material-symbols-outlined">music_note</span>
        <span className="text-xs">Repertorio</span>
      </a>
    </nav>
  </footer>
);

// --- Page Components ---

const PageWrapper = ({ children, showFooter, activeFooterLink, header }) => (
    <div className="relative flex h-auto min-h-screen w-full flex-col justify-between overflow-x-hidden bg-background-dark text-gray-200">
      {header}
      <div className="flex flex-col flex-grow">
        {children}
      </div>
      {showFooter && <FooterNav active={activeFooterLink} />}
    </div>
);

interface QuizQuestion {
  question: string;
  options: string[];
  answer: string;
}

const QuizFlow = () => {
  const [gameState, setGameState] = useState<'welcome' | 'loading' | 'quiz' | 'results'>('welcome');
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchQuiz = useCallback(async () => {
    setGameState('loading');
    setError(null);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: "Eres un instructor experto de guitarra clásica. Crea un cuestionario de evaluación de 5 preguntas de opción múltiple para un nuevo estudiante. Las preguntas deben aumentar progresivamente en dificultad, comenzando desde conceptos muy básicos (por ejemplo, partes de la guitarra) hasta temas para principiantes un poco más avanzados (por ejemplo, notación musical básica, técnicas simples). La respuesta proporcionada debe ser una de las opciones.",
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              quiz: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    question: { type: Type.STRING },
                    options: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING },
                    },
                    answer: { type: Type.STRING },
                  },
                  required: ['question', 'options', 'answer'],
                },
              },
            },
            required: ['quiz'],
          },
        },
      });

      const jsonResponse = JSON.parse(response.text);
      if (jsonResponse.quiz && jsonResponse.quiz.length > 0) {
        setQuestions(jsonResponse.quiz);
        setCurrentQuestionIndex(0);
        setScore(0);
        setSelectedAnswer(null);
        setIsCorrect(null);
        setGameState('quiz');
      } else {
        throw new Error("No se pudo generar un cuestionario válido.");
      }
    } catch (e) {
      console.error(e);
      setError("Lo siento, no pude crear un cuestionario en este momento. Por favor, inténtalo de nuevo más tarde.");
      setGameState('welcome');
    }
  }, []);

  const handleAnswerSelect = (option: string) => {
    if (selectedAnswer) return; 

    setSelectedAnswer(option);
    const correct = option === questions[currentQuestionIndex].answer;
    setIsCorrect(correct);
    if (correct) {
      setScore(score + 1);
    }

    setTimeout(() => {
      if (currentQuestionIndex < questions.length - 1) {
        setCurrentQuestionIndex(currentQuestionIndex + 1);
        setSelectedAnswer(null);
        setIsCorrect(null);
      } else {
        setGameState('results');
      }
    }, 1500);
  };

  const handleRestart = () => {
    setGameState('welcome');
    setQuestions([]);
  };
  
  const renderContent = () => {
    switch (gameState) {
      case 'loading':
        return (
          <div className="flex flex-col flex-grow items-center justify-center text-center px-6 py-8">
            <svg className="animate-spin h-12 w-12 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p className="mt-4 text-lg text-gray-300">Generando tu evaluación...</p>
          </div>
        );
      case 'quiz': {
        const question = questions[currentQuestionIndex];
        return (
          <div className="flex-grow flex flex-col justify-center px-6 py-8 text-center max-w-2xl mx-auto w-full">
            <div className="mb-8">
              <p className="text-lg font-medium text-primary" aria-live="polite">Pregunta {currentQuestionIndex + 1} de {questions.length}</p>
              <h2 className="mt-2 text-2xl font-bold text-white leading-tight">{question.question}</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {question.options.map((option, index) => {
                const isSelected = selectedAnswer === option;
                let buttonClass = 'w-full text-left text-lg p-4 rounded-lg border-2 transition-all duration-300 ';
                if (isSelected) {
                    buttonClass += isCorrect ? 'bg-green-500 border-green-500 text-white ring-4 ring-green-500/50' : 'bg-red-500 border-red-500 text-white ring-4 ring-red-500/50';
                } else if (selectedAnswer && option === question.answer) {
                    buttonClass += 'bg-green-500/80 border-green-500/80 text-white';
                } else {
                    buttonClass += 'bg-gray-800 border-gray-600 hover:bg-primary/20 hover:border-primary/50 text-white';
                }
                return (
                    <button key={index} onClick={() => handleAnswerSelect(option)} disabled={!!selectedAnswer} className={buttonClass}>
                        {option}
                    </button>
                );
              })}
            </div>
          </div>
        );
      }
      case 'results': {
        const percentage = Math.round((score / questions.length) * 100);
        let level, description;
        if (percentage >= 80) {
            level = "Intermedio";
            description = "¡Excelente trabajo! Tienes una base sólida. Estás listo para sumergirte en repertorio más desafiante.";
        } else if (percentage >= 40) {
            level = "Principiante";
            description = "¡Un gran comienzo! Conoces los conceptos básicos. Vamos a construir sobre esa base para afianzar tu técnica.";
        } else {
            level = "Recién Llegado";
            description = "¡Bienvenido al mundo de la guitarra clásica! Este es el lugar perfecto para comenzar tu viaje musical.";
        }
        
        return (
             <div className="flex-grow flex flex-col justify-center items-center px-6 py-8 text-center">
                 <h2 className="text-4xl font-bold text-white">¡Evaluación Completada!</h2>
                 <p className="mt-4 text-xl text-gray-300">Has acertado {score} de {questions.length} preguntas.</p>
                <div className="mt-8 bg-gray-800/50 border border-gray-700 p-6 rounded-xl max-w-md w-full">
                    <p className="text-lg font-semibold text-primary">Tu Nivel Recomendado es:</p>
                    <p className="text-3xl font-bold text-white mt-2">{level}</p>
                    <p className="mt-3 text-gray-300">{description}</p>
                </div>
                <div className="mt-8 flex flex-col gap-4 w-full max-w-md">
                    <a href="#diagnostico" className="w-full block bg-primary text-white font-bold py-3 px-5 rounded-lg shadow-lg hover:bg-primary/90 transition-colors duration-300 text-center">
                        Ir a mi Panel de Inicio
                    </a>
                    <button onClick={handleRestart} className="w-full bg-transparent text-primary font-bold py-3 px-5 rounded-lg hover:bg-primary/10 transition-colors duration-300">
                        Hacer de Nuevo
                    </button>
                </div>
             </div>
        );
      }
      case 'welcome':
      default:
        return (
          <>
            <div className="w-full h-80 bg-center bg-no-repeat bg-cover" style={{ backgroundImage: 'url("https://lh3.googleusercontent.com/aida-public/AB6AXuAOokjRTgOSqw3KHvri84jQQENIwf1dB1uN4GqeQD9Yl7VDB0Lsq2QnKQL7wlUObe8fofItIooroCT-4iVbntTCz3fMvGe5fZ0FdnR4tL8a3lL98KTkXIVm4IeX90OV_zZZf3F8mEpWpDWX0Q27ZmRkVOsk9SweCG4R0VkU908jxSCnTMOlO1fewAOpuNgUwZzGIvnCCzU2tphXd-whrgWwvYqdj24vXwmJay0io9F5Sau39aHU2cIiCybJbznIYQ0ppAPKLHB00gg")' }}></div>
            <div className="flex-grow flex flex-col justify-center px-6 py-8 text-center">
              <h1 className="text-3xl font-bold text-white leading-tight">Domina la Guitarra Clásica</h1>
              <p className="mt-4 text-base text-gray-300 max-w-md mx-auto">
                Desbloquea tu potencial musical con nuestra ruta de aprendizaje adaptativo, diseñada para llevarte desde los fundamentos hasta la maestría.
              </p>
              {error && <p className="mt-4 text-red-500" role="alert">{error}</p>}
            </div>
            <div className="px-6 pb-8 pt-4">
              <button onClick={fetchQuiz} className="w-full bg-primary text-white font-bold py-3 px-5 rounded-lg shadow-lg hover:bg-primary/90 transition-colors duration-300 max-w-md mx-auto block">
                Iniciar Diagnóstico Adaptativo
              </button>
            </div>
          </>
        );
    }
  };

   // FIX: Added missing 'activeFooterLink' and 'header' props to the PageWrapper component call to resolve a type error.
   return <PageWrapper showFooter={false} activeFooterLink={null} header={null}>{renderContent()}</PageWrapper>;
};

const DiagnosticoPage = () => (
    <PageWrapper showFooter={true} activeFooterLink="diagnostico" header={
        <header className="sticky top-0 z-20 bg-background-dark/80 backdrop-blur-sm">
            <div className="flex items-center p-4">
                <a href="#" onClick={(e) => { e.preventDefault(); window.history.back(); }} className="flex h-11 w-11 items-center justify-center rounded-full text-gray-300">
                    <span className="material-symbols-outlined">arrow_back</span>
                </a>
                <h1 className="flex-1 text-center text-lg font-bold text-white">Diagnóstico Adaptativo</h1>
                <div className="w-11"></div>
            </div>
        </header>
    }>
        <main className="flex-1 overflow-y-auto p-4 pb-24">
            <div className="space-y-6">
                <div className="rounded-xl bg-gray-800/50 border border-gray-700 p-6">
                    <div className="flex justify-between items-center">
                        <span className="text-sm font-semibold text-gray-400">Progreso</span>
                        <span className="text-sm font-semibold text-gray-400">80%</span>
                    </div>
                    <div className="progress-bar mt-2">
                        <div className="progress-bar-fill" style={{ width: '80%' }}></div>
                    </div>
                </div>
                <div className="space-y-4">
                    <h2 className="text-xl font-bold text-white">Objetivos del nivel</h2>
                    <div className="rounded-xl border border-gray-700 bg-gray-800/50 p-4">
                        <div className="flex justify-between items-center">
                            <p className="font-semibold text-white">Postura y sujeción</p>
                            <p className="text-sm text-gray-400">1/1</p>
                        </div>
                        <div className="progress-bar mt-2">
                            <div className="progress-bar-fill" style={{ width: '100%' }}></div>
                        </div>
                    </div>
                    <div className="rounded-xl border border-gray-700 bg-gray-800/50 p-4">
                        <div className="flex justify-between items-center">
                            <p className="font-semibold text-white">Coordinación de dedos</p>
                            <p className="text-sm text-gray-400">2/5 ritmos dominados</p>
                        </div>
                        <div className="progress-bar mt-2">
                            <div className="progress-bar-fill" style={{ width: '40%' }}></div>
                        </div>
                    </div>
                    <div className="rounded-xl border border-gray-700 bg-gray-800/50 p-4">
                        <div className="flex justify-between items-center">
                            <p className="font-semibold text-white">Lectura Rítmica</p>
                            <p className="text-sm text-gray-400">0/5 ritmos dominados</p>
                        </div>
                        <div className="progress-bar mt-2">
                            <div className="progress-bar-fill" style={{ width: '0%' }}></div>
                        </div>
                    </div>
                </div>
                <div className="pt-4">
                    <button className="w-full bg-primary text-white font-bold py-3 px-5 rounded-lg shadow-lg hover:bg-primary/90 transition-colors duration-300">
                        Continuar con el diagnóstico
                    </button>
                </div>
            </div>
        </main>
    </PageWrapper>
);

const NivelesPage = () => (
    <PageWrapper showFooter={true} activeFooterLink="niveles" header={
        <header className="sticky top-0 z-20 bg-background-dark/80 backdrop-blur-sm">
            <div className="flex items-center p-4">
                <a href="#diagnostico" className="flex h-11 w-11 items-center justify-center rounded-full text-gray-300">
                    <span className="material-symbols-outlined">arrow_back</span>
                </a>
                <h1 className="flex-1 text-center text-lg font-bold text-white">Niveles</h1>
                <div className="w-11"></div>
            </div>
        </header>
    }>
         <main className="flex-1 overflow-y-auto p-4 pb-24">
            <div className="space-y-8">
                <section className="rounded-xl bg-gray-800/50 border border-gray-700 p-6">
                    <div className="flex justify-between items-center">
                        <h2 className="text-xl font-bold text-white">Nivel 4: Ritmos y acordes</h2>
                        <span className="font-semibold text-primary">33%</span>
                    </div>
                    <div className="progress-bar mt-3 !h-2">
                        <div className="progress-bar-fill" style={{ width: '33%' }}></div>
                    </div>
                </section>
                <section>
                    <h3 className="text-lg font-bold text-white mb-4">Objetivos del nivel</h3>
                    <div className="space-y-4">
                        <div className="flex items-center gap-4">
                            <div className="w-6 h-6 flex items-center justify-center rounded-full bg-primary text-white">
                                <span className="material-symbols-outlined text-base">check</span>
                            </div>
                            <div className="flex-1">
                                <p className="text-white">Dominar 5 ritmos básicos</p>
                                <div className="progress-bar mt-1">
                                    <div className="progress-bar-fill" style={{ width: '40%' }}></div>
                                </div>
                            </div>
                            <span className="text-sm text-gray-400">2/5</span>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="w-6 h-6 flex items-center justify-center rounded-full border-2 border-primary"></div>
                            <div className="flex-1">
                                <p className="text-white">Aprender 5 acordes comunes</p>
                                <div className="progress-bar mt-1">
                                    <div className="progress-bar-fill" style={{ width: '60%' }}></div>
                                </div>
                            </div>
                            <span className="text-sm text-gray-400">3/5</span>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="w-6 h-6 flex items-center justify-center rounded-full border-2 border-gray-500"></div>
                            <div className="flex-1">
                                <p className="text-white">Tocar 2 canciones sencillas</p>
                                <div className="progress-bar mt-1">
                                    <div className="progress-bar-fill" style={{ width: '50%' }}></div>
                                </div>
                            </div>
                            <span className="text-sm text-gray-400">1/2</span>
                        </div>
                    </div>
                </section>
                <section>
                    <h3 className="text-lg font-bold text-white mb-4">Próxima lección</h3>
                    <a href="#" className="flex items-center gap-4 rounded-xl bg-gray-800/50 border border-gray-700 p-4 transition-colors hover:bg-gray-800/70">
                        <img alt="Guitarra" className="h-16 w-16 flex-shrink-0 rounded-lg object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuA3X7tjPV5cqJtYstgGf-pm4NKTnzxXdHm4UMU_QXJ0xPugoKrOpRNE_pYnsttNAR3TpjCNyh7Mk1WpdpF5qaRcs27MTssSxu34y0eGN1pXixPkqNIzY33HFQkd-i_eklBRIilOq4bz8wy4ZrPXO93PDM9QziIw2wB-wr3dwRKIkr5f3u7zYhF5QbVjGMpPmii62DYODULnJ2De4KGANJ1zDAdyTeESyVtaQUEdJyS8KPNeTZcLwJkA4pxqBHNtVBb4MQG--2F-vZk" />
                        <div className="flex-1">
                            <h4 className="font-semibold text-white">Ritmo de Rock Básico</h4>
                            <p className="text-sm text-gray-400">Aprende los fundamentos de un ritmo de rock versátil.</p>
                        </div>
                        <span className="material-symbols-outlined text-gray-400 ml-auto">chevron_right</span>
                    </a>
                </section>
                <section>
                    <h3 className="text-lg font-bold text-white mb-4">Hitos alcanzados</h3>
                    <div className="grid grid-cols-3 gap-4 text-center bg-gray-800/50 border border-gray-700 rounded-xl p-4">
                        <div>
                            <p className="text-2xl font-bold text-white">2/3</p>
                            <p className="text-xs text-gray-400 mt-1">Ritmos dominados</p>
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-white">3/5</p>
                            <p className="text-xs text-gray-400 mt-1">Acordes aprendidos</p>
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-white">1/2</p>
                            <p className="text-xs text-gray-400 mt-1">Canciones tocadas</p>
                        </div>
                    </div>
                </section>
                <section>
                    <h3 className="text-lg font-bold text-white mb-4">Todos los niveles</h3>
                    <div className="space-y-2">
                        <a href="#partituras" className="flex justify-between items-center rounded-lg p-4 bg-gray-800/50 hover:bg-gray-800/80 transition-colors">
                            <div>
                                <h4 className="font-semibold text-white">Niveles 1-4</h4>
                                <p className="text-sm text-gray-400">Nivel inicial</p>
                            </div>
                            <span className="material-symbols-outlined text-gray-400">chevron_right</span>
                        </a>
                        <a href="#partituras" className="flex justify-between items-center rounded-lg p-4 bg-gray-800/50 hover:bg-gray-800/80 transition-colors">
                            <div>
                                <h4 className="font-semibold text-white">Niveles 5-8</h4>
                                <p className="text-sm text-gray-400">Nivel intermedio</p>
                            </div>
                            <span className="material-symbols-outlined text-gray-400">chevron_right</span>
                        </a>
                        <a href="#partituras" className="flex justify-between items-center rounded-lg p-4 bg-gray-800/50 hover:bg-gray-800/80 transition-colors">
                            <div>
                                <h4 className="font-semibold text-white">Niveles 9-12</h4>
                                <p className="text-sm text-gray-400">Nivel avanzado</p>
                            </div>
                            <span className="material-symbols-outlined text-gray-400">chevron_right</span>
                        </a>
                    </div>
                </section>
            </div>
        </main>
    </PageWrapper>
);

const ComingSoonPage = ({ title, parent, parentHref }) => (
    <PageWrapper showFooter={true} activeFooterLink="partituras" header={
        <header className="sticky top-0 z-20 bg-background-dark/80 backdrop-blur-sm">
            <div className="flex items-center p-4">
                <a href={parentHref} className="flex h-11 w-11 items-center justify-center rounded-full text-gray-300">
                    <span className="material-symbols-outlined">arrow_back</span>
                </a>
                <h1 className="flex-1 text-center text-lg font-bold text-white">{title}</h1>
                <div className="w-11"></div>
            </div>
        </header>
    }>
        <main className="flex-1 flex items-center justify-center text-center p-4">
            <div>
                <h2 className="text-2xl font-bold text-white">Próximamente</h2>
                <p className="mt-2 text-gray-400">Estamos preparando las partituras para {title}. ¡Vuelve pronto!</p>
            </div>
        </main>
    </PageWrapper>
);

const PracticaPage = () => (
    <PageWrapper showFooter={true} activeFooterLink="practica" header={
        <header className="sticky top-0 z-20 bg-background-dark/80 backdrop-blur-sm">
            <div className="flex items-center p-4">
                <h1 className="flex-1 text-center text-lg font-bold text-white">Sesión de Práctica</h1>
            </div>
        </header>
    }>
        <main className="flex-1 overflow-y-auto p-4 flex flex-col items-center justify-center">
            <div className="text-center">
                <h2 className="text-7xl font-bold text-white tabular-nums">10:00</h2>
                <p className="text-lg text-gray-400 mt-2">Calentamiento de Técnica</p>
            </div>
            <div className="mt-8 flex items-center gap-4">
                <button className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-800/50 text-gray-300">
                    <span className="material-symbols-outlined text-4xl">restart_alt</span>
                </button>
                <button className="flex h-24 w-24 items-center justify-center rounded-full bg-primary text-white shadow-lg">
                    <span className="material-symbols-outlined text-6xl">play_arrow</span>
                </button>
                <button className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-800/50 text-gray-300">
                    <span className="material-symbols-outlined text-4xl">skip_next</span>
                </button>
            </div>
            <div className="mt-12 w-full max-w-sm">
                <h3 className="font-bold text-center text-gray-300">Siguiente: Repertorio (10 min)</h3>
            </div>
        </main>
    </PageWrapper>
);

const TecnicaPage = () => (
    <PageWrapper showFooter={true} activeFooterLink="tecnica" header={
        <header className="sticky top-0 z-20 bg-background-dark/80 backdrop-blur-sm">
            <div className="flex items-center p-4">
                <h1 className="flex-1 text-center text-lg font-bold text-white">Biblioteca de Técnica</h1>
            </div>
        </header>
    }>
        <main className="flex-1 overflow-y-auto p-4">
            <div className="space-y-4">
                <div className="rounded-xl border border-gray-800 bg-background-dark/50 p-4">
                    <h3 className="font-bold text-white">Escalas</h3>
                    <p className="text-sm text-gray-400">Ejercicios para agilidad y precisión.</p>
                </div>
                <div className="rounded-xl border border-gray-800 bg-background-dark/50 p-4">
                    <h3 className="font-bold text-white">Arpegios</h3>
                    <p className="text-sm text-gray-400">Para la independencia y fuerza de los dedos.</p>
                </div>
                <div className="rounded-xl border border-gray-800 bg-background-dark/50 p-4">
                    <h3 className="font-bold text-white">Ligados</h3>
                    <p className="text-sm text-gray-400">Desarrolla la fluidez y la mano izquierda.</p>
                </div>
                <div className="rounded-xl border border-gray-800 bg-background-dark/50 p-4">
                    <h3 className="font-bold text-white">Trémolo</h3>
                    <p className="text-sm text-gray-400">Crea un sonido sostenido y expresivo.</p>
                </div>
            </div>
        </main>
    </PageWrapper>
);

const PartiturasPage = () => (
    <PageWrapper showFooter={true} activeFooterLink="partituras" header={
         <header className="sticky top-0 z-20 bg-background-dark/80 backdrop-blur-sm">
            <div className="flex items-center p-4">
                <h1 className="flex-1 text-center text-lg font-bold text-white">Repertorio por Nivel</h1>
            </div>
        </header>
    }>
        <main className="flex-1 overflow-y-auto p-4">
            <div className="space-y-4">
                {[1, 2, 3, 4, 5, 6, 7].map(level => {
                    const titles = ["Recién Llegado", "Principiante", "Intermedio Bajo", "Intermedio", "Intermedio Alto", "Avanzado", "Maestría"];
                    const descriptions = ["Conceptos básicos y piezas sencillas", "Desarrollo de técnica y musicalidad", "Introducción a repertorio más complejo", "Dominio de técnicas y estilos", "Piezas de concierto y estudios avanzados", "Repertorio virtuoso y de interpretación", "Dominio completo del instrumento"];
                    return (
                        <a key={level} className="flex items-center justify-between rounded-xl border border-gray-800 bg-background-dark/50 p-4 transition-transform duration-200 hover:scale-[1.02]" href={`#nivel-${level}`}>
                            <div className="flex items-center gap-4">
                                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-xl font-bold text-primary">{level}</span>
                                <div>
                                    <h3 className="font-bold text-white">Nivel {level}: {titles[level-1]}</h3>
                                    <p className="text-sm text-gray-400">{descriptions[level-1]}</p>
                                </div>
                            </div>
                            <span className="material-symbols-outlined text-gray-500">chevron_right</span>
                        </a>
                    );
                })}
            </div>
        </main>
    </PageWrapper>
);

const LevelPage = ({ level, pieces }) => (
    <PageWrapper showFooter={true} activeFooterLink="partituras" header={
        <header className="sticky top-0 z-20 bg-background-dark/80 backdrop-blur-sm">
            <div className="flex items-center p-4">
                <a href="#partituras" className="flex h-11 w-11 items-center justify-center rounded-full text-gray-300">
                    <span className="material-symbols-outlined">arrow_back</span>
                </a>
                <h1 className="flex-1 text-center text-lg font-bold text-white">Partituras: Nivel {level}</h1>
                <div className="w-11"></div>
            </div>
        </header>
    }>
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
            <div className="space-y-12 max-w-4xl mx-auto">
                {pieces.map(piece => (
                    <section key={piece.id} aria-labelledby={`${piece.id}-heading`}>
                        <h2 id={`${piece.id}-heading`} className="text-2xl font-bold mb-4 border-b pb-2 border-gray-700 text-white">{piece.title}</h2>
                        <div className="space-y-4">
                            {Array.from({ length: piece.pages }, (_, i) => i + 1).map(pageNumber => (
                                <img key={pageNumber} src={`https://storage.googleapis.com/aai-web-samples/custom-apps/guitar-tutor/assets/${piece.id}-${pageNumber}.png`} alt={`${piece.title} - Página ${pageNumber}`} className="w-full rounded-lg shadow-md border border-gray-700" />
                            ))}
                        </div>
                    </section>
                ))}
            </div>
        </main>
    </PageWrapper>
);

const levelPieces = {
    1: [
        { id: 'silent-night', title: 'Silent Night', pages: 5 },
        { id: 'bransle-du-poictou', title: 'Bransle Du Poictou', pages: 3 },
        { id: 'andantino', title: 'Andantino', pages: 3 },
        { id: 'country-dance', title: 'Country Dance', pages: 3 },
        { id: 'allegretto', title: 'Allegretto', pages: 4 },
    ],
    2: [
        { id: 'allegro', title: 'Allegro', pages: 4 },
        { id: 'swan-lake', title: 'Swan Lake', pages: 5 },
        { id: 'canario', title: 'Canario', pages: 4 },
        { id: 'packingtons-pound', title: 'Packington\'s Pound', pages: 6 },
        { id: 'waltz-in-e-minor', title: 'Waltz in E Minor', pages: 6 },
        { id: 'andante-in-a-minor', title: 'Andante in A Minor', pages: 6 },
        { id: 'lesson-op-31-no-1', title: 'Lesson: Op. 31 - No. 1', pages: 6 },
    ],
    4: [
        { id: 'capricho-arabe', title: 'Capricho Arabe', pages: 8 },
        { id: 'lagrima', title: 'Lagrima', pages: 4 },
        { id: 'malaguena', title: 'Malaguena', pages: 12 },
        { id: 'gavotta-choro', title: 'Gavotta Choro', pages: 10 },
    ],
    5: [
        { id: 'asturias-leyenda', title: 'Asturias (Leyenda)', pages: 12 },
        { id: 'bwv-997-prelude', title: 'BWV 997: Prelude', pages: 8 },
        { id: 'el-colibri', title: 'El Colibri', pages: 8 },
        { id: 'etude-no-7-in-e', title: 'Etude No. 7 in E', pages: 8 },
        { id: 'etude-2', title: 'Etude 2', pages: 6 },
    ],
};

// --- Main App Component with Routing ---

const App = () => {
  const [hash, setHash] = useState(window.location.hash);

  useEffect(() => {
    const handleHashChange = () => {
      setHash(window.location.hash);
      window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const route = hash.replace(/^#/, '') || 'welcome';
  
  if (route.startsWith('nivel-')) {
    const level = parseInt(route.split('-')[1], 10);
    const pieces = levelPieces[level];
    if (pieces) {
      return <LevelPage level={level} pieces={pieces} />;
    }
    return <ComingSoonPage title={`Nivel ${level}`} parent="Partituras" parentHref="#partituras" />;
  }

  switch (route) {
    case 'diagnostico':
      return <DiagnosticoPage />;
    case 'niveles':
      return <NivelesPage />;
    case 'practica':
      return <PracticaPage />;
    case 'tecnica':
      return <TecnicaPage />;
    case 'partituras':
      return <PartiturasPage />;
    case 'repertorio': // Legacy link, redirect or show something
      window.location.hash = '#partituras';
      return null;
    case 'welcome':
    default:
      return <QuizFlow />;
  }
};

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

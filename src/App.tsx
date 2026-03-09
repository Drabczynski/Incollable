import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Map, 
  Library, 
  FlaskConical, 
  Film, 
  Palette, 
  Dribbble, 
  ArrowRight, 
  Check,
  Sparkles,
  Timer,
  Target,
  BarChart3,
  TrendingUp,
  Award,
  ChevronLeft,
  Layers,
  FastForward,
  Pause,
  Square,
  Play
} from 'lucide-react';
import { Difficulty, Screen, Theme } from './types';
import { QUESTIONS } from './data/questions';

// SCORM API Helper
const SCORM = {
  getAPI: () => {
    let win: any = window;
    let findAPI = (w: any): any => {
      try {
        // SCORM 2004
        if (w.API_1484_11) return { api: w.API_1484_11, version: '2004' };
        // SCORM 1.2
        if (w.API) return { api: w.API, version: '1.2' };
        if (w.parent && w.parent !== w) return findAPI(w.parent);
      } catch (e) {
        return null;
      }
      return null;
    };
    return findAPI(win);
  },
  init: () => {
    const res = SCORM.getAPI();
    if (res) {
      if (res.version === '2004') res.api.Initialize("");
      else res.api.LMSInitialize("");
    }
  },
  setScore: (score: number) => {
    const res = SCORM.getAPI();
    if (res) {
      if (res.version === '2004') {
        res.api.SetValue("cmi.score.scaled", (score / 100).toString());
        res.api.SetValue("cmi.score.raw", score.toString());
        res.api.SetValue("cmi.score.min", "0");
        res.api.SetValue("cmi.score.max", "100");
      } else {
        res.api.LMSSetValue("cmi.core.score.raw", score.toString());
        res.api.LMSSetValue("cmi.core.score.min", "0");
        res.api.LMSSetValue("cmi.core.score.max", "100");
      }
      res.version === '2004' ? res.api.Commit("") : res.api.LMSCommit("");
    }
  },
  complete: (passed: boolean) => {
    const res = SCORM.getAPI();
    if (res) {
      if (res.version === '2004') {
        res.api.SetValue("cmi.completion_status", "completed");
        res.api.SetValue("cmi.success_status", passed ? "passed" : "failed");
        res.api.Commit("");
        res.api.Terminate("");
      } else {
        res.api.LMSSetValue("cmi.core.lesson_status", passed ? "passed" : "failed");
        res.api.LMSCommit("");
        res.api.LMSFinish("");
      }
    }
  }
};

const THEMES: Theme[] = [
  { 
    id: 'geo', 
    label: 'Géographie', 
    icon: <Map className="w-5 h-5" />, 
    color: 'text-[#9405ff]', 
    bgLight: 'bg-[#9405ff]/10', 
    accent: 'bg-[#9405ff]', 
    border: 'border-[#9405ff]/20',
    gradient: { from: '#f3e8ff', to: '#e9d5ff' }
  },
  { 
    id: 'hist', 
    label: 'Histoire', 
    icon: <Library className="w-5 h-5" />, 
    color: 'text-[#00abbd]', 
    bgLight: 'bg-[#00abbd]/10', 
    accent: 'bg-[#00abbd]', 
    border: 'border-[#00abbd]/20',
    gradient: { from: '#ecfeff', to: '#cffafe' }
  },
  { 
    id: 'sci', 
    label: 'Sciences', 
    icon: <FlaskConical className="w-5 h-5" />, 
    color: 'text-[#e90d7b]', 
    bgLight: 'bg-[#e90d7b]/10', 
    accent: 'bg-[#e90d7b]', 
    border: 'border-[#e90d7b]/20',
    gradient: { from: '#fdf2f8', to: '#fce7f3' }
  },
  { 
    id: 'music', 
    label: 'Divertissement', 
    icon: <Film className="w-5 h-5" />, 
    color: 'text-[#ff520d]', 
    bgLight: 'bg-[#ff520d]/10', 
    accent: 'bg-[#ff520d]', 
    border: 'border-[#ff520d]/20',
    gradient: { from: '#fff7ed', to: '#ffedd5' }
  },
  { 
    id: 'art', 
    label: 'Culture', 
    icon: <Palette className="w-5 h-5" />, 
    color: 'text-[#06aff4]', 
    bgLight: 'bg-[#06aff4]/10', 
    accent: 'bg-[#06aff4]', 
    border: 'border-[#06aff4]/20',
    gradient: { from: '#f0f9ff', to: '#e0f2fe' }
  },
  { 
    id: 'sport', 
    label: 'Sports', 
    icon: <Dribbble className="w-5 h-5" />, 
    color: 'text-[#ffc000]', 
    bgLight: 'bg-[#ffc000]/10', 
    accent: 'bg-[#ffc000]', 
    border: 'border-[#ffc000]/20',
    gradient: { from: '#fffbeb', to: '#fef3c7' }
  },
];

export default function App() {
  const [screen, setScreen] = useState<Screen>('setup');
  const [difficulty, setDifficulty] = useState<Difficulty>('Moyen');
  const [selectedThemes, setSelectedThemes] = useState<string[]>(THEMES.map(t => t.id));
  const [questionCount, setQuestionCount] = useState<number>(10);
  
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [scorePerTheme, setScorePerTheme] = useState<Record<string, number>>({});
  const [totalAnsweredPerTheme, setTotalAnsweredPerTheme] = useState<Record<string, number>>({});
  const [startTime, setStartTime] = useState<number>(0);
  const [endTime, setEndTime] = useState<number>(0);
  const [isPaused, setIsPaused] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [userInput, setUserInput] = useState('');
  const [showPointAnim, setShowPointAnim] = useState(false);

  const quizQuestions = useMemo(() => {
    return QUESTIONS.filter(q => selectedThemes.includes(q.themeId)).sort(() => Math.random() - 0.5).slice(0, questionCount);
  }, [selectedThemes, questionCount, screen === 'quiz']);

  const currentTheme = useMemo(() => {
    if (screen !== 'quiz' || quizQuestions.length === 0) return null;
    const q = quizQuestions[currentQuestionIdx];
    if (!q) return null;
    return THEMES.find(t => t.id === q.themeId) || null;
  }, [screen, currentQuestionIdx, quizQuestions]);

  const playClickSound = useCallback(() => {
    const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3');
    audio.volume = 0.2;
    audio.play().catch(() => {});
  }, []);

  const playThemeSound = useCallback(() => {
    const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3');
    audio.volume = 0.15;
    audio.play().catch(() => {});
  }, []);

  const toggleTheme = (id: string) => {
    playThemeSound();
    setSelectedThemes(prev => 
      prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]
    );
  };

  const startQuiz = () => {
    playClickSound();
    if (selectedThemes.length === 0) return;
    setCurrentQuestionIdx(0);
    setScorePerTheme({});
    setTotalAnsweredPerTheme({});
    setStartTime(Date.now());
    setIsPaused(false);
    setSelectedAnswer(null);
    setShowFeedback(false);
    setUserInput('');
    setScreen('quiz');
  };

  const handleAnswer = (answer: string) => {
    if (showFeedback) return;
    playClickSound();
    setSelectedAnswer(answer);
    setShowFeedback(true);
    
    const question = quizQuestions[currentQuestionIdx];
    const isCorrect = answer.toLowerCase().trim() === question.correctAnswer.toLowerCase().trim();

    if (isCorrect) {
      setShowPointAnim(true);
      setTimeout(() => setShowPointAnim(false), 1500);
    }

    setScorePerTheme(prev => ({
      ...prev,
      [question.themeId]: (prev[question.themeId] || 0) + (isCorrect ? 1 : 0)
    }));

    setTotalAnsweredPerTheme(prev => ({
      ...prev,
      [question.themeId]: (prev[question.themeId] || 0) + 1
    }));
  };

  const nextQuestion = () => {
    setSelectedAnswer(null);
    setShowFeedback(false);
    setUserInput('');
    if (currentQuestionIdx < quizQuestions.length - 1) {
      setCurrentQuestionIdx(prev => prev + 1);
    } else {
      finishQuiz();
    }
  };

  const skipQuestion = () => {
    playClickSound();
    nextQuestion();
  };

  const finishQuiz = () => {
    playClickSound();
    setEndTime(Date.now());
    setScreen('results');
  };

  const totalScore: number = (Object.values(scorePerTheme) as number[]).reduce((acc, val) => acc + val, 0);
  const percentageScore = useMemo(() => {
    if (quizQuestions.length === 0) return 0;
    return Math.round((totalScore / quizQuestions.length) * 100);
  }, [totalScore, quizQuestions.length]);
  const timeSpent = Math.round((endTime - startTime) / 1000);

  useEffect(() => {
    SCORM.init();
  }, []);

  useEffect(() => {
    if (screen === 'results') {
      SCORM.setScore(percentageScore);
      SCORM.complete(percentageScore >= 50);
    }
  }, [screen, percentageScore]);

  return (
    <motion.div 
      animate={{ 
        background: currentTheme 
          ? `linear-gradient(135deg, ${currentTheme.gradient.from} 0%, #ffffff 40%, ${currentTheme.gradient.to} 100%)` 
          : 'linear-gradient(135deg, #e0e7ff 0%, #ffffff 50%, #fce7f3 100%)'
      }}
      transition={{ duration: 1.2, ease: "easeInOut" }}
      className="min-h-screen w-full flex items-center justify-center p-2 md:p-4 pb-24 md:pb-4 font-sans selection:bg-slate-900 selection:text-white overflow-y-auto"
    >
      <AnimatePresence mode="wait">
        {screen === 'setup' && (
          <motion.div 
            key="setup"
            initial={{ opacity: 0, scale: 0.98, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 1.02, y: -10 }}
            transition={{ type: "spring", duration: 0.8, bounce: 0.2 }}
            className="w-full max-w-4xl bg-white/90 backdrop-blur-xl rounded-3xl shadow-[0_40px_80px_-20px_rgba(0,0,0,0.15)] p-6 md:p-10 border border-white/50 relative overflow-hidden flex flex-col gap-6 my-4"
          >
            {/* Decorative background elements */}
            <div className="absolute -top-24 -right-24 w-80 h-80 bg-indigo-100/50 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-24 -left-24 w-80 h-80 bg-rose-100/50 rounded-full blur-3xl pointer-events-none" />
            
            <div className="flex flex-row items-center justify-between relative z-10 gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <div className="bg-amber-100 p-1 rounded-lg">
                    <Sparkles className="w-3 h-3 text-amber-600 fill-amber-600" />
                  </div>
                  <span className="text-[9px] font-black uppercase tracking-[0.2em] text-indigo-600">Quiz Master Pro</span>
                </div>
                <h1 className="text-2xl md:text-4xl font-black text-slate-900 tracking-tight leading-none">
                  Prêt pour le <span className="text-indigo-600 italic">défi ?</span>
                </h1>
              </div>
              <div className="w-12 h-12 md:w-16 md:h-16 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-indigo-200 rotate-3">
                <Target className="w-6 h-6 md:w-8 md:h-8" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
              <div className="space-y-6">
                <section>
                  <div className="flex items-center gap-2 mb-3">
                    <TrendingUp className="w-4 h-4 text-slate-400" />
                    <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Difficulté</h2>
                  </div>
                  <div className="flex gap-2">
                    {(['Facile', 'Moyen'] as Difficulty[]).map((level) => (
                      <button
                        key={level}
                        onClick={() => { playClickSound(); setDifficulty(level); }}
                        className={`flex-1 py-3 rounded-xl text-[10px] font-black transition-all border-2 ${difficulty === level ? 'bg-slate-900 border-slate-900 text-white shadow-lg' : 'bg-white border-slate-100 text-slate-400 hover:border-slate-200'}`}
                      >
                        {level}
                      </button>
                    ))}
                  </div>
                </section>

                <section>
                  <div className="flex items-center gap-2 mb-3">
                    <BarChart3 className="w-4 h-4 text-slate-400" />
                    <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Nombre de questions</h2>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {[10, 20, 40, 50].map((count) => (
                      <button
                        key={count}
                        onClick={() => { playClickSound(); setQuestionCount(count); }}
                        className={`py-3 rounded-xl text-[10px] font-black transition-all border-2 ${questionCount === count ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg' : 'bg-white border-slate-100 text-slate-400 hover:border-slate-200'}`}
                      >
                        {count}
                      </button>
                    ))}
                  </div>
                </section>

                <div className="hidden md:block pt-4">
                  <motion.button
                    whileHover={{ scale: 1.02, y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={startQuiz}
                    disabled={selectedThemes.length === 0}
                    className="w-full bg-indigo-600 text-white py-5 rounded-2xl font-black text-sm flex items-center justify-center gap-3 shadow-xl shadow-indigo-200 transition-all disabled:opacity-50"
                  >
                    Lancer le Quiz
                    <ArrowRight className="w-5 h-5" />
                  </motion.button>
                </div>
              </div>

              <section>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-slate-400" />
                    <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Thématiques</h2>
                  </div>
                  <div className="text-[9px] font-black text-indigo-600 bg-indigo-50 px-2 py-1 rounded-md">
                    {selectedThemes.length} / {THEMES.length}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {THEMES.map((theme) => {
                    const isActive = selectedThemes.includes(theme.id);
                    return (
                      <button
                        key={theme.id}
                        onClick={() => toggleTheme(theme.id)}
                        className={`group flex items-center gap-2 p-3 rounded-xl border-2 transition-all relative overflow-hidden ${isActive ? 'border-slate-900 bg-white shadow-sm' : 'border-slate-50 bg-slate-50/50 opacity-60 hover:opacity-100'}`}
                      >
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all relative z-10 ${isActive ? theme.bgLight + ' ' + theme.color : 'bg-white text-slate-300'}`}>
                          {theme.icon}
                        </div>
                        <span className={`text-xs md:text-sm font-black truncate relative z-10 ${isActive ? 'text-slate-900' : 'text-slate-400'}`}>
                          {theme.label}
                        </span>
                        {isActive && (
                          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="ml-auto relative z-10">
                            <Check className="w-3 h-3 text-emerald-500" />
                          </motion.div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </section>
            </div>

            <div className="md:hidden pt-2">
              <motion.button
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.98 }}
                onClick={startQuiz}
                disabled={selectedThemes.length === 0}
                className="w-full bg-indigo-600 text-white py-4 rounded-xl font-black text-sm flex items-center justify-center gap-3 shadow-xl shadow-indigo-200 transition-all disabled:opacity-50"
              >
                Lancer le Quiz
                <ArrowRight className="w-5 h-5" />
              </motion.button>
            </div>
          </motion.div>
        )}

        {screen === 'quiz' && currentTheme && (() => {
          const currentQuestion = quizQuestions[currentQuestionIdx];
          return (
            <motion.div 
              key="quiz-container"
              className="w-full max-w-6xl flex flex-col items-center gap-4 -mt-12 md:-mt-24"
            >
            <AnimatePresence mode="wait">
              {!isPaused ? (
                <motion.div 
                  key={`question-${currentQuestionIdx}`}
                  initial={{ opacity: 0, scale: 0.96, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 1.04, y: -20 }}
                  transition={{ 
                    duration: 0.5,
                    ease: [0.22, 1, 0.36, 1]
                  }}
                  className="w-full bg-white rounded-3xl shadow-[0_40px_80px_-20px_rgba(0,0,0,0.15)] p-6 md:p-16 border border-slate-50 relative overflow-hidden min-h-[400px] flex flex-col"
                >
                  <div className={`absolute top-0 left-0 w-full h-2 ${currentTheme.accent}`} />
                  
                  <div className="flex justify-between items-center mb-6 md:mb-8">
                    <div className="flex items-center gap-3 md:gap-4">
                      <div className={`w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center ${currentTheme.bgLight} ${currentTheme.color}`}>
                        {currentTheme.icon}
                      </div>
                      <div className="relative">
                        <div className="text-[10px] md:text-[12px] font-black text-slate-400 uppercase tracking-[0.2em]">{currentTheme.label}</div>
                        <AnimatePresence>
                          {showPointAnim && (
                            <motion.div 
                              initial={{ opacity: 0, y: 0, scale: 0.5 }}
                              animate={{ opacity: 1, y: -40, scale: 1.5 }}
                              exit={{ opacity: 0 }}
                              className="absolute top-0 left-0 text-emerald-500 font-black text-xl pointer-events-none"
                            >
                              +1
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 bg-slate-50 px-3 md:px-5 py-1.5 md:py-2.5 rounded-full border border-slate-100">
                      <Timer className="w-3 h-3 md:w-4 md:h-4 text-slate-400" />
                      <span className="text-[9px] md:text-[11px] font-black text-slate-600 uppercase">Chrono</span>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden mb-6 md:mb-8">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${((currentQuestionIdx + 1) / quizQuestions.length) * 100}%` }}
                      transition={{ type: "spring", stiffness: 100, damping: 20 }}
                      className={`h-full ${currentTheme.accent}`}
                    />
                  </div>

                  <div className="flex-grow flex flex-col items-center justify-center">
                    <h2 className="text-xl md:text-3xl font-black text-slate-900 text-center mb-8 md:mb-12 leading-tight max-w-3xl">
                      {currentQuestion.text}
                    </h2>

                    {/* Question Content based on Type */}
                    <div className="w-full">
                      {((currentQuestion.type || 'qcm') === 'qcm' || currentQuestion.type === 'boolean') && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                          {currentQuestion.options?.map((option, i) => {
                            const isSelected = selectedAnswer === option;
                            const isCorrect = option === currentQuestion.correctAnswer;
                            
                            let buttonClass = "bg-slate-50 hover:bg-white border-transparent hover:border-slate-900";
                            if (showFeedback) {
                              if (isCorrect) {
                                buttonClass = "bg-emerald-50 border-emerald-500 text-emerald-900";
                              } else if (isSelected) {
                                buttonClass = "bg-rose-50 border-rose-500 text-rose-900";
                              } else {
                                buttonClass = "bg-slate-50 opacity-50 border-transparent";
                              }
                            }

                            return (
                              <motion.button
                                key={i}
                                whileHover={!showFeedback ? { scale: 1.01, y: -1 } : {}}
                                whileTap={!showFeedback ? { scale: 0.99 } : {}}
                                onClick={() => handleAnswer(option)}
                                disabled={showFeedback}
                                className={`group w-full p-4 md:p-6 rounded-xl md:rounded-2xl border-2 transition-all text-left flex items-center justify-between shadow-sm ${buttonClass}`}
                              >
                                <span className={`font-bold text-base md:text-lg ${showFeedback && isCorrect ? 'text-emerald-700' : showFeedback && isSelected ? 'text-rose-700' : 'text-slate-600 group-hover:text-slate-900'}`}>
                                  {option}
                                </span>
                                <div className={`w-5 h-5 md:w-6 md:h-6 rounded-full border-2 flex items-center justify-center transition-colors ${showFeedback && isCorrect ? 'border-emerald-500 bg-emerald-500' : showFeedback && isSelected ? 'border-rose-500 bg-rose-500' : 'border-slate-200 group-hover:border-slate-900'}`}>
                                  {showFeedback && isCorrect ? (
                                    <Check className="w-3 h-3 text-white" />
                                  ) : showFeedback && isSelected ? (
                                    <div className="w-2 h-2 rounded-full bg-white" />
                                  ) : (
                                    <div className="w-2 h-2 rounded-full bg-slate-900 opacity-0 group-hover:opacity-100 transition-opacity" />
                                  )}
                                </div>
                              </motion.button>
                            );
                          })}
                        </div>
                      )}

                      {currentQuestion.type === 'input' && (
                        <div className="max-w-2xl mx-auto w-full">
                          <div className="flex flex-col md:flex-row gap-3">
                            <input 
                              type="text"
                              value={userInput}
                              onChange={(e) => setUserInput(e.target.value)}
                              disabled={showFeedback}
                              placeholder="Tapez votre réponse ici..."
                              className={`flex-1 p-4 md:p-6 rounded-xl border-2 outline-none transition-all text-lg font-bold ${showFeedback ? (userInput.toLowerCase().trim() === currentQuestion.correctAnswer.toLowerCase().trim() ? 'bg-emerald-50 border-emerald-500 text-emerald-900' : 'bg-rose-50 border-rose-500 text-rose-900') : 'bg-slate-50 border-slate-100 focus:border-indigo-600 focus:bg-white'}`}
                              onKeyDown={(e) => e.key === 'Enter' && userInput && handleAnswer(userInput)}
                            />
                            {!showFeedback && (
                              <button 
                                onClick={() => userInput && handleAnswer(userInput)}
                                disabled={!userInput}
                                className="w-full md:w-auto bg-indigo-600 text-white px-8 py-4 rounded-xl font-black text-sm disabled:opacity-50 transition-all hover:bg-indigo-700 shadow-lg shadow-indigo-100"
                              >
                                Valider
                              </button>
                            )}
                          </div>
                          {showFeedback && (
                            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-4 p-4 rounded-xl bg-slate-50 border border-slate-100">
                              <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">La bonne réponse était :</div>
                              <div className="text-lg font-black text-slate-900">{currentQuestion.correctAnswer}</div>
                            </motion.div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Feedback Explanation & Next Button */}
                  <div className="h-32 md:h-24 flex items-center justify-center mt-8">
                    <AnimatePresence>
                      {showFeedback && (
                        <motion.div 
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="w-full flex flex-col md:flex-row items-center justify-between gap-4"
                        >
                          <div className="flex-grow">
                            {currentQuestion.explanation && (
                              <p className="text-xs md:text-sm text-slate-500 font-medium italic max-w-xl">
                                "{currentQuestion.explanation}"
                              </p>
                            )}
                          </div>
                          <button 
                            onClick={nextQuestion}
                            className="w-full md:w-auto bg-slate-900 text-white px-8 py-4 rounded-full font-black flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-[0.98] md:hover:scale-105 transition-transform shadow-lg shadow-slate-200 whitespace-nowrap"
                          >
                            Question suivante
                            <ArrowRight className="w-5 h-5" />
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </motion.div>
              ) : (
                <motion.div 
                  key="paused"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="w-full bg-white rounded-3xl shadow-2xl p-10 md:p-20 text-center flex flex-col items-center gap-6 md:gap-8 min-h-[500px] justify-center"
                >
                  <div className="w-16 h-16 md:w-24 md:h-24 bg-slate-100 rounded-full flex items-center justify-center text-slate-400">
                    <Pause className="w-8 h-8 md:w-12 md:h-12" />
                  </div>
                  <h2 className="text-2xl md:text-4xl font-black text-slate-900">Session Suspendue</h2>
                  <button 
                    onClick={() => { playClickSound(); setIsPaused(false); }}
                    className="bg-slate-900 text-white px-8 md:px-10 py-4 md:py-5 rounded-full font-black flex items-center gap-3 hover:scale-105 transition-transform"
                  >
                    <Play className="w-5 h-5" />
                    Reprendre le quiz
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Bottom Control Bar - More subtle */}
            <div className="fixed bottom-0 md:bottom-8 left-0 w-full flex justify-center pointer-events-none z-50 px-0 md:px-4">
              <motion.div 
                initial={{ y: 100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="bg-white/70 backdrop-blur-md border-t md:border border-white/40 shadow-xl rounded-none md:rounded-full px-4 md:px-6 py-2 md:py-3 flex items-center justify-between md:justify-start gap-4 md:gap-6 pointer-events-auto w-full md:max-w-fit"
              >
                <div className="flex items-center gap-4 md:gap-6 border-r border-slate-200/50 pr-4 md:pr-6">
                  <div className="flex flex-col">
                    <span className="text-[7px] md:text-[8px] font-black text-slate-400 uppercase tracking-widest">Question</span>
                    <span className="text-[10px] md:text-xs font-black text-slate-900">{currentQuestionIdx + 1}/{quizQuestions.length}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[7px] md:text-[8px] font-black text-slate-400 uppercase tracking-widest">Score</span>
                    <span className="text-[10px] md:text-xs font-black text-slate-900">{totalScore}</span>
                  </div>
                </div>

                <div className="flex items-center gap-1 md:gap-2">
                  <button 
                    onClick={skipQuestion}
                    disabled={showFeedback}
                    className="p-2 rounded-full hover:bg-slate-100 transition-colors text-slate-500 disabled:opacity-20"
                    title="Passer"
                  >
                    <FastForward className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => { playClickSound(); setIsPaused(!isPaused); }}
                    className={`p-2 rounded-full transition-all ${isPaused ? 'bg-indigo-100 text-indigo-600' : 'hover:bg-slate-100 text-slate-500'}`}
                    title={isPaused ? 'Reprendre' : 'Suspendre'}
                  >
                    {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
                  </button>
                  <button 
                    onClick={finishQuiz}
                    className="p-2 rounded-full hover:bg-rose-50 text-rose-400 transition-colors"
                    title="Terminer"
                  >
                    <Square className="w-4 h-4 fill-current" />
                  </button>
                </div>
              </motion.div>
            </div>
          </motion.div>
          );
        })()}

        {screen === 'results' && (
          <motion.div 
            key="results"
            initial={{ opacity: 0, scale: 0.9, filter: "blur(10px)" }}
            animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="w-full max-w-5xl bg-white rounded-3xl shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)] p-6 md:p-14 border border-slate-50 my-8"
          >
            <div className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-12">
              {/* Left Column: Main Stats */}
              <div className="md:col-span-5 space-y-6 md:space-y-8">
                <div>
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 text-emerald-600 text-[10px] font-black uppercase tracking-widest mb-4">
                    <Award className="w-3 h-3" />
                    Session Terminée
                  </div>
                  <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight leading-none mb-4">
                    Performance <br /> <span className="text-indigo-600 italic">Analysée.</span>
                  </h1>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-50 p-4 md:p-6 rounded-2xl md:rounded-3xl">
                    <div className="text-[8px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Score Global</div>
                    <div className="text-2xl md:text-4xl font-black text-slate-900">{percentageScore}%</div>
                  </div>
                  <div className="bg-slate-50 p-4 md:p-6 rounded-2xl md:rounded-3xl">
                    <div className="text-[8px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Temps Total</div>
                    <div className="text-2xl md:text-4xl font-black text-slate-900">{timeSpent}s</div>
                  </div>
                </div>

                <div className="p-5 md:p-6 bg-indigo-600 rounded-2xl md:rounded-3xl text-white shadow-xl shadow-indigo-100">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-8 h-8 md:w-10 md:h-10 bg-white/20 rounded-xl md:rounded-2xl flex items-center justify-center">
                      <TrendingUp className="w-4 h-4 md:w-5 md:h-5" />
                    </div>
                    <div className="text-[10px] md:text-xs font-bold">Statut du Profil</div>
                  </div>
                  <div className="text-xl md:text-2xl font-black mb-1">
                    {percentageScore >= 80 ? "Maître du Quiz" : percentageScore >= 50 ? "Apprenti Confirmé" : "En Apprentissage"}
                  </div>
                  <p className="text-indigo-100 text-[9px] md:text-[10px] font-medium leading-relaxed">
                    {percentageScore >= 80 
                      ? "Félicitations ! Vous avez démontré une excellente maîtrise des sujets abordés."
                      : percentageScore >= 50 
                      ? "Bon travail ! Vous avez une bonne base, continuez ainsi pour atteindre l'excellence."
                      : "Ne vous découragez pas ! Repassez le quiz pour renforcer vos connaissances."}
                  </p>
                </div>

                <button
                  onClick={() => { playClickSound(); setScreen('setup'); }}
                  className="w-full flex items-center justify-center gap-3 py-4 md:py-5 rounded-xl md:rounded-[1.5rem] border-2 border-slate-100 font-black text-slate-900 hover:bg-slate-50 transition-all text-sm"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Nouvelle Session
                </button>
              </div>

              {/* Right Column: Detailed Breakdown */}
              <div className="md:col-span-7">
                <div className="flex items-center justify-between mb-6 md:mb-8">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-slate-400" />
                    <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Détails par thématique</h2>
                  </div>
                </div>

                <div className="space-y-3 md:space-y-4">
                  {THEMES.map((theme) => {
                    const score = scorePerTheme[theme.id] || 0;
                    const total = totalAnsweredPerTheme[theme.id] || 0;
                    const percent = total > 0 ? Math.round((score / total) * 100) : 0;
                    
                    return (
                      <div key={theme.id} className="group p-3 md:p-4 rounded-xl md:rounded-2xl bg-white border border-slate-100 hover:border-slate-200 transition-all">
                        <div className="flex items-center justify-between mb-2 md:mb-3">
                          <div className="flex items-center gap-3">
                            <div className={`w-7 h-7 md:w-8 md:h-8 rounded-lg md:rounded-xl flex items-center justify-center ${theme.bgLight} ${theme.color}`}>
                              {theme.icon}
                            </div>
                            <span className="text-[10px] md:text-xs font-black text-slate-900">{theme.label}</span>
                          </div>
                          <div className="text-[10px] md:text-xs font-black text-slate-900">{percent}%</div>
                        </div>
                        <div className="h-1.5 md:h-2 bg-slate-50 rounded-full overflow-hidden">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${percent}%` }}
                            className={`h-full ${theme.accent} rounded-full`}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

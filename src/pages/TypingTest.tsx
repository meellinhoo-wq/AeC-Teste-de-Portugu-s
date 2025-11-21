import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import Header from '@/components/Header';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { FileText, Headphones, Play, Pause, RotateCcw, Send, ArrowLeft, CheckCircle, MousePointerClick } from 'lucide-react';
import TestTimer from '@/components/test/TestTimer';
import TestStats from '@/components/test/TestStats';
import ErrorList from '@/components/test/ErrorList';
import ResultsChart from '@/components/test/ResultsChart';

import { getRandomText } from '@/data/testTexts';
import { calculateWPM, calculateAccuracy, detectErrors, getErrorSummary, compareTexts } from '@/lib/textAnalysis';
import { calculateWPM, calculateAccuracy, detectErrors, getErrorSummary, compareTexts } from '@/lib/textAnalysis';
import { supabase } from '@/lib/supabase';

type TestMode = 'selection' | 'instructions' | 'testing' | 'results';
type TestType = 'texto' | 'audio';
type TestDifficulty = 'facil' | 'medio' | 'dificil';

interface UserData {
  nome: string;
  email: string;
  matricula?: string;
  cpf?: string;
}

interface TestResult {
  type: TestType;
  difficulty: TestDifficulty;
  wpm: number;
  accuracy: number;
  errors: number;
  textToType: string;
  userInput: string;
  timeElapsed: number;
}

// Sequência obrigatória de testes
// Sequências de testes
const getTextSequence = (): Array<{ type: TestType; difficulty: TestDifficulty }> => [
  { type: 'texto', difficulty: 'facil' },
  { type: 'texto', difficulty: 'medio' },
  { type: 'texto', difficulty: 'dificil' },
];

const getAudioSequence = (): Array<{ type: TestType; difficulty: TestDifficulty }> => [
  { type: 'audio', difficulty: 'facil' },
  { type: 'audio', difficulty: 'medio' },
  { type: 'audio', difficulty: 'dificil' },
];

// Tempos por nível de dificuldade (em segundos)
const DIFFICULTY_TIMES = {
  facil: 120,    // 2 minutos
  medio: 180,    // 3 minutos
  dificil: 300,  // 5 minutos
};

const TypingTest = () => {
  const navigate = useNavigate();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [testMode, setTestMode] = useState<TestMode>('selection');
  const [userData, setUserData] = useState<UserData | null>(null);
  const [testTypeChoice, setTestTypeChoice] = useState<TestType | null>(null);
  const [currentTestIndex, setCurrentTestIndex] = useState(0);
  const [testResults, setTestResults] = useState<TestResult[]>([]);

  const testSequence = testTypeChoice === 'texto' ? getTextSequence() : getAudioSequence();


  const [isSpeaking, setIsSpeaking] = useState(false);
  const [currentPhraseIndex, setCurrentPhraseIndex] = useState(0);
  const [phrases, setPhrases] = useState<string[]>([]);
  const speechRef = useRef<SpeechSynthesisUtterance | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [textToType, setTextToType] = useState('');
  const [userInput, setUserInput] = useState('');
  const [startTime, setStartTime] = useState<number | null>(null);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [pausedTime, setPausedTime] = useState(0);

  // Métricas
  const [wpm, setWpm] = useState(0);
  const [accuracy, setAccuracy] = useState(0);
  const [errors, setErrors] = useState<ReturnType<typeof detectErrors>>([]);
  const [wordsTyped, setWordsTyped] = useState(0);

  // Teste atual
  const currentTest = testSequence[currentTestIndex];
  const testType = currentTest?.type;
  const difficulty = currentTest?.difficulty;
  const isLastTest = currentTestIndex === testSequence.length - 1;

  // Labels
  const getTypeLabel = (type: TestType) => type === 'texto' ? 'Texto' : 'Áudio';
  const getDifficultyLabel = (diff: TestDifficulty) => {
    const labels = { facil: 'Fácil', medio: 'Moderado', dificil: 'Difícil' };
    return labels[diff];
  };

  // Atualizar métricas em tempo real
  useEffect(() => {
    if (isRunning && userInput.length > 0) {
      const currentWpm = calculateWPM(userInput, timeElapsed || 1);
      const currentAccuracy = calculateAccuracy(textToType, userInput);
      const words = userInput.trim().split(/\s+/).filter(w => w.length > 0).length;

      setWpm(currentWpm);
      setAccuracy(currentAccuracy);
      setWordsTyped(words);
    }
  }, [userInput, timeElapsed, isRunning, textToType]);

  useEffect(() => {
    const loadUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (profile) {
          setUserData({
            nome: user.user_metadata?.full_name || profile.full_name || user.email?.split('@')[0] || 'Usuário',
            email: user.email || '',
            matricula: user.user_metadata?.matricula || profile.matricula || '',
            cpf: user.user_metadata?.cpf || '',
          });
        }
      }
    };
    loadUser();
  }, []);

  const handleStartTest = () => {
    const randomText = getRandomText(difficulty);
    setTextToType(randomText.text);
    setUserInput('');
    setStartTime(Date.now());
    setIsRunning(true);
    setIsPaused(false);
    setPausedTime(0);
    setTimeElapsed(0);
    setTestMode('testing');

    // Configurar áudio se for teste com áudio
    if (testType === 'audio') {
      // Dividir texto em frases para pausas
      const textPhrases = randomText.text.match(/[^.!?]+[.!?]+/g) || [randomText.text];
      setPhrases(textPhrases);
      setCurrentPhraseIndex(0);
      setIsSpeaking(false);

      // Iniciar leitura automaticamente após um breve delay
      setTimeout(() => {
        playPhrase(0, textPhrases);
      }, 1000);
    }

    toast.success('Teste iniciado! Boa sorte!');

    // Focar no textarea após um pequeno delay
    setTimeout(() => {
      textareaRef.current?.focus();
    }, 100);
  };

  const handleTimeEnd = () => {
    if (isRunning) {
      toast.info('Tempo esgotado! Finalizando teste...');
      handleFinishTest();
    }
  };

  const handlePauseResume = () => {
    if (isPaused) {
      setStartTime(Date.now() - pausedTime * 1000);
      setIsPaused(false);
      setIsRunning(true);
      toast.info('Teste retomado');
      textareaRef.current?.focus();

      if (testType === 'audio') {
        playPhrase(currentPhraseIndex, phrases);
      }
    } else {
      setPausedTime(timeElapsed);
      setIsPaused(true);
      setIsRunning(false);
      toast.info('Teste pausado');

      if (testType === 'audio') {
        window.speechSynthesis.cancel();
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        setIsSpeaking(false);
      }
    }
  };

  const playPhrase = (index: number, currentPhrases: string[]) => {
    if (index >= currentPhrases.length) {
      setIsSpeaking(false);
      return;
    }

    setIsSpeaking(true);
    setCurrentPhraseIndex(index);

    // Cancelar qualquer fala anterior
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(currentPhrases[index]);
    utterance.lang = 'pt-BR';
    utterance.rate = 0.9; // Um pouco mais lento para facilitar

    utterance.onend = () => {
      // Pausa de 2 segundos entre frases
      timeoutRef.current = setTimeout(() => {
        if (!isPaused && isRunning) {
          playPhrase(index + 1, currentPhrases);
        }
      }, 2000);
    };

    utterance.onerror = (e) => {
      console.error('Erro na fala:', e);
      setIsSpeaking(false);
    };

    speechRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  };

  const handleFinishTest = async () => {
    if (userInput.trim().length < 10) {
      toast.error('Digite pelo menos 10 caracteres para finalizar o teste');
      return;
    }

    setIsRunning(false);

    // Calcular métricas finais
    const finalWpm = calculateWPM(userInput, timeElapsed);
    const finalAccuracy = calculateAccuracy(textToType, userInput);
    const detectedErrors = detectErrors(textToType, userInput);

    setWpm(finalWpm);
    setAccuracy(finalAccuracy);
    setErrors(detectedErrors);

    // Salvar resultado do teste atual
    const result: TestResult = {
      type: testType,
      difficulty,
      wpm: finalWpm,
      accuracy: finalAccuracy,
      errors: detectedErrors.length,
      textToType,
      userInput,
      timeElapsed
    };

    setTestResults([...testResults, result]);

    // Envio automático ao final de cada nível
    const loadingToast = toast.loading('Salvando resultados...');
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        const { error } = await supabase.from('typing_test_results').insert({
          user_id: user.id,
          test_type: testType,
          difficulty: difficulty,
          wpm: finalWpm,
          accuracy: finalAccuracy,
          duration_seconds: timeElapsed,
          errors_count: detectedErrors.length,
        });

        if (error) throw error;
        toast.success('Resultado salvo com sucesso!');
      }
    } catch (error) {
      console.error('Erro ao salvar:', error);
      toast.error('Erro ao salvar resultado.');
    } finally {
      toast.dismiss(loadingToast);
    }

    if (testType === 'texto' && !isLastTest) {
      // Continuidade automática para texto
      handleNextTest();
    } else {
      setTestMode('results');
      toast.success('Nível finalizado!');
    }
  };

  const handleNextTest = () => {
    // Avançar para o próximo teste
    setCurrentTestIndex(currentTestIndex + 1);

    // Se for texto, pula instruções e vai direto (exceto se for o primeiro, mas aqui já é next)
    // Mas precisamos resetar os estados antes
    const nextTest = testSequence[currentTestIndex + 1];

    if (nextTest?.type === 'texto') {
      // Preparar próximo teste de texto imediatamente
      const randomText = getRandomText(nextTest.difficulty);
      setTextToType(randomText.text);
      setUserInput('');
      setStartTime(Date.now());
      setIsRunning(true);
      setIsPaused(false);
      setPausedTime(0);
      setTimeElapsed(0);
      setTestMode('testing');
      setErrors([]);
      setWpm(0);
      setAccuracy(0);
      setWordsTyped(0);


      toast.success(`Iniciando nível ${getDifficultyLabel(nextTest.difficulty)}...`);
      setTimeout(() => textareaRef.current?.focus(), 100);
    } else {
      setTestMode('instructions');
      setUserInput('');
      setErrors([]);
      setWpm(0);
      setAccuracy(0);
      setWordsTyped(0);

    }
  };

  const handleNewTest = () => {
    setTestMode('selection');


    setTestTypeChoice(null);
    setCurrentTestIndex(0);
    setTestResults([]);
    setUserInput('');
    setTextToType('');
    setStartTime(null);
    setTimeElapsed(0);
    setIsRunning(false);
    setIsPaused(false);
    setWpm(0);
    setAccuracy(0);
    setErrors([]);
    setWordsTyped(0);

  };

  const handleSendResults = async () => {
    // Função mantida para compatibilidade, mas o envio agora é automático
    toast.info('Os resultados já foram salvos automaticamente.');
  };

  // Controle de integridade: detectar saída da página
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && testMode === 'testing' && isRunning) {
        toast.error('Você saiu da página! O teste será reiniciado.');
        setTimeout(() => {
          handleNewTest();
        }, 2000);
      }
    };

    const handleBlur = () => {
      if (testMode === 'testing' && isRunning) {
        toast.warning('Atenção! Mantenha o foco no teste.');
      }
    };

    // Bloquear tentativas de print screen
    const handleKeyDown = (e: KeyboardEvent) => {
      if (testMode === 'testing' && (
        e.key === 'PrintScreen' ||
        (e.ctrlKey && e.shiftKey && e.key === 'S') ||
        (e.metaKey && e.shiftKey && e.key === '3') ||
        (e.metaKey && e.shiftKey && e.key === '4')
      )) {
        e.preventDefault();
        toast.error('Captura de tela não é permitida durante o teste!');
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleBlur);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleBlur);
      document.removeEventListener('keydown', handleKeyDown);
      window.speechSynthesis.cancel();
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [testMode, isRunning]);

  const renderTextWithHighlights = () => {
    if (!userInput) return textToType;

    const comparisons = compareTexts(textToType, userInput);

    return (
      <div className="font-mono text-lg leading-relaxed">
        {comparisons.map((comp, index) => (
          <span
            key={index}
            className={
              index >= userInput.length
                ? 'text-foreground/40'
                : comp.isCorrect
                  ? 'text-verde'
                  : 'text-foreground'
            }
          >
            {comp.expected}
          </span>
        ))}
      </div>
    );
  };



  // TELA DE SELEÇÃO
  if (testMode === 'selection') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-cobalto/5 to-background">
        <Header />
        <div className="container mx-auto px-4 py-8 mt-16">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-cobalto mb-4">
                Escolha o Tipo de Teste
              </h2>
              <p className="text-xl text-foreground/70">
                Selecione como você deseja realizar a avaliação
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              {/* Opção Texto */}
              <div
                className="bg-background border-2 border-border hover:border-cobalto/50 rounded-xl p-8 cursor-pointer transition-all hover:shadow-lg group"
                onClick={() => {
                  setTestTypeChoice('texto');
                  setTestMode('instructions');
                }}
              >
                <div className="flex flex-col items-center text-center space-y-6">
                  <div className="w-24 h-24 rounded-full bg-cobalto/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <FileText className="w-12 h-12 text-cobalto" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-foreground mb-2">Teste de Digitação</h3>
                    <p className="text-foreground/70 mb-4">
                      Transcreva textos exibidos na tela.
                    </p>
                    <ul className="text-sm text-left space-y-2 text-foreground/60 bg-foreground/5 p-4 rounded-lg">
                      <li>• 3 Níveis: Fácil, Médio e Difícil</li>
                      <li>• Foco em velocidade e precisão</li>
                      <li>• Sem pausas entre os níveis</li>
                    </ul>
                  </div>
                  <Button className="w-full bg-cobalto group-hover:bg-noite">
                    Selecionar Texto
                  </Button>
                </div>
              </div>

              {/* Opção Áudio */}
              <div
                className="bg-background border-2 border-border hover:border-ceu/50 rounded-xl p-8 cursor-pointer transition-all hover:shadow-lg group"
                onClick={() => {
                  setTestTypeChoice('audio');
                  setTestMode('instructions');
                }}
              >
                <div className="flex flex-col items-center text-center space-y-6">
                  <div className="w-24 h-24 rounded-full bg-ceu/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Headphones className="w-12 h-12 text-ceu" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-foreground mb-2">Teste de Áudio</h3>
                    <p className="text-foreground/70 mb-4">
                      Ouça e transcreva o conteúdo ditado.
                    </p>
                    <ul className="text-sm text-left space-y-2 text-foreground/60 bg-foreground/5 p-4 rounded-lg">
                      <li>• 3 Níveis: Fácil, Médio e Difícil</li>
                      <li>• Pausas automáticas entre frases</li>
                      <li>• Foco em audição e escrita</li>
                    </ul>
                  </div>
                  <Button className="w-full bg-ceu text-cobalto hover:bg-ceu/80">
                    Selecionar Áudio
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // TELA DE INSTRUÇÕES
  if (testMode === 'instructions' && userData) {
    const timeLimit = DIFFICULTY_TIMES[difficulty];
    const nextTest = testSequence[currentTestIndex + 1];

    return (
      <div className="min-h-screen bg-gradient-to-b from-cobalto/5 to-background">
        <Header />
        <div className="container mx-auto px-4 py-8 mt-16">
          {userData && (
            <div className="mb-6 p-4 bg-cobalto/10 border border-cobalto/20 rounded-lg">
              <div className="text-center">
                <p className="text-sm text-foreground/80">
                  <strong>Participante:</strong> {userData.nome} • <strong>{userData.matricula ? 'Matrícula' : 'CPF'}:</strong> {userData.matricula || userData.cpf}
                </p>
              </div>
            </div>
          )}

          <div className="max-w-3xl mx-auto">
            <div className="bg-background border border-border rounded-xl p-8 shadow-lg">
              <div className="text-center mb-6">
                <h2 className="text-3xl font-bold text-cobalto mb-2">
                  {getTypeLabel(testType)} - Nível {getDifficultyLabel(difficulty)}
                </h2>
                <p className="text-foreground/70">
                  Teste {currentTestIndex + 1} de {testSequence.length}
                </p>
              </div>

              <div className="space-y-4 mb-8">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-cobalto/10 flex items-center justify-center flex-shrink-0 mt-1">
                    <span className="text-cobalto font-bold">1</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground mb-1">Atenção ao conteúdo</h3>
                    <p className="text-foreground/70">
                      {testType === 'texto'
                        ? 'Leia atentamente o texto apresentado antes de começar a digitar.'
                        : 'Ouça o áudio com atenção. Ele será tocado frase por frase com pausas automáticas.'}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-cobalto/10 flex items-center justify-center flex-shrink-0 mt-1">
                    <span className="text-cobalto font-bold">2</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground mb-1">Digite com precisão</h3>
                    <p className="text-foreground/70">
                      Preste atenção à ortografia, pontuação, acentuação e maiúsculas. Tudo será avaliado.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-cobalto/10 flex items-center justify-center flex-shrink-0 mt-1">
                    <span className="text-cobalto font-bold">3</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground mb-1">Tempo limitado</h3>
                    <p className="text-foreground/70">
                      Você terá {Math.floor(timeLimit / 60)} minutos para completar o teste.
                      O teste será finalizado automaticamente quando o tempo acabar.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-cobalto/10 flex items-center justify-center flex-shrink-0 mt-1">
                    <span className="text-cobalto font-bold">4</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground mb-1">Mantenha o foco</h3>
                    <p className="text-foreground/70">
                      Não saia da página durante o teste. Se você sair, todos os testes serão reiniciados.
                      Capturas de tela também não são permitidas.
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-ceu/10 border border-ceu/20 rounded-lg p-4 mb-8">
                <h3 className="font-semibold text-foreground mb-2">Metas de Desempenho</h3>
                <ul className="space-y-1 text-sm text-foreground/80">
                  <li>• <strong>Velocidade:</strong> Mínimo de 40 palavras por minuto</li>
                  <li>• <strong>Precisão:</strong> Mínimo de 90% de acertos</li>
                </ul>
              </div>

              {!isLastTest && nextTest && (
                <div className="mb-6 p-4 bg-amarelo/10 border border-amarelo/20 rounded-lg">
                  <p className="text-sm text-foreground/80 text-center">
                    <strong>Após este teste:</strong> {getTypeLabel(nextTest.type)} - {getDifficultyLabel(nextTest.difficulty)}
                  </p>
                </div>
              )}

              <Button
                onClick={handleStartTest}
                size="lg"
                className="w-full bg-cobalto hover:bg-noite text-white"
              >
                <Play className="w-5 h-5 mr-2" />
                Iniciar Teste
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // TELA DE TESTE
  if (testMode === 'testing' && userData) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-cobalto/5 to-background">
        <Header />
        <div className="container mx-auto px-4 py-8 mt-16">
          <div className="max-w-6xl mx-auto">
            {userData && (
              <div className="mb-6 p-4 bg-cobalto/10 border border-cobalto/20 rounded-lg">
                <div className="flex justify-between items-center">
                  <p className="text-sm text-foreground/80">
                    <strong>{userData.nome}</strong> • {userData.matricula ? `Matrícula: ${userData.matricula}` : `CPF: ${userData.cpf}`}
                  </p>
                  <p className="text-sm text-foreground/80">
                    Teste {currentTestIndex + 1} de {testSequence.length} • {getTypeLabel(testType)} - {getDifficultyLabel(difficulty)}
                  </p>
                </div>
              </div>
            )}

            {/* Header com Timer e Controles */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-6">
              <TestTimer
                isRunning={isRunning}
                startTime={startTime}
                onTimeUpdate={setTimeElapsed}
                maxTime={DIFFICULTY_TIMES[difficulty]}
                onTimeEnd={handleTimeEnd}
              />

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={handlePauseResume}
                >
                  {isPaused ? (
                    <>
                      <Play className="w-4 h-4 mr-2" />
                      Retomar
                    </>
                  ) : (
                    <>
                      <Pause className="w-4 h-4 mr-2" />
                      Pausar
                    </>
                  )}
                </Button>

                <Button
                  onClick={handleFinishTest}
                  className="bg-verde hover:bg-verde/90 text-white"
                >
                  Finalizar Teste
                </Button>
              </div>
            </div>

            {/* Estatísticas em Tempo Real */}
            <div className="mb-6">
              <TestStats wpm={wpm} accuracy={accuracy} wordsTyped={wordsTyped} />
            </div>

            {/* Área do Teste */}
            <div className="grid md:grid-cols-2 gap-6">
              {/* Texto de Referência */}
              <div className="bg-background border border-border rounded-xl p-6">
                <h3 className="text-lg font-semibold text-cobalto mb-4">
                  {testType === 'texto' ? 'Texto de Referência' : 'Transcreva o Áudio'}
                </h3>

                {/* Player de Áudio */}
                {testType === 'audio' && (
                  <div className="mb-4 p-4 bg-ceu/10 border border-ceu/20 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (isSpeaking) {
                            window.speechSynthesis.cancel();
                            if (timeoutRef.current) clearTimeout(timeoutRef.current);
                            setIsSpeaking(false);
                            toast.info('Áudio pausado');
                          } else {
                            playPhrase(currentPhraseIndex, phrases);
                            toast.info('Reproduzindo áudio...');
                          }
                        }}
                        disabled={isPaused || !isRunning}
                      >
                        {isSpeaking ? (
                          <>
                            <Pause className="w-4 h-4 mr-2" />
                            Pausar Áudio
                          </>
                        ) : (
                          <>
                            <Play className="w-4 h-4 mr-2" />
                            {currentPhraseIndex > 0 ? 'Continuar Áudio' : 'Iniciar Áudio'}
                          </>
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          window.speechSynthesis.cancel();
                          if (timeoutRef.current) clearTimeout(timeoutRef.current);
                          playPhrase(0, phrases);
                          toast.info('Áudio reiniciado');
                        }}
                        disabled={isPaused || !isRunning}
                      >
                        <RotateCcw className="w-4 h-4 mr-2" />
                        Reiniciar
                      </Button>
                    </div>
                    <div className="mt-3">
                      <div className="flex justify-between text-xs text-foreground/60 mb-1">
                        <span>Progresso do Áudio</span>
                        <span>{Math.min(currentPhraseIndex + 1, phrases.length)} / {phrases.length} frases</span>
                      </div>
                      <div className="w-full bg-background rounded-full h-2">
                        <div
                          className="bg-ceu h-2 rounded-full transition-all duration-500"
                          style={{ width: `${((currentPhraseIndex) / Math.max(phrases.length, 1)) * 100}%` }}
                        />
                      </div>
                    </div>
                    <p className="text-xs text-foreground/60 mt-2">
                      O áudio pausa automaticamente por 2 segundos entre cada frase.
                    </p>
                  </div>
                )}

                <div className="bg-foreground/5 rounded-lg p-4 max-h-[400px] overflow-y-auto">
                  {renderTextWithHighlights()}
                </div>
              </div>

              {/* Área de Digitação */}
              <div className="bg-background border border-border rounded-xl p-6">
                <h3 className="text-lg font-semibold text-cobalto mb-4">
                  Digite Aqui
                </h3>
                <Textarea
                  ref={textareaRef}
                  value={userInput}
                  onChange={(e) => setUserInput(e.target.value)}
                  placeholder="Comece a digitar..."
                  className="min-h-[400px] font-mono text-lg resize-none"
                  disabled={isPaused || !isRunning}
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck="false"
                  onPaste={(e) => {
                    e.preventDefault();
                    toast.error('Copiar e colar não é permitido neste teste!');
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // TELA DE RESULTADOS
  return (
    <div className="min-h-screen bg-gradient-to-b from-cobalto/5 to-background">
      <Header />
      <div className="container mx-auto px-4 py-8 mt-16">
        <div className="max-w-6xl mx-auto">
          {userData && (
            <div className="mb-6 p-6 bg-cobalto/10 border border-cobalto/20 rounded-lg">
              <div className="grid md:grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-sm text-foreground/60 mb-1">Nome</p>
                  <p className="font-semibold text-foreground">{userData.nome}</p>
                </div>
                <div>
                  <p className="text-sm text-foreground/60 mb-1">Email</p>
                  <p className="font-semibold text-foreground">{userData.email}</p>
                </div>
                <div>
                  <p className="text-sm text-foreground/60 mb-1">{userData.matricula ? 'Matrícula' : 'CPF'}</p>
                  <p className="font-semibold text-foreground">{userData.matricula || userData.cpf}</p>
                </div>
              </div>
            </div>
          )}

          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-cobalto/10 mb-4">
              <CheckCircle className="w-8 h-8 text-cobalto" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-cobalto mb-4">
              {isLastTest ? 'Todos os Testes Concluídos!' : 'Teste Concluído!'}
            </h1>
            <p className="text-lg text-foreground/70">
              {isLastTest
                ? 'Parabéns! Você completou todos os testes'
                : `Teste ${currentTestIndex + 1} de {testSequence.length} finalizado`}
            </p>
          </div>

          {/* Feedback de Desempenho */}
          {(() => {
            const metWPM = wpm >= 40;
            const metAccuracy = accuracy >= 90;
            const allMetsPassed = metWPM && metAccuracy;

            return (
              <div className={`mb-8 p-6 rounded-xl border-2 ${allMetsPassed
                ? 'bg-verde/10 border-verde/30'
                : 'bg-amarelo/10 border-amarelo/30'
                }`}>
                <div className="text-center mb-4">
                  <h3 className={`text-2xl font-bold ${allMetsPassed ? 'text-verde' : 'text-amarelo'
                    }`}>
                    {allMetsPassed
                      ? '🎉 Parabéns! Você atingiu as metas!'
                      : '⚠️ Continue praticando!'}
                  </h3>
                </div>

                <div className="grid md:grid-cols-2 gap-4 max-w-2xl mx-auto">
                  <div className={`flex items-center gap-2 p-3 rounded-lg ${metWPM ? 'bg-verde/20' : 'bg-rosa/20'
                    }`}>
                    <span className="text-2xl">{metWPM ? '✓' : '✗'}</span>
                    <div>
                      <p className="text-sm font-medium">Velocidade</p>
                      <p className="text-xs text-foreground/70">
                        Meta: 40 ppm | Você: {wpm} ppm
                      </p>
                    </div>
                  </div>

                  <div className={`flex items-center gap-2 p-3 rounded-lg ${metAccuracy ? 'bg-verde/20' : 'bg-rosa/20'
                    }`}>
                    <span className="text-2xl">{metAccuracy ? '✓' : '✗'}</span>
                    <div>
                      <p className="text-sm font-medium">Precisão</p>
                      <p className="text-xs text-foreground/70">
                        Meta: 90% | Você: {accuracy}%
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Gráfico de Resultados */}
          <div className="mb-8">
            <ResultsChart wpm={wpm} accuracy={accuracy} errorsCount={errors.length} />
          </div>

          {/* Métricas Principais */}
          <div className="mb-8">
            <TestStats wpm={wpm} accuracy={accuracy} wordsTyped={wordsTyped} />
          </div>

          {/* Lista de Erros */}
          <div className="mb-8">
            <ErrorList errors={errors} />
          </div>

          {/* Próximo teste ou finalizar */}
          {!isLastTest && (
            <div className="mb-6 p-4 bg-cobalto/10 border border-cobalto/20 rounded-lg">
              <p className="text-center text-foreground">
                <strong>Próximo teste:</strong> {' '}
                <strong>Próximo teste:</strong> {' '}
                {getTypeLabel(testSequence[currentTestIndex + 1].type)} - {getDifficultyLabel(testSequence[currentTestIndex + 1].difficulty)}
              </p>
            </div>
          )}

          {/* Ações */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {isLastTest ? (
              <>
                <Button
                  onClick={handleNewTest}
                  variant="outline"
                  size="lg"
                >
                  <RotateCcw className="w-5 h-5 mr-2" />
                  Fazer Novo Teste Completo
                </Button>

                <Button
                  onClick={handleSendResults}
                  size="lg"
                  className="bg-cobalto hover:bg-noite text-white"
                >
                  <Send className="w-5 h-5 mr-2" />
                  Enviar Resultados
                </Button>

                <Button
                  onClick={() => navigate('/')}
                  variant="outline"
                  size="lg"
                >
                  Página Inicial
                </Button>
              </>
            ) : (
              <Button
                onClick={handleNextTest}
                size="lg"
                className="w-full bg-cobalto hover:bg-noite text-white"
              >
                Continuar para Próximo Teste
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TypingTest;

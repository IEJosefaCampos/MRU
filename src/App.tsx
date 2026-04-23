/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
  ReferenceLine,
} from 'recharts';
import { 
  Activity, 
  Clock, 
  MoveRight, 
  Settings2, 
  Info,
  TrendingUp,
  Square,
  Play,
  Pause,
  RotateCcw,
  Bike,
  Zap,
  Flame,
  Skull,
  Trophy,
  Flag,
  Star,
  Gamepad2,
  User,
  GraduationCap,
  Coins,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  ArrowRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import { 
  collection, 
  addDoc, 
  serverTimestamp, 
  updateDoc, 
  doc, 
  onSnapshot, 
  query, 
  orderBy 
} from 'firebase/firestore';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { db, auth, signInWithGoogle } from './lib/firebase';
import { cn } from './lib/utils';

type Mode = 'distance' | 'time' | 'velocity' | 'meeting';
type GameState = 'intro' | 'character_selection' | 'playing' | 'results' | 'admin';

interface Character {
  id: string;
  name: string;
  image: string;
  color: string;
  personality: string;
  motto?: string;
}

const CHARACTERS: Character[] = [
  { 
    id: 'vector', 
    name: 'VECTOR "EL VELOZ"', 
    image: 'https://i.postimg.cc/cHsJqfy5/Vector2.png', 
    color: '#e60012',
    personality: 'Directo y enfocado.',
    motto: '"La distancia más corta entre dos puntos es mi trayectoria"'
  },
  { 
    id: 'inercia', 
    name: 'INERCIA "LA IMPARABLE"', 
    image: 'https://i.postimg.cc/zBJfmTZ7/inercia2.png', 
    color: '#43b02a',
    personality: 'Una vez que arranca, nadie la detiene. Es relajada pero persistente.'
  },
  { 
    id: 'cronos', 
    name: 'CRONOS "EL PRECISO"', 
    image: 'https://i.postimg.cc/Dz3ZgtCm/cronos2.png', 
    color: '#0072ce',
    personality: 'Obsesionado con la exactitud. Calcula cada milisegundo de la carrera.'
  },
  { 
    id: 'magno', 
    name: 'MAGNO "EL MASA"', 
    image: 'https://i.postimg.cc/50xtc8dR/magno2.png', 
    color: '#f9d71c',
    personality: 'Rudo pero bonachón. Su fuerza le permite mantener una velocidad constante sin desviarse por obstáculos menores.'
  },
];

interface Challenge {
  id: number;
  mode: Mode;
  question: string;
  options: string[];
  correctAnswer: string;
  hint: string;
  reward: number;
}

const CHALLENGES: Challenge[] = [
  // DISTANCE MODULE
  { id: 1, mode: 'distance', question: "Magno escapa a 40 m/s. Si tarda 5s en llegar a su base, ¿a qué distancia está?", options: ["150m", "200m", "250m", "300m"], correctAnswer: "200m", hint: "d = v * t", reward: 50 },
  { id: 2, mode: 'distance', question: "Un rayo láser viaja a 60 m/s durante 3s. ¿Qué distancia recorre?", options: ["120m", "150m", "180m", "200m"], correctAnswer: "180m", hint: "d = v * t", reward: 50 },
  { id: 3, mode: 'distance', question: "Vector usa su propulsor y va a 80 m/s por 4s. ¿Cuántos metros avanzó?", options: ["240m", "320m", "400m", "480m"], correctAnswer: "320m", hint: "d = v * t", reward: 50 },
  // VELOCITY MODULE
  { id: 4, mode: 'velocity', question: "Recorres 600m en 15s. ¿A qué velocidad constante vas?", options: ["30 m/s", "35 m/s", "40 m/s", "50 m/s"], correctAnswer: "40 m/s", hint: "v = d / t", reward: 50 },
  { id: 5, mode: 'velocity', question: "Un destello recorre 1000m en 10s. ¿Cuál es su velocidad?", options: ["80 m/s", "90 m/s", "100 m/s", "110 m/s"], correctAnswer: "100 m/s", hint: "v = d / t", reward: 50 },
  { id: 6, mode: 'velocity', question: "Inercia recorre 450m en 9s. ¿A qué velocidad se mueve?", options: ["40 m/s", "45 m/s", "50 m/s", "55 m/s"], correctAnswer: "50 m/s", hint: "v = d / t", reward: 50 },
  // TIME MODULE
  { id: 7, mode: 'time', question: "La meta está a 1000m. Si vas a 50 m/s, ¿cuánto tiempo tardarás?", options: ["10s", "15s", "20s", "25s"], correctAnswer: "20s", hint: "t = d / v", reward: 50 },
  { id: 8, mode: 'time', question: "Cronos debe recorrer 1200m a 40 m/s. ¿En cuánto tiempo llega?", options: ["20s", "25s", "30s", "35s"], correctAnswer: "30s", hint: "t = d / v", reward: 50 },
  { id: 9, mode: 'time', question: "Una alarma sonará en 5s. Si estás a 250m, ¿a qué velocidad mínima debes huir?", options: ["40 m/s", "45 m/s", "50 m/s", "60 m/s"], correctAnswer: "50 m/s", hint: "v = d / t", reward: 50 },
  // MEETING POINT MODULE
  { id: 10, mode: 'meeting', question: "Vector (0m, 30m/s) y Magno (1000m, 20m/s) van al encuentro. ¿En qué tiempo se cruzan?", options: ["10s", "15s", "20s", "25s"], correctAnswer: "20s", hint: "t = D / (v1 + v2)", reward: 100 },
  { id: 11, mode: 'meeting', question: "En el encuentro anterior (t=20s, v1=30m/s), ¿a qué distancia desde el inicio de Vector se cruzan?", options: ["400m", "500m", "600m", "700m"], correctAnswer: "600m", hint: "d = v1 * t", reward: 100 },
  { id: 12, mode: 'meeting', question: "Vector (0m, 50m/s) persigue a Magno (200m, 30m/s). ¿Cuánto tiempo tarda en alcanzarlo?", options: ["5s", "10s", "15s", "20s"], correctAnswer: "10s", hint: "t = d_separacion / (v_rapido - v_lento)", reward: 100 },
];

export default function App() {
  // Game State
  const [gameState, setGameState] = useState<GameState>('intro');
  const [userName, setUserName] = useState('');
  const [userGrade, setUserGrade] = useState('');
  const [selectedChar, setSelectedChar] = useState<Character | null>(null);
  const [coins, setCoins] = useState(0);
  const [currentChallengeIdx, setCurrentChallengeIdx] = useState(0);
  const [showChallenge, setShowChallenge] = useState(false);
  const [feedback, setFeedback] = useState<{ correct: boolean; message: string } | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [bgMusicStarted, setBgMusicStarted] = useState(false);
  const bgOscRef = useRef<OscillatorNode | null>(null);

  // Firebase Tracking State
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [adminData, setAdminData] = useState<any[]>([]);

  // Auth Listener
  useEffect(() => {
    return onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
    });
  }, []);

  // Admin Data Listener
  useEffect(() => {
    if (gameState === 'admin' && currentUser?.email === 'iejosefacampos2025@gmail.com') {
      const q = query(collection(db, 'sessions'), orderBy('lastActiveAt', 'desc'));
      return onSnapshot(q, async (snapshot) => {
        const sessionsPromises = snapshot.docs.map(async (d) => {
          const sessionData = { id: d.id, ...d.data() } as any;
          
          // Get responses for this session
          const responsesQuery = query(collection(db, 'sessions', d.id, 'responses'), orderBy('timestamp', 'asc'));
          const responsesSnapshot = await new Promise<any>((resolve) => {
            const unsub = onSnapshot(responsesQuery, (innerSnap) => {
              unsub();
              resolve(innerSnap.docs.map(doc => doc.data()));
            });
          });
          
          sessionData.responses = responsesSnapshot;
          return sessionData;
        });

        const data = await Promise.all(sessionsPromises);
        setAdminData(data);
      });
    }
  }, [gameState, currentUser]);

  const startSession = async () => {
    try {
      const docRef = await addDoc(collection(db, 'sessions'), {
        userName,
        userGrade,
        selectedCharId: selectedChar?.id,
        coins: 0,
        totalScore: 0,
        challengesCompleted: 0,
        startedAt: serverTimestamp(),
        lastActiveAt: serverTimestamp()
      });
      setSessionId(docRef.id);
    } catch (e) {
      console.error("Error starting session", e);
    }
  };

  const updateSession = async (newCoins: number, correct: boolean, studentAnswer: string) => {
    if (!sessionId) return;
    try {
      const sessionRef = doc(db, 'sessions', sessionId);
      await updateDoc(sessionRef, {
        coins: newCoins,
        challengesCompleted: currentChallengeIdx + 1,
        lastActiveAt: serverTimestamp(),
        totalScore: Math.round((newCoins / ((currentChallengeIdx + 1) * 50)) * 100)
      });

      // Save response
      await addDoc(collection(db, 'sessions', sessionId, 'responses'), {
        challengeId: CHALLENGES[currentChallengeIdx].id,
        answer: studentAnswer,
        isCorrect: correct,
        timestamp: serverTimestamp()
      });
    } catch (e) {
      console.error("Error updating session", e);
    }
  };

  // Simulator State
  const [mode, setMode] = useState<Mode>('distance');
  const [velocity, setVelocity] = useState<number>(30); // m/s
  const [time, setTime] = useState<number>(10); // s
  const [distance, setDistance] = useState<number>(300); // m
  
  // Graph Scaling
  const [xScale, setXScale] = useState(1.2); // Multiplier for X axis
  const [yScale, setYScale] = useState(1.2); // Multiplier for Y axis
  const [isDragging, setIsDragging] = useState<'x' | 'y' | null>(null);
  const lastPosRef = useRef<number>(0);

  const handleMouseDown = (e: React.MouseEvent | React.TouchEvent, axis: 'x' | 'y') => {
    setIsDragging(axis);
    const pos = 'touches' in e ? (axis === 'x' ? e.touches[0].clientX : e.touches[0].clientY) : (axis === 'x' ? e.clientX : e.clientY);
    lastPosRef.current = pos;
    e.stopPropagation();
  };

  useEffect(() => {
    const handleMove = (e: MouseEvent | TouchEvent) => {
      if (!isDragging) return;
      const pos = 'touches' in e ? (isDragging === 'x' ? e.touches[0].clientX : e.touches[0].clientY) : (isDragging === 'x' ? e.clientX : e.clientY);
      const delta = pos - lastPosRef.current;
      
      if (isDragging === 'x') {
        setXScale(prev => Math.max(0.2, Math.min(5, prev - delta * 0.01)));
      } else {
        setYScale(prev => Math.max(0.2, Math.min(5, prev + delta * 0.01)));
      }
      
      lastPosRef.current = pos;
    };

    const handleUp = () => setIsDragging(null);

    if (isDragging) {
      window.addEventListener('mousemove', handleMove);
      window.addEventListener('mouseup', handleUp);
      window.addEventListener('touchmove', handleMove);
      window.addEventListener('touchend', handleUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
      window.removeEventListener('touchmove', handleMove);
      window.removeEventListener('touchend', handleUp);
    };
  }, [isDragging]);
  
  // Meeting Point State
  const [v2, setV2] = useState<number>(20);
  const [dTotal, setDTotal] = useState<number>(1000);
  const [isChase, setIsChase] = useState(false);

  const [showArea, setShowArea] = useState(false);
  const [showSlope, setShowSlope] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [simTime, setSimTime] = useState(0);
  const [hasCelebrated, setHasCelebrated] = useState(false);
  const requestRef = useRef<number>(null);
  const lastUpdateTimeRef = useRef<number>(null);

  // Derived values
  const calculatedValue = useMemo(() => {
    if (mode === 'distance') return velocity * time;
    if (mode === 'time') return velocity !== 0 ? distance / velocity : 0;
    if (mode === 'velocity') return time !== 0 ? distance / time : 0;
    if (mode === 'meeting') {
      if (isChase) {
        const vDiff = velocity - v2;
        return vDiff > 0 ? dTotal / vDiff : 0;
      } else {
        return (velocity + v2) !== 0 ? dTotal / (velocity + v2) : 0;
      }
    }
    return 0;
  }, [mode, velocity, time, distance, v2, dTotal, isChase]);

  const effV = mode === 'velocity' ? calculatedValue : velocity;
  const effT = mode === 'time' || mode === 'meeting' ? calculatedValue : time;
  const effD = mode === 'distance' ? calculatedValue : distance;

  const meetingDist = useMemo(() => {
    if (mode === 'meeting') return velocity * calculatedValue;
    return 0;
  }, [mode, velocity, calculatedValue]);

  // Animation loop
  useEffect(() => {
    const animate = (now: number) => {
      if (lastUpdateTimeRef.current !== null) {
        const deltaTime = (now - lastUpdateTimeRef.current) / 1000;
        setSimTime(prev => {
          const next = prev + deltaTime;
          const bufferPixels = 1600;
          const startLineOffset = 130;
          const triggerPointInMeters = (bufferPixels + startLineOffset) / 10;
          const waitTime = effV > 0 ? (triggerPointInMeters / effV) : 0;
          
          // Trigger celebration exactly when crossing the finish line
          if (!hasCelebrated && next >= (effT + waitTime)) {
            setHasCelebrated(true);
            triggerCelebration();
          }

          // Allow 1.5 seconds extra to see the character cross the line
          const stopTime = effT + waitTime + 1.5;
          if (next >= stopTime) {
            setIsRunning(false);
            return stopTime;
          }
          return next;
        });
      }
      lastUpdateTimeRef.current = now;
      requestRef.current = requestAnimationFrame(animate);
    };

    if (isRunning) {
      requestRef.current = requestAnimationFrame(animate);
    } else {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      lastUpdateTimeRef.current = null;
    }

    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [isRunning, effT, hasCelebrated]);

  const triggerCelebration = () => {
    // 1. Confetti burst from sides
    const duration = 2 * 1000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

    function randomInRange(min: number, max: number) {
      return Math.random() * (max - min) + min;
    }

    const interval: any = setInterval(function() {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        return clearInterval(interval);
      }

      const particleCount = 50 * (timeLeft / duration);
      // since particles fall down, start a bit higher than random
      confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
      confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
    }, 250);

    // 2. Realistic explosions (fireworks)
    const count = 200;
    const fireworksDefaults = {
      origin: { y: 0.7 }
    };

    function fire(particleRatio: number, opts: any) {
      confetti({
        ...fireworksDefaults,
        ...opts,
        particleCount: Math.floor(count * particleRatio)
      });
    }

    fire(0.25, { spread: 26, startVelocity: 55 });
    fire(0.2, { spread: 60 });
    fire(0.35, { spread: 100, decay: 0.91, scalar: 0.8 });
    fire(0.1, { spread: 120, startVelocity: 25, decay: 0.92, scalar: 1.2 });
    fire(0.1, { spread: 120, startVelocity: 45 });

    // 3. Sound effect (basic synth celebration)
    if (soundEnabled) {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
      notes.forEach((freq, i) => {
        setTimeout(() => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, ctx.currentTime);
          gain.gain.setValueAtTime(0.1, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start();
          osc.stop(ctx.currentTime + 0.3);
        }, i * 150);
      });
    }
  };

  const resetSim = () => {
    setIsRunning(false);
    setSimTime(0);
    setHasCelebrated(false);
  };

  const graphData = useMemo(() => {
    const data = [];
    const steps = 30;
    const maxT = Math.max(effT, 10);
    for (let i = 0; i <= steps; i++) {
      const t = (maxT / steps) * i;
      const d1 = effV * t;
      let d2 = 0;
      if (mode === 'meeting') {
        if (isChase) {
          d2 = dTotal + v2 * t;
        } else {
          d2 = dTotal - v2 * t;
        }
      }
      data.push({
        time: Number(t.toFixed(2)),
        distance: Number(d1.toFixed(2)),
        distance2: Number(d2.toFixed(2)),
        velocity: Number(effV.toFixed(2)),
        velocity2: Number((mode === 'meeting' ? (isChase ? v2 : -v2) : 0).toFixed(2)),
      });
    }
    return data;
  }, [effV, effT, mode, v2, dTotal, isChase]);

  const handleInputChange = (type: 'v' | 't' | 'd' | 'v2' | 'dt', val: string) => {
    const num = parseFloat(val) || 0;
    if (type === 'v') setVelocity(num);
    if (type === 't') setTime(num);
    if (type === 'd') setDistance(num);
    if (type === 'v2') setV2(num);
    if (type === 'dt') setDTotal(num);
    resetSim();
  };

  const playSound = (type: 'success' | 'fail' | 'start' | 'coin') => {
    if (!soundEnabled) return;
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    const now = ctx.currentTime;

    if (type === 'success') {
      osc.type = 'square';
      osc.frequency.setValueAtTime(523.25, now); // C5
      osc.frequency.exponentialRampToValueAtTime(1046.50, now + 0.1); // C6
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
      osc.start(now);
      osc.stop(now + 0.3);
    } else if (type === 'fail') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, now); // A3
      osc.frequency.exponentialRampToValueAtTime(110, now + 0.2); // A2
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.linearRampToValueAtTime(0, now + 0.4);
      osc.start(now);
      osc.stop(now + 0.4);
    } else if (type === 'coin') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(987.77, now); // B5
      osc.frequency.setValueAtTime(1318.51, now + 0.1); // E6
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
      osc.start(now);
      osc.stop(now + 0.3);
    } else if (type === 'start') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.1);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.linearRampToValueAtTime(0, now + 0.2);
      osc.start(now);
      osc.stop(now + 0.2);
    }
  };

  const startBgMusic = () => {
    if (!soundEnabled || bgMusicStarted) return;
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(261.63, ctx.currentTime); // C4
    gain.gain.setValueAtTime(0.02, ctx.currentTime);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    bgOscRef.current = osc;
    setBgMusicStarted(true);
  };

  useEffect(() => {
    if (!soundEnabled && bgOscRef.current) {
      bgOscRef.current.stop();
      bgOscRef.current = null;
      setBgMusicStarted(false);
    }
  }, [soundEnabled]);

  const handleAnswer = (answer: string) => {
    startBgMusic(); // Start music on first interaction
    const challenge = CHALLENGES[currentChallengeIdx];
    const isCorrect = answer === challenge.correctAnswer;
    
    if (isCorrect) {
      const newCoins = coins + challenge.reward;
      setCoins(newCoins);
      setFeedback({ correct: true, message: "¡EXCELENTE! Has salvado un sector de la galaxia." });
      playSound('success');
      updateSession(newCoins, true, answer);
    } else {
      setFeedback({ correct: false, message: "¡OH NO! El cálculo falló. ¡Inténtalo de nuevo!" });
      playSound('fail');
      updateSession(coins, false, answer);
    }
  };

  const nextChallenge = () => {
    setFeedback(null);
    if (currentChallengeIdx < CHALLENGES.length - 1) {
      const nextIdx = currentChallengeIdx + 1;
      setCurrentChallengeIdx(nextIdx);
      setMode(CHALLENGES[nextIdx].mode);
      setShowChallenge(false);
      resetSim();
    } else {
      setGameState('results');
    }
  };

  useEffect(() => {
    if (gameState === 'playing') {
      setMode(CHALLENGES[currentChallengeIdx].mode);
    }
  }, [gameState]);

  const getRating = () => {
    const totalPossible = CHALLENGES.reduce((acc, c) => acc + c.reward, 0);
    const percentage = (coins / totalPossible) * 100;
    if (percentage >= 90) return { label: 'SUPERIOR', color: 'text-kart-green', msg: '¡Eres una leyenda de la física! La humanidad está a salvo gracias a tu precisión matemática.' };
    if (percentage >= 75) return { label: 'ALTO', color: 'text-kart-blue', msg: '¡Gran trabajo, piloto! Tus cálculos son muy precisos y has protegido a la mayoría.' };
    if (percentage >= 60) return { label: 'BÁSICO', color: 'text-kart-yellow', msg: '¡Bien hecho! Has superado los retos, pero sigue practicando para ser el más rápido.' };
    return { label: 'BAJO', color: 'text-kart-red', msg: '¡No te rindas! Incluso los mejores pilotos necesitan entrenar más sus fórmulas.' };
  };

  const motoProgress = effT > 0 ? (simTime / effT) * 100 : 0;

  return (
    <div className="min-h-screen bg-kart-sky text-slate-900 font-sans p-4 md:p-8 selection:bg-kart-yellow selection:text-black overflow-x-hidden">
      <AnimatePresence mode="wait">
        
        {/* INTRO SCREEN */}
        {gameState === 'intro' && (
          <motion.div 
            key="intro"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.1 }}
            className="max-w-2xl mx-auto mt-20 kart-card p-12 text-center space-y-8"
          >
            <div className="flex justify-center">
              <motion.div 
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ repeat: Infinity, duration: 2 }}
                className="bg-kart-red p-6 rounded-full border-4 border-black shadow-[6px_6px_0px_#000]"
              >
                <Star size={64} className="text-kart-yellow fill-kart-yellow" />
              </motion.div>
            </div>
            <h1 className="text-5xl md:text-7xl font-display font-black italic uppercase tracking-tighter text-kart-red leading-none">
              MRU HEROES<br/>
              <span className="text-kart-blue text-4xl md:text-5xl">MISIÓN CRÍTICA</span>
            </h1>
            <p className="text-lg font-tech font-bold text-slate-600 leading-relaxed uppercase tracking-tight">
              ¡Atención Piloto! El universo está en peligro. Solo dominando las leyes del <span className="text-kart-blue border-b-2 border-kart-blue">Movimiento Rectilíneo Uniforme</span> podrás interceptar las amenazas y salvar a la humanidad.
            </p>
            <div className="space-y-4">
              <div className="relative group">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-kart-blue transition-colors" />
                <input 
                  type="text" 
                  placeholder="Tu Nombre de Piloto"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 rounded-xl border-4 border-black font-tech font-bold text-xl focus:outline-none focus:ring-4 focus:ring-kart-blue/20 bg-slate-50 uppercase"
                />
              </div>
              <div className="relative group">
                <GraduationCap className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-kart-green transition-colors" />
                <input 
                  type="text" 
                  placeholder="Tu Grado (Ej: 10° A)"
                  value={userGrade}
                  onChange={(e) => setUserGrade(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 rounded-xl border-4 border-black font-tech font-bold text-xl focus:outline-none focus:ring-4 focus:ring-kart-green/20 bg-slate-50 uppercase"
                />
              </div>
            </div>
            <button 
              disabled={!userName || !userGrade}
              onClick={() => {
                startBgMusic();
                setGameState('character_selection');
              }}
              className="kart-button w-full py-6 bg-kart-red text-white text-3xl italic disabled:opacity-50 disabled:grayscale shadow-[10px_10px_0px_#000]"
            >
              INICIAR PROTOCOLO <ArrowRight className="inline ml-2" />
            </button>
          </motion.div>
        )}

        {/* CHARACTER SELECTION */}
        {gameState === 'character_selection' && (
          <motion.div 
            key="char"
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -100 }}
            className="max-w-4xl mx-auto mt-10 space-y-10"
          >
            <div className="text-center space-y-4">
              <h2 className="text-5xl font-display font-black italic uppercase text-kart-blue tracking-tighter">Elige tu Corredor</h2>
              <p className="font-tech text-xs text-slate-500 uppercase tracking-widest">Cada piloto tiene el mismo motor MRU, ¡tú pones la mente!</p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {CHARACTERS.map((char) => (
                <motion.button
                  key={char.id}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setSelectedChar(char)}
                  className={cn(
                    "kart-card p-4 transition-all border-4 flex flex-col items-center text-center",
                    selectedChar?.id === char.id ? "border-kart-yellow ring-8 ring-kart-yellow/20 -translate-y-2" : "border-black"
                  )}
                >
                  <img src={char.image} alt={char.name} className="w-full aspect-square rounded-lg mb-4 border-2 border-black object-contain bg-slate-50 p-2" />
                  <span className="font-display font-bold italic text-lg uppercase mb-2 leading-tight">{char.name}</span>
                  <div className="text-[10px] font-tech text-slate-600 space-y-2 leading-relaxed">
                    <p>{char.personality}</p>
                    {char.motto && <p className="text-kart-red italic">{char.motto}</p>}
                  </div>
                </motion.button>
              ))}
            </div>
            <div className="flex justify-center">
              <button 
                disabled={!selectedChar}
                onClick={() => {
                  startSession();
                  setGameState('playing');
                }}
                className="kart-button px-20 py-5 bg-kart-green text-white text-2xl disabled:opacity-50"
              >
                ¡A LA PISTA!
              </button>
            </div>
          </motion.div>
        )}

        {/* MAIN GAMEPLAY */}
        {gameState === 'playing' && (
          <motion.div 
            key="playing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="max-w-6xl mx-auto space-y-8"
          >
            {/* HUD */}
            <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-2xl border-4 border-black shadow-[6px_6px_0px_#000]">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full border-4 border-black overflow-hidden bg-white">
                  <img src={selectedChar?.image} alt={selectedChar?.name} className="w-full h-full object-contain p-1" referrerPolicy="no-referrer" />
                </div>
                <div>
                  <p className="font-display font-black italic text-xl text-kart-red uppercase">{userName}</p>
                  <div className="flex items-center gap-2">
                    <p className="font-tech text-[10px] text-slate-400 uppercase tracking-wider">{userGrade}</p>
                    <div className="w-24 h-2 bg-slate-200 rounded-full overflow-hidden border border-black">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${(currentChallengeIdx / CHALLENGES.length) * 100}%` }}
                        className="h-full bg-kart-green"
                      />
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4 md:gap-8">
                <div className="flex items-center gap-3 bg-kart-yellow px-4 py-2 rounded-xl border-2 border-black">
                  <Coins className="text-black fill-black" size={20} />
                  <span className="font-tech font-bold text-lg">{coins}</span>
                </div>
                
                {/* Sound Toggle Menu */}
                <button 
                  onClick={() => setSoundEnabled(!soundEnabled)}
                  className={cn(
                    "p-2 rounded-xl border-2 border-black transition-colors",
                    soundEnabled ? "bg-kart-blue text-white" : "bg-slate-200 text-slate-500"
                  )}
                >
                  {soundEnabled ? <Zap size={20} /> : <Zap size={20} className="opacity-50" />}
                </button>

                <button 
                  onClick={() => setShowChallenge(true)}
                  className="kart-button bg-kart-red text-white px-4 py-2 text-xs flex items-center gap-2"
                >
                  <ShieldAlert size={16} />
                  MISIÓN
                </button>
              </div>
            </div>

            {/* Simulation Area */}
            <section className="kart-card p-10 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-full bg-kart-sky opacity-20 pointer-events-none" />
              
              <div className="flex flex-col sm:flex-row items-center justify-between gap-6 mb-8 relative z-10">
                <h3 className="font-display text-2xl md:text-3xl text-kart-blue flex items-center gap-3 uppercase italic">
                  <Flag size={32} className="text-kart-red" />
                  Circuito Retro 64
                </h3>
                <div className="flex items-center gap-4 md:gap-8 text-lg md:text-xl font-tech bg-white px-4 md:px-8 py-3 md:py-4 rounded-xl border-4 border-black shadow-[6px_6px_0px_#000] w-full sm:w-auto justify-center uppercase tracking-tight">
                  <div className="flex flex-col items-center">
                    <span className="text-[10px] font-bold text-slate-400 mb-1">Time</span>
                    <span className="text-kart-red font-black italic">
                      {(() => {
                        const pixelsPerMeter = 10;
                        const bufferPixels = 1600;
                        const startOffset = 130;
                        const triggerPoint = bufferPixels + startOffset;
                        const waitTime = effV > 0 ? (triggerPoint / (effV * pixelsPerMeter)) : 0;
                        const t = Math.max(0, simTime - waitTime);
                        return t > effT ? effT.toFixed(2) : t.toFixed(2);
                      })()}s
                    </span>
                  </div>
                  <div className="w-1 h-10 bg-slate-200" />
                  <div className="flex flex-col items-center">
                    <span className="text-[10px] font-bold text-slate-400 mb-1">Dist 1</span>
                    <span className="text-kart-green font-black italic">
                      {(() => {
                        const pixelsPerMeter = 10;
                        const bufferPixels = 1600;
                        const startOffset = 130;
                        const triggerPointInMeters = (bufferPixels + startOffset) / pixelsPerMeter;
                        const d = Math.max(0, (effV * simTime) - triggerPointInMeters);
                        return d > effD ? effD.toFixed(1) : d.toFixed(1);
                      })()}m
                    </span>
                  </div>
                  {mode === 'meeting' && (
                    <>
                      <div className="w-1 h-10 bg-slate-200" />
                      <div className="flex flex-col items-center">
                        <span className="text-[10px] font-bold text-slate-400 mb-1">Dist 2</span>
                        <span className="text-kart-blue font-black italic">
                          {isChase ? (dTotal + v2 * simTime).toFixed(1) : (dTotal - v2 * simTime).toFixed(1)}m
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Dynamic 3-Part Sequential Track Simulation */}
              <div 
                className="relative h-[280px] sm:h-[400px] md:h-[450px] rounded-2xl sm:rounded-3xl border-4 sm:border-8 border-black overflow-hidden shadow-2xl flex flex-col group"
                style={{ 
                  backgroundImage: 'url(https://i.postimg.cc/SKLKtD5d/background2.png)',
                  backgroundSize: 'auto 100%',
                  backgroundRepeat: 'repeat'
                }}
              >
                {/* Scrollable World Strip */}
                {(() => {
                  const dEndMeters = (effD || 100);
                  const pixelsPerMeter = 10; 
                  const dEndPixels = dEndMeters * pixelsPerMeter;
                  const viewportOffset = typeof window !== 'undefined' && window.innerWidth < 640 ? 80 : 180; 
                  const bufferPixels = 1600; 
                  const startLineWorldPos = bufferPixels + 130;
                  const finishLineWorldPos = startLineWorldPos + dEndPixels;
                  
                  // World width covers from 0 to slightly past finish line
                  const worldWidth = finishLineWorldPos + 1000;
                  const currentDistPixels = effV * simTime * pixelsPerMeter;
                  
                  return (
                    <motion.div 
                      className="absolute inset-0 flex h-full"
                      style={{ 
                        width: `${worldWidth}px`,
                        x: `${-currentDistPixels + viewportOffset}px` 
                      }}
                    >
                      {/* ROAD ZONE 1: PRE-START (BG2) */}
                      <div 
                        className="h-full shrink-0 relative" 
                        style={{ 
                          backgroundImage: 'url(https://i.postimg.cc/SKLKtD5d/background2.png)',
                          backgroundSize: 'auto 100%',
                          backgroundRepeat: 'repeat-x',
                          width: '1600px'
                        }} 
                      />

                      {/* ROAD ZONE 2: START LINE (BG1) */}
                      <div 
                        className="h-full shrink-0 relative" 
                        style={{ 
                          backgroundImage: 'url(https://i.postimg.cc/7L1LQmcn/background1.png)',
                          backgroundSize: '1200px 100%',
                          backgroundRepeat: 'no-repeat',
                          width: '1200px'
                        }} 
                      >
                        {/* Foreground Overlay */}
                        <div 
                          className="absolute inset-0 z-50 pointer-events-none"
                          style={{
                            backgroundImage: 'url(https://i.postimg.cc/nLKLw05D/foreground1.png)',
                            backgroundSize: '1200px 100%',
                            backgroundRepeat: 'no-repeat'
                          }}
                        />
                      </div>
                      
                      {/* ROAD ZONE 3: MID SECTION (BG2 repeated) */}
                      {/* We need the distance between end of BG1 (1600+1200) and start of BG3 */}
                      <div 
                        className="h-full shrink-0 relative" 
                        style={{ 
                          backgroundImage: 'url(https://i.postimg.cc/SKLKtD5d/background2.png)',
                          backgroundRepeat: 'repeat-x',
                          backgroundSize: 'auto 100%',
                          width: `${Math.max(0, dEndPixels - (1200 - 130) - 560)}px`
                        }} 
                      />
                      
                      {/* ROAD ZONE 4: FINISH LINE (BG3) */}
                      <div 
                        className="h-full shrink-0 relative" 
                        style={{ 
                          backgroundImage: 'url(https://i.postimg.cc/9fPfNJSS/background3.png)',
                          backgroundSize: '1200px 100%',
                          backgroundRepeat: 'no-repeat',
                          width: '1200px',
                          // This margin ensures the line at 560px in BG3 aligns perfectly with finishLineWorldPos
                          marginLeft: dEndPixels < (1200 - 130 + 560)
                            ? `-${(1200 - 130 + 560) - dEndPixels}px`
                            : '0px'
                        }} 
                      >
                        {/* Foreground Overlay for Finish Line */}
                        <div 
                          className="absolute inset-0 z-50 pointer-events-none"
                          style={{
                            backgroundImage: 'url(https://i.postimg.cc/tgdgm2fD/foreground2.png)',
                            backgroundSize: '1200px 100%',
                            backgroundRepeat: 'no-repeat'
                          }}
                        />
                      </div>

                      {/* ROAD ZONE 5: POST-STRETCH (BG2) - Added to see character cross */}
                      <div 
                        className="h-full shrink-0 relative" 
                        style={{ 
                          backgroundImage: 'url(https://i.postimg.cc/SKLKtD5d/background2.png)',
                          backgroundSize: 'auto 100%',
                          backgroundRepeat: 'repeat-x',
                          width: '1800px'
                        }} 
                      />

                      {/* OBJECTS IN WORLD */}
                      <div className="absolute inset-y-0 left-0 right-0 pointer-events-none">
                        <div className="relative w-full h-full">
                          {/* Main Kart (Kart 1) */}
                          <motion.div 
                            className="absolute z-30"
                            style={{ 
                              left: `${currentDistPixels}px`,
                              bottom: '12%',
                            }}
                          >
                            <img 
                              src={selectedChar?.image} 
                              alt="Player"
                              className="w-14 sm:w-20 md:w-28 h-auto drop-shadow-2xl"
                            />
                          </motion.div>

                          {/* Rival Kart (Kart 2) */}
                          {mode === 'meeting' && (
                            <motion.div 
                              className="absolute z-30"
                              style={{ 
                                left: `${((isChase ? (v2 * simTime) : (dTotal - v2 * simTime)) * pixelsPerMeter) + startLineWorldPos}px`,
                                bottom: '18%',
                                scaleX: isChase ? 1 : -1
                              }}
                            >
                              <img 
                                src={CHARACTERS.find(c => c.id === 'magno')?.image} 
                                alt="Rival" 
                                className="w-14 sm:w-20 md:w-28 h-auto drop-shadow-xl opacity-80"
                              />
                            </motion.div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })()}

                {/* HUD Overlay inside track - FIXED POSITION */}
                <div className="absolute top-3 sm:top-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 sm:gap-2 pointer-events-none z-50 w-full max-w-[200px] sm:max-w-none">
                  <div className="bg-black/80 backdrop-blur-md px-4 sm:px-6 py-1.5 sm:py-2 rounded-full border-2 border-white/20 text-white font-tech italic text-[10px] sm:text-sm shadow-xl whitespace-nowrap">
                    VELOCIDAD: <span className="text-kart-yellow font-black">{velocity} M/S</span>
                  </div>
                  <div className="bg-white/20 backdrop-blur-sm px-2 py-0.5 rounded-md text-[6px] sm:text-[8px] text-white font-retro uppercase">
                    MRU: {mode === 'meeting' ? 'ENCUENTRO' : 'MODELO'}
                  </div>
                </div>

                {/* Floating In-Game Controls */}
                <div className="absolute left-3 sm:left-6 top-1/2 -translate-y-1/2 flex flex-col gap-2 sm:gap-3 z-50">
                  <motion.button
                    whileHover={{ scale: 1.1, x: 5 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setIsRunning(!isRunning)}
                    disabled={simTime >= effT + (1600+130)/10 && !isRunning}
                    className={cn(
                      "w-12 h-12 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl border-2 sm:border-4 border-black shadow-[2px_2px_0px_#000] sm:shadow-[4px_4px_0px_#000] flex items-center justify-center transition-transform backdrop-blur-sm",
                      isRunning ? "bg-kart-yellow/90 text-black" : "bg-kart-green/90 text-white"
                    )}
                  >
                    {isRunning ? <Pause className="w-6 h-6 sm:w-8 sm:h-8" fill="currentColor" /> : <Play className="w-6 h-6 sm:w-8 sm:h-8" fill="currentColor" />}
                  </motion.button>
                  
                  <motion.button
                    whileHover={{ scale: 1.1, x: 5 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      setSimTime(0);
                      setIsRunning(false);
                    }}
                    className="w-12 h-12 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl bg-kart-red/90 border-2 sm:border-4 border-black shadow-[2px_2px_0px_#000] sm:shadow-[4px_4px_0px_#000] flex items-center justify-center text-white backdrop-blur-sm"
                  >
                    <RotateCcw className="w-6 h-6 sm:w-8 sm:h-8" />
                  </motion.button>
                </div>
              </div>

              <div className="mt-8 flex flex-col sm:flex-row justify-center items-center gap-4 hidden">
                {/* Redundant buttons removed as requested - they are now overlays */}
              </div>
            </section>

            {/* Controls & Graphs */}
            <div className="mt-16 mb-8 text-center">
              <h2 className="text-4xl font-display text-black italic uppercase tracking-tighter drop-shadow-sm">
                ANÁLISIS GRÁFICO
              </h2>
              <div className="w-24 h-2 bg-kart-red mx-auto mt-2 rounded-full" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <section className="lg:col-span-1 space-y-8">
                <div className="kart-card p-6 space-y-6 relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-2 bg-kart-red text-white text-[8px] font-tech uppercase italic">Panel de Control</div>
                  <div className="flex flex-wrap gap-2">
                    {(['distance', 'velocity', 'time', 'meeting'] as Mode[]).map(m => (
                      <button 
                        key={m}
                        onClick={() => { setMode(m); resetSim(); }}
                        className={cn(
                          "px-3 py-1 rounded-lg font-display text-[10px] uppercase border-2 border-black",
                          mode === m ? "bg-kart-red text-white" : "bg-white"
                        )}
                      >
                        {m === 'meeting' ? 'ENCUENTRO' : m === 'distance' ? 'DISTANCIA' : m === 'velocity' ? 'VELOCIDAD' : 'TIEMPO'}
                      </button>
                    ))}
                  </div>

                  <div className="space-y-6">
                    <p className="text-[10px] font-tech font-bold text-kart-blue animate-pulse flex items-center gap-2 bg-kart-blue/5 p-2 rounded border border-kart-blue/20">
                      <Settings2 size={16} /> 1. AJUSTA TUS VALORES (V, T, D) → 2. ¡DALE A VAMOS!
                    </p>
                    {mode === 'meeting' && (
                      <div className="flex items-center gap-4 p-2 bg-slate-100 rounded-lg border-2 border-black">
                        <span className="text-[10px] font-retro uppercase">Modo:</span>
                        <button onClick={() => setIsChase(false)} className={cn("px-2 py-1 text-[8px] rounded border", !isChase ? "bg-kart-blue text-white" : "bg-white")}>ENCUENTRO</button>
                        <button onClick={() => setIsChase(true)} className={cn("px-2 py-1 text-[8px] rounded border", isChase ? "bg-kart-red text-white" : "bg-white")}>PERSECUCIÓN</button>
                      </div>
                    )}

                    <div className="space-y-4">
                      <label className="text-[10px] font-retro text-slate-500 uppercase flex justify-between">
                        Velocidad 1 <span className="text-kart-red">{velocity} m/s</span>
                      </label>
                      <input type="range" min="0" max="200" value={velocity} onChange={(e) => handleInputChange('v', e.target.value)} className="w-full h-3 accent-kart-red" />
                    </div>

                    {mode === 'meeting' && (
                      <div className="space-y-4">
                        <label className="text-[10px] font-retro text-slate-500 uppercase flex justify-between">
                          Velocidad 2 <span className="text-kart-blue">{v2} m/s</span>
                        </label>
                        <input type="range" min="0" max="200" value={v2} onChange={(e) => handleInputChange('v2', e.target.value)} className="w-full h-3 accent-kart-blue" />
                      </div>
                    )}

                    {(mode === 'meeting' || mode === 'time' || mode === 'velocity') && (
                      <div className="space-y-4">
                        <label className="text-[10px] font-retro text-slate-500 uppercase flex justify-between">
                          {mode === 'meeting' ? 'Distancia Separación' : 'Distancia Total'} <span className="text-kart-green">{mode === 'meeting' ? dTotal : distance} m</span>
                        </label>
                        <input type="range" min="0" max="2000" value={mode === 'meeting' ? dTotal : distance} onChange={(e) => handleInputChange(mode === 'meeting' ? 'dt' : 'd', e.target.value)} className="w-full h-3 accent-kart-green" />
                      </div>
                    )}

                    {(mode === 'distance' || mode === 'velocity') && (
                      <div className="space-y-4">
                        <label className="text-[10px] font-retro text-slate-500 uppercase flex justify-between">
                          Tiempo <span className="text-kart-blue">{time} s</span>
                        </label>
                        <input type="range" min="0" max="120" value={time} onChange={(e) => handleInputChange('t', e.target.value)} className="w-full h-3 accent-kart-blue" />
                      </div>
                    )}
                  </div>

                  <div className="bg-kart-yellow p-6 rounded-xl border-4 border-black shadow-[4px_4px_0px_#000]">
                    <p className="font-retro text-[8px] uppercase mb-2">Resultado</p>
                    <div className="flex items-baseline gap-2">
                      <span className="text-4xl font-display text-black italic">
                        {calculatedValue.toFixed(1)}
                      </span>
                      <span className="text-black font-display text-xs uppercase">
                        {mode === 'distance' ? 'm' : mode === 'time' || mode === 'meeting' ? 's' : 'm/s'}
                      </span>
                    </div>
                    {mode === 'meeting' && (
                      <p className="text-[10px] font-bold mt-2">Punto de encuentro: {meetingDist.toFixed(1)}m</p>
                    )}
                  </div>
                </div>
              </section>

              <section className="lg:col-span-2 space-y-8">
                {/* V vs T Graph */}
                <div className="kart-card p-6 relative">
                  <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                    <h3 className="font-display text-xl text-kart-blue uppercase italic flex items-center gap-2">
                      <TrendingUp size={24} /> V vs T
                    </h3>
                    <div className="flex items-center gap-2">
                      <div className="text-[8px] font-retro bg-slate-100 px-2 py-1 rounded border border-black animate-pulse">
                        ARRASTRA LOS EJES PARA ESCALAR
                      </div>
                      <button onClick={() => setShowArea(!showArea)} className={cn("px-4 py-2 rounded border-2 border-black font-retro text-[8px]", showArea ? "bg-kart-blue text-white" : "bg-white")}>
                        {showArea ? `ÁREA = ${effD.toFixed(1)}m` : "VER ÁREA"}
                      </button>
                    </div>
                  </div>
                  <div className="h-[300px] w-full mt-4 flex flex-col">
                    <AreaChart width={window.innerWidth < 1024 ? window.innerWidth - 80 : 800} height={250} data={graphData} margin={{ left: 0, right: 20, bottom: 0, top: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis 
                        dataKey="time" 
                        type="number"
                        stroke="#000" 
                        tick={{fontSize: 10}} 
                        domain={[0, 'auto']}
                        label={{ value: 'Tiempo (s)', position: 'insideBottomRight', offset: 0, fontSize: 10, fontWeight: 'bold' }}
                      />
                      <YAxis 
                        stroke="#000" 
                        type="number"
                        tick={{fontSize: 10}} 
                        domain={[0, 'auto']}
                        label={{ value: 'v (m/s)', angle: -90, position: 'insideLeft', fontSize: 10, fontWeight: 'bold' }}
                      />
                      <Tooltip />
                      <Area type="stepAfter" dataKey="velocity" name="V Kart 1" stroke="#0072ce" strokeWidth={4} fill={showArea ? "#0072ce" : "transparent"} fillOpacity={0.2} isAnimationActive={false} />
                      {mode === 'meeting' && (
                        <Area type="stepAfter" dataKey="velocity2" name="V Kart 2" stroke="#e60012" strokeWidth={2} fill="transparent" isAnimationActive={false} strokeDasharray="5 5" />
                      )}
                      <ReferenceLine x={simTime} stroke="#000" strokeWidth={3} />
                    </AreaChart>
                  </div>
                </div>

                {/* D vs T Graph */}
                <div className="kart-card p-6 relative">
                  <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                    <h3 className="font-display text-xl text-kart-green uppercase italic flex items-center gap-2">
                      <Activity size={24} /> D vs T
                    </h3>
                    <div className="flex items-center gap-2">
                      <button onClick={() => setShowSlope(!showSlope)} className={cn("px-4 py-2 rounded border-2 border-black font-tech font-bold text-[10px] transition-all", showSlope ? "bg-kart-green text-white shadow-[2px_2px_0px_#000]" : "bg-white hover:bg-slate-50 shadow-[4px_4px_0px_#000]")}>
                        {showSlope ? `PENDIENTE = ${effV.toFixed(1)}m/s` : "VER PENDIENTE"}
                      </button>
                    </div>
                  </div>
                  <div className="h-[300px] w-full mt-4 flex flex-col">
                    <LineChart width={window.innerWidth < 1024 ? window.innerWidth - 80 : 800} height={250} data={graphData} margin={{ left: 0, right: 20, bottom: 0, top: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis 
                        dataKey="time" 
                        type="number"
                        stroke="#000" 
                        tick={{fontSize: 10}} 
                        domain={[0, 'auto']}
                        label={{ value: 'Tiempo (s)', position: 'insideBottomRight', offset: 0, fontSize: 10, fontWeight: 'bold' }}
                      />
                      <YAxis 
                        stroke="#000" 
                        type="number"
                        tick={{fontSize: 10}} 
                        domain={[0, 'auto']}
                        label={{ value: 'd (m)', angle: -90, position: 'insideLeft', fontSize: 10, fontWeight: 'bold' }}
                      />
                      <Tooltip />
                      <Line type="monotone" dataKey="distance" name="D Kart 1" stroke="#43b02a" strokeWidth={4} dot={false} isAnimationActive={false} />
                      {mode === 'meeting' && (
                        <Line type="monotone" dataKey="distance2" name="D Kart 2" stroke="#0072ce" strokeWidth={4} dot={false} isAnimationActive={false} strokeDasharray="5 5" />
                      )}
                      <ReferenceLine x={simTime} stroke="#000" strokeWidth={3} />
                    </LineChart>
                  </div>
                </div>
              </section>
            </div>

            {/* CHALLENGE MODAL */}
            {showChallenge && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                <motion.div 
                  initial={{ scale: 0.8, y: 50 }}
                  animate={{ scale: 1, y: 0 }}
                  className="max-w-xl w-full kart-card p-8 space-y-6 relative"
                >
                  <div className="flex items-center gap-4 text-kart-red font-display font-black italic text-4xl uppercase tracking-tighter">
                    <ShieldAlert size={40} />
                    MISIÓN #{CHALLENGES[currentChallengeIdx].id}
                  </div>
                  <p className="text-2xl font-tech font-bold text-slate-700 leading-tight">
                    {CHALLENGES[currentChallengeIdx].question}
                  </p>
                  <div className="grid grid-cols-2 gap-6">
                    {CHALLENGES[currentChallengeIdx].options.map((opt) => (
                      <button 
                        key={opt}
                        onClick={() => handleAnswer(opt)}
                        className="kart-button py-5 bg-white hover:bg-slate-50 text-2xl font-display italic font-bold border-4"
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                  <div className="bg-slate-50 p-6 rounded-xl border-4 border-black border-dashed">
                    <div className="flex items-center gap-2 font-tech text-xs uppercase tracking-widest text-slate-400 mb-2 font-bold">
                      <Info size={16} /> RECOMENDACIÓN TÉCNICA:
                    </div>
                    <p className="font-tech text-sm text-slate-600 font-bold italic">
                      {CHALLENGES[currentChallengeIdx].hint}
                    </p>
                  </div>

                  {/* Feedback Overlay */}
                  <AnimatePresence>
                    {feedback && (
                      <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={cn(
                          "absolute inset-0 flex flex-col items-center justify-center p-8 rounded-lg text-center space-y-6 z-10",
                          feedback.correct ? "bg-kart-green text-white" : "bg-kart-red text-white"
                        )}
                      >
                        {feedback.correct ? <CheckCircle2 size={80} /> : <XCircle size={80} />}
                        <h4 className="text-3xl font-display uppercase">{feedback.correct ? "¡LOGRADO!" : "¡FALLO!"}</h4>
                        <p className="text-xl font-bold">{feedback.message}</p>
                        <button 
                          onClick={nextChallenge}
                          className="kart-button bg-white text-black px-12 py-4 text-xl"
                        >
                          CONTINUAR
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              </div>
            )}
          </motion.div>
        )}

        {/* RESULTS SCREEN */}
        {gameState === 'results' && (
          <motion.div 
            key="results"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-3xl mx-auto mt-10 kart-card p-12 text-center space-y-10"
          >
            <div className="space-y-4">
              <h2 className="text-6xl font-display font-black italic uppercase text-kart-blue tracking-tighter">Misión Cumplida</h2>
              <p className="text-xl font-tech font-bold text-slate-500 uppercase tracking-widest leading-none">Piloto: <span className="text-kart-red">{userName}</span> | Grado: <span className="text-kart-green">{userGrade}</span></p>
            </div>

            <div className="flex justify-center gap-8">
              <div className="bg-kart-yellow p-8 rounded-2xl border-4 border-black shadow-[8px_8px_0px_#000] min-w-[200px]">
                <Coins className="mx-auto mb-4" size={48} />
                <p className="font-tech font-bold text-xs uppercase mb-2">Monedas</p>
                <p className="text-5xl font-display font-black italic">{coins}</p>
              </div>
              <div className="bg-white p-8 rounded-2xl border-4 border-black shadow-[8px_8px_0px_#000] min-w-[200px]">
                <Trophy className="mx-auto mb-4 text-kart-yellow" size={48} />
                <p className="font-tech font-bold text-xs uppercase mb-2">Valoración</p>
                <p className={cn("text-4xl font-display font-black italic", getRating().color)}>
                  {getRating().label}
                </p>
              </div>
            </div>

            <div className="bg-slate-50 p-8 rounded-xl border-4 border-black border-dashed">
              <p className="text-2xl font-bold text-slate-700 leading-relaxed italic">
                "{getRating().msg}"
              </p>
            </div>

            <div className="pt-8 border-t-4 border-slate-100">
              <p className="text-slate-500 font-bold mb-6">¿Quieres mejorar tu récord?</p>
              <button 
                onClick={() => window.location.reload()}
                className="kart-button px-12 py-5 bg-kart-red text-white text-2xl"
              >
                NUEVA PARTIDA
              </button>
            </div>
          </motion.div>
        )}

        {/* ADMIN PANEL */}
        {gameState === 'admin' && (
          <motion.div 
            key="admin"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="max-w-6xl mx-auto mt-10 space-y-8"
          >
            <div className="flex items-center justify-between bg-white p-8 rounded-2xl border-4 border-black shadow-[8px_8px_0px_#000]">
              <div>
                <h2 className="text-4xl font-display font-black italic uppercase text-kart-blue">Monitoreo de resultados en tiempo real</h2>
                <p className="font-tech text-slate-500 uppercase tracking-widest text-xs mt-2">Control central de misiones galácticas</p>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right hidden md:block">
                  <p className="font-tech text-[10px] text-slate-400 uppercase font-bold tracking-widest">Sesiones Totales</p>
                  <p className="font-display font-black italic text-2xl text-kart-red leading-none">{adminData.length}</p>
                </div>
                <button 
                  onClick={() => setGameState('intro')}
                  className="kart-button bg-slate-100 text-black px-6 py-2 text-sm"
                >
                  VOLVER
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-8">
              {adminData.map((session: any) => {
                const totalAnswers = session.responses?.length || 0;
                const correctCount = session.responses?.filter((r: any) => r.isCorrect).length || 0;
                const incorrectCount = totalAnswers - correctCount;
                const successRate = totalAnswers > 0 ? (correctCount / totalAnswers) * 100 : 0;
                const failRate = totalAnswers > 0 ? (incorrectCount / totalAnswers) * 100 : 0;
                
                // Valuation logic (Bajo, Básico, Alto, Superior)
                const getValuation = (score: number) => {
                  if (score >= 90) return { label: 'SUPERIOR', color: 'bg-kart-green' };
                  if (score >= 75) return { label: 'ALTO', color: 'bg-kart-blue' };
                  if (score >= 60) return { label: 'BÁSICO', color: 'bg-kart-yellow text-slate-900 border-2 border-black' };
                  return { label: 'BAJO', color: 'bg-kart-red' };
                };
                const valuation = getValuation(session.totalScore || 0);

                return (
                  <div key={session.id} className="kart-card p-6 bg-white border-4 border-black relative overflow-hidden group">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                      {/* Left: User Info & Summary */}
                      <div className="lg:col-span-4 space-y-6">
                        <div className="flex items-start gap-4">
                          <div className="bg-slate-100 w-20 h-20 rounded-xl border-2 border-black overflow-hidden flex items-center justify-center p-1">
                            {(() => {
                              const char = CHARACTERS.find(c => c.id === session.selectedCharId);
                              return char ? (
                                <img src={char.image} alt={char.name} className="w-full h-full object-contain" />
                              ) : (
                                <User className="text-slate-400" size={32} />
                              );
                            })()}
                          </div>
                          <div>
                            <p className="font-display font-black italic text-2xl uppercase text-kart-red leading-none mb-2">{session.userName}</p>
                            <div className="flex items-center gap-2">
                              <GraduationCap size={16} className="text-slate-400" />
                              <p className="font-tech text-xs text-slate-500 uppercase font-bold tracking-widest">{session.userGrade}</p>
                            </div>
                            <div className="mt-3 flex items-center gap-4">
                              <div className={cn("px-3 py-1 rounded font-display font-black italic text-xs text-white shadow-[2px_2px_0px_#000]", valuation.color)}>
                                {valuation.label}
                              </div>
                              <div className="font-display font-black italic text-lg text-kart-blue">
                                {session.totalScore}%
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="bg-kart-green/10 p-3 rounded-lg border-2 border-kart-green/20 text-center">
                            <p className="font-tech text-[10px] uppercase text-kart-green font-bold mb-1">Aciertos</p>
                            <p className="font-display font-black italic text-xl text-kart-green">{successRate.toFixed(0)}%</p>
                          </div>
                          <div className="bg-kart-red/10 p-3 rounded-lg border-2 border-kart-red/20 text-center">
                            <p className="font-tech text-[10px] uppercase text-kart-red font-bold mb-1">Desaciertos</p>
                            <p className="font-display font-black italic text-xl text-kart-red">{failRate.toFixed(0)}%</p>
                          </div>
                        </div>
                        
                        <div className="bg-slate-50 p-4 rounded-xl border-2 border-black border-dashed">
                          <p className="font-tech text-[10px] uppercase text-slate-400 font-bold mb-2 tracking-widest">Actividad Reciente</p>
                          <div className="flex items-center gap-2 text-xs font-bold font-tech text-slate-600">
                            <Clock size={14} />
                            {session.lastActiveAt?.toDate().toLocaleString()}
                          </div>
                        </div>
                      </div>

                      {/* Right: Detailed Mission Responses */}
                      <div className="lg:col-span-8 flex flex-col">
                        <p className="font-display font-black italic text-lg uppercase text-slate-900 mb-4 border-b-2 border-slate-100 pb-2">Historial de Misiones</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                          {session.responses?.length > 0 ? session.responses.map((resp: any, idx: number) => {
                            const challenge = CHALLENGES.find(c => c.id === resp.challengeId);
                            return (
                              <div key={idx} className={cn(
                                "p-4 rounded-xl border-2 border-black flex items-start gap-4 transition-all hover:scale-[1.02]",
                                resp.isCorrect ? "bg-kart-green/5 border-kart-green" : "bg-kart-red/5 border-kart-red"
                              )}>
                                <div className={cn(
                                  "shrink-0 w-8 h-8 rounded-lg border-2 border-black flex items-center justify-center font-display font-black text-white italic shadow-[2px_2px_0px_#000]",
                                  resp.isCorrect ? "bg-kart-green" : "bg-kart-red"
                                )}>
                                  {resp.isCorrect ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
                                </div>
                                <div className="space-y-1">
                                  <p className="font-tech text-[10px] uppercase text-slate-400 font-bold leading-none">Misión #{resp.challengeId}</p>
                                  <p className="font-tech text-xs text-slate-700 leading-tight line-clamp-2 italic">{challenge?.question}</p>
                                  <div className="flex items-center gap-2 pt-1">
                                    <span className="font-tech text-[10px] uppercase text-slate-500 font-bold">Respuesta:</span>
                                    <span className={cn("font-display font-black italic text-sm", resp.isCorrect ? "text-kart-green" : "text-kart-red")}>
                                      {resp.answer}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            );
                          }) : (
                            <div className="col-span-full py-10 text-center text-slate-300 font-tech uppercase italic">
                              Aún no ha respondido misiones
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
              {adminData.length === 0 && (
                <div className="col-span-full py-20 text-center kart-card bg-slate-50 border-4 border-dashed border-slate-300">
                  <Activity className="mx-auto text-slate-300 mb-4" size={64} />
                  <p className="font-tech text-slate-400 font-bold uppercase">No hay sesiones activas por el momento.</p>
                </div>
              )}
            </div>
          </motion.div>
        )}

      </AnimatePresence>

      {/* Footer / Credits */}
      <footer className="max-w-6xl mx-auto mt-12 bg-white p-12 rounded-2xl border-4 border-black shadow-[8px_8px_0px_#000] text-center space-y-8 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-4 checkered-pattern opacity-20" />
        <div className="pt-8 space-y-6">
          <button 
            onClick={async () => {
              try {
                if (currentUser?.email === 'iejosefacampos2025@gmail.com') {
                  setGameState('admin');
                } else {
                  const user = await signInWithGoogle();
                  if (user?.email === 'iejosefacampos2025@gmail.com') {
                    setGameState('admin');
                  } else if (user) {
                    alert("Acceso Restringido: Solo el docente administrador puede ingresar.");
                  } else {
                    alert("No se pudo iniciar sesión. Por favor, asegúrate de abrir la aplicación EN UNA PESTAÑA NUEVA para que el navegador permita la ventana de inicio de sesión de Google.");
                  }
                }
              } catch (err) {
                console.error(err);
                alert("Error de conexión. Intenta abrir la app en una nueva pestaña.");
              }
            }}
            className="font-display font-black italic text-4xl text-kart-red uppercase tracking-tighter hover:scale-105 transition-transform"
          >
            Créditos del Proyecto
          </button>
          <div className="space-y-4 text-slate-700">
            <p className="font-display text-3xl italic text-black leading-none">Jorge Armando Jaramillo Bravo</p>
            <p className="font-tech font-bold text-lg text-slate-600 tracking-wide uppercase">Docente de la I.E Josefa Campos</p>
            <div className="flex flex-col gap-2 font-tech text-xs text-slate-500 mt-6 uppercase tracking-widest">
              <p className="bg-slate-50 border border-slate-200 py-1 px-3 rounded inline-block mx-auto">Lic. matemáticas y física (UdeA)</p>
              <p className="bg-slate-50 border border-slate-200 py-1 px-3 rounded inline-block mx-auto">Mag. Enseñanza de las ciencias exactas y naturales (UNAL)</p>
              <p className="bg-slate-50 border border-slate-200 py-1 px-3 rounded inline-block mx-auto">Doctorante en Educación (UTEL)</p>
            </div>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 w-full h-4 checkered-pattern opacity-20" />
      </footer>
    </div>
  );
}

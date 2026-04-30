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
  ArrowRight,
  Trash2
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
  orderBy,
  where,
  getDocs,
  getDoc,
  setDoc,
  limit,
  deleteDoc
} from 'firebase/firestore';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { 
  db, 
  auth, 
  signInWithGoogle, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut 
} from './lib/firebase';
import { cn } from './lib/utils';
import { LogOut, Mail, Lock, UserPlus, LogIn, School, Hash } from 'lucide-react';

type Mode = 'distance' | 'time' | 'velocity' | 'meeting';
type GameState = 'intro' | 'auth' | 'register' | 'login' | 'character_selection' | 'playing' | 'results' | 'admin';

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
  { id: 1, mode: 'distance', question: "Magno escapa a 40 m/s. Si tarda 5s en llegar a su base, ¿a qué distancia está?", options: ["150m", "200m", "250m", "300m"], correctAnswer: "200m", hint: "d = v * t", reward: 50 },
  { id: 2, mode: 'distance', question: "Un rayo láser viaja a 60 m/s durante 3s. ¿Qué distancia recorre?", options: ["120m", "150m", "180m", "200m"], correctAnswer: "180m", hint: "d = v * t", reward: 50 },
  { id: 3, mode: 'distance', question: "Vector usa su propulsor y va a 80 m/s por 4s. ¿Cuántos metros avanzó?", options: ["240m", "320m", "400m", "480m"], correctAnswer: "320m", hint: "d = v * t", reward: 50 },
  { id: 4, mode: 'velocity', question: "Recorres 600m en 15s. ¿A qué velocidad constante vas?", options: ["30 m/s", "35 m/s", "40 m/s", "50 m/s"], correctAnswer: "40 m/s", hint: "v = d / t", reward: 50 },
  { id: 5, mode: 'velocity', question: "Un destello recorre 1000m en 10s. ¿Cuál es su velocidad?", options: ["80 m/s", "90 m/s", "100 m/s", "110 m/s"], correctAnswer: "100 m/s", hint: "v = d / t", reward: 50 },
  { id: 6, mode: 'velocity', question: "Inercia recorre 450m en 9s. ¿A qué velocidad se mueve?", options: ["40 m/s", "45 m/s", "50 m/s", "55 m/s"], correctAnswer: "50 m/s", hint: "v = d / t", reward: 50 },
  { id: 7, mode: 'time', question: "La meta está a 1000m. Si vas a 50 m/s, ¿cuánto tiempo tardarás?", options: ["10s", "15s", "20s", "25s"], correctAnswer: "20s", hint: "t = d / v", reward: 50 },
  { id: 8, mode: 'time', question: "Cronos debe recorrer 1200m a 40 m/s. ¿En cuánto tiempo llega?", options: ["20s", "25s", "30s", "35s"], correctAnswer: "30s", hint: "t = d / v", reward: 50 },
  { id: 9, mode: 'time', question: "Una alarma sonará en 5s. Si estás a 250m, ¿a qué velocidad mínima debes huir?", options: ["40 m/s", "45 m/s", "50 m/s", "60 m/s"], correctAnswer: "50 m/s", hint: "v = d / t", reward: 50 },
  { id: 10, mode: 'meeting', question: "Vector (0m, 30m/s) y Magno (1000m, 20m/s) van al encuentro. ¿En qué tiempo se cruzan?", options: ["10s", "15s", "20s", "25s"], correctAnswer: "20s", hint: "t = D / (v1 + v2)", reward: 100 },
  { id: 11, mode: 'meeting', question: "En el encuentro anterior (t=20s, v1=30m/s), ¿a qué distancia desde el inicio de Vector se cruzan?", options: ["400m", "500m", "600m", "700m"], correctAnswer: "600m", hint: "d = v1 * t", reward: 100 },
  { id: 12, mode: 'meeting', question: "Vector (0m, 50m/s) persigue a Magno (200m, 30m/s). ¿Cuánto tiempo tarda en alcanzarlo?", options: ["5s", "10s", "15s", "20s"], correctAnswer: "10s", hint: "t = d_separacion / (v_rapido - v_lento)", reward: 100 },
];

export default function App() {
  const [gameState, setGameState] = useState<GameState>('intro');
  const [isPracticeMode, setIsPracticeMode] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [tutorialStep, setTutorialStep] = useState(0);
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

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [adminData, setAdminData] = useState<any[]>([]);
  const [adminSearch, setAdminSearch] = useState('');
  const [adminGradeFilter, setAdminGradeFilter] = useState('ALL');
  const [adminSortBy, setAdminSortBy] = useState<'date' | 'score'>('date');

  const filteredAdminData = useMemo(() => {
    let data = [...adminData];
    
    if (adminSearch) {
      data = data.filter(s => s.userName?.toLowerCase().includes(adminSearch.toLowerCase()));
    }
    
    if (adminGradeFilter !== 'ALL') {
      data = data.filter(s => s.userGrade === adminGradeFilter);
    }
    
    data.sort((a, b) => {
      if (adminSortBy === 'date') {
        return (b.lastActiveAt?.seconds || 0) - (a.lastActiveAt?.seconds || 0);
      }
      return (b.totalScore || 0) - (a.totalScore || 0);
    });
    
    return data;
  }, [adminData, adminSearch, adminGradeFilter, adminSortBy]);

  const uniqueGrades = useMemo(() => {
    const grades = new Set(adminData.map(s => s.userGrade).filter(Boolean));
    return Array.from(grades).sort();
  }, [adminData]);

  const adminStats = useMemo(() => {
    const stats = { superior: 0, alto: 0, basico: 0, bajo: 0 };
    adminData.forEach(s => {
      const score = s.totalScore || 0;
      if (score >= 90) stats.superior++;
      else if (score >= 75) stats.alto++;
      else if (score >= 60) stats.basico++;
      else stats.bajo++;
    });
    return stats;
  }, [adminData]);

  // Auth/Register form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [age, setAge] = useState('');
  const [institution, setInstitution] = useState('');
  const [authError, setAuthError] = useState('');
  const [isAuthLoading, setIsAuthLoading] = useState(false);

  useEffect(() => {
    return onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        // Fetch user profile
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          const profile = userDoc.data();
          setUserProfile(profile);
          setUserName(profile.fullName);
          setUserGrade(profile.grade);
          
          // Try to resume session
          const q = query(
            collection(db, 'sessions'), 
            where('userId', '==', user.uid),
            orderBy('lastActiveAt', 'desc'),
            limit(1)
          );
          const sessionSnap = await getDocs(q);
          if (!sessionSnap.empty) {
            const lastSession = sessionSnap.docs[0];
            const data = lastSession.data();
            setSessionId(lastSession.id);
            setCoins(data.coins || 0);
            setCurrentChallengeIdx(data.challengesCompleted || 0);
            if (data.selectedCharId) {
              const char = CHARACTERS.find(c => c.id === data.selectedCharId);
              if (char) setSelectedChar(char);
            }
          }
        }
      } else {
        setUserProfile(null);
        setSessionId(null);
        setCoins(0);
        setCurrentChallengeIdx(0);
      }
    });
  }, []);

  useEffect(() => {
    if (gameState === 'admin' && currentUser?.email === 'iejosefacampos2025@gmail.com') {
      const q = query(collection(db, 'sessions'), orderBy('lastActiveAt', 'desc'));
      return onSnapshot(q, async (snapshot) => {
        const sessionsPromises = snapshot.docs.map(async (d) => {
          const sessionData = { id: d.id, ...d.data() } as any;
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
        userId: currentUser?.uid || null,
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
      console.error(e);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setIsAuthLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // Save profile
      await setDoc(doc(db, 'users', user.uid), {
        fullName,
        email,
        age: parseInt(age),
        grade: userGrade,
        institution,
        createdAt: serverTimestamp()
      });
      
      setGameState('character_selection');
    } catch (err: any) {
      setAuthError(err.message);
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setIsAuthLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      setGameState('character_selection');
    } catch (err: any) {
      setAuthError(err.message);
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    setGameState('intro');
  };

  const resetSim = () => {
    setSimTime(0);
    setIsRunning(false);
    setHasCelebrated(false);
  };

  const handleInputChange = (field: 'v' | 't' | 'd', value: string) => {
    const val = Number(value);
    if (field === 'v') setVelocity(val);
    else if (field === 't') setTime(val);
    else if (field === 'd') setDistance(val);
    resetSim();
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
      await addDoc(collection(db, 'sessions', sessionId, 'responses'), {
        challengeId: CHALLENGES[currentChallengeIdx].id,
        answer: studentAnswer,
        isCorrect: correct,
        timestamp: serverTimestamp()
      });
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteSession = async (id: string, name: string) => {
    if (!window.confirm(`¿Estás seguro de que deseas eliminar el registro de "${name}"? Esta acción no se puede deshacer.`)) return;
    try {
      await deleteDoc(doc(db, 'sessions', id));
      // The onSnapshot in the admin section will automatically update the UI
      playSound('click');
    } catch (e) {
      console.error("Error al eliminar sesión:", e);
      alert("Error al intentar eliminar el registro.");
    }
  };

  const [mode, setMode] = useState<Mode>('distance');
  const [velocity, setVelocity] = useState<number>(30);
  const [time, setTime] = useState<number>(10);
  const [distance, setDistance] = useState<number>(300);
  const [v2, setV2] = useState<number>(20);
  const [dTotal, setDTotal] = useState<number>(1000);
  const [isChase, setIsChase] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [simTime, setSimTime] = useState(0);
  const [hasCelebrated, setHasCelebrated] = useState(false);
  const requestRef = useRef<number>(null);
  const lastUpdateTimeRef = useRef<number>(null);

  const calculatedValue = useMemo(() => {
    if (mode === 'distance') return velocity * time;
    if (mode === 'time') return velocity !== 0 ? distance / velocity : 0;
    if (mode === 'velocity') return time !== 0 ? distance / time : 0;
    if (mode === 'meeting') {
      const vDiff = isChase ? (velocity - v2) : (velocity + v2);
      return vDiff !== 0 ? dTotal / vDiff : 0;
    }
    return 0;
  }, [mode, velocity, time, distance, v2, dTotal, isChase]);

  const effV = mode === 'velocity' ? calculatedValue : velocity;
  const effT = mode === 'time' || mode === 'meeting' ? calculatedValue : time;
  const effD = mode === 'distance' ? calculatedValue : distance;

  useEffect(() => {
    const animate = (now: number) => {
      if (lastUpdateTimeRef.current !== null) {
        const deltaTime = (now - lastUpdateTimeRef.current) / 1000;
        setSimTime(prev => {
          const next = prev + deltaTime;
          const waitTime = (1600 + 130) / 10 / (effV || 1);
          if (!hasCelebrated && next >= (effT + waitTime)) {
            setHasCelebrated(true);
            triggerCelebration();
          }
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
    if (isRunning) requestRef.current = requestAnimationFrame(animate);
    else if (requestRef.current) cancelAnimationFrame(requestRef.current);
    return () => { if (requestRef.current) cancelAnimationFrame(requestRef.current); };
  }, [isRunning, effT, hasCelebrated, effV]);

  const triggerCelebration = () => {
    confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
    if (soundEnabled) playSound('success');
  };

  const playSound = (type: string) => {
    if (!soundEnabled) return;
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === 'success') {
        osc.type = 'square';
        osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
        osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.1); // A5
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
        osc.start();
        osc.stop(ctx.currentTime + 0.3);
      } else if (type === 'fail') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(220, ctx.currentTime); // A3
        osc.frequency.exponentialRampToValueAtTime(110, ctx.currentTime + 0.2); // A2
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
        osc.start();
        osc.stop(ctx.currentTime + 0.3);
      } else if (type === 'click') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        gain.gain.setValueAtTime(0.05, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
        osc.start();
        osc.stop(ctx.currentTime + 0.1);
      } else if (type === 'start') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(440, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.2);
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
        osc.start();
        osc.stop(ctx.currentTime + 0.2);
      }
    } catch (e) {
      console.warn("Audio error:", e);
    }
  };

  const handleAnswer = (answer: string) => {
    const challenge = CHALLENGES[currentChallengeIdx];
    const isCorrect = answer === challenge.correctAnswer;
    if (isCorrect) {
      setCoins(c => c + challenge.reward);
      setFeedback({ correct: true, message: "¡EXCELENTE! Has salvado un sector de la galaxia." });
      playSound('success');
      updateSession(coins + challenge.reward, true, answer);
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
      setSimTime(0); setIsRunning(false); setHasCelebrated(false);
    } else {
      setGameState('results');
    }
  };

  const graphData = useMemo(() => {
    const data = [];
    const maxT = Math.max(effT, 10);
    for (let i = 0; i <= 30; i++) {
       const t = (maxT / 30) * i;
       data.push({ time: t, distance: effV * t });
    }
    return data;
  }, [effV, effT]);

  return (
    <div className="min-h-screen bg-kart-sky p-4 font-sans selection:bg-kart-yellow">
      <AnimatePresence mode="wait">
        {/* INTRO SCREEN */}
        {gameState === 'intro' && (
          <motion.div key="intro" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="max-w-2xl mx-auto mt-20 p-12 bg-white border-4 border-black text-center space-y-8 shadow-[10px_10px_0px_#000]">
            <Star size={64} className="mx-auto text-kart-red font-black" />
            <h1 className="text-5xl font-display font-black italic uppercase text-kart-red">MRU HEROES</h1>
            <p className="font-tech text-slate-500 uppercase tracking-widest text-sm">Entrenamiento Galáctico de Física</p>
            
            {!currentUser ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button 
                  onClick={() => { setGameState('register'); playSound('click'); }} 
                  className="kart-button bg-kart-green text-white py-4 text-xl flex items-center justify-center gap-2"
                >
                  <UserPlus size={20} /> REGISTRARSE
                </button>
                <button 
                  onClick={() => { setGameState('login'); playSound('click'); }} 
                  className="kart-button bg-kart-blue text-white py-4 text-xl flex items-center justify-center gap-2"
                >
                  <LogIn size={20} /> INICIAR SESIÓN
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="font-display font-black italic text-2xl text-kart-blue uppercase">HOLA DE NUEVO, {userProfile?.fullName || userName}!</p>
                <button 
                  onClick={() => { setGameState('character_selection'); playSound('click'); }} 
                  className="kart-button w-full bg-kart-red text-white py-4 text-2xl"
                >
                  CONTINUAR MISIÓN
                </button>
                <button 
                  onClick={() => { handleLogout(); playSound('click'); }}
                  className="text-slate-400 font-tech text-xs uppercase hover:text-kart-red transition-colors flex items-center justify-center gap-2 mx-auto"
                >
                  <LogOut size={12} /> Cerrar Sesión
                </button>
              </div>
            )}
          </motion.div>
        )}

        {/* REGISTER SCREEN */}
        {gameState === 'register' && (
          <motion.div 
            key="register" 
            initial={{ opacity: 0, x: 100 }} 
            animate={{ opacity: 1, x: 0 }} 
            exit={{ opacity: 0, x: -100 }}
            className="max-w-xl mx-auto mt-10 p-8 bg-white/90 backdrop-blur-md border-4 border-black shadow-[10px_10px_0px_#000] space-y-6 relative overflow-hidden"
            style={{
              backgroundImage: 'url(https://i.postimg.cc/zBJfmTZ7/inercia2.png)',
              backgroundSize: '300px',
              backgroundPosition: 'bottom right',
              backgroundRepeat: 'no-repeat'
            }}
          >
            <div className="absolute top-0 left-0 w-full h-2 bg-kart-green" />
            <h2 className="text-4xl font-display font-black italic uppercase text-kart-green">Registro de Piloto</h2>
            <form onSubmit={handleRegister} className="space-y-4 relative z-10">
              <div className="space-y-2">
                <label className="text-[10px] font-tech font-black uppercase text-slate-500 flex items-center gap-1">
                  <User size={12} /> Nombre Completo
                </label>
                <input required value={fullName} onChange={e => setFullName(e.target.value)} className="w-full p-3 border-2 border-black font-tech" placeholder="Ej: Juan Pérez" />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-tech font-black uppercase text-slate-500 flex items-center gap-1">
                    <Mail size={12} /> Correo
                  </label>
                  <input required type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full p-3 border-2 border-black font-tech" placeholder="correo@ejemplo.com" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-tech font-black uppercase text-slate-500 flex items-center gap-1">
                    <Lock size={12} /> Contraseña
                  </label>
                  <input required type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full p-3 border-2 border-black font-tech" placeholder="******" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-tech font-black uppercase text-slate-500 flex items-center gap-1">
                    <Hash size={12} /> Edad
                  </label>
                  <input required type="number" value={age} onChange={e => setAge(e.target.value)} className="w-full p-3 border-2 border-black font-tech" placeholder="15" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-tech font-black uppercase text-slate-500 flex items-center gap-1">
                    <GraduationCap size={12} /> Grado
                  </label>
                  <input required value={userGrade} onChange={e => setUserGrade(e.target.value)} className="w-full p-3 border-2 border-black font-tech" placeholder="10° A" />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-tech font-black uppercase text-slate-500 flex items-center gap-1">
                  <School size={12} /> Institución Educativa
                </label>
                <input required value={institution} onChange={e => setInstitution(e.target.value)} className="w-full p-3 border-2 border-black font-tech" placeholder="I.E Josefa Campos" />
              </div>

              {authError && <p className="text-kart-red font-tech text-xs bg-kart-red/10 p-2 border border-kart-red uppercase">{authError}</p>}

              <div className="pt-4 flex items-center justify-between">
                <button onClick={() => { setGameState('intro'); playSound('click'); }} type="button" className="text-slate-400 font-tech text-xs uppercase font-bold hover:text-black">Volver</button>
                <button disabled={isAuthLoading} type="submit" onClick={() => playSound('click')} className="kart-button bg-kart-green text-white px-8 py-3 text-lg">
                  {isAuthLoading ? 'REGISTRANDO...' : '¡LISTO PARA VOLAR!'}
                </button>
              </div>
            </form>
          </motion.div>
        )}

        {/* LOGIN SCREEN */}
        {gameState === 'login' && (
          <motion.div 
            key="login" 
            initial={{ opacity: 0, x: -100 }} 
            animate={{ opacity: 1, x: 0 }} 
            exit={{ opacity: 0, x: 100 }}
            className="max-w-md mx-auto mt-20 p-10 bg-white border-4 border-black shadow-[10px_10px_0px_#000] space-y-6"
          >
            <h2 className="text-4xl font-display font-black italic uppercase text-kart-blue">ACCESO AL HANGAR</h2>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-tech font-black uppercase text-slate-500">Correo Electrónico</label>
                <input required type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full p-4 border-2 border-black font-tech" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-tech font-black uppercase text-slate-500">Contraseña</label>
                <input required type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full p-4 border-2 border-black font-tech" />
              </div>
              {authError && <p className="text-kart-red font-tech text-xs bg-kart-red/10 p-2 border border-kart-red uppercase">{authError}</p>}
              <div className="pt-4 flex flex-col gap-4">
                <button disabled={isAuthLoading} type="submit" onClick={() => playSound('click')} className="kart-button bg-kart-blue text-white py-4 text-xl">
                  {isAuthLoading ? 'ENTRANDO...' : 'INICIAR SESIÓN'}
                </button>
                <button onClick={() => { setGameState('intro'); playSound('click'); }} type="button" className="text-slate-400 font-tech text-xs uppercase font-bold text-center">Volver</button>
              </div>
            </form>
          </motion.div>
        )}

        {gameState === 'character_selection' && (
          <motion.div key="char" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-4xl mx-auto mt-10 space-y-10">
            <h2 className="text-center text-4xl font-display font-black italic uppercase text-kart-blue">Elige tu Piloto</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {CHARACTERS.map(char => (
                <button key={char.id} onClick={() => { setSelectedChar(char); playSound('click'); }} className={cn("p-4 border-4 border-black bg-white", selectedChar?.id === char.id && "bg-kart-yellow")}>
                  <img src={char.image} alt={char.name} className="w-full" />
                  <p className="font-display font-bold italic mt-2">{char.name}</p>
                </button>
              ))}
            </div>
            <button onClick={() => { startSession(); setGameState('playing'); playSound('start'); }} disabled={!selectedChar} className="kart-button mx-auto block bg-kart-green text-white px-20 py-4">GO!</button>
          </motion.div>
        )}

        {gameState === 'playing' && (
          <motion.div key="playing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-6xl mx-auto space-y-8">
            <div className="flex items-center justify-between bg-white p-4 border-4 border-black shadow-[6px_6px_0px_#000]">
               <div className="flex items-center gap-4">
                 <img src={selectedChar?.image} className="w-16 h-16 object-contain" />
                 <div>
                   <p className="font-display font-black italic text-xl uppercase leading-none">{userName}</p>
                   <p className="font-tech text-xs text-slate-400 uppercase">{userGrade} | {userProfile?.institution || 'PILOTO'}</p>
                 </div>
               </div>
               <div className="flex gap-4 items-center">
                 <button 
                  onClick={() => {
                    setShowTutorial(true);
                    setTutorialStep(0);
                    playSound('click');
                  }}
                  className="flex items-center gap-2 font-tech text-[10px] text-slate-400 hover:text-kart-blue uppercase transition-colors"
                >
                  <Info size={14} /> Tutorial
                </button>
                 <div className="bg-kart-yellow p-2 border-2 border-black font-tech font-bold flex items-center gap-2">
                    <Coins size={16} /> COINS: {coins}
                 </div>
                 <div className="flex items-center bg-slate-100 p-1 border-2 border-black">
                  <button 
                    onClick={() => { setIsPracticeMode(false); playSound('click'); }}
                    className={cn(
                      "px-3 py-1 text-[10px] font-black uppercase transition-all",
                      !isPracticeMode ? "bg-kart-red text-white" : "text-slate-400"
                    )}
                  >
                    Misión
                  </button>
                  <button 
                    onClick={() => { setIsPracticeMode(true); playSound('click'); }}
                    className={cn(
                      "px-3 py-1 text-[10px] font-black uppercase transition-all",
                      isPracticeMode ? "bg-kart-blue text-white" : "text-slate-400"
                    )}
                  >
                    Libre
                  </button>
                </div>
                  <button onClick={() => { setSoundEnabled(!soundEnabled); if (!soundEnabled) playSound('click'); }} className="p-2 border-2 border-black bg-white">
                    {soundEnabled ? <Zap className="text-kart-blue" /> : <Skull className="text-slate-400" />}
                  </button>
                  <button 
                  onClick={() => { handleLogout(); playSound('click'); }}
                  className="p-2 border-2 border-black bg-white hover:bg-kart-red hover:text-white transition-colors group"
                  title="Cerrar Sesión"
                >
                   <LogOut size={20} />
                 </button>
                 <button onClick={() => { setShowChallenge(true); playSound('click'); }} className="bg-kart-red text-white p-2 px-4 shadow-[3px_3px_0px_#000] border-2 border-black font-tech text-xs uppercase italic">MISIÓN</button>
               </div>
            </div>

            <section className="bg-white border-4 border-black p-8 relative overflow-hidden">
               <div className="relative h-[400px] border-4 border-black bg-slate-200 overflow-hidden" 
                    style={{ backgroundImage: 'url(https://i.postimg.cc/SKLKtD5d/background2.png)', backgroundSize: 'auto 100%' }}>
                  <motion.div style={{ x: simTime * -effV * 10, display: 'flex' }}>
                    <div style={{ minWidth: '1600px', height: '400px', backgroundImage: 'url(https://i.postimg.cc/SKLKtD5d/background2.png)' }} />
                    <div style={{ minWidth: '1200px', height: '400px', backgroundImage: 'url(https://i.postimg.cc/7L1LQmcn/background1.png)' }} />
                  </motion.div>
                  <img src={selectedChar?.image} className="absolute bottom-10 left-10 w-24 z-10" />
                  <div className="absolute top-10 left-1/2 -translate-x-1/2 bg-black text-white p-2 font-tech">T: {simTime.toFixed(1)}s | D: {(simTime * effV).toFixed(1)}m</div>
                  <div className="absolute left-10 bottom-10 flex gap-4">
                    <button onClick={() => { setIsRunning(!isRunning); playSound('click'); }} className="bg-kart-green p-4 border-4 border-black">{isRunning ? <Pause /> : <Play />}</button>
                    <button onClick={() => { setSimTime(0); setIsRunning(false); playSound('click'); }} className="bg-kart-red p-4 border-4 border-black"><RotateCcw /></button>
                  </div>
               </div>
            </section>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
               <div className={cn(
                  "md:col-span-1 p-6 space-y-6 bg-white border-4 border-black relative overflow-hidden",
                  tutorialStep === 1 && showTutorial && "ring-8 ring-kart-yellow z-[60]"
                )}>
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-display text-xs uppercase italic text-slate-400">Hangar de Ajustes</p>
                    {isPracticeMode && <span className="bg-kart-blue text-white text-[8px] px-2 py-0.5 rounded font-black italic">PRÁCTICA</span>}
                  </div>
                  
                  <div className="flex flex-wrap gap-2">
                    {(['distance', 'velocity', 'time', 'meeting'] as Mode[]).map(m => (
                      <button 
                        key={m}
                        onClick={() => { setMode(m); resetSim(); playSound('click'); }}
                        className={cn(
                          "px-2 py-1 rounded font-display text-[9px] uppercase border-2 border-black",
                          m === mode ? "bg-kart-red text-white" : "bg-white"
                        )}
                      >
                        {m === 'distance' ? 'Distancia' : m === 'velocity' ? 'Velocidad' : m === 'time' ? 'Tiempo' : 'Encuentro'}
                      </button>
                    ))}
                  </div>

                  <div className="space-y-4">
                    <div className={cn("space-y-1", mode === 'velocity' && !isPracticeMode && "opacity-50")}>
                      <div className="flex justify-between items-end">
                        <label className="text-[9px] font-tech font-black uppercase text-slate-500">Velocidad (v)</label>
                        <span className="text-lg font-display font-black italic text-kart-red leading-none">{velocity} m/s</span>
                      </div>
                      <input 
                        type="range" min="0" max="200" step="1" value={velocity} 
                        disabled={mode === 'velocity' && !isPracticeMode}
                        onChange={(e) => handleInputChange('v', e.target.value)} 
                        className="w-full accent-kart-red h-1.5"
                      />
                    </div>

                    <div className={cn("space-y-1", mode === 'time' && !isPracticeMode && "opacity-50")}>
                      <div className="flex justify-between items-end">
                        <label className="text-[9px] font-tech font-black uppercase text-slate-500">Tiempo (t)</label>
                        <span className="text-lg font-display font-black italic text-kart-blue leading-none">{time} s</span>
                      </div>
                      <input 
                        type="range" min="1" max="60" step="1" value={time} 
                        disabled={mode === 'time' && !isPracticeMode}
                        onChange={(e) => handleInputChange('t', e.target.value)} 
                        className="w-full accent-kart-blue h-1.5"
                      />
                    </div>

                    {(mode === 'velocity' || mode === 'time' || isPracticeMode) && (
                      <div className={cn("space-y-1", mode === 'distance' && !isPracticeMode && "opacity-50")}>
                        <div className="flex justify-between items-end">
                          <label className="text-[9px] font-tech font-black uppercase text-slate-500">Distancia (d)</label>
                          <span className="text-lg font-display font-black italic text-kart-green leading-none">{distance} m</span>
                        </div>
                        <input 
                          type="range" min="0" max="2000" step="10" value={distance} 
                          disabled={mode === 'distance' && !isPracticeMode}
                          onChange={(e) => handleInputChange('d', e.target.value)} 
                          className="w-full accent-kart-green h-1.5"
                        />
                      </div>
                    )}

                    <div className="bg-kart-yellow p-3 border-4 border-black text-center relative overflow-hidden">
                      <p className="text-[9px] font-tech uppercase mb-1">Resultado</p>
                      <p className="text-2xl font-display font-black italic leading-none">{calculatedValue.toFixed(1)}</p>
                    </div>
                  </div>
               </div>
               <div className={cn(
                  "md:col-span-2 p-6 bg-white border-4 border-black h-[300px]",
                  tutorialStep === 3 && showTutorial && "z-[60] ring-8 ring-kart-yellow"
                )}>
                 <ResponsiveContainer width="100%" height="100%">
                   <LineChart data={graphData}>
                     <CartesianGrid /> <XAxis dataKey="time" /> <YAxis /> <Tooltip /> <Line dataKey="distance" stroke="#43b02a" strokeWidth={4} dot={false} />
                   </LineChart>
                 </ResponsiveContainer>
               </div>
            </div>

            <AnimatePresence>
              {showTutorial && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/50 backdrop-blur-sm">
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="max-w-md w-full bg-white border-4 border-black p-8 shadow-[12px_12px_0px_#000] relative"
                  >
                    <button onClick={() => setShowTutorial(false)} className="absolute top-4 right-4"><XCircle /></button>
                    <div className="space-y-6 text-center">
                      <div className="w-16 h-16 bg-kart-red rounded-full flex items-center justify-center text-white font-display text-2xl border-4 border-black mx-auto">
                        {tutorialStep + 1}
                      </div>
                      <h3 className="text-2xl font-display font-black italic uppercase text-kart-red">Entrenamiento de Piloto</h3>
                      <div className="p-4 bg-slate-50 border-2 border-black font-tech text-base leading-relaxed italic">
                        {tutorialStep === 0 && "¡Bienvenido! En MRU Heroes dominarás la física para salvar planetas. El MRU describe objetos que se mueven a velocidad constante."}
                        {tutorialStep === 1 && "En el panel de ajustes eliges qué calcular: Distancia (d), Velocidad (v) o Tiempo (t). ¡Pruébalo ahora!"}
                        {tutorialStep === 2 && "En EXPLORACIÓN LIBRE, puedes mover todos los deslizadores para ver cómo cambian los resultados instantáneamente."}
                        {tutorialStep === 3 && "Observa la gráfica. Muestra la relación entre Posición y Tiempo. ¡Cuanto más inclinada la línea, mayor es la velocidad!"}
                        {tutorialStep === 4 && "¡Listo! Elige el modo MISIONES para ganar monedas y créditos completando desafíos de física reales."}
                      </div>
                      <div className="flex justify-between pt-4 border-t-2 border-slate-100">
                        <button disabled={tutorialStep === 0} onClick={() => { setTutorialStep(s => s - 1); playSound('click'); }} className="font-tech uppercase text-xs disabled:opacity-20">Atrás</button>
                        <div className="flex gap-1 items-center">
                          {[0, 1, 2, 3, 4].map(i => <div key={i} className={cn("w-2 h-2 rounded-full", tutorialStep === i ? "bg-kart-red" : "bg-slate-200")} />)}
                        </div>
                        {tutorialStep < 4 ? (
                          <button onClick={() => { setTutorialStep(s => s + 1); playSound('click'); }} className="bg-kart-blue text-white px-6 py-2 font-display italic text-xs border-2 border-black uppercase">Siguiente</button>
                        ) : (
                          <button onClick={() => { setShowTutorial(false); playSound('click'); }} className="bg-kart-green text-white px-6 py-2 font-display italic text-xs border-2 border-black uppercase">¡Empezar!</button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>

            {showChallenge && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
                <div className="bg-white border-4 border-black p-8 max-w-xl w-full text-center space-y-6">
                  <h2 className="text-3xl font-display italic font-black text-kart-red uppercase">Misión #{CHALLENGES[currentChallengeIdx].id}</h2>
                  <p className="text-xl font-bold">{CHALLENGES[currentChallengeIdx].question}</p>
                  <div className="grid grid-cols-2 gap-4">
                    {CHALLENGES[currentChallengeIdx].options.map(opt => <button key={opt} onClick={() => { handleAnswer(opt); playSound('click'); }} className="kart-button border-4 py-4 text-xl">{opt}</button>)}
                  </div>
                  {feedback && (
                    <div className={cn("p-4 font-black italic", feedback.correct ? "text-kart-green" : "text-kart-red")}>
                      {feedback.message} <button onClick={() => { nextChallenge(); playSound('click'); }} className="bg-black text-white px-6 py-1 ml-4 italic">NEXT</button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </motion.div>
        )}

        {gameState === 'results' && (
          <motion.div key="results" className="max-w-2xl mx-auto mt-20 p-12 bg-white border-4 border-black text-center space-y-8 shadow-[10px_10px_0px_#000]">
             <h2 className="text-4xl font-display font-black italic uppercase text-kart-blue">CARRERA FINALIZADA</h2>
             <div className="flex justify-center gap-10">
               <div className="p-6 bg-kart-yellow border-4 border-black"><p className="text-4xl font-black italic">{coins}</p><p className="text-xs uppercase font-tech">Coins</p></div>
             </div>
             <button onClick={() => window.location.reload()} className="kart-button bg-kart-red text-white py-4 px-10 text-xl font-black italic">REINTENTAR</button>
          </motion.div>
        )}

        {gameState === 'admin' && (
          <motion.div key="admin" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-7xl mx-auto mt-10 space-y-8 pb-20">
            {/* ADMIN HEADER */}
            <div className="bg-white p-8 border-4 border-black shadow-[8px_8px_0px_#000] space-y-6">
              <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                <div>
                  <h2 className="text-4xl font-display font-black italic uppercase text-kart-blue">Dashboard Docente</h2>
                  <p className="font-tech text-xs text-slate-400 uppercase">Seguimiento de Aprendizaje MRU</p>
                </div>
                <button 
                  onClick={() => setGameState('intro')} 
                  className="kart-button bg-slate-800 text-white px-8 py-2 text-sm italic uppercase"
                >
                  SALIR DEL PANEL
                </button>
              </div>

              {/* QUICK STATS */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: 'SUPERIOR (90-100)', count: adminStats.superior, color: 'text-kart-green', bg: 'bg-kart-green/5' },
                  { label: 'ALTO (75-89)', count: adminStats.alto, color: 'text-kart-blue', bg: 'bg-kart-blue/5' },
                  { label: 'BÁSICO (60-74)', count: adminStats.basico, color: 'text-slate-700', bg: 'bg-kart-yellow/10' },
                  { label: 'BAJO (0-59)', count: adminStats.bajo, color: 'text-kart-red', bg: 'bg-kart-red/5' },
                ].map((s, i) => (
                  <div key={i} className={cn("p-4 border-2 border-black rounded-lg text-center", s.bg)}>
                    <p className="text-[10px] font-tech font-black uppercase opacity-60 mb-1">{s.label}</p>
                    <p className={cn("text-3xl font-display font-black italic leading-none", s.color)}>{s.count}</p>
                    <p className="text-[10px] font-tech uppercase mt-1">Estudiantes</p>
                  </div>
                ))}
              </div>

              {/* FILTERS TOOLBAR */}
              <div className="flex flex-col lg:flex-row gap-4 pt-4 border-t-2 border-slate-100">
                <div className="flex-1 relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input 
                    type="text" 
                    placeholder="Buscar por nombre..." 
                    value={adminSearch}
                    onChange={(e) => setAdminSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border-2 border-black font-tech uppercase text-xs focus:ring-2 ring-kart-blue outline-none"
                  />
                </div>
                
                <div className="flex flex-wrap gap -2">
                  <button 
                    onClick={() => {
                      const headers = ['Estudiante', 'Grado', 'Institucion', 'Puntaje', 'Coins', 'Aciertos', 'Total Misiones', 'Ultima Actividad'];
                      const rows = filteredAdminData.map(s => [
                        s.userName,
                        s.userGrade,
                        s.institution || 'N/A',
                        `${s.totalScore}%`,
                        s.coins || 0,
                        s.responses?.filter((r: any) => r.isCorrect).length || 0,
                        s.responses?.length || 0,
                        s.lastActiveAt?.toDate().toLocaleString() || 'N/A'
                      ]);
                      const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
                      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                      const link = document.createElement("a");
                      const url = URL.createObjectURL(blob);
                      link.setAttribute("href", url);
                      link.setAttribute("download", `mru_heroes_reporte_${new Date().toLocaleDateString()}.csv`);
                      link.style.visibility = 'hidden';
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                    }}
                    className="p-3 border-2 border-dashed border-slate-300 font-tech text-[10px] uppercase hover:border-black flex items-center gap-2"
                  >
                    <Trophy size={14} /> Descargar Reporte CSV
                  </button>

                  <div className="relative group">
                    <GraduationCap className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
                    <select 
                      value={adminGradeFilter}
                      onChange={(e) => setAdminGradeFilter(e.target.value)}
                      className="pl-10 pr-8 py-3 border-2 border-black font-tech uppercase text-xs appearance-none bg-white cursor-pointer hover:bg-slate-50"
                    >
                      <option value="ALL">TODOS LOS GRADOS</option>
                      {uniqueGrades.map(g => <option key={g} value={g}>{g}</option>)}
                    </select>
                  </div>

                  <div className="relative group">
                    <TrendingUp className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
                    <select 
                      value={adminSortBy}
                      onChange={(e) => setAdminSortBy(e.target.value as 'date' | 'score')}
                      className="pl-10 pr-8 py-3 border-2 border-black font-tech uppercase text-xs appearance-none bg-white cursor-pointer hover:bg-slate-50"
                    >
                      <option value="date">RECIENTES PRIMERO</option>
                      <option value="score">MEJOR PUNTAJE</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* RESULTS LIST */}
            <div className="grid grid-cols-1 gap-6">
              {filteredAdminData.length === 0 ? (
                <div className="bg-white p-12 border-4 border-black text-center space-y-4">
                  <ShieldAlert size={48} className="mx-auto text-slate-300" />
                  <p className="font-display text-2xl italic text-slate-400 uppercase">Sin resultados para esta búsqueda</p>
                </div>
              ) : (
                filteredAdminData.map((session: any) => {
                  const totalAnswers = session.responses?.length || 0;
                  const correctCount = session.responses?.filter((r: any) => r.isCorrect).length || 0;
                  const incorrectCount = totalAnswers - correctCount;
                  const successRate = totalAnswers > 0 ? (correctCount / totalAnswers) * 100 : 0;
                  
                  const getValuation = (score: number) => {
                    if (score >= 90) return { label: 'SUPERIOR', color: 'bg-kart-green', text: 'text-kart-green' };
                    if (score >= 75) return { label: 'ALTO', color: 'bg-kart-blue', text: 'text-kart-blue' };
                    if (score >= 60) return { label: 'BÁSICO', color: 'bg-kart-yellow text-slate-900 border-2 border-black', text: 'text-slate-600' };
                    return { label: 'BAJO', color: 'bg-kart-red', text: 'text-kart-red' };
                  };
                  const val = getValuation(session.totalScore || 0);

                  return (
                    <motion.div 
                      key={session.id} 
                      layout
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-white border-4 border-black overflow-hidden hover:shadow-[12px_12px_0px_#000] transition-shadow"
                    >
                      <div className="grid grid-cols-1 lg:grid-cols-12 gap-0">
                        {/* LEFT PANEL: Student Profile */}
                        <div className="lg:col-span-4 p-6 border-b-4 lg:border-b-0 lg:border-r-4 border-black space-y-6">
                          <div className="flex gap-4">
                            <div className="w-20 h-20 bg-slate-100 border-2 border-black rounded-xl p-2 relative flex-shrink-0">
                              {(() => {
                                const char = CHARACTERS.find(c => c.id === session.selectedCharId);
                                return char ? (
                                  <img src={char.image} className="w-full h-full object-contain" alt={char.name} />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center bg-slate-200">
                                    <User className="text-slate-400" />
                                  </div>
                                );
                              })()}
                            </div>
                            <div className="min-w-0">
                              <h3 className="font-display font-black italic text-2xl text-black uppercase truncate leading-tight">
                                {session.userName}
                              </h3>
                              <p className="font-tech text-[10px] text-slate-500 uppercase tracking-widest mt-1">
                                {session.userGrade} | {session.institution || 'I.E Josefa Campos'}
                              </p>
                              <div className="mt-3 flex flex-wrap gap-2 items-center">
                                <span className={cn("px-2 py-0.5 text-[10px] text-white italic font-black rounded", val.color)}>
                                  {val.label}
                                </span>
                                <span className="font-display font-black italic text-kart-blue text-xl leading-none">
                                  {session.totalScore}%
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div className="bg-slate-50 p-3 border-2 border-black text-center">
                              <p className="text-[10px] font-black font-tech text-slate-500 uppercase">Aciertos</p>
                              <p className="text-2xl font-display font-black italic text-kart-green leading-none mt-1">
                                {correctCount}
                              </p>
                              <p className="text-[10px] font-tech text-slate-400 uppercase mt-1">de {totalAnswers}</p>
                            </div>
                            <div className="bg-slate-50 p-3 border-2 border-black text-center">
                              <p className="text-[10px] font-black font-tech text-slate-500 uppercase">Coins</p>
                              <p className="text-2xl font-display font-black italic text-kart-yellow leading-none mt-1">
                                {session.coins || 0}
                              </p>
                              <p className="text-[10px] font-tech text-slate-400 uppercase mt-1">Acumulados</p>
                            </div>
                          </div>

                          <div className="flex items-center justify-between">
                            <p className="text-[10px] font-tech text-slate-400 flex items-center gap-2 uppercase">
                              <Clock size={12} /> Última actividad: {session.lastActiveAt?.toDate().toLocaleString() || 'N/A'}
                            </p>
                            <button 
                              onClick={() => handleDeleteSession(session.id, session.userName)}
                              className="p-2 text-slate-300 hover:text-kart-red transition-colors"
                              title="Eliminar Registro"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>

                        {/* RIGHT PANEL: Detailed Responses */}
                        <div className="lg:col-span-8 p-6 flex flex-col">
                          <div className="flex items-center justify-between mb-4">
                            <h4 className="font-display font-black italic text-xl uppercase italic text-slate-400">Desglose de Misiones</h4>
                            <div className="text-[10px] font-tech text-slate-400 uppercase bg-slate-100 px-3 py-1 rounded-full">
                              Efectividad: {successRate.toFixed(1)}%
                            </div>
                          </div>
                          
                          <div className="flex-1 overflow-y-auto max-h-[300px] pr-2 custom-scrollbar">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              {session.responses && session.responses.length > 0 ? (
                                session.responses.map((r: any, idx: number) => {
                                  const challenge = CHALLENGES.find(c => c.id === r.challengeId);
                                  return (
                                    <div 
                                      key={idx} 
                                      className={cn(
                                        "p-3 border-2 border-black flex gap-3 text-xs italic font-tech relative group",
                                        r.isCorrect ? "bg-kart-green/5 border-kart-green/20" : "bg-kart-red/5 border-kart-red/20"
                                      )}
                                    >
                                      <div className="mt-1">
                                        {r.isCorrect 
                                          ? <CheckCircle2 className="text-kart-green" size={16} /> 
                                          : <XCircle className="text-kart-red" size={16} />
                                        }
                                      </div>
                                      <div className="min-w-0 flex-1">
                                        <p className="font-bold text-slate-700 leading-tight">
                                          Mission #{r.challengeId}: {challenge?.question.slice(0, 50)}...
                                        </p>
                                        <div className="mt-2 flex justify-between items-end">
                                          <p className="uppercase text-[9px] text-slate-400">
                                            Tu R: <span className={cn("font-black", r.isCorrect ? "text-kart-green" : "text-kart-red")}>
                                              {r.answer}
                                            </span>
                                          </p>
                                          {!r.isCorrect && (
                                            <p className="text-[8px] text-slate-400 italic">Correcta: {challenge?.correctAnswer}</p>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })
                              ) : (
                                <div className="col-span-full py-12 text-center border-2 border-dashed border-slate-200">
                                  <Activity size={24} className="mx-auto text-slate-200 mb-2" />
                                  <p className="text-[10px] font-tech uppercase text-slate-400">Sin respuestas aún</p>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <footer className="max-w-6xl mx-auto mt-20 mb-10 text-center space-y-4">
        <div className="flex flex-col items-center gap-3">
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
                    alert("Acceso Restringido: Solo el docente administrador puede ingresar al panel de monitoreo.");
                  }
                }
              } catch (err) {
                console.error(err);
                alert("Para acceder a la administración, abre la app en una nueva pestaña.");
              }
            }}
            className="font-display font-black italic text-xl text-kart-red uppercase tracking-tighter hover:opacity-70 transition-opacity"
          >
            Créditos del Proyecto
          </button>
          
          <div className="flex flex-col gap-1 font-tech text-[10px] text-slate-500 uppercase tracking-widest">
            <p className="font-bold flex items-center justify-center gap-2">
              <span>Jorge Armando Jaramillo Bravo</span>
              <span className="w-1 h-1 bg-slate-300 rounded-full" />
              <span>Docente I.E Josefa Campos</span>
            </p>
            <p className="opacity-50">Lic. matemáticas y física (UdeA) | Mag. Enseñanza (UNAL) | Doctorante en Educación (UTEL)</p>
            <p className="mt-2 text-slate-400 font-black italic">@Laboratorio virtual Josefa Campos</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

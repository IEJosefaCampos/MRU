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
  Trash2,
  UserX,
  UserPlus,
  Loader2,
  BookOpen,
  Rocket
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import 'katex/dist/katex.min.css';
import { InlineMath } from 'react-katex';
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
  deleteDoc,
  writeBatch,
  increment
} from 'firebase/firestore';
import { 
  onAuthStateChanged, 
  User as FirebaseUser,
  getAuth,
  createUserWithEmailAndPassword
} from 'firebase/auth';
import { 
  db, 
  auth, 
  signInWithGoogle, 
  signInWithEmailAndPassword, 
  signOut,
  firebaseConfig 
} from './lib/firebase';
import { initializeApp } from 'firebase/app';
import { cn } from './lib/utils';
import { LogOut, LogIn } from 'lucide-react';

type Mode = 'distance' | 'time' | 'velocity' | 'meeting' | 'overtaking';
type GameState = 'intro' | 'auth' | 'login' | 'grade_selection' | 'character_selection' | 'main_menu' | 'concepts' | 'formulas' | 'guided_examples' | 'challenges' | 'playing' | 'results' | 'admin';

interface Concept {
  id: string;
  title: string;
  definition: string;
  icon: React.ReactNode;
  color: string;
  formula?: string;
}

const CONCEPTS: Concept[] = [
  { id: 'posicion', title: 'Posición', definition: 'Lugar exacto en el espacio donde se encuentra un cuerpo respecto a un sistema de referencia.', icon: <Settings2 />, color: '#0072ce', formula: 'x = x_0 + v \\cdot t' },
  { id: 'trayectoria', title: 'Trayectoria', definition: 'Línea imaginaria que describe un móvil durante su movimiento.', icon: <Activity />, color: '#43b02a' },
  { id: 'distancia', title: 'Distancia Recorrida', definition: 'Longitud de la trayectoria. Es una magnitud escalar (siempre positiva).', icon: <MoveRight />, color: '#e60012', formula: 'd = v \\cdot t' },
  { id: 'desplazamiento', title: 'Desplazamiento', definition: 'Cambio de posición. Es un vector que une el punto inicial con el final.', icon: <ArrowRight />, color: '#f9d71c', formula: '\\Delta x = x_f - x_i' },
  { id: 'rapidez', title: 'Rapidez', definition: 'Relación entre la distancia recorrida y el tiempo empleado. Es una magnitud escalar (siempre positiva).', icon: <Zap />, color: '#e60012', formula: 'v = \\frac{d}{t}' },
  { id: 'velocidad', title: 'Velocidad', definition: 'Relación entre el desplazamiento y el tiempo empleado. Es una magnitud vectorial (incluye dirección).', icon: <Flame />, color: '#43b02a', formula: '\\vec{v} = \\frac{\\Delta x}{t}' },
  { id: 'aceleracion', title: 'Aceleración', definition: 'Variación de la velocidad en la unidad de tiempo.', icon: <TrendingUp />, color: '#0072ce', formula: 'a = \\frac{v_f - v_i}{t}' },
];

interface Formula {
  concept: string;
  formula: string;
  unit: string;
}

const FORMULAS: Formula[] = [
  { concept: 'Desplazamiento (Δx)', formula: '\\Delta x = x_f - x_i', unit: 'm (metros)' },
  { concept: 'Posición (x)', formula: 'x = x_0 + v \\cdot t', unit: 'm (metros)' },
  { concept: 'Distancia (d)', formula: 'd = v \\cdot t', unit: 'm (metros)' },
  { concept: 'Rapidez (v)', formula: 'v = \\frac{d}{t}', unit: 'm/s' },
  { concept: 'Velocidad (v)', formula: '\\vec{v} = \\frac{\\Delta x}{t}', unit: 'm/s' },
  { concept: 'Tiempo (t)', formula: 't = \\frac{d}{v}', unit: 's (segundos)' },
  { concept: 'Tiempo de Encuentro', formula: 't_e = \\frac{d}{v_1 + v_2}', unit: 's' },
  { concept: 'Tiempo de Alcance', formula: 't_a = \\frac{d}{v_1 - v_2}', unit: 's' },
  { concept: 'Aceleración (a)', formula: 'a = \\frac{v_f - v_i}{t}', unit: 'm/s^2' },
];

interface Challenge {
  id: number;
  mode: Mode;
  narrative: string;
  question: string;
  options: string[];
  correctAnswer: string;
  hint: string;
  reward: number;
  xp: number;
  initialValues: { v?: number; t?: number; d?: number; v2?: number; dTotal?: number; isChase?: boolean };
}

const GUIDED_EXAMPLES: Challenge[] = [
  { 
    id: 1, 
    mode: 'velocity', 
    narrative: "Tu personaje necesita recorrer 100m para entregar un mensaje urgente y debe llegar a la meta en exactamente 2 segundos.",
    question: "¿Cual será su velocidad necesaria?", 
    options: ["25 m/s", "50 m/s", "75 m/s", "100 m/s"], 
    correctAnswer: "50 m/s", 
    hint: "v = \\frac{d}{t}", 
    reward: 100,
    xp: 20,
    initialValues: { d: 100, t: 2 }
  },
  { 
    id: 2, 
    mode: 'distance', 
    narrative: "Una patrulla espacial viaja a 30 m/s durante 5 segundos patrullando el sector Josefa.",
    question: "¿Qué distancia logró recorrer?", 
    options: ["100m", "150m", "200m", "250m"], 
    correctAnswer: "150m", 
    hint: "d = v \\cdot t", 
    reward: 100,
    xp: 20,
    initialValues: { v: 30, t: 5 }
  },
  { 
    id: 3, 
    mode: 'time', 
    narrative: "Cronos detecta un portal a 240 m de distancia. Su velocidad máxima es de 40 m/s.",
    question: "¿En cuántos segundos llegará al portal?", 
    options: ["4s", "5s", "6s", "8s"], 
    correctAnswer: "6s", 
    hint: "t = \\frac{d}{v}", 
    reward: 100,
    xp: 20,
    initialValues: { d: 240, v: 40 }
  },
  { 
    id: 4, 
    mode: 'meeting', 
    narrative: "Dos pilotos, Vector (v₁=30 m/s) y Magno (v₂=20 m/s), se encuentran en extremos opuestos de una pista de 1500m y avanzan uno hacia el otro.",
    question: "¿En cuánto tiempo se encontrarán?", 
    options: ["20s", "30s", "40s", "50s"], 
    correctAnswer: "30s", 
    hint: "t_e = \\frac{D}{v_1 + v_2}", 
    reward: 150,
    xp: 30,
    initialValues: { dTotal: 1500, v: 30, v2: 20, isChase: false }
  },
  { 
    id: 5, 
    mode: 'meeting', 
    narrative: "Inercia persigue a un infractor. Ella va a 50 m/s y el infractor a 30 m/s. La distancia que los separa es de 200m.",
    question: "¿En cuánto tiempo logrará alcanzarlo?", 
    options: ["5s", "10s", "15s", "20s"], 
    correctAnswer: "10s", 
    hint: "t_a = \\frac{d_{separación}}{v_{rápido} - v_{lento}}", 
    reward: 150,
    xp: 30,
    initialValues: { dTotal: 200, v: 50, v2: 30, isChase: true }
  },
];

const CHALLENGES: Challenge[] = [
  { id: 1, mode: 'distance', narrative: "Misión 1: Escapa de la zona roja.", question: "Magno va a 40 m/s por 5s. ¿Distancia?", options: ["150m", "200m", "250m", "300m"], correctAnswer: "200m", hint: "d = v \\cdot t", reward: 200, xp: 50, initialValues: { v: 40, t: 5 } },
  { id: 2, mode: 'velocity', narrative: "Misión 2: Ajuste de propulsores.", question: "Recorres 600m en 15s. ¿Velocidad?", options: ["30 m/s", "40 m/s", "50 m/s", "60 m/s"], correctAnswer: "40 m/s", hint: "v = \\frac{d}{t}", reward: 200, xp: 50, initialValues: { d: 600, t: 15 } },
  { id: 3, mode: 'time', narrative: "Misión 3: Tiempo límite.", question: "Meta a 1000m, vas a 50 m/s. ¿Tiempo?", options: ["10s", "20s", "30s", "40s"], correctAnswer: "20s", hint: "t = \\frac{d}{v}", reward: 200, xp: 50, initialValues: { d: 1000, v: 50 } },
  { id: 4, mode: 'meeting', narrative: "Misión 4: Intersección.", question: "v1=30, v2=20, Distancia=1000m. ¿Tiempo encuentro?", options: ["10s", "20s", "25s", "30s"], correctAnswer: "20s", hint: "t_e = \\frac{D}{v_1 + v_2}", reward: 300, xp: 75, initialValues: { dTotal: 1000, v: 30, v2: 20, isChase: false } },
  { id: 5, mode: 'meeting', narrative: "Misión 5: Persecución.", question: "v1=50, v2=30, Distancia=400m. ¿Tiempo alcance?", options: ["10s", "15s", "20s", "25s"], correctAnswer: "20s", hint: "t_a = \\frac{d}{v_1 - v_2}", reward: 300, xp: 75, initialValues: { dTotal: 400, v: 50, v2: 30, isChase: true } },
  { id: 6, mode: 'distance', narrative: "Misión 6: Exploración profunda.", question: "v=15 m/s, t=40s. ¿Distancia?", options: ["400m", "500m", "600m", "700m"], correctAnswer: "600m", hint: "d = v \\cdot t", reward: 200, xp: 50, initialValues: { v: 15, t: 40 } },
  { id: 7, mode: 'velocity', narrative: "Misión 7: Rompe la barrera.", question: "d=2000m, t=50s. ¿Velocidad?", options: ["30 m/s", "40 m/s", "50 m/s", "60 m/s"], correctAnswer: "40 m/s", hint: "v = \\frac{d}{t}", reward: 200, xp: 50, initialValues: { d: 2000, t: 50 } },
  { id: 8, mode: 'time', narrative: "Misión 8: Retorno seguro.", question: "d=3000m, v=100 m/s. ¿Tiempo?", options: ["20s", "30s", "40s", "50s"], correctAnswer: "30s", hint: "t = \\frac{d}{v}", reward: 200, xp: 50, initialValues: { d: 3000, v: 100 } },
  { id: 9, mode: 'meeting', narrative: "Misión 9: Maniobra de acople.", question: "v1=60, v2=40, D=500m. ¿Tiempo encuentro?", options: ["5s", "10s", "15s", "20s"], correctAnswer: "5s", hint: "t_e = \\frac{D}{v_1 + v_2}", reward: 350, xp: 100, initialValues: { dTotal: 500, v: 60, v2: 40, isChase: false } },
  { id: 10, mode: 'meeting', narrative: "Misión 10: Alcance final.", question: "v1=80, v2=40, D=800m. ¿Tiempo alcance?", options: ["10s", "15s", "20s", "25s"], correctAnswer: "20s", hint: "t_a = \\frac{d}{v_1 - v_2}", reward: 400, xp: 150, initialValues: { dTotal: 800, v: 80, v2: 40, isChase: true } },
];
interface Character {
  id: string;
  name: string;
  image: string;
  color: string;
  description: string;
}

const CHARACTERS: Character[] = [
  { 
    id: 'vector', 
    name: 'VECTOR', 
    image: 'https://i.postimg.cc/cHsJqfy5/Vector2.png', 
    color: 'text-kart-red',
    description: 'La distancia más corta entre dos puntos es mi trayectoria'
  },
  { 
    id: 'inercia', 
    name: 'INERCIA', 
    image: 'https://i.postimg.cc/zBJfmTZ7/inercia2.png', 
    color: 'text-kart-green',
    description: 'Una vez que arranca, nadie la detiene. Es relajada pero persistente.'
  },
  { 
    id: 'cronos', 
    name: 'CRONOS', 
    image: 'https://i.postimg.cc/Dz3ZgtCm/cronos2.png', 
    color: 'text-kart-blue',
    description: 'Obsesionado con la exactitud. Calcula cada milisegundo de la carrera.'
  },
  { 
    id: 'magno', 
    name: 'MAGNO', 
    image: 'https://i.postimg.cc/50xtc8dR/magno2.png', 
    color: 'text-kart-yellow',
    description: 'Rudo pero bonachón. Su fuerza le permite mantener una velocidad constante sin desviarse por obstáculos menores.'
  }
];

const GRADES = ['10°1', '10°2', '10°3', '11°1', '11°2', '11°3', 'DOCENTE', 'OTRO'];


const App = () => {
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
  const [guestStats, setGuestStats] = useState<any>(null);

  const deleteUser = async (studentId: string, studentName: string) => {
    if (!studentId) {
      alert("Error: No se pudo identificar el ID del estudiante.");
      return;
    }

    const confirmMsg = `¡ALERTA DE SEGURIDAD!\n\n¿Estás seguro de que deseas eliminar permanentemente a "${studentName.toUpperCase()}"?\n\nEsta acción:\n1. Borrará su perfil de usuario.\n2. Borrará TODAS sus sesiones y misiones completadas.\n3. Es irreversible.\n\n¿Deseas continuar?`;
    
    if (!window.confirm(confirmMsg)) return;
    
    try {
      setIsAuthLoading(true); // Reuse loading state to show progress
      playSound('click');
      
      // 1. Delete all sessions for this specific user ID
      const sessionsRef = collection(db, 'sessions');
      const q = query(sessionsRef, where('userId', '==', studentId));
      const sessionSnap = await getDocs(q);
      
      const batch = writeBatch(db);
      
      // Add each session found to the batch
      sessionSnap.docs.forEach((d) => {
        batch.delete(d.ref);
      });
      
      // 2. Delete the user document in the users collection
      const userRef = doc(db, 'users', studentId);
      batch.delete(userRef);
      
      // Execute all deletions atomically
      await batch.commit();
      
      alert(`Éxito: El estudiante "${studentName}" y sus ${sessionSnap.size} registros han sido borrados.`);
    } catch (e: any) {
      console.error("Error al eliminar estudiante:", e);
      if (e.code === 'permission-denied') {
        alert("PERMISO DENEGADO: Solo el administrador principal puede realizar esta acción.");
      } else {
        alert(`ERROR CRÍTICO: ${e.message || 'No se pudo completar la operación'}`);
      }
    } finally {
      setIsAuthLoading(false);
    }
  };

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
    const grades = new Set(adminData.map(s => s.userGrade).filter(g => g && g !== '10°A'));
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

  // Auth form states
  const [authError, setAuthError] = useState('');
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [isGuest, setIsGuest] = useState(false);

  const [xp, setXp] = useState(0);
  const [showSlope, setShowSlope] = useState(false);
  const [showArea, setShowArea] = useState(false);
  const [activeTab, setActiveTab] = useState<'concepts' | 'formulas'>('concepts');

  const performanceRating = useMemo(() => {
    const score = (coins > 0 && currentChallengeIdx > 0) ? (coins / (currentChallengeIdx * 400)) * 100 : 0; // Rough estimate
    if (score >= 90) return { label: 'SUPERIOR', color: 'text-kart-green', bg: 'bg-kart-green' };
    if (score >= 75) return { label: 'ALTO', color: 'text-kart-blue', bg: 'bg-kart-blue' };
    if (score >= 60) return { label: 'BÁSICO', color: 'text-kart-yellow', bg: 'bg-kart-yellow' };
    return { label: 'BAJO', color: 'text-kart-red', bg: 'bg-kart-red' };
  }, [coins, currentChallengeIdx]);

  useEffect(() => {
    return onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        // Fetch or create user profile
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        let profile = userDoc.exists() ? userDoc.data() : null;
        
        if (!profile) {
          // Auto-create basic profile for Google users
          profile = {
            fullName: user.displayName || user.email?.split('@')[0] || 'PILOTO',
            email: user.email,
            grade: '', // Start empty to trigger selection
            institution: 'I.E. Josefa Campos',
            createdAt: serverTimestamp()
          };
          await setDoc(doc(db, 'users', user.uid), profile);
        }

        setUserProfile(profile);
        setUserName(profile.fullName);
        setUserGrade(profile.grade);

        // Redirect to grade selection if not set OR if it's the old invalid grade
        const isInvalidGrade = profile.grade === '10°A';
        if ((!profile.grade || isInvalidGrade) && gameState !== 'admin') {
          setGameState('grade_selection');
        }
        
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
          setXp(data.xp || 0);
          setCurrentChallengeIdx(data.challengesCompleted || 0);
          if (data.selectedCharId) {
            const char = CHARACTERS.find(c => c.id === data.selectedCharId);
            if (char) setSelectedChar(char);
          }
        }
      } else {
        setUserProfile(null);
        setSessionId(null);
        setCoins(0);
        setXp(0);
        setCurrentChallengeIdx(0);
      }
    });
  }, []);

  const startSession = async () => {
    if (isGuest) {
      setSessionId('guest-session-' + Date.now());
      try {
        const statsRef = doc(db, 'stats', 'visitors');
        await setDoc(statsRef, {
          count: increment(1),
          lastVisitorAt: serverTimestamp()
        }, { merge: true });
      } catch (e) {
        console.error("Error updating visitor count:", e);
      }
      return;
    }
    try {
      const docRef = await addDoc(collection(db, 'sessions'), {
        userId: currentUser?.uid || null,
        userName,
        userGrade,
        selectedCharId: selectedChar?.id,
        coins: 0,
        xp: 0,
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

  useEffect(() => {
    if (gameState === 'admin' && currentUser?.email === 'iejosefacampos2025@gmail.com') {
      const statsUnsub = onSnapshot(doc(db, 'stats', 'visitors'), (doc) => {
        if (doc.exists()) setGuestStats(doc.data());
      });

      const q = query(collection(db, 'sessions'), orderBy('lastActiveAt', 'desc'));
      const sessionsUnsub = onSnapshot(q, async (snapshot) => {
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

      return () => {
        statsUnsub();
        sessionsUnsub();
      };
    }
  }, [gameState, currentUser]);

  const updateSessionWithReward = async (reward: number, gainXp: number, correct: boolean, studentAnswer: string) => {
    if (isGuest) {
      // Update global guest stats instead of individual session
      try {
        const statsRef = doc(db, 'stats', 'visitors');
        await updateDoc(statsRef, {
          totalResponses: increment(1),
          totalCorrect: increment(correct ? 1 : 0),
          lastActiveAt: serverTimestamp()
        });
      } catch (e) {
        // Create document if it doesn't exist
        try {
          const statsRef = doc(db, 'stats', 'visitors');
          await setDoc(statsRef, {
            count: 1,
            totalResponses: 1,
            totalCorrect: correct ? 1 : 0,
            lastActiveAt: serverTimestamp()
          }, { merge: true });
        } catch (err) {
          console.error("Error updating guest stats:", err);
        }
      }
      setCoins(prev => prev + (correct ? 10 : 0)); // Symbolic in state
      return;
    }
    if (!sessionId) return;
    try {
      const sessionRef = doc(db, 'sessions', sessionId);
      const newCoins = coins + reward;
      const newXp = xp + gainXp;
      await updateDoc(sessionRef, {
        coins: newCoins,
        xp: newXp,
        challengesCompleted: currentChallengeIdx + 1,
        lastActiveAt: serverTimestamp(),
        totalScore: Math.round((newCoins / ((currentChallengeIdx + 1) * 200)) * 100) // Adjust base for scoring
      });
      const collName = gameState === 'guided_examples' ? 'guided_responses' : 'responses';
      await addDoc(collection(db, 'sessions', sessionId, collName), {
        challengeId: (gameState === 'guided_examples' ? GUIDED_EXAMPLES : CHALLENGES)[currentChallengeIdx].id,
        answer: studentAnswer,
        isCorrect: correct,
        timestamp: serverTimestamp()
      });
      setCoins(newCoins);
      setXp(newXp);
    } catch (e) {
      console.error(e);
    }
  };

  const selectCharacter = async (char: Character) => {
    setSelectedChar(char);
    playSound('characterSelect');
    if (isGuest) {
      setGameState('main_menu');
      return;
    }
    setGameState('main_menu');
    await startSession();
  };

  const saveGrade = async (grade: string) => {
    if (!currentUser) return;
    try {
      playSound('click');
      const userRef = doc(db, 'users', currentUser.uid);
      await updateDoc(userRef, { grade });
      setUserGrade(grade);
      setUserProfile((prev: any) => ({ ...prev, grade }));
      setGameState('character_selection');
    } catch (e) {
      console.error("Error saving grade:", e);
    }
  };

  const [currentNarrative, setCurrentNarrative] = useState('');
  const [showConceptDetails, setShowConceptDetails] = useState<Concept | null>(null);
  const [showHint, setShowHint] = useState(false);

  const startChallenge = (idx: number, isGuided: boolean) => {
    const challenge = isGuided ? GUIDED_EXAMPLES[idx] : CHALLENGES[idx];
    setCurrentChallengeIdx(idx);
    setGameState(isGuided ? 'guided_examples' : 'challenges');
    setMode(challenge.mode);
    if (challenge.initialValues) {
      if (challenge.initialValues.v !== undefined) setVelocity(challenge.initialValues.v);
      if (challenge.initialValues.t !== undefined) setTime(challenge.initialValues.t);
      if (challenge.initialValues.d !== undefined) setDistance(challenge.initialValues.d);
      if (challenge.initialValues.v2 !== undefined) setV2(challenge.initialValues.v2);
      if (challenge.initialValues.dTotal !== undefined) setDTotal(challenge.initialValues.dTotal);
      if (challenge.initialValues.isChase !== undefined) setIsChase(challenge.initialValues.isChase);
    }
    setCurrentNarrative(challenge.narrative);
    setSimTime(0);
    setIsRunning(false);
    setHasCelebrated(false);
    setShowHint(false); // Reset hint
    playSound('click');
  };

  const handleLogout = async () => {
    if (isGuest) {
      setIsGuest(false);
      setGameState('intro');
      setCurrentNarrative('');
      setFeedback(null);
      resetSim();
      return;
    }
    await signOut(auth);
    setGameState('intro');
    setCurrentNarrative('');
    setFeedback(null);
    resetSim();
  };

  const AppHeader = () => (
    <div className="flex items-center justify-between bg-white p-4 border-4 border-black shadow-[6px_6px_0px_#000] sticky top-0 z-50">
      <div className="flex items-center gap-4">
        <button onClick={() => { setGameState('main_menu'); setCurrentNarrative(''); setFeedback(null); resetSim(); }} className="hover:scale-110 transition-transform">
          <img src={selectedChar?.image || '/vector2.png'} className="w-16 h-16 object-contain" />
        </button>
        <div>
          <p className="font-display font-black italic text-xl uppercase leading-none">{userName}</p>
          <p className="font-tech text-[10px] text-slate-400 uppercase">{userGrade} | {userProfile?.institution || 'JOSÉFA CAMPOS'}</p>
          <div className="mt-1 w-32 h-2 bg-slate-200 border border-black overflow-hidden flex">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(100, (xp / 1000) * 100)}%` }}
              className="h-full bg-kart-green"
            />
          </div>
        </div>
      </div>
      <div className="flex gap-4 items-center">
        <div className="hidden md:flex flex-col items-center">
          <p className="text-[8px] font-tech uppercase text-slate-400">Desempeño</p>
          <p className={cn("font-display font-black italic text-lg leading-none", performanceRating.color)}>{performanceRating.label}</p>
        </div>
        <div className="bg-kart-yellow p-2 border-2 border-black font-tech font-bold flex items-center gap-2">
          <Coins size={16} /> <span className="text-sm">{coins}</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => { setSoundEnabled(!soundEnabled); if (!soundEnabled) playSound('click'); }} className="p-2 border-2 border-black bg-white transition-colors hover:bg-slate-50">
            {soundEnabled ? <Zap className="text-kart-blue" size={18} /> : <Skull className="text-slate-400" size={18} />}
          </button>
          <button onClick={() => { handleLogout(); playSound('click'); }} className="p-2 border-2 border-black bg-white hover:bg-kart-red hover:text-white transition-colors group">
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </div>
  );

  const MainMenuCard = ({ title, icon, onClick, color, description }: { title: string, icon: any, onClick: () => void, color: string, description: string }) => (
    <button 
      onClick={onClick}
      className={cn(
        "group p-6 border-4 border-black text-left space-y-4 transition-all hover:-translate-y-1 hover:shadow-[8px_8px_0px_#000] relative overflow-hidden",
        color === 'blue' ? "bg-kart-blue text-white" : color === 'green' ? "bg-kart-green text-white" : color === 'red' ? "bg-kart-red text-white" : "bg-kart-yellow text-black"
      )}
    >
      <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center border-2 border-black/10">
        {icon}
      </div>
      <div>
        <h3 className="font-display font-black italic text-2xl uppercase leading-tight">{title}</h3>
        <p className="font-tech text-xs opacity-80 uppercase leading-none mt-1">{description}</p>
      </div>
      <div className="absolute top-2 right-2 opacity-10 group-hover:opacity-20 transition-opacity">
        {icon}
      </div>
    </button>
  );

  const resetSim = () => {
    setSimTime(0);
    setRaceTime(0);
    setHasCrossedStart(false);
    setHasFinished(false);
    setIsRunning(false);
    setHasCelebrated(false);
  };

  const handleInputChange = (field: 'v' | 't' | 'd' | 'v2' | 'dt', value: string) => {
    const val = Number(value);
    if (field === 'v') setVelocity(val);
    else if (field === 't') setTime(val);
    else if (field === 'd') setDistance(val);
    else if (field === 'v2') setV2(val);
    else if (field === 'dt') setDTotal(val);
    resetSim();
  };

  const handleDeleteSession = async (id: string, name: string) => {
    if (!window.confirm(`¿Estás seguro de que deseas eliminar el registro de "${name}"? Esta acción no se puede deshacer.`)) return;
    try {
      await deleteDoc(doc(db, 'sessions', id));
      // The onSnapshot in the admin section will automatically update the UI
      playSound('click');
    } catch (e: any) {
      console.error("Error al eliminar sesión:", e);
      if (e.code === 'permission-denied') {
        alert("Permiso denegado. Asegúrate de estar usando el correo de administrador.");
      } else {
        alert(`Error al intentar eliminar el registro: ${e.message || 'Error desconocido'}`);
      }
    }
  };

  const [showCredits, setShowCredits] = useState(false);
  const [mode, setMode] = useState<Mode>('distance');
  const [velocity, setVelocity] = useState<number>(30);
  const [time, setTime] = useState<number>(10);
  const [distance, setDistance] = useState<number>(300);
  const [v2, setV2] = useState<number>(20);
  const [dTotal, setDTotal] = useState<number>(1000);
  const [isChase, setIsChase] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [simTime, setSimTime] = useState(0);
  const [raceTime, setRaceTime] = useState(0);
  const [hasCrossedStart, setHasCrossedStart] = useState(false);
  const [hasFinished, setHasFinished] = useState(false);
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
          
          if (next > 0 && !hasCrossedStart) setHasCrossedStart(true);

          // Celebration happens exactly when crossing the finish line
          if (!hasCelebrated && next >= effT && effT > 0) {
            setHasCelebrated(true);
            setHasFinished(true);
            triggerCelebration();
          }

          if (!hasFinished) {
            setRaceTime(next);
          }

          // Let simulation run past effT for crossing animation
          const animationStopTime = effT + (effV > 0 ? (200 / (effV * 10)) : 1.5);
          if (next >= animationStopTime && effT > 0) {
            setIsRunning(false);
            return animationStopTime;
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
  }, [isRunning, effT, hasCelebrated, hasCrossedStart, hasFinished]);

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

  const handleAnswer = async (answer: string) => {
    const list = gameState === 'guided_examples' ? GUIDED_EXAMPLES : CHALLENGES;
    const challenge = list[currentChallengeIdx];
    const isCorrect = answer === challenge.correctAnswer;
    
    if (isCorrect) {
      setFeedback({ correct: true, message: "¡BRUTAL! Has salvado un sector de la galaxia." });
      playSound('success');
      if (gameState === 'challenges') {
        const reward = challenge.reward;
        const gainXp = challenge.xp;
        await updateSessionWithReward(reward, gainXp, true, answer);
      } else {
        // Just visual feedback for guided examples
        setCoins(c => c + 10); // Symbolic reward
      }
    } else {
      setFeedback({ correct: false, message: "¡ERROR DE CÁLCULO! El sistema detecta una anomalía. ¡Inténtalo de nuevo!" });
      playSound('fail');
      if (gameState === 'challenges') {
        await updateSessionWithReward(0, 0, false, answer);
      }
    }
  };

  const nextChallenge = () => {
    setFeedback(null);
    const list = gameState === 'guided_examples' ? GUIDED_EXAMPLES : CHALLENGES;
    if (currentChallengeIdx < list.length - 1) {
      const nextIdx = currentChallengeIdx + 1;
      startChallenge(nextIdx, gameState === 'guided_examples');
    } else {
      if (gameState === 'guided_examples') {
        setGameState('main_menu');
        setCurrentNarrative('');
      } else {
        setGameState('results');
        setCurrentNarrative('');
        setFeedback(null);
      }
    }
  };

  const graphData = useMemo(() => {
    const data = [];
    const targetT = effT > 0 ? effT : 10;
    const maxT = targetT * 1.2; // Show slightly more than the event time
    const steps = 60;
    
    for (let i = 0; i <= steps; i++) {
       const t = (maxT / steps) * i;
       const d1 = effV * t;
       const v1 = effV;
       let point: any = { time: t.toFixed(1), distance: Number(d1.toFixed(1)), vel: v1 };
       
       if (mode === 'meeting' || mode === 'overtaking') {
         const d2 = isChase ? (dTotal + v2 * t) : (dTotal - v2 * t);
         point.distance2 = Number(d2.toFixed(1));
         point.vel2 = v2;
       }
       data.push(point);
    }
    return data;
  }, [effV, v2, dTotal, mode, effT, isChase]);

  return (
    <div className="min-h-screen bg-kart-sky p-4 font-sans selection:bg-kart-yellow overflow-x-hidden">
      <main className="container mx-auto px-4 py-8 relative z-10 min-h-[calc(100vh-80px)]">
        {(['main_menu', 'concepts', 'formulas', 'guided_examples', 'challenges', 'playing', 'results'].includes(gameState)) && <AppHeader />}
        <AnimatePresence mode="wait">
        {gameState === 'intro' && (
          <motion.div key="intro" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="max-w-4xl mx-auto text-center space-y-12 mt-20">
            <div className="relative inline-block">
              <motion.h1 
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                className="text-8xl font-display font-black italic text-kart-red uppercase tracking-tighter drop-shadow-[8px_8px_0px_#000] rotate-[-2deg]"
              >
                MRU HEROES
              </motion.h1>
              <div className="absolute -top-6 -right-6 bg-kart-yellow text-black px-4 py-1 font-tech font-bold border-4 border-black rotate-[15deg]">V2.0</div>
            </div>
            
            <p className="font-tech text-xl text-slate-600 uppercase max-w-2xl mx-auto border-y-4 border-black py-4">
              Domina la cinemática, salva la galaxia. El simulador de física definitivo de la I.E. Josefa Campos.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto">
              {currentUser ? (
                <div className="flex flex-col gap-4 col-span-full">
                  <button 
                    onClick={() => { playSound('click'); setGameState('main_menu'); }}
                    className="kart-button bg-kart-green text-white py-6 text-xl flex items-center justify-center gap-4 group border-4 border-black"
                  >
                    <ArrowRight />
                    CONTINUAR COMO {userName}
                  </button>
                  <button 
                    onClick={() => { playSound('click'); handleLogout(); }}
                    className="font-tech text-xs text-slate-400 hover:text-kart-red transition-colors uppercase"
                  >
                    Cerrar sesión o cambiar de cuenta
                  </button>
                </div>
              ) : (
                <button 
                  onClick={() => { playSound('click'); signInWithGoogle(); }}
                  disabled={isAuthLoading}
                  className="kart-button bg-kart-blue text-white py-6 text-xl flex items-center justify-center gap-4 group"
                >
                  {isAuthLoading ? <Loader2 className="animate-spin" /> : <LogIn />}
                  ENTRAR CON GOOGLE
                </button>
              )}
              <button 
                onClick={() => { playSound('click'); setIsGuest(true); setGameState('character_selection'); }}
                className="kart-button bg-white text-black py-6 text-xl flex items-center justify-center gap-4 border-4 border-black"
              >
                <User /> VER COMO VISITANTE
              </button>
            </div>
          </motion.div>
        )}

        {gameState === 'grade_selection' && (
          <motion.div key="grades" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="max-w-2xl mx-auto space-y-12 mt-10">
            <div className="text-center space-y-4">
              <h2 className="text-5xl font-display font-black italic uppercase text-kart-blue">Configura tu Perfil</h2>
              <p className="font-tech text-slate-500 uppercase tracking-widest leading-relaxed">Selecciona tu grado para registrar tu progreso en el Dashboard docente.</p>
              <div className="bg-kart-yellow/20 p-4 border-2 border-kart-yellow border-dashed text-kart-yellow font-tech text-[10px] uppercase font-bold">
                * Esta elección es única y no podrá cambiarse después.
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {GRADES.map((grade) => (
                <button
                  key={grade}
                  onClick={() => saveGrade(grade)}
                  className="group relative bg-white border-4 border-black p-6 shadow-[6px_6px_0px_#000] hover:shadow-[10px_10px_0px_#000] hover:-translate-y-1 transition-all flex flex-col items-center justify-center text-center gap-2"
                >
                  <GraduationCap className="text-slate-200 group-hover:text-kart-blue transition-colors" size={32} />
                  <span className="font-display font-black italic text-xl uppercase leading-none">{grade}</span>
                </button>
              ))}
            </div>
            
            <div className="text-center">
               <button onClick={handleLogout} className="font-tech text-[10px] text-slate-400 hover:text-kart-red uppercase transition-colors">Cancelar e Iniciar Sesión con otra cuenta</button>
            </div>
          </motion.div>
        )}

        {gameState === 'character_selection' && (
          <motion.div key="chars" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-6xl mx-auto space-y-12">
            <div className="text-center space-y-4">
              <h2 className="text-5xl font-display font-black italic uppercase text-kart-blue">Elige tu Piloto</h2>
              <p className="font-tech text-slate-500 uppercase tracking-widest">Cada héroe domina una dimensión de la cinemática</p>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
              {CHARACTERS.map((char) => (
                <motion.button
                  key={char.id}
                  whileHover={{ scale: 1.05, translateY: -10 }}
                  onClick={() => selectCharacter(char)}
                  className="group relative bg-white border-4 border-black p-8 shadow-[8px_8px_0px_#000] hover:shadow-[12px_12px_0px_#000] transition-all flex flex-col items-center text-center space-y-4"
                >
                  <div className={cn("absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity", char.color.replace('text-', 'bg-'))}></div>
                  <img src={char.image} alt={char.name} className="w-40 h-40 object-contain z-10" />
                  <h3 className="text-2xl font-display font-black italic uppercase group-hover:text-kart-red transition-colors">{char.name}</h3>
                  <p className="font-tech text-xs text-slate-400 leading-relaxed uppercase">{char.description}</p>
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}

        {gameState === 'main_menu' && (
          <motion.div key="menu" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="max-w-6xl mx-auto space-y-12 mt-10">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <MainMenuCard 
                title="Conceptos Básicos" 
                icon={<BookOpen size={32} />} 
                description="Aprende sobre posición, velocidad y más"
                color="blue"
                onClick={() => { setGameState('concepts'); playSound('click'); }}
              />
              <MainMenuCard 
                title="Fórmulas y Unidades" 
                icon={<Settings2 size={32} />} 
                description="Tu manual de herramientas físicas"
                color="green"
                onClick={() => { setGameState('formulas'); playSound('click'); }}
              />
              <MainMenuCard 
                title="Ejemplos Guiados" 
                icon={<Rocket size={32} />} 
                description="Simulaciones paso a paso"
                color="yellow"
                onClick={() => { setGameState('guided_examples'); playSound('click'); }}
              />
              <MainMenuCard 
                title="Retos del Sistema" 
                icon={<Trophy size={32} />} 
                description="Demuestra tu dominio y gana coins"
                color="red"
                onClick={() => { setGameState('challenges'); playSound('click'); }}
              />
            </div>
            
            <div className="bg-slate-100 border-4 border-black p-8 text-center space-y-4">
              <h3 className="font-display font-black italic text-2xl uppercase">Simulador Libre</h3>
              <p className="font-tech text-sm text-slate-500 uppercase">Experimenta sin límites con las leyes del MRU</p>
              <button 
                onClick={() => { setGameState('playing'); setMode('distance'); setIsPracticeMode(true); playSound('click'); }}
                className="kart-button bg-black text-white px-12 py-3 text-lg italic uppercase"
              >
                Activar Laboratorio
              </button>
            </div>
          </motion.div>
        )}

        {gameState === 'concepts' && (
          <motion.div key="concepts" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-6xl mx-auto space-y-8">
             <div className="flex items-center gap-4 mb-8">
               <button onClick={() => setGameState('main_menu')} className="p-2 border-2 border-black hover:bg-slate-100 transition-colors"><ArrowRight className="rotate-180" /></button>
               <h2 className="text-4xl font-display font-black italic uppercase">Conceptos Cinemática</h2>
             </div>
             
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
               {CONCEPTS.map(c => (
                 <div key={c.id} className="bg-white border-4 border-black p-6 shadow-[6px_6px_0px_#000] space-y-4">
                   <div className="flex items-center gap-4">
                     <div className="p-3 bg-slate-100 border-2 border-black" style={{ color: c.color }}>{c.icon}</div>
                     <h3 className="font-display font-black italic text-xl uppercase leading-none">{c.title}</h3>
                   </div>
                   <p className="font-tech text-sm leading-relaxed text-slate-600 uppercase">{c.definition}</p>
                    {c.formula && (
                      <div className="mt-4 pt-4 border-t border-slate-100 flex justify-center scale-110">
                        <div className="bg-slate-50 px-6 py-2 border-2 border-black/5 rounded-lg shadow-inner">
                          <InlineMath math={c.formula} />
                        </div>
                      </div>
                    )}
                 </div>
               ))}
             </div>
          </motion.div>
        )}

        {gameState === 'formulas' && (
          <motion.div key="formulas" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-4xl mx-auto space-y-8">
             <div className="flex items-center gap-4 mb-8">
               <button onClick={() => setGameState('main_menu')} className="p-2 border-2 border-black hover:bg-slate-100 transition-colors"><ArrowRight className="rotate-180" /></button>
               <h2 className="text-4xl font-display font-black italic uppercase">Fórmulas y Unidades</h2>
             </div>

             <div className="bg-white border-4 border-black shadow-[8px_8px_0px_#000] overflow-hidden">
               <table className="w-full text-left font-tech">
                 <thead className="bg-black text-white uppercase text-xs">
                   <tr>
                     <th className="p-4">Concepto</th>
                     <th className="p-4">Fórmula Principal</th>
                     <th className="p-4">Unidad (S.I.)</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y-2 divide-slate-100 uppercase text-sm">
                   {FORMULAS.map((f, i) => (
                     <tr key={i} className="hover:bg-slate-50 transition-colors">
                       <td className="p-4 font-bold">{f.concept}</td>
                       <td className="p-4 text-kart-red font-black text-xl"><InlineMath math={f.formula} /></td>
                       <td className="p-4 text-slate-500 font-bold">{f.unit}</td>
                     </tr>
                   ))}
                 </tbody>
               </table>
             </div>
          </motion.div>
        )}

        {(gameState === 'guided_examples' || gameState === 'challenges') && !currentNarrative && (
          <motion.div key="lists" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-4xl mx-auto space-y-8 mt-10">
             <div className="flex items-center gap-4 mb-8">
               <button onClick={() => setGameState('main_menu')} className="p-2 border-2 border-black hover:bg-slate-100 transition-colors"><ArrowRight className="rotate-180" /></button>
               <h2 className="text-4xl font-display font-black italic uppercase">
                 {gameState === 'guided_examples' ? 'Entrenamiento' : 'Misiones Galácticas'}
               </h2>
             </div>

             <div className="space-y-4">
               {(gameState === 'guided_examples' ? GUIDED_EXAMPLES : CHALLENGES).map((c, i) => (
                 <button 
                  key={c.id} 
                  disabled={gameState === 'challenges' && i > currentChallengeIdx}
                  onClick={() => startChallenge(i, gameState === 'guided_examples')}
                  className={cn(
                    "w-full bg-white border-4 border-black p-6 flex justify-between items-center transition-all shadow-[6px_6px_0px_#000] hover:shadow-[10px_10px_0px_#000] hover:-translate-y-1",
                    gameState === 'challenges' && i > currentChallengeIdx && "opacity-40 grayscale pointer-events-none"
                  )}
                 >
                   <div className="flex items-center gap-6">
                     <div className="w-12 h-12 bg-black text-white rounded-full flex items-center justify-center font-display italic text-2xl border-2 border-white">
                       {i + 1}
                     </div>
                     <div className="text-left">
                       <h4 className="font-display font-black italic text-xl uppercase leading-none">{gameState === 'guided_examples' ? `Entrenamiento ${i+1}` : `Misión ${i+1}`}</h4>
                       <p className="font-tech text-xs text-slate-400 uppercase mt-1">Modo: {c.mode}</p>
                     </div>
                   </div>
                   <div className="flex gap-4 items-center">
                     <span className="font-tech font-bold text-kart-yellow text-sm flex items-center gap-1"><Coins size={14} /> {c.reward}</span>
                     {i < (gameState === 'challenges' ? currentChallengeIdx : GUIDED_EXAMPLES.length) ? <CheckCircle2 className="text-kart-green" /> : <Play className="text-kart-red" />}
                   </div>
                 </button>
               ))}
             </div>
          </motion.div>
        )}

        {(['playing', 'guided_examples', 'challenges'].includes(gameState)) && (gameState === 'playing' || currentNarrative) && (
          <motion.div key="playing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-6xl mx-auto space-y-8 mt-10 pb-20">
            <section className="bg-white border-4 border-black p-6 relative overflow-hidden shadow-[8px_8px_0px_#000]">
               {currentNarrative && (
                 <div className="mb-6 p-4 bg-slate-900 text-white font-tech italic text-sm border-l-8 border-kart-red animate-pulse flex items-center gap-3">
                    <div className="w-2 h-2 bg-kart-red rounded-full animate-ping" />
                    SYSTEM LOG: {currentNarrative}
                  </div>
                )}

               <div className="relative h-[300px] border-4 border-black bg-slate-100 overflow-hidden">
                  {/* SKY (Static Background) */}
                  <div className="absolute inset-0 z-0">
                    <img src="/background1.png" className="w-full h-full object-cover opacity-30" alt="" />
                  </div>

                  {/* FLOATING DIGITAL TIMER (Top Center) */}
                  <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center pointer-events-none">
                    <div className="bg-black/90 border-2 border-kart-red px-6 py-2 rounded shadow-[0_0_20px_rgba(255,30,86,0.5)] flex flex-col items-center min-w-[280px]">
                      <div className="w-full flex justify-between items-center mb-1 px-1">
                        <p className="text-[10px] text-kart-red font-tech uppercase tracking-widest animate-pulse">
                          {hasFinished ? 'CRONÓMETRO FINAL' : 'CRONÓMETRO EN VIVO'}
                        </p>
                        <div className="h-1.5 w-1.5 bg-kart-red rounded-full animate-ping" />
                      </div>
                      
                      <div className="flex flex-col items-center gap-1">
                        <p className="text-4xl font-tech text-white tabular-nums drop-shadow-[0_0_10px_#fff]">
                          {(() => {
                            const t = raceTime;
                            const mins = Math.floor(t / 60).toString().padStart(2, '0');
                            const secs = Math.floor(t % 60).toString().padStart(2, '0');
                            const ms = Math.floor((t % 1) * 100).toString().padStart(2, '0');
                            return `${mins}:${secs}:${ms}`;
                          })()}
                        </p>
                        <div className="w-full h-[1px] bg-white/20 my-1" />
                        <p className="text-xl font-tech text-kart-red tabular-nums tracking-wider">
                          DISTANCIA: {(effV * raceTime).toFixed(2)}m
                        </p>
                      </div>
                    </div>
                  </div>

                   <div className="absolute inset-0">
                    {/* BACKGROUNDS LAYER */}
                    <motion.div 
                      className="absolute inset-y-0 h-full"
                      animate={{ x: -(simTime * effV * 10) }}
                      transition={{ ease: "linear", duration: 0 }}
                      style={{ left: '40px', zIndex: 10 }}
                    >
                      {/* Background Segment 1: START */}
                      <div className="absolute inset-y-0 left-0 h-full w-[1600px]">
                        <img src="/background1.png" className="w-full h-full object-fill pointer-events-none" />
                      </div>

                      {/* Background Filler 2 loop */}
                      {(() => {
                        const targetPos = effD * 10;
                        const fillerNeeded = Math.ceil(targetPos / 1600) + 1;
                        return Array.from({ length: fillerNeeded }).map((_, i) => (
                          <div key={`bg-fill-${i}`} className="absolute inset-y-0 h-full w-[1604px]" style={{ left: `${(i+1)*1600}px` }}>
                            <img src="/background2.png" className="w-full h-full object-fill pointer-events-none" />
                          </div>
                        ));
                      })()}

                      {/* Background Segment Finish: 3 */}
                      <div className="absolute inset-y-0 w-[1600px] h-full" style={{ left: `${effD * 10}px` }}>
                        <img src="/background3.png" className="w-full h-full object-fill pointer-events-none" />
                      </div>
                    </motion.div>

                    {/* MOBILES LAYER (In middle) */}
                    <div className="absolute inset-0 z-40 pointer-events-none">
                      <img src={selectedChar?.image || 'https://i.postimg.cc/cHsJqfy5/Vector2.png'} className="absolute bottom-6 left-10 w-28 drop-shadow-lg pointer-events-auto" />
                      
                      {(mode === 'meeting' || mode === 'overtaking') && (
                        <motion.img 
                          src="https://i.postimg.cc/50xtc8dR/magno2.png" 
                          className="absolute bottom-6 w-40 grayscale opacity-80 pointer-events-auto"
                          animate={{ 
                            left: isChase 
                              ? `${10 + (80 * (dTotal + (v2 - effV) * simTime) / (dTotal || 1))}%`
                              : `${10 + (80 * (dTotal - (effV + v2) * simTime) / (dTotal || 1))}%`
                          }}
                        />
                      )}
                    </div>

                    {/* FOREGROUNDS LAYER (On top) */}
                    <motion.div 
                      className="absolute inset-y-0 h-full"
                      animate={{ x: -(simTime * effV * 10) }}
                      transition={{ ease: "linear", duration: 0 }}
                      style={{ left: '40px', zIndex: 50 }}
                    >
                      {/* Foreground Segment 1: START */}
                      <div className="absolute inset-y-0 left-0 h-full w-[1600px] pointer-events-none">
                        <img src="/foreground1.png" className="w-full h-full object-fill" />
                        <div className="absolute top-[18.2%] left-[72%] w-[19.5%] h-[9%] flex items-center justify-center -rotate-1">
                            <div className="bg-black w-full h-[60%] flex items-center justify-center border border-kart-red/30">
                              <p className="text-kart-red font-tech text-[14px]">LEVEL 1: MRU</p>
                            </div>
                        </div>
                        <div className="absolute top-[40%] right-[3%] bg-black/80 border border-white/20 p-2 text-white font-tech text-[8px] uppercase">
                          DATOS DE CARRERA
                        </div>
                      </div>

                      {/* Foreground Segment Finish: 3 */}
                      <div className="absolute inset-y-0 w-[1600px] h-full pointer-events-none" style={{ left: `${effD * 10}px` }}>
                        <img src="/foreground3.png" className="w-full h-full object-fill" />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="absolute top-[18.2%] left-[72%] w-[19.5%] h-[9%] flex items-center justify-center -rotate-1">
                            <div className="bg-black w-full h-[60%] flex items-center justify-center border border-green-500/30">
                              <p className="text-green-500 font-tech text-[11px] text-center leading-none">¡LLEGADA! FIN DEL NIVEL 1: MRU</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  </div>

                  {/* FOREGROUND LAYER */}
                  <motion.div 
                    className="absolute inset-0 flex z-30 pointer-events-none"
                    animate={{ x: (simTime * -effV * 20) % 1600 }}
                  >
                    <div className="flex-shrink-0 w-[1600px] h-full flex items-end justify-around pb-2 opacity-50">
                       <div className="w-8 h-8 bg-black/10 rounded-full blur-xl" />
                       <div className="w-12 h-12 bg-black/10 rounded-full blur-xl" />
                    </div>
                    <div className="flex-shrink-0 w-[1600px] h-full flex items-end justify-around pb-2 opacity-50">
                       <div className="w-8 h-8 bg-black/10 rounded-full blur-xl" />
                       <div className="w-12 h-12 bg-black/10 rounded-full blur-xl" />
                    </div>
                  </motion.div>

                  {/* SIDE CONTROL BUTTONS */}
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 z-50 flex flex-col gap-4">
                    <button 
                      onClick={() => { setIsRunning(!isRunning); playSound('click'); }} 
                      className="bg-kart-green p-3 border-2 border-black hover:bg-emerald-400 transition-all active:scale-95 shadow-[4px_4px_0px_#000]"
                      title={isRunning ? "Pausar" : "Iniciar"}
                    >
                      {isRunning ? <Pause /> : <Play />}
                    </button>
                    <button 
                      onClick={() => { resetSim(); playSound('click'); }} 
                      className="bg-kart-red p-3 border-2 border-black hover:bg-rose-400 transition-all active:scale-95 shadow-[4px_4px_0px_#000]"
                      title="Reiniciar"
                    >
                      <RotateCcw />
                    </button>
                  </div>


               </div>
            </section>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                {/* CONTROLS PANEL */}
                <div className="lg:col-span-1 p-6 space-y-6 bg-white border-4 border-black shadow-[6px_6px_0px_#000]">
                   <p className="font-display text-xs uppercase italic text-slate-400 border-b-2 border-slate-100 pb-2">Hangar de Ajustes</p>
                   
                   <div className="space-y-4">
                     {/* Solo mostrar los controles relevantes según el modo del reto */}
                     {(mode === 'distance' || mode === 'time' || isPracticeMode) && (
                       <div className="space-y-1">
                         <div className="flex justify-between items-center text-[10px] font-tech font-bold uppercase text-slate-500">
                           <span>Velocidad (v)</span>
                           <span className="text-kart-red font-black leading-none">{velocity} m/s</span>
                         </div>
                         <input type="range" min="0" max="200" step="1" value={velocity} onChange={(e) => handleInputChange('v', e.target.value)} className="w-full h-1.5 accent-kart-red" />
                       </div>
                     )}

                     {(mode === 'meeting' || mode === 'overtaking') && (
                       <>
                        <div className="space-y-1">
                          <div className="flex justify-between items-center text-[10px] font-tech font-bold uppercase text-slate-500">
                            <span>Velocidad 1 (v₁)</span>
                            <span className="text-kart-red font-black leading-none">{velocity} m/s</span>
                          </div>
                          <input type="range" min="0" max="200" step="1" value={velocity} onChange={(e) => handleInputChange('v', e.target.value)} className="w-full h-1.5 accent-kart-red" />
                        </div>
                        <div className="space-y-1">
                          <div className="flex justify-between items-center text-[10px] font-tech font-bold uppercase text-slate-500">
                            <span>Velocidad 2 (v₂)</span>
                            <span className="text-kart-blue font-black leading-none">{v2} m/s</span>
                          </div>
                          <input type="range" min="0" max="200" step="1" value={v2} onChange={(e) => handleInputChange('v2', e.target.value)} className="w-full h-1.5 accent-kart-blue" />
                        </div>
                       </>
                     )}

                     {(mode === 'velocity' || mode === 'distance' || isPracticeMode) && (
                       <div className="space-y-1">
                         <div className="flex justify-between items-center text-[10px] font-tech font-bold uppercase text-slate-500">
                           <span>Tiempo (t)</span>
                           <span className="text-kart-blue font-black leading-none">{time} s</span>
                         </div>
                         <input type="range" min="1" max="60" step="1" value={time} onChange={(e) => handleInputChange('t', e.target.value)} className="w-full h-1.5 accent-kart-blue" />
                       </div>
                     )}

                     {(mode === 'velocity' || mode === 'time' || isPracticeMode) && (
                       <div className="space-y-1">
                         <div className="flex justify-between items-center text-[10px] font-tech font-bold uppercase text-slate-500">
                           <span>Distancia (d)</span>
                           <span className="text-kart-green font-black leading-none">{distance} m</span>
                         </div>
                         <input type="range" min="0" max="2000" step="10" value={distance} onChange={(e) => handleInputChange('d', e.target.value)} className="w-full h-1.5 accent-kart-green" />
                       </div>
                     )}

                     {(mode === 'meeting' || mode === 'overtaking') && (
                        <div className="space-y-1">
                          <div className="flex justify-between items-center text-[10px] font-tech font-bold uppercase text-slate-500">
                            <span>Distancia Separación (D)</span>
                            <span className="text-kart-green font-black leading-none">{dTotal} m</span>
                          </div>
                          <input type="range" min="0" max="2000" step="10" value={dTotal} onChange={(e) => handleInputChange('dt', e.target.value)} className="w-full h-1.5 accent-kart-green" />
                        </div>
                     )}

                     <div className="bg-kart-yellow p-4 border-4 border-black text-center mt-6">
                       <p className="text-[10px] font-tech uppercase font-bold mb-1">
                        Resultado: {
                          mode === 'distance' ? 'Distancia (d)' : 
                          mode === 'velocity' ? 'Velocidad (v)' : 
                          mode === 'time' ? 'Tiempo (t)' : 
                          'Tiempo Encuentro/Alcance'
                        }
                       </p>
                       <p className="text-3xl font-display font-black italic leading-none">
                         {calculatedValue.toFixed(1)} 
                         <span className="text-sm ml-2 font-tech uppercase italic">
                           {mode === 'distance' ? 'm' : mode === 'velocity' ? 'm/s' : 's'}
                         </span>
                       </p>
                     </div>
                   </div>
                </div>

               {/* GRAPH AND QUESTION PANEL */}
               <div className="lg:col-span-3 space-y-8">
                  {/* BOTONES DE ANÁLISIS */}
                  <div className="flex flex-wrap gap-4 items-center justify-between">
                    <div className="flex gap-2 text-[10px]">
                       <button 
                        onClick={() => { playSound('click'); setShowSlope(!showSlope); }}
                        className={cn(
                          "px-3 py-1.5 border-2 border-black font-display font-black italic uppercase transition-all shadow-[2px_2px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none",
                          showSlope ? "bg-kart-red text-white" : "bg-white text-black"
                        )}
                       >
                         {showSlope ? 'Ocultar Pendiente' : 'Ver Pendiente (v)'}
                       </button>
                       <button 
                        onClick={() => { playSound('click'); setShowArea(!showArea); }}
                        className={cn(
                          "px-3 py-1.5 border-2 border-black font-display font-black italic uppercase transition-all shadow-[2px_2px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none",
                          showArea ? "bg-kart-green text-white" : "bg-white text-black"
                        )}
                       >
                         {showArea ? 'Ocultar Área' : 'Ver Área (Δx)'}
                       </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                    {/* d vs t */}
                    <div className="p-3 bg-white border-4 border-black shadow-[6px_6px_0px_#000] space-y-2">
                       <div className="flex justify-between items-center text-[10px] font-display font-black italic uppercase text-slate-400">
                        <p>Posición vs Tiempo</p>
                        {showSlope && <span className="text-kart-red">m = v = {effV.toFixed(1)} m/s</span>}
                      </div>
                      <div className="h-52 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={graphData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="time" label={{ value: 't (s)', position: 'insideBottomRight', offset: -5, fontSize: 8 }} />
                            <YAxis domain={[0, 'auto']} label={{ value: 'x (m)', angle: -90, position: 'insideLeft', fontSize: 8 }} />
                            <Tooltip />
                            <Line type="monotone" dataKey="distance" stroke="#e60012" strokeWidth={3} dot={false} isAnimationActive={false} />
                            {(mode === 'meeting' || mode === 'overtaking') && (
                              <Line type="monotone" dataKey="distance2" stroke="#0072ce" strokeWidth={3} dot={false} isAnimationActive={false} />
                            )}
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* v vs t */}
                    <div className="p-3 bg-white border-4 border-black shadow-[6px_6px_0px_#000] space-y-2">
                       <div className="flex justify-between items-center text-[10px] font-display font-black italic uppercase text-slate-400">
                        <p>Velocidad vs Tiempo</p>
                        {showArea && <span className="text-kart-green">Área = Δx = {effD.toFixed(0)} m</span>}
                      </div>
                      <div className="h-52 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={graphData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="time" label={{ value: 't (s)', position: 'insideBottomRight', offset: -5, fontSize: 8 }} />
                            <YAxis domain={[0, (dataMax: number) => Math.max(dataMax * 1.2, 50)]} label={{ value: 'v (m/s)', angle: -90, position: 'insideLeft', fontSize: 8 }} />
                            <Tooltip />
                            <Area type="stepAfter" dataKey="vel" stroke="#0072ce" strokeWidth={3} fill={showArea ? "#f9d71c" : "transparent"} fillOpacity={0.3} isAnimationActive={false} />
                            {(mode === 'meeting' || mode === 'overtaking') && (
                              <Area type="stepAfter" dataKey="vel2" stroke="#43b02a" strokeWidth={2} fill="transparent" isAnimationActive={false} />
                            )}
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>

                 {currentNarrative && (
                   <div className="bg-white border-4 border-black p-8 shadow-[8px_8px_0px_#000] space-y-6">
                     <div className="flex items-center gap-3">
                       <div className="w-2 h-8 bg-kart-red"></div>
                       <h3 className="text-2xl font-display font-black italic uppercase">Cuestionario de Misión</h3>
                     </div>
                     
                      <div className="flex justify-between items-start gap-4">
                        <p className="text-lg font-bold text-slate-700 bg-slate-100 p-4 border-2 border-black italic flex-1">
                          {(gameState === 'guided_examples' ? GUIDED_EXAMPLES : CHALLENGES)[currentChallengeIdx].question}
                        </p>
                        <button 
                          onClick={() => setShowHint(!showHint)}
                          className="bg-white border-4 border-black p-4 hover:bg-slate-50 transition-colors shadow-[4px_4px_0px_#000] active:translate-x-1 active:translate-y-1 active:shadow-none"
                          title="Obtener Pista"
                        >
                          <Info className="text-kart-blue" />
                        </button>
                      </div>

                      <AnimatePresence>
                        {showHint && (
                          <motion.div 
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                          >
                            <div className="p-4 bg-kart-blue/5 border-2 border-kart-blue border-dashed text-kart-blue flex flex-col items-center gap-2">
                              <p className="text-[10px] font-tech uppercase font-black">Sugerencia del Sistema</p>
                              <div className="text-2xl">
                                <InlineMath math={(gameState === 'guided_examples' ? GUIDED_EXAMPLES : CHALLENGES)[currentChallengeIdx].hint} />
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>

                     <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {(gameState === 'guided_examples' ? GUIDED_EXAMPLES : CHALLENGES)[currentChallengeIdx].options.map(opt => (
                          <button 
                            key={opt} 
                            onClick={() => { handleAnswer(opt); playSound('click'); }} 
                            className="kart-button border-4 py-4 text-xl flex items-center justify-between px-6 group"
                          >
                            <span>{opt}</span>
                            <ArrowRight className="opacity-0 group-hover:opacity-100 transition-all -translate-x-4 group-hover:translate-x-0" />
                          </button>
                        ))}
                     </div>

                     <AnimatePresence>
                       {feedback && (
                         <motion.div 
                           initial={{ opacity: 0, x: -20 }} 
                           animate={{ opacity: 1, x: 0 }}
                           className={cn("p-6 border-4 border-black flex items-center justify-between", feedback.correct ? "bg-kart-green/10 text-kart-green" : "bg-kart-red/10 text-kart-red")}
                         >
                           <div className="flex items-center gap-4">
                             {feedback.correct ? <Trophy size={32} /> : <Skull size={32} />}
                             <div>
                               <p className="font-display font-black italic text-xl uppercase leading-none">{feedback.correct ? '¡SISTEMA ESTABLE!' : 'ANOMALÍA DETECTADA'}</p>
                               <p className="font-tech text-xs uppercase mt-1 opacity-80">{feedback.message}</p>
                             </div>
                           </div>
                           <button 
                             onClick={() => { nextChallenge(); playSound('click'); }} 
                             className="bg-black text-white px-8 py-2 font-display italic uppercase text-lg border-2 border-white hover:bg-slate-800 transition-colors"
                           >
                             SIGUIENTE REPORTE
                           </button>
                         </motion.div>
                       )}
                     </AnimatePresence>
                   </div>
                 )}
               </div>
            </div>
          </motion.div>
        )}

        {gameState === 'results' && (
          <motion.div key="results" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="max-w-2xl mx-auto mt-20 p-12 bg-white border-4 border-black text-center space-y-8 shadow-[12px_12px_0px_#000]">
             <Trophy size={80} className="mx-auto text-kart-yellow drop-shadow-lg" />
             <h2 className="text-5xl font-display font-black italic uppercase text-kart-blue">Operación Finalizada</h2>
             
             <div className="grid grid-cols-2 gap-6">
                <div className="p-6 bg-kart-yellow border-4 border-black">
                  <p className="text-4xl font-display font-black italic">{coins}</p>
                  <p className="text-[10px] uppercase font-tech font-bold">Coins Galácticos</p>
                </div>
                <div className="p-6 bg-kart-green text-white border-4 border-black">
                  <p className="text-4xl font-display font-black italic">{xp}</p>
                  <p className="text-[10px] uppercase font-tech font-bold">Puntos de Héroe</p>
                </div>
             </div>

             <div className="p-8 border-4 border-black space-y-2">
               <p className="font-tech text-xs text-slate-400 uppercase">Clasificación de Piloto</p>
               <p className={cn("text-3xl font-display font-black italic uppercase", performanceRating.color)}>{performanceRating.label}</p>
             </div>

             <button 
              onClick={() => window.location.reload()} 
              className="kart-button w-full bg-kart-red text-white py-4 text-2xl font-black italic font-display uppercase shadow-[8px_8px_0px_#000] active:translate-x-1 active:translate-y-1 active:shadow-none transition-all"
             >
               Nueva Misión
             </button>
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

              {/* GUEST SUMMARY */}
              <div className="bg-slate-50 border-4 border-black p-4 flex flex-col sm:flex-row items-center justify-between gap-6">
                 <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-white border-2 border-black flex items-center justify-center text-slate-400">
                      <User size={24} />
                    </div>
                    <div>
                      <p className="font-display font-black italic text-xl uppercase leading-none">Resumen de Visitantes</p>
                      <p className="font-tech text-[10px] text-slate-400 uppercase">Actividad de usuarios sin registro</p>
                    </div>
                 </div>
                 <div className="flex gap-8">
                    <div className="text-center">
                       <p className="text-[10px] font-tech uppercase text-slate-400">Total Visitantes</p>
                       <p className="text-2xl font-display font-black italic">{guestStats?.count || 0}</p>
                    </div>
                    <div className="text-center border-l-2 border-slate-200 pl-8">
                       <p className="text-[10px] font-tech uppercase text-slate-400">Rendimiento Promedio</p>
                       <p className="text-2xl font-display font-black italic text-kart-blue">
                         {guestStats?.totalResponses > 0 
                            ? Math.round((guestStats.totalCorrect / guestStats.totalResponses) * 100) 
                            : 0}%
                       </p>
                    </div>
                 </div>
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
                            <div className="flex items-center gap-2">
                              <button 
                                onClick={() => handleDeleteSession(session.id, session.userName)}
                                className="p-2 text-slate-300 hover:text-kart-red transition-colors"
                                title="Eliminar este Registro"
                              >
                                <Trash2 size={16} />
                              </button>
                              {session.userId && (
                                <button 
                                  onClick={() => deleteUser(session.userId, session.userName)}
                                  className="flex items-center gap-2 px-3 py-1.5 bg-red-50 text-red-600 hover:bg-red-600 hover:text-white transition-all border-2 border-red-100 hover:border-red-600 rounded-md ml-2"
                                  title="BORRAR ESTUDIANTE COMPLETO (PERFIL + TODO EL PROGRESO)"
                                >
                                  <UserX size={14} />
                                  <span className="font-tech text-[9px] font-bold uppercase whitespace-nowrap">Eliminar Estudiante</span>
                                </button>
                              )}
                            </div>
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
    </main>

      <footer className="max-w-6xl mx-auto mb-10 text-center space-y-4 relative z-20">
        <div className="flex flex-col items-center gap-3">
          <button 
            onClick={() => { playSound('click'); setShowCredits(true); }}
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
            <p className="opacity-50 text-[8px]">Lic. matemáticas y física (UdeA) | Mag. Enseñanza (UNAL) | Doctorante en Educación (UTEL)</p>
          </div>
          
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
                    alert("Acceso Restringido: Reservado para el docente.");
                  }
                }
              } catch (err) {
                alert("Error de acceso.");
              }
            }}
            className="text-[8px] font-tech text-slate-300 uppercase hover:text-slate-500"
          >
            Terminal Admin
          </button>
        </div>
      </footer>

      <AnimatePresence>
        {showCredits && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-md">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="max-w-2xl w-full bg-white border-8 border-black p-10 shadow-[15px_15px_0px_#000] relative space-y-8"
            >
              <button 
                onClick={() => setShowCredits(false)}
                className="absolute -top-6 -right-6 bg-kart-red text-white p-3 border-4 border-black hover:rotate-90 transition-transform"
              >
                <XCircle size={32} />
              </button>
              
              <div className="text-center space-y-4">
                <h2 className="text-5xl font-display font-black italic uppercase text-kart-blue drop-shadow-md">Créditos</h2>
                <div className="h-2 w-32 bg-kart-yellow mx-auto border-2 border-black" />
              </div>

              <div className="space-y-6 font-tech text-sm leading-loose text-center">
                <div className="p-6 bg-slate-50 border-4 border-black space-y-2">
                  <p className="font-black text-xl italic uppercase text-kart-red leading-none">Jorge Armando Jaramillo Bravo</p>
                  <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px]">Líder de Proyecto & Autor de Contenidos</p>
                  <p className="text-slate-400 border-t-2 border-slate-200 pt-2 italic">
                    Docente de la Institución Educativa Josefa Campos (Bello, Antioquia). Experto en enseñanza de la física.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-6 uppercase text-[10px] font-black text-slate-500">
                  <div className="space-y-1">
                    <p className="text-kart-blue">Desarrollo Tecnológico</p>
                    <p className="text-black">Google AI Studio Build</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-kart-green">Pedagogía</p>
                    <p className="text-black">Gamificación en Ciencias</p>
                  </div>
                </div>

                <p className="text-[10px] text-center opacity-50 uppercase tracking-[0.2em] pt-4">
                  © 2026 LABORATORIO INTERACTIVO JOSEFA CAMPOS
                </p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default App;

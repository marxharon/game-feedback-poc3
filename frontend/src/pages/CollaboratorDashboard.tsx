import { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import ReactMarkdown from 'react-markdown';
import { User as UserIcon, X, Check, Edit2, XCircle, FileText, BarChart2, Star, Sparkles, MessageSquare, Info, Award, Trophy, Medal, ChevronLeft, ChevronRight } from 'lucide-react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts';


interface ChallengePending {
  challenge: {
    id: number;
    title: string;
    description: string;
  };
  cycle: {
    id: number;
    cycleNumber: number;
  };
  persona: Persona;
  evaluations: {
    id: number;
    axisId: number;
    rating: number;
    observation: string;
  }[];
  axes: {
    id: number;
    name: string;
    description: string;
  }[];
  projectedPersona: string | null;
}

interface PersonaVersion {
  id: number;
  personaId: number;
  versionNumber: number;
  textContent: string;
  status: string;
  createdAt: string;
}

interface Persona {
  id: number;
  name: string;
  role: string;
  managerId: number;
  collaboratorId: number;
  createdAt: string;
  latestVersion?: PersonaVersion;
  versions?: PersonaVersion[];
}

interface PendingClosureReport {
  report: { id: number; challengeId: number; personaId: number; summaryText: string; collaboratorStatus: string; createdAt: string; };
  challenge: { id: number; title: string; description: string; axes?: { id: number; name: string; description: string; }[]; };
  persona: Persona;
  axes?: { id: number; name: string; description: string; }[];
  finalEvaluations?: { id: number; axisId: number; rating: number; observation: string; }[];
  evaluations?: { id: number; axisId: number; rating: number; observation: string; }[];
  finalEvaluation?: any;
}
interface ChallengeHistory extends ChallengePending {
  validation: {
    id: number;
    status: string;
    justification: string;
    alignmentScore: number;
    createdAt: string;
  };
}

export function CollaboratorDashboard() {
  const { user, token } = useAuthStore();
  const [pendingPersonas, setPendingPersonas] = useState<Persona[]>([]);
  const [historyPersonas, setHistoryPersonas] = useState<Persona[]>([]);
  const [selectedPersona, setSelectedPersona] = useState<Persona | null>(null);
  const [actionType, setActionType] = useState<'ACCEPT' | 'ADJUST' | 'REJECT' | null>(null);
  const [justification, setJustification] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [pendingChallenges, setPendingChallenges] = useState<ChallengePending[]>([]);
  const [historyChallenges, setHistoryChallenges] = useState<ChallengeHistory[]>([]);
  const [selectedChallenge, setSelectedChallenge] = useState<ChallengePending | ChallengeHistory | null>(null);
  const [alignmentScore, setAlignmentScore] = useState<number | null>(null);
  const [xpGained, setXpGained] = useState<number | null>(null);
  const [pendingClosureReports, setPendingClosureReports] = useState<PendingClosureReport[]>([]);
  const [historyClosureReports, setHistoryClosureReports] = useState<PendingClosureReport[]>([]);
  const [selectedClosureReport, setSelectedClosureReport] = useState<PendingClosureReport | null>(null);
  const [closureReportsData, setClosureReportsData] = useState<{reports: any[], finalEvaluations: any[], axes?: any[]} | null>(null);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'ranking'>('dashboard');
  const [ranking, setRanking] = useState<{userId: number, xp: number, level: number, name: string, role: string}[]>([]);
  const [gamificationInfo, setGamificationInfo] = useState<{gamification: {xp: number, level: number}, badges: any[]} | null>(null);


  // Pagination states
  const [pendingPersonasPage, setPendingPersonasPage] = useState(1);
  const [historyPersonasPage, setHistoryPersonasPage] = useState(1);
  const [pendingChallengesPage, setPendingChallengesPage] = useState(1);
  const [historyChallengesPage, setHistoryChallengesPage] = useState(1);
  const [pendingClosureReportsPage, setPendingClosureReportsPage] = useState(1);
  const [historyClosureReportsPage, setHistoryClosureReportsPage] = useState(1);
  const ITEMS_PER_PAGE = 6;

  const paginatedPendingPersonas = pendingPersonas.slice((pendingPersonasPage - 1) * ITEMS_PER_PAGE, pendingPersonasPage * ITEMS_PER_PAGE);
  const totalPendingPersonasPages = Math.ceil(pendingPersonas.length / ITEMS_PER_PAGE);
  useEffect(() => { if (totalPendingPersonasPages > 0 && pendingPersonasPage > totalPendingPersonasPages) setPendingPersonasPage(totalPendingPersonasPages); }, [totalPendingPersonasPages, pendingPersonasPage]);

  const paginatedHistoryPersonas = historyPersonas.slice((historyPersonasPage - 1) * ITEMS_PER_PAGE, historyPersonasPage * ITEMS_PER_PAGE);
  const totalHistoryPersonasPages = Math.ceil(historyPersonas.length / ITEMS_PER_PAGE);
  useEffect(() => { if (totalHistoryPersonasPages > 0 && historyPersonasPage > totalHistoryPersonasPages) setHistoryPersonasPage(totalHistoryPersonasPages); }, [totalHistoryPersonasPages, historyPersonasPage]);

  const paginatedPendingChallenges = pendingChallenges.slice((pendingChallengesPage - 1) * ITEMS_PER_PAGE, pendingChallengesPage * ITEMS_PER_PAGE);
  const totalPendingChallengesPages = Math.ceil(pendingChallenges.length / ITEMS_PER_PAGE);
  useEffect(() => { if (totalPendingChallengesPages > 0 && pendingChallengesPage > totalPendingChallengesPages) setPendingChallengesPage(totalPendingChallengesPages); }, [totalPendingChallengesPages, pendingChallengesPage]);

  const paginatedHistoryChallenges = historyChallenges.slice((historyChallengesPage - 1) * ITEMS_PER_PAGE, historyChallengesPage * ITEMS_PER_PAGE);
  const totalHistoryChallengesPages = Math.ceil(historyChallenges.length / ITEMS_PER_PAGE);
  useEffect(() => { if (totalHistoryChallengesPages > 0 && historyChallengesPage > totalHistoryChallengesPages) setHistoryChallengesPage(totalHistoryChallengesPages); }, [totalHistoryChallengesPages, historyChallengesPage]);

  const paginatedPendingClosureReports = pendingClosureReports.slice((pendingClosureReportsPage - 1) * ITEMS_PER_PAGE, pendingClosureReportsPage * ITEMS_PER_PAGE);
  const totalPendingClosureReportsPages = Math.ceil(pendingClosureReports.length / ITEMS_PER_PAGE);
  useEffect(() => { if (totalPendingClosureReportsPages > 0 && pendingClosureReportsPage > totalPendingClosureReportsPages) setPendingClosureReportsPage(totalPendingClosureReportsPages); }, [totalPendingClosureReportsPages, pendingClosureReportsPage]);

  const paginatedHistoryClosureReports = historyClosureReports.slice((historyClosureReportsPage - 1) * ITEMS_PER_PAGE, historyClosureReportsPage * ITEMS_PER_PAGE);
  const totalHistoryClosureReportsPages = Math.ceil(historyClosureReports.length / ITEMS_PER_PAGE);
  useEffect(() => { if (totalHistoryClosureReportsPages > 0 && historyClosureReportsPage > totalHistoryClosureReportsPages) setHistoryClosureReportsPage(totalHistoryClosureReportsPages); }, [totalHistoryClosureReportsPages, historyClosureReportsPage]);
  
  
  const fetchHistoryClosureReports = async () => {
    try {
      const res = await fetch('http://localhost:3001/challenges/history-closure-reports', {
        headers: { Authorization: 'Bearer ' + token }
      });
      if (res.ok) {
        const data = await res.json();
        setHistoryClosureReports(data);
      }
    } catch (err) {
      console.error('Error fetching history closure reports:', err);
    }
  };

  const fetchPendingClosureReports = async () => {
    try {
      const res = await fetch('http://localhost:3001/challenges/pending-closure-reports', {
        headers: { Authorization: 'Bearer ' + token }
      });
      if (res.ok) {
        const data = await res.json();
        setPendingClosureReports(data);
      }
    } catch (err) {
      console.error('Error fetching pending closure reports:', err);
    }
  };
  const fetchHistoryChallenges = async () => {
    try {
      const res = await fetch('http://localhost:3001/challenges/history-validations', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        
        const data = await res.json();
        setHistoryChallenges(data);
      }
    } catch (err) {
      console.error('Error fetching history challenge validations:', err);
    }
  };

  const fetchPendingChallenges = async () => {
    try {
      const res = await fetch('http://localhost:3001/challenges/pending-validations', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        
        const data = await res.json();
        setPendingChallenges(data);
      }
    } catch (err) {
      console.error('Error fetching pending challenge validations:', err);
    }
  };

  const fetchPendingPersonas = async () => {
    try {
      const res = await fetch('http://localhost:3001/personas/pending', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        
        const data = await res.json();
        setPendingPersonas(data);
      }
    } catch (err) {
      console.error('Error fetching pending personas:', err);
    }
  };

  const fetchHistoryPersonas = async () => {
    try {
      const res = await fetch('http://localhost:3001/personas/history', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        
        const data = await res.json();
        setHistoryPersonas(data);
      }
    } catch (err) {
      console.error('Error fetching history personas:', err);
    }
  };

  const fetchGamification = async () => {
    try {
      const res = await fetch('http://localhost:3001/gamification/me', { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        setGamificationInfo(data);
      }
    } catch (err) {}
  };

  const fetchRanking = async () => {
    try {
      const res = await fetch('http://localhost:3001/gamification/ranking', { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        setRanking(data);
      }
    } catch (err) {}
  };

    useEffect(() => {


    if (token) {
      fetchPendingPersonas();
      fetchHistoryPersonas();
      fetchPendingChallenges();
      fetchHistoryChallenges();
      fetchPendingClosureReports();
      fetchHistoryClosureReports();
      fetchGamification();
      fetchRanking();
    }


  }, [token]);

  const handleOpenClosureReport = (item: PendingClosureReport) => {
    setSelectedClosureReport(item);
  };

  
  const handleSignClosureReport = async (action: 'ACCEPTED' | 'REJECTED') => {
    if (!selectedClosureReport) return;
    setIsSubmitting(true);
    try {
      const targetPersonaId = selectedClosureReport.report?.personaId || selectedClosureReport.persona?.id;
      const res = await fetch('http://localhost:3001/challenges/' + selectedClosureReport.challenge.id + '/closure-reports/' + targetPersonaId + '/sign', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + token 
        },
        body: JSON.stringify({ status: action })
      });
      
      if (res.ok) {
        setSelectedClosureReport(null);
        fetchPendingClosureReports();
        fetchHistoryClosureReports();
        fetchHistoryChallenges();
        fetchGamification();
      } else {
        console.error('Failed to sign closure report');
      }
    } catch (error) {
      console.error('Error signing closure report:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChallengeValidation = async (action: 'ACCEPTED' | 'PARTIAL' | 'REJECTED') => {
    if (!selectedChallenge) return;
    setIsSubmitting(true);
    try {
      const { challenge, cycle, persona } = selectedChallenge;
      const res = await fetch(`http://localhost:3001/challenges/${challenge.id}/cycles/${cycle.id}/personas/${persona.id}/validate`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ status: action, justification })
      });
      
      if (res.ok) {
        
        const data = await res.json();
        setAlignmentScore(data.alignmentScore);
        setXpGained(data.xpGained);
        
        // Timeout para ver o score antes de fechar
        setTimeout(() => {
            setSelectedChallenge(null);
            setJustification('');
            setActionType(null);
            setAlignmentScore(null);
            setXpGained(null);
            fetchPendingChallenges();
            fetchGamification();
        }, 3000);

      } else {
        console.error('Failed to submit validation');
      }
    } catch (error) {
      console.error('Error submitting validation:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFeedback = async (action: 'ACCEPT' | 'ADJUST' | 'REJECT') => {
    if (!selectedPersona) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`http://localhost:3001/personas/${selectedPersona.id}/feedback`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ action, justification })
      });
      if (res.ok) {
        setSelectedPersona(null);
        setJustification('');
        setActionType(null);
        fetchPendingPersonas();
        fetchHistoryPersonas();
      fetchPendingChallenges();
      } else {
        console.error('Failed to submit feedback');
      }
    } catch (error) {
      console.error('Error submitting feedback:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const closeDialog = () => { setSelectedChallenge(null);  setAlignmentScore(null);
    setSelectedPersona(null);
    setActionType(null);
    setJustification('');
    setSelectedClosureReport(null);
    setClosureReportsData(null);
    setXpGained(null);
  };

  return (
    <div className="max-w-6xl mx-auto">
      <header className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Olá, {user?.name?.split(' ')[0]}!</h1>
          <p className="text-gray-500 mt-2">Acompanhe seu desenvolvimento e desafios ativos.</p>
        </div>
        {gamificationInfo && (
          <div className="bg-white px-5 py-3 rounded-xl shadow-sm border border-purple-100 flex items-center gap-4 animate-in fade-in zoom-in duration-500">
            <div className="w-12 h-12 bg-gradient-to-tr from-purple-100 to-indigo-100 rounded-full flex items-center justify-center text-purple-700 font-black text-xl shadow-inner border border-purple-200">
              L{gamificationInfo.gamification.level}
            </div>
            <div>
              <div className="flex justify-between text-xs font-bold mb-1">
                <span className="text-gray-700 uppercase tracking-wide">Desbravador</span>
                <span className="text-purple-600">{gamificationInfo.gamification.xp} / {gamificationInfo.gamification.level * 100} XP</span>
              </div>
              <div className="w-48 h-2.5 bg-gray-100 rounded-full overflow-hidden shadow-inner">
                <div className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full relative" style={{ width: `${(gamificationInfo.gamification.xp % 100)}%` }}>
                  <div className="absolute top-0 right-0 bottom-0 left-0 bg-white/20 animate-pulse"></div>
                </div>
              </div>
            </div>
            {gamificationInfo.badges && gamificationInfo.badges.length > 0 && (
              <div className="flex gap-2 ml-2 pl-4 border-l border-purple-100 flex-wrap max-w-[200px]">
                {gamificationInfo.badges.map((badge: any, i: number) => (
                  <div key={i} className="group relative flex items-center justify-center w-8 h-8 bg-gradient-to-br from-yellow-100 to-orange-100 rounded-full border border-yellow-300 text-yellow-600 cursor-help hover:scale-110 transition-transform shadow-sm">
                    <Award size={16} className="text-yellow-600" />
                    <div className="absolute top-full mt-2 right-0 md:left-1/2 md:-translate-x-1/2 w-48 p-2 bg-gray-800 text-white text-[10px] rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 text-center font-normal shadow-lg">
                      <strong className="block mb-1 text-yellow-300">{badge.name}</strong>
                      {badge.description}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </header>

      <div className="flex space-x-4 border-b border-gray-200 mb-8">
        <button 
          onClick={() => setActiveTab('dashboard')}
          className={`py-2 px-4 border-b-2 font-medium text-sm transition-colors ${activeTab === 'dashboard' ? 'border-purple-600 text-purple-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
        >
          Meu Painel
        </button>
        <button 
          onClick={() => setActiveTab('ranking')}
          className={`py-2 px-4 border-b-2 font-medium text-sm transition-colors ${activeTab === 'ranking' ? 'border-purple-600 text-purple-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
        >
          Ranking da Equipe
        </button>
      </div>

      {activeTab === 'ranking' ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden mb-12">
          <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-purple-50 to-white flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                <Trophy className="text-yellow-500" size={28} />
                Ranking de Gamificação
              </h2>
              <p className="text-gray-500 text-sm mt-1">Acompanhe sua posição no ranking de sinergia.</p>
            </div>
            <div className="bg-white px-4 py-2 rounded-lg shadow-sm border border-gray-200 text-center">
              <p className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-1">Sua Posição</p>
              <p className="text-xl font-black text-purple-600">
                #{ranking.findIndex(r => r.userId === user?.id) + 1 || '-'}
              </p>
            </div>
          </div>
          <div className="p-0">
            {ranking.length === 0 ? (
              <p className="text-center text-gray-500 py-12">Nenhum jogador pontuou ainda.</p>
            ) : (
              <ul className="divide-y divide-gray-100">
                {ranking.map((userRank, index) => {
                  const isTop3 = index < 3;
                  const isMe = userRank.userId === user?.id;
                  
                  return (
                    <li key={userRank.userId} className={`flex items-center justify-between p-6 transition-colors ${isMe ? 'bg-purple-50/50' : 'hover:bg-gray-50'}`}>
                      <div className="flex items-center gap-6">
                        <div className={`flex items-center justify-center w-12 h-12 rounded-full font-black text-xl shadow-sm border ${
                          index === 0 ? 'bg-gradient-to-br from-yellow-300 to-yellow-500 text-white border-yellow-400 scale-110' :
                          index === 1 ? 'bg-gradient-to-br from-gray-300 to-gray-400 text-white border-gray-300 scale-105' :
                          index === 2 ? 'bg-gradient-to-br from-orange-300 to-orange-500 text-white border-orange-400 scale-105' :
                          'bg-gray-100 text-gray-600 border-gray-200'
                        }`}>
                          {index === 0 ? <Trophy size={24} /> : index === 1 || index === 2 ? <Medal size={20} /> : `#${index + 1}`}
                        </div>
                        <div>
                          <h3 className="font-bold text-gray-900 text-lg flex items-center gap-2">
                            {userRank.name}
                            {isMe && <span className="bg-purple-100 text-purple-800 text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider">Você</span>}
                          </h3>
                          <p className="text-sm text-gray-500 flex items-center gap-1">
                            {userRank.role === 'MANAGER' || userRank.role === 'ADMIN' ? 'Gestor / Mentor' : 'Colaborador'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="text-right hidden md:block">
                          <p className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-1">Nível</p>
                          <div className="bg-purple-100 text-purple-800 font-bold px-3 py-1 rounded-full text-sm inline-block">
                            Lvl {userRank.level}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-1">XP Sinergia</p>
                          <p className="text-2xl font-black text-gray-900">{userRank.xp}</p>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      ) : (
        <>
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-800 flex items-center space-x-2">
          <span>Personas Aguardando sua Validação</span>
          {pendingPersonas.length > 0 && (
            <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
              {pendingPersonas.length}
            </span>
          )}
        </h2>
      </div>

      {pendingPersonas.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center text-gray-500">
          <div className="flex justify-center mb-4">
            <div className="bg-green-50 p-4 rounded-full text-green-400">
              <Check size={48} />
            </div>
          </div>
          <p className="text-lg font-medium text-gray-900">Tudo certo por aqui!</p>
          <p className="text-sm mt-2 max-w-md mx-auto">Não há personas aguardando sua validação no momento.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {paginatedPendingPersonas.map(persona => (
              <div key={persona.id} className="bg-white rounded-xl shadow-sm border border-orange-200 overflow-hidden flex flex-col hover:shadow-md transition-shadow relative">
              <div className="absolute top-0 right-0 w-2 h-full bg-orange-400"></div>
              <div className="p-5 border-b border-gray-100 flex items-start justify-between pr-8">
                <div>
                  <h3 className="font-bold text-lg text-gray-900">{persona.name}</h3>
                  <p className="text-indigo-600 text-sm font-medium">{persona.role}</p>
                </div>
                <div className="px-5 py-3 bg-gray-50 border-t border-purple-100 text-xs flex justify-end">
                  <button 
                    onClick={() => setSelectedPersona(persona)}
                    className="text-purple-600 hover:text-purple-800 font-medium"
                  >
                    Ver detalhes
                  </button>
                </div>
              </div>
              <div className="p-5 flex-1">
                <p className="text-sm text-gray-600 line-clamp-4">
                  {persona.latestVersion?.textContent || 'Sem descrição.'}
                </p>
              </div>
              <div className="px-5 py-4 bg-orange-50/50 border-t border-gray-100 text-sm font-medium flex justify-between items-center">
                <span className="text-orange-700 flex items-center space-x-1">
                  <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse"></span>
                  <span>Ação Requerida</span>
                </span>
                <button 
                  onClick={() => setSelectedPersona(persona)}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-1.5 rounded-lg shadow-sm transition-colors text-sm"
                >
                  Avaliar Persona
                </button>
              </div>
              </div>
            ))}
          </div>
          {totalPendingPersonasPages > 1 && (
            <div className="mt-8 flex justify-center items-center gap-4">
              <button
                onClick={() => setPendingPersonasPage(p => Math.max(1, p - 1))}
                disabled={pendingPersonasPage === 1}
                className="flex items-center gap-1 px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft size={16} /> Anterior
              </button>
              <span className="text-sm font-medium text-gray-600">
                Página {pendingPersonasPage} de {totalPendingPersonasPages}
              </span>
              <button
                onClick={() => setPendingPersonasPage(p => Math.min(totalPendingPersonasPages, p + 1))}
                disabled={pendingPersonasPage === totalPendingPersonasPages}
                className="flex items-center gap-1 px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Próxima <ChevronRight size={16} />
              </button>
            </div>
          )}
        </>
      )}
      </>
      )}

      
            {/* SEÇÃO DE RELATÓRIOS DE FECHAMENTO (FASE 4) */}
      <div className="mb-6 mt-12">
        <h2 className="text-xl font-bold text-gray-800 flex items-center space-x-2">
          <span>Relatórios de Fechamento Aguardando Assinatura</span>
          {pendingClosureReports.length > 0 && (
            <span className="bg-blue-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
              {pendingClosureReports.length}
            </span>
          )}
        </h2>
      </div>

      {pendingClosureReports.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center text-gray-500">
          <p className="text-sm mt-2 max-w-md mx-auto">Nenhum relatório de fechamento pendente no momento.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {paginatedPendingClosureReports.map((item, index) => (
              <div key={index} className="bg-white rounded-xl shadow-sm border border-blue-200 overflow-hidden flex flex-col hover:shadow-md transition-shadow relative">
              <div className="absolute top-0 right-0 w-2 h-full bg-blue-400"></div>
              <div className="p-5 border-b border-gray-100">
                <div className="text-xs font-bold text-blue-600 mb-1">FECHAMENTO DE DESAFIO</div>
                <h3 className="font-bold text-lg text-gray-900 line-clamp-1">{item.challenge.title}</h3>
                <p className="text-gray-500 text-xs mt-1">Persona: {item.persona.name}</p>
              </div>
              <div className="p-5 flex-1">
                <p className="text-sm text-gray-600 line-clamp-3">
                  {item.report.summaryText}
                </p>
              </div>
              <div className="px-5 py-4 bg-blue-50/50 border-t border-gray-100 flex justify-between items-center">
                <span className="text-blue-700 text-sm font-medium animate-pulse">Ação Requerida</span>
                <button 
                  onClick={() => handleOpenClosureReport(item)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded-lg shadow-sm transition-colors text-sm"
                >
                  Ler e Assinar
                </button>
              </div>
              </div>
            ))}
          </div>
          {totalPendingClosureReportsPages > 1 && (
            <div className="mt-8 flex justify-center items-center gap-4">
              <button
                onClick={() => setPendingClosureReportsPage(p => Math.max(1, p - 1))}
                disabled={pendingClosureReportsPage === 1}
                className="flex items-center gap-1 px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft size={16} /> Anterior
              </button>
              <span className="text-sm font-medium text-gray-600">
                Página {pendingClosureReportsPage} de {totalPendingClosureReportsPages}
              </span>
              <button
                onClick={() => setPendingClosureReportsPage(p => Math.min(totalPendingClosureReportsPages, p + 1))}
                disabled={pendingClosureReportsPage === totalPendingClosureReportsPages}
                className="flex items-center gap-1 px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Próxima <ChevronRight size={16} />
              </button>
            </div>
          )}
        </>
      )}

      {/* SEÇÃO DE DESAFIOS PENDENTES (FASE 3) */}
      <div className="mb-6 mt-12">
        <h2 className="text-xl font-bold text-gray-800 flex items-center space-x-2">
          <span>Avaliações de Desafio Aguardando sua Validação</span>
          {pendingChallenges.length > 0 && (
            <span className="bg-purple-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
              {pendingChallenges.length}
            </span>
          )}
        </h2>
      </div>

      {pendingChallenges.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center text-gray-500">
          <p className="text-sm mt-2 max-w-md mx-auto">Nenhuma avaliação de desafio pendente para suas personas no momento.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {paginatedPendingChallenges.map((item, index) => (
              <div key={index} className="bg-white rounded-xl shadow-sm border border-purple-200 overflow-hidden flex flex-col hover:shadow-md transition-shadow relative">
              <div className="absolute top-0 right-0 w-2 h-full bg-purple-400"></div>
              <div className="p-5 border-b border-gray-100">
                <div className="text-xs font-bold text-purple-600 mb-1">CICLO {item.cycle.cycleNumber}</div>
                <h3 className="font-bold text-lg text-gray-900 line-clamp-1">{item.challenge.title}</h3>
                <p className="text-gray-500 text-xs mt-1">Persona: {item.persona.name}</p>
              </div>
              <div className="p-5 flex-1">
                <div className="flex items-center space-x-2 text-sm text-gray-600 mb-2">
                   <BarChart2 size={16}/> <span>{item.evaluations.length} Eixos Avaliados</span>
                </div>
                <p className="text-sm text-gray-600 line-clamp-2">
                  O gestor enviou as avaliações deste ciclo. Verifique o feedback e a nova persona projetada.
                </p>
              </div>
              <div className="px-5 py-4 bg-purple-50/50 border-t border-gray-100 flex justify-between items-center">
                <span className="text-purple-700 text-sm font-medium animate-pulse">Ação Requerida</span>
                <button 
                  onClick={() => setSelectedChallenge(item)}
                  className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-1.5 rounded-lg shadow-sm transition-colors text-sm"
                >
                  Validar Ciclo
                </button>
              </div>
              </div>
            ))}
          </div>
          {totalPendingChallengesPages > 1 && (
            <div className="mt-8 flex justify-center items-center gap-4">
              <button
                onClick={() => setPendingChallengesPage(p => Math.max(1, p - 1))}
                disabled={pendingChallengesPage === 1}
                className="flex items-center gap-1 px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft size={16} /> Anterior
              </button>
              <span className="text-sm font-medium text-gray-600">
                Página {pendingChallengesPage} de {totalPendingChallengesPages}
              </span>
              <button
                onClick={() => setPendingChallengesPage(p => Math.min(totalPendingChallengesPages, p + 1))}
                disabled={pendingChallengesPage === totalPendingChallengesPages}
                className="flex items-center gap-1 px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Próxima <ChevronRight size={16} />
              </button>
            </div>
          )}
        </>
      )}

      {historyPersonas.length > 0 && (
        <div className="mt-12 mb-6">
          <h2 className="text-xl font-bold text-gray-800 flex items-center space-x-2">
            <span>Meu Histórico de Personas</span>
          </h2>
          <>
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {paginatedHistoryPersonas.map(persona => (
                <div key={persona.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
                <div className="p-5 border-b border-gray-100">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-bold text-lg text-gray-900">{persona.name}</h3>
                      <p className="text-indigo-600 text-sm font-medium">{persona.role}</p>
                    </div>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      persona.latestVersion?.status === 'VALIDADA' ? 'bg-green-100 text-green-800' :
                      persona.latestVersion?.status === 'RECUSADA' ? 'bg-red-100 text-red-800' :
                      persona.latestVersion?.status === 'AJUSTADA' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {persona.latestVersion?.status}
                    </span>
                  </div>
                </div>
                <div className="p-5 flex-1">
                  <p className="text-sm text-gray-600 line-clamp-4">
                    {persona.latestVersion?.textContent}
                  </p>
                </div>
                <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 text-xs flex justify-end">
                  <button 
                    onClick={() => setSelectedPersona(persona)}
                    className="text-indigo-600 hover:text-indigo-800 font-medium"
                  >
                    Ver detalhes
                  </button>
                </div>
                </div>
              ))}
            </div>
            {totalHistoryPersonasPages > 1 && (
              <div className="mt-8 flex justify-center items-center gap-4">
                <button
                  onClick={() => setHistoryPersonasPage(p => Math.max(1, p - 1))}
                  disabled={historyPersonasPage === 1}
                  className="flex items-center gap-1 px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft size={16} /> Anterior
                </button>
                <span className="text-sm font-medium text-gray-600">
                  Página {historyPersonasPage} de {totalHistoryPersonasPages}
                </span>
                <button
                  onClick={() => setHistoryPersonasPage(p => Math.min(totalHistoryPersonasPages, p + 1))}
                  disabled={historyPersonasPage === totalHistoryPersonasPages}
                  className="flex items-center gap-1 px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Próxima <ChevronRight size={16} />
                </button>
              </div>
            )}
          </>
        </div>
      )}


      {historyChallenges.length > 0 && (
        <div className="mt-12 mb-6">
          <h2 className="text-xl font-bold text-gray-800 flex items-center space-x-2">
            <span>Meu Histórico de Desafios Avaliados</span>
          </h2>
          <>
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {paginatedHistoryChallenges.map((item, idx) => (
                <div key={idx} className="bg-white rounded-xl shadow-sm border border-purple-200 overflow-hidden flex flex-col hover:shadow-md transition-all">
                <div className="p-5 border-b border-gray-100">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="text-xs font-bold text-purple-600 mb-1">CICLO {item.cycle.cycleNumber}</div>
                      <h3 className="font-bold text-lg text-gray-900 line-clamp-1">{item.challenge.title}</h3>
                      <p className="text-indigo-600 text-sm font-medium">{item.persona.name}</p>
                    </div>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      item.validation?.status === 'ACCEPTED' ? 'bg-green-100 text-green-800' :
                      item.validation?.status === 'REJECTED' ? 'bg-red-100 text-red-800' :
                      item.validation?.status === 'PARTIAL' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {item.validation?.status === 'ACCEPTED' ? 'ACATADO' : item.validation?.status === 'REJECTED' ? 'RECUSADO' : item.validation?.status === 'PARTIAL' ? 'PARCIAL' : 'AVALIADO'}
                    </span>
                  </div>
                </div>
                <div className="p-5 flex-1 flex flex-col items-center justify-center bg-gray-50/50">
                  <div className="text-xs text-gray-500 mb-3 uppercase tracking-wide font-bold flex items-center group relative">
                    Adequação / Alinhamento
                    <Info size={14} className="ml-1 text-purple-400 cursor-help" />
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-gray-800 text-white text-[10px] rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 text-center font-normal normal-case tracking-normal shadow-lg">
                      A IA avalia o nível de concordância entre a avaliação do gestor e a sua justificativa.
                    </div>
                  </div>
                  {item.validation?.alignmentScore !== null && item.validation?.alignmentScore !== undefined ? (
                    <div className="w-20 h-20 rounded-full flex items-center justify-center bg-gradient-to-tr from-purple-500 to-indigo-500 text-white shadow-md shadow-purple-200">
                      <span className="text-2xl font-black">{item.validation.alignmentScore}%</span>
                    </div>
                  ) : (
                    <span className="text-gray-400 italic text-sm">Não calculado</span>
                  )}
                </div>
                <div className="px-5 py-4 bg-white border-t border-gray-100 flex justify-end">
                  <button 
                    onClick={() => setSelectedChallenge(item)}
                    className="flex items-center gap-2 bg-purple-50 hover:bg-purple-100 text-purple-700 px-4 py-2 rounded-lg font-bold text-sm transition-colors border border-purple-200"
                  >
                    <BarChart2 size={16} />
                    Ver Detalhes do Desafio
                  </button>
                </div>
                </div>
              ))}
            </div>
            {totalHistoryChallengesPages > 1 && (
              <div className="mt-8 flex justify-center items-center gap-4">
                <button
                  onClick={() => setHistoryChallengesPage(p => Math.max(1, p - 1))}
                  disabled={historyChallengesPage === 1}
                  className="flex items-center gap-1 px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft size={16} /> Anterior
                </button>
                <span className="text-sm font-medium text-gray-600">
                  Página {historyChallengesPage} de {totalHistoryChallengesPages}
                </span>
                <button
                  onClick={() => setHistoryChallengesPage(p => Math.min(totalHistoryChallengesPages, p + 1))}
                  disabled={historyChallengesPage === totalHistoryChallengesPages}
                  className="flex items-center gap-1 px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Próxima <ChevronRight size={16} />
                </button>
              </div>
            )}
          </>
        </div>
      )}
      
      {/* Modal Validação de Desafio (Step 3.3) */}
      {selectedChallenge && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-5xl overflow-hidden flex flex-col max-h-[95vh] border-t-8 border-purple-500">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-start bg-gray-50/50">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  Validação do Ciclo {selectedChallenge.cycle.cycleNumber}
                </h2>
                <p className="text-purple-600 font-medium">
                  Desafio: {selectedChallenge.challenge.title} | Persona: {selectedChallenge.persona.name}
                </p>
              </div>
              <button onClick={closeDialog} className="text-gray-400 hover:text-gray-600 bg-white rounded-full p-1 shadow-sm">
                <X size={20} />
              </button>
            </div>
            
            {alignmentScore !== null && !('validation' in selectedChallenge) ? (
               <div className="p-12 flex-1 flex flex-col items-center justify-center text-center">
                  <div className="w-32 h-32 rounded-full flex items-center justify-center mb-6 bg-gradient-to-tr from-purple-500 to-indigo-500 text-white shadow-lg shadow-purple-200">
                    <span className="text-4xl font-black">{alignmentScore}%</span>
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">Alinhamento Calculado!</h3>
                  {xpGained !== null && (
                    <div className="bg-green-100 text-green-800 px-4 py-2 rounded-full font-bold mb-4 animate-bounce inline-block">
                      🎉 +{xpGained} Sinergy XP!
                    </div>
                  )}
                  <p className="text-gray-600 max-w-md">
                    A IA analisou sua resposta e a consistência com a avaliação do gestor.
                    Este ciclo foi validado com sucesso e os resultados foram registrados.
                  </p>
               </div>
            ) : (
              <div className="flex flex-1 overflow-hidden">
                {/* Lado Esquerdo: Avaliações do Gestor */}
                <div className="w-1/2 border-r border-gray-200 p-6 overflow-y-auto bg-white">
                  <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
                    <FileText size={20} className="mr-2 text-purple-600" />
                    Avaliações do Gestor
                  </h3>
                  
                  {selectedChallenge.axes && selectedChallenge.evaluations && (
                    <div className="mb-6 h-64 bg-gray-50 rounded-xl p-4 border border-gray-100">
                      <ResponsiveContainer width="100%" height="100%">
                      <RadarChart cx="50%" cy="50%" outerRadius="70%" data={selectedChallenge?.axes?.map(axis => {
                        const ev = selectedChallenge?.evaluations?.find(e => e.axisId === axis.id);
                          return { subject: axis.name, score: ev ? ev.rating : 0 };
                        })}>
                          <PolarGrid />
                          <PolarAngleAxis dataKey="subject" tick={{fontSize: 10}} />
                          <PolarRadiusAxis angle={30} domain={[0, 5]} />
                          <Radar name="Avaliação" dataKey="score" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.5} />
                        </RadarChart>
                      </ResponsiveContainer>
                    </div>
                  )}

                  <div className="space-y-4">
                    {selectedChallenge?.axes?.map(axis => {
                      const ev = selectedChallenge?.evaluations?.find(e => e.axisId === axis.id);
                      if (!ev) return null;
                      
                      return (
                        <div key={axis.id} className="p-4 border border-gray-200 rounded-xl bg-gray-50">
                          <div className="flex justify-between items-start mb-2">
                            <h4 className="font-bold text-gray-900">{axis.name}</h4>
                            <div className="flex items-center space-x-1 bg-white px-2 py-1 rounded-md border border-gray-200 shadow-sm">
                              <Star size={14} className={ev.rating >= 4 ? "text-green-500 fill-green-500" : ev.rating <= 2 ? "text-red-500 fill-red-500" : "text-yellow-500 fill-yellow-500"} />
                              <span className="font-bold text-sm">{ev.rating} / 5</span>
                            </div>
                          </div>
                          
                          {ev.observation ? (
                            <div className="mt-2 text-sm text-gray-700 bg-white p-3 rounded border border-gray-100">
                              <span className="text-xs font-bold text-gray-400 block mb-1 uppercase">Observação:</span>
                              {ev.observation}
                            </div>
                          ) : (
                            <p className="text-xs text-gray-400 italic mt-2">Sem observações detalhadas.</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Lado Direito: Ações e Persona Projetada */}
                <div className="w-1/2 p-6 overflow-y-auto bg-gray-50/50 flex flex-col">
                  {selectedChallenge.projectedPersona && (
                    <div className="mb-6 bg-white p-5 rounded-xl border border-indigo-200 shadow-sm">
                      <div className="flex items-center space-x-2 mb-3">
                        <Sparkles size={20} className="text-indigo-600" />
                        <h4 className="font-bold text-indigo-900">Nova Persona Projetada pela IA</h4>
                      </div>
                      <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed bg-indigo-50/30 p-3 rounded border border-indigo-50">
                        {selectedChallenge.projectedPersona}
                      </p>
                    </div>
                  )}

                  <div className="mt-auto bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                    <h4 className="font-bold text-gray-900 mb-4 flex items-center">
                      <MessageSquare size={18} className="mr-2 text-gray-500"/>
                      Sua Validação
                    </h4>
                    
                    {'validation' in selectedChallenge ? (
                      <div className="flex flex-col gap-3">
                        <div className="flex items-center gap-2">
                           <span className="text-sm font-bold text-gray-700">Status:</span>
                           <span className={`px-2 py-1 rounded text-xs font-bold uppercase tracking-wider ${selectedChallenge.validation.status === 'ACCEPTED' ? 'bg-green-100 text-green-800' : selectedChallenge.validation.status === 'PARTIAL' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}`}>
                             {selectedChallenge.validation.status === 'ACCEPTED' ? 'Acatado' : selectedChallenge.validation.status === 'PARTIAL' ? 'Parcial' : 'Recusado'}
                           </span>
                        </div>
                        {selectedChallenge.validation.justification && (
                          <div>
                            <span className="text-sm font-bold text-gray-700 block mb-1">Justificativa:</span>
                            <p className="text-sm text-gray-800 bg-gray-50 p-3 rounded-lg border border-gray-200 whitespace-pre-wrap">{selectedChallenge.validation.justification}</p>
                          </div>
                        )}
                        <div className="mt-2 flex items-center gap-2">
                           <span className="text-sm font-bold text-gray-700">Alinhamento Calculado:</span>
                           <span className="text-lg font-black text-purple-600">{selectedChallenge.validation.alignmentScore}%</span>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="grid grid-cols-3 gap-2 mb-4">
                          <button onClick={() => setActionType('ACCEPT')} disabled={isSubmitting} className={`flex flex-col items-center justify-center p-3 rounded-lg border-2 ${actionType === 'ACCEPT' ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:border-green-300'} transition-colors disabled:opacity-50`}>
                            <span className="font-bold text-green-700 text-sm">Acatar</span>
                          </button>
                          <button onClick={() => setActionType('ADJUST')} disabled={isSubmitting} className={`flex flex-col items-center justify-center p-3 rounded-lg border-2 ${actionType === 'ADJUST' ? 'border-yellow-500 bg-yellow-50' : 'border-gray-200 hover:border-yellow-300'} transition-colors disabled:opacity-50`}>
                            <span className="font-bold text-yellow-700 text-sm">Acatar Parcial</span>
                          </button>
                          <button onClick={() => setActionType('REJECT')} disabled={isSubmitting} className={`flex flex-col items-center justify-center p-3 rounded-lg border-2 ${actionType === 'REJECT' ? 'border-red-500 bg-red-50' : 'border-gray-200 hover:border-red-300'} transition-colors disabled:opacity-50`}>
                            <span className="font-bold text-red-700 text-sm">Recusar</span>
                          </button>
                        </div>

                        {(actionType === 'ADJUST' || actionType === 'REJECT') && (
                          <div className="mb-4 animate-in slide-in-from-top-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Justificativa (Obrigatória)
                            </label>
                            <textarea 
                              value={justification}
                              onChange={(e) => setJustification(e.target.value)}
                              className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-purple-500 focus:border-purple-500 resize-none h-24"
                              placeholder="Por que você está concordando parcialmente ou recusando a avaliação?"
                            ></textarea>
                          </div>
                        )}

                        <div className="flex justify-end pt-2">
                          <button 
                            onClick={() => handleChallengeValidation(actionType === 'ACCEPT' ? 'ACCEPTED' : actionType === 'ADJUST' ? 'PARTIAL' : 'REJECTED')}
                            disabled={isSubmitting || !actionType || ((actionType === 'ADJUST' || actionType === 'REJECT') && !justification.trim())}
                            className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-lg font-bold shadow-sm disabled:opacity-50 transition-colors"
                          >
                            {isSubmitting ? 'Processando...' : 'Confirmar e Medir Alinhamento'}
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

        <div className="mt-12 mb-6">
          <h2 className="text-xl font-bold text-gray-800 flex items-center space-x-2">
            <span>Meu Histórico de Fechamentos</span>
          </h2>
          {historyClosureReports.length === 0 ? (
            <div className="mt-4 bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center text-gray-500">
              <p>Você ainda não possui relatórios de fechamento de desafios.</p>
              <p className="text-sm mt-2">Conclua seus desafios ativos para visualizar suas análises de evolução aqui!</p>
            </div>
          ) : (
            <>
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {paginatedHistoryClosureReports.map((item, idx) => (
                <div key={idx} className="bg-white rounded-xl shadow-sm border border-blue-200 overflow-hidden flex flex-col">
                <div className="p-5 border-b border-gray-100">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="text-xs font-bold text-blue-600 mb-1">FECHAMENTO DE DESAFIO</div>
                      <h3 className="font-bold text-lg text-gray-900 line-clamp-1">{item.challenge.title}</h3>
                      <p className="text-blue-600 text-sm font-medium">{item.persona.name}</p>
                    </div>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      item.report.collaboratorStatus === 'ACCEPTED' ? 'bg-green-100 text-green-800' :
                      item.report.collaboratorStatus === 'REJECTED' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {item.report.collaboratorStatus === 'ACCEPTED' ? 'ACATADO' : item.report.collaboratorStatus === 'REJECTED' ? 'RECUSADO' : item.report.collaboratorStatus}
                    </span>
                  </div>
                </div>
                <div className="p-5 flex-1 flex flex-col items-center justify-center bg-gray-50">
                   <FileText size={48} className="text-gray-300 mb-2" />
                   <p className="text-sm text-gray-500 font-medium">Relatório Assinado</p>
                </div>
                <div className="px-5 py-3 bg-white border-t border-gray-100 text-xs flex justify-end">
                  <button 
                    onClick={() => handleOpenClosureReport(item)}
                    className="text-blue-600 hover:text-blue-800 font-medium"
                  >
                    Ver relatório
                  </button>
                </div>
                </div>
              ))}
            </div>
            {totalHistoryClosureReportsPages > 1 && (
              <div className="mt-8 flex justify-center items-center gap-4">
                <button
                  onClick={() => setHistoryClosureReportsPage(p => Math.max(1, p - 1))}
                  disabled={historyClosureReportsPage === 1}
                  className="flex items-center gap-1 px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft size={16} /> Anterior
                </button>
                <span className="text-sm font-medium text-gray-600">
                  Página {historyClosureReportsPage} de {totalHistoryClosureReportsPages}
                </span>
                <button
                  onClick={() => setHistoryClosureReportsPage(p => Math.min(totalHistoryClosureReportsPages, p + 1))}
                  disabled={historyClosureReportsPage === totalHistoryClosureReportsPages}
                  className="flex items-center gap-1 px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Próxima <ChevronRight size={16} />
                </button>
              </div>
            )}
            </>
          )}
        </div>

      {/* Modal Relatório de Fechamento (Step 4.3) */}
      {selectedClosureReport !== null && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh] border-t-8 border-blue-500">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-start bg-gray-50/50">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                  <FileText className="text-blue-500" />
                  Relatório de Fechamento IA
                </h2>
                <p className="text-blue-600 font-medium">
                  Desafio: {selectedClosureReport.challenge.title} | Persona: {selectedClosureReport.persona.name}
                </p>
              </div>
              <button onClick={closeDialog} className="text-gray-400 hover:text-gray-600 bg-white rounded-full p-1 shadow-sm">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-8 overflow-y-auto flex-1 bg-gray-50/50">
              <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm mb-6">
                <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
                  <Sparkles size={20} className="mr-2 text-blue-600" />
                  Análise Comparativa e Plano de Desenvolvimento
                </h3>
                <div className="text-gray-700 leading-relaxed space-y-6">
                  {(() => {
                    if (!selectedClosureReport || !selectedClosureReport.report) return null;
                    let parsed = null;
                    try {
                      parsed = JSON.parse(selectedClosureReport.report.summaryText);
                      if (!parsed) throw new Error();
                    } catch (e) {
                      return <ReactMarkdown>{selectedClosureReport.report.summaryText || ''}</ReactMarkdown>;
                    }
                    return (
                      <>
                        <div className="bg-blue-50/50 p-5 rounded-lg border border-blue-100">
                          <h4 className="font-bold text-blue-900 mb-2">Resumo Analítico</h4>
                          <p className="text-sm text-gray-700">{parsed?.resumoAnalitico || ''}</p>
                        </div>
                        
                        <div>
                          <h4 className="font-bold text-gray-900 mb-3">Ações Recomendadas</h4>
                          <div className="space-y-3">
                            {parsed?.acoesRecomendadas?.map((acao: any, idx: number) => (
                              <div key={idx} className="p-4 bg-white border-l-4 border-blue-500 rounded-r-lg shadow-sm border border-gray-100">
                                <h5 className="font-bold text-blue-900">{acao?.titulo}</h5>
                                <p className="text-sm text-gray-600 mt-1">{acao?.descricao}</p>
                              </div>
                            ))}
                          </div>
                        </div>

                        {parsed?.indiceAcuracia && (
                          <div className="flex items-center gap-2 mt-4">
                            <span className="font-bold text-gray-700 text-sm">Índice de Acurácia:</span>
                            <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-xs font-bold">
                              {parsed.indiceAcuracia}%
                            </span>
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>
              </div>

              {selectedClosureReport.report?.collaboratorStatus === 'PENDING' ? (
                <div className="bg-blue-50 p-6 rounded-xl border border-blue-100 flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-blue-900 text-lg">Assinatura Digital</h4>
                    <p className="text-blue-700 text-sm mt-1">Ao acatar, você confirma que leu o relatório de fechamento deste desafio.</p>
                  </div>
                  <div className="flex gap-3">
                    <button 
                      onClick={() => handleSignClosureReport('REJECTED')}
                      disabled={isSubmitting}
                      className="px-6 py-2 border-2 border-red-200 bg-white text-red-600 font-bold rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
                    >
                      Recusar
                    </button>
                    <button 
                      onClick={() => handleSignClosureReport('ACCEPTED')}
                      disabled={isSubmitting}
                      className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-sm transition-colors flex items-center gap-2 disabled:opacity-50"
                    >
                      <Check size={18} />
                      Acatar Fechamento
                    </button>
                  </div>
                </div>
              ) : (
                <div className="bg-gray-50 p-6 rounded-xl border border-gray-200 flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-gray-900 text-lg">Status do Relatório</h4>
                    <p className="text-gray-600 text-sm mt-1">Este relatório já foi {selectedClosureReport.report.collaboratorStatus === 'ACCEPTED' ? 'acatado' : 'recusado'} por você.</p>
                  </div>
                  <div className={`px-4 py-2 rounded-lg font-bold flex items-center gap-2 ${selectedClosureReport.report.collaboratorStatus === 'ACCEPTED' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {selectedClosureReport.report.collaboratorStatus === 'ACCEPTED' ? (
                      <><Check size={18} /> Acatado</>
                    ) : (
                      <><X size={18} /> Recusado</>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

{/* Modal Detalhes da Persona */}
      {selectedPersona && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] border-t-8 border-orange-500">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-start bg-gray-50/50">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  {selectedPersona.latestVersion?.status === 'Normalizado por IA' ? 'Revisão de Persona' : 'Detalhes da Persona'}
                </h2>
                <p className="text-gray-500 font-medium">
                  {selectedPersona.latestVersion?.status === 'Normalizado por IA' ? 'Validar perfil criado pelo gestor' : `Status: ${selectedPersona.latestVersion?.status}`}
                </p>
              </div>
              <button onClick={closeDialog} className="text-gray-400 hover:text-gray-600 bg-white rounded-full p-1 shadow-sm">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1">
              <div className="mb-6">
                <h3 className="text-xl font-bold text-gray-900">{selectedPersona.name}</h3>
                <p className="text-indigo-600 font-medium">{selectedPersona.role}</p>
              </div>

              <div className="bg-indigo-50 p-5 rounded-xl border border-indigo-100 mb-6">
                <h4 className="text-sm font-bold text-indigo-800 uppercase tracking-wider mb-2 flex items-center space-x-2">
                  <UserIcon size={16} />
                  <span>Descrição da Persona</span>
                </h4>
                <div className="prose prose-sm max-w-none text-gray-800 whitespace-pre-wrap">
                  {selectedPersona.latestVersion?.textContent}
                </div>
              </div>
              
              {selectedPersona.latestVersion?.status === 'Normalizado por IA' && (
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                  <p className="text-sm text-gray-600 mb-4 font-medium">
                    Esta é a visão do seu gestor sobre o seu perfil profissional. Como você avalia esta descrição?
                  </p>
                  <div className="grid grid-cols-3 gap-3">
                    <button onClick={() => handleFeedback('ACCEPT')} disabled={isSubmitting} className="flex flex-col items-center justify-center p-3 rounded-lg border-2 border-green-200 bg-green-50 text-green-700 hover:bg-green-100 hover:border-green-300 transition-colors disabled:opacity-50">
                      <Check size={24} className="mb-1" />
                      <span className="font-bold">Aceitar</span>
                    </button>
                    <button onClick={() => setActionType('ADJUST')} disabled={isSubmitting} className={`flex flex-col items-center justify-center p-3 rounded-lg border-2 ${actionType === 'ADJUST' ? 'border-yellow-500 bg-yellow-100' : 'border-yellow-200 bg-yellow-50'} text-yellow-700 hover:bg-yellow-100 hover:border-yellow-300 transition-colors disabled:opacity-50`}>
                      <Edit2 size={24} className="mb-1" />
                      <span className="font-bold">Ajustar</span>
                    </button>
                    <button onClick={() => handleFeedback('REJECT')} disabled={isSubmitting} className="flex flex-col items-center justify-center p-3 rounded-lg border-2 border-red-200 bg-red-50 text-red-700 hover:bg-red-100 hover:border-red-300 transition-colors disabled:opacity-50">
                      <XCircle size={24} className="mb-1" />
                      <span className="font-bold">Recusar</span>
                    </button>
                  </div>

                  {actionType === 'ADJUST' && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Qual ajuste você sugere para esta persona?
                      </label>
                      <textarea 
                        value={justification}
                        onChange={(e) => setJustification(e.target.value)}
                        className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-orange-500 focus:border-orange-500"
                        rows={4}
                        placeholder="Descreva o que você gostaria de mudar..."
                      ></textarea>
                      <div className="mt-3 flex justify-end">
                        <button 
                          onClick={() => handleFeedback('ADJUST')}
                          disabled={isSubmitting || !justification.trim()}
                          className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg font-medium shadow-sm disabled:opacity-50"
                        >
                          {isSubmitting ? 'Enviando...' : 'Enviar Ajuste'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-gray-100 bg-white flex justify-end">
              <button
                onClick={closeDialog}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium transition-colors"
              >
                {selectedPersona.latestVersion?.status === 'Normalizado por IA' ? 'Cancelar' : 'Fechar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
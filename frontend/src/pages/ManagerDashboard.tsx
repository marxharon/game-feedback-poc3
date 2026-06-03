import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts';
import { Plus, X, User as UserIcon, Edit2, Trash2, Target, PlusCircle, CheckCircle, Clock, CalendarDays, Play, BarChart3, Eye, Sparkles, ArrowRight, Award, Trophy, Medal, ChevronLeft, ChevronRight } from 'lucide-react';

interface PersonaVersion {
  id: number;
  personaId: number;
  versionNumber: number;
  textContent: string;
  status: string;
  feedback?: string;
  createdAt: string;
}

interface Persona {
  id: number;
  name: string;
  role: string;
  managerId: number;
  collaboratorId?: number;
  createdAt: string;
  latestVersion?: PersonaVersion;
  versions?: PersonaVersion[];
}

interface Axis {
  id?: number;
  name: string;
  type: string;
  description: string;
}

interface Challenge {
  id: number;
  title: string;
  description: string;
  status: string;
  personaIds: number[];
  axes: Axis[];
  deadline?: string;
  numberOfCycles: number;
  currentCycle?: number;
  evaluatedPersonaIds?: number[];
}

interface EvaluationData {
  id: number;
  challengeId: number;
  cycleId: number;
  personaId: number;
  axisId: number;
  managerId: number;
  rating: number;
  observation?: string;
  createdAt: string;
}

const formatStatus = (status?: string) => {
  if (status === 'Em rascunho') return 'Em rascunho';
  if (status === 'Normalizado por IA') return 'Normalizado via IA';
  if (status === 'VALIDADA') return 'Validada pelo Colaborador';
  if (status === 'RECUSADA') return 'Recusada pelo Colaborador';
  if (status === 'AJUSTADA') return 'Ajustada pela IA (Consenso)';
  return status || 'Em rascunho';
};

const formatChallengeStatus = (status?: string) => {
  if (status === 'DRAFT') return 'Rascunho';
  if (status === 'PREPARATION') return 'Preparação';
  if (status === 'RUNNING') return 'Em andamento';
  if (status === 'FINISHER_PENDING') return 'Aguardando Fechamento';
  if (status === 'CLOSED') return 'Concluído';
  return status || '';
};

export function ManagerDashboard() {
  const { user, token } = useAuthStore();
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isChallengeModalOpen, setIsChallengeModalOpen] = useState(false);
  const [editingPersonaId, setEditingPersonaId] = useState<number | null>(null);
  const [editingChallengeId, setEditingChallengeId] = useState<number | null>(null);
  const [selectedPersona, setSelectedPersona] = useState<Persona | null>(null);
  const [loading, setLoading] = useState(false);
  const [collaborators, setCollaborators] = useState<{id: number, name: string, email: string}[]>([]);

  // Form states
  const [formData, setFormData] = useState({ name: '', role: '', baseText: '', collaboratorId: '' });

  // Tab state
  const [activeTab, setActiveTab] = useState<'personas' | 'challenges' | 'ranking'>('personas');
  const [ranking, setRanking] = useState<{userId: number, xp: number, level: number, name: string, role: string}[]>([]);
  const [personasPage, setPersonasPage] = useState(1);
  const [challengesPage, setChallengesPage] = useState(1);
  const ITEMS_PER_PAGE = 6;

  // Challenge Form states
  const [challengeTitle, setChallengeTitle] = useState('');
  const [challengeDescription, setChallengeDescription] = useState('');
  const [challengeDeadline, setChallengeDeadline] = useState('');
  const [challengeCycles, setChallengeCycles] = useState(1);
  const [selectedPersonasIds, setSelectedPersonasIds] = useState<number[]>([]);
  const [challengeAxes, setChallengeAxes] = useState<Axis[]>([]);
  const [challengeStep, setChallengeStep] = useState<1 | 2 | 3>(1);
  const [isAiThinking, setIsAiThinking] = useState(false);

  // Evaluation states
  const [isEvaluateModalOpen, setIsEvaluateModalOpen] = useState(false);

  const [isFinisherModalOpen, setIsFinisherModalOpen] = useState(false);
  const [closureReport, setClosureReport] = useState<any | null>(null);

  const [activeChallengeForEval, setActiveChallengeForEval] = useState<Challenge | null>(null);
  const [selectedPersonaForEval, setSelectedPersonaForEval] = useState<number | null>(null);
  const [evaluationsDict, setEvaluationsDict] = useState<Record<number, {axisId: number, rating: number, observation: string}[]>>({});
  const [evaluatedPersonas, setEvaluatedPersonas] = useState<Set<number>>(new Set());
  const [projectedPersonaFeedback, setProjectedPersonaFeedback] = useState<{text: string, isLastPersona: boolean, newEvaluatedIds: number[]} | null>(null);

  // View Evaluations State
  const [isViewEvaluationsModalOpen, setIsViewEvaluationsModalOpen] = useState(false);
  const [viewChallengeData, setViewChallengeData] = useState<{evaluations: EvaluationData[], cycles: any[], projectedPersonas: any[], validations?: any[]}>({ evaluations: [], cycles: [], projectedPersonas: [] });
  const [activeViewCycle, setActiveViewCycle] = useState<number | null>(null);
  const [selectedViewPersonaId, setSelectedViewPersonaId] = useState<number | null>(null);
  const [isViewClosureReportsModalOpen, setIsViewClosureReportsModalOpen] = useState(false);
  const [closureReportsData, setClosureReportsData] = useState<{reports: any[], finalEvaluations: any[]} | null>(null);
  const [gamificationInfo, setGamificationInfo] = useState<{gamification: {xp: number, level: number}, badges: any[]} | null>(null);

  const fetchPersonas = async () => {
    try {
      const res = await fetch('http://localhost:3001/personas', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setPersonas(data);
      }
    } catch (err) {
      console.error('Error fetching personas:', err);
    }
  };

  const handleViewClosureReports = async (challenge: Challenge) => {
    try {
      const res = await fetch(`http://localhost:3001/challenges/${challenge.id}/closure-reports`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setClosureReportsData(data);
        setActiveChallengeForEval(challenge);
        if (challenge.personaIds.length > 0) {
          setSelectedViewPersonaId(challenge.personaIds[0]);
        }
        setIsViewClosureReportsModalOpen(true);
      }
    } catch (err) {
      console.error('Error fetching closure reports:', err);
    }
  };

  const fetchChallenges = async () => {
    try {
      const res = await fetch('http://localhost:3001/challenges', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setChallenges(data);
      }
    } catch (err) {
      console.error('Error fetching challenges:', err);
    }
  };

  const fetchCollaborators = async () => {
    try {
      const res = await fetch('http://localhost:3001/users/collaborators', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setCollaborators(data);
      }
    } catch (err) {
      console.error('Error fetching collaborators:', err);
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
      fetchPersonas();
      fetchChallenges();
      fetchCollaborators();
      fetchGamification();
      fetchRanking();
    }
  }, [token]);

  const paginatedPersonas = personas.slice((personasPage - 1) * ITEMS_PER_PAGE, personasPage * ITEMS_PER_PAGE);
  const totalPersonaPages = Math.ceil(personas.length / ITEMS_PER_PAGE);

  const paginatedChallenges = challenges.slice((challengesPage - 1) * ITEMS_PER_PAGE, challengesPage * ITEMS_PER_PAGE);
  const totalChallengePages = Math.ceil(challenges.length / ITEMS_PER_PAGE);

  useEffect(() => {
    if (totalPersonaPages > 0 && personasPage > totalPersonaPages) {
      setPersonasPage(totalPersonaPages);
    }
  }, [totalPersonaPages, personasPage]);

  useEffect(() => {
    if (totalChallengePages > 0 && challengesPage > totalChallengePages) {
      setChallengesPage(totalChallengePages);
    }
  }, [totalChallengePages, challengesPage]);

  const openCreateModal = () => {
    setEditingPersonaId(null);
    setFormData({ name: '', role: '', baseText: '', collaboratorId: '' });
    setIsModalOpen(true);
  };

  const openEditModal = (persona: Persona) => {
    setEditingPersonaId(persona.id);
    const textToEdit = persona.latestVersion?.textContent || '';
    setFormData({
      name: persona.name,
      role: persona.role,
      baseText: textToEdit,
      collaboratorId: persona.collaboratorId ? String(persona.collaboratorId) : ''
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Tem certeza que deseja excluir esta persona?')) return;
    try {
      const res = await fetch(`http://localhost:3001/personas/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        fetchPersonas();
      }
    } catch (err) {
      console.error('Error deleting persona:', err);
    }
  };

  const handleSavePersona = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const url = editingPersonaId 
        ? `http://localhost:3001/personas/${editingPersonaId}`
        : 'http://localhost:3001/personas';
      const method = editingPersonaId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify(formData)
      });
      
      if (res.ok) {
        setIsModalOpen(false);
        setFormData({ name: '', role: '', baseText: '', collaboratorId: '' });
        fetchPersonas();
      } else {
        console.error('Failed to save persona');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleContinueAfterProjection = () => {
    if (!projectedPersonaFeedback || !activeChallengeForEval) return;
    
    setEvaluatedPersonas(new Set(projectedPersonaFeedback.newEvaluatedIds));
    
    if (projectedPersonaFeedback.isLastPersona) {
      setIsEvaluateModalOpen(false);
      fetchChallenges();
    } else {
      const unevaluated = activeChallengeForEval.personaIds.filter(pid => !projectedPersonaFeedback.newEvaluatedIds.includes(pid));
      if (unevaluated.length > 0) {
        setSelectedPersonaForEval(unevaluated[0]);
      }
      fetchChallenges();
    }
    setProjectedPersonaFeedback(null);
  };

  const openCreateChallengeModal = () => {
    setEditingChallengeId(null);
    setChallengeTitle('');
    setChallengeDescription('');
    setChallengeDeadline('');
    setChallengeCycles(1);
    setSelectedPersonasIds([]);
    setChallengeAxes([]);
    setChallengeStep(1);
    setIsChallengeModalOpen(true);
  };

  const openEditChallengeModal = (challenge: Challenge) => {
    setEditingChallengeId(challenge.id);
    setChallengeTitle(challenge.title);
    setChallengeDescription(challenge.description);
    setChallengeDeadline(challenge.deadline ? new Date(challenge.deadline).toISOString().split('T')[0] : '');
    setChallengeCycles(challenge.numberOfCycles || 1);
    setSelectedPersonasIds(challenge.personaIds || []);
    setChallengeAxes(challenge.axes || []);
    if (challenge.axes && challenge.axes.length > 0) {
      setChallengeStep(3);
    } else {
      setChallengeStep(1);
    }
    setIsChallengeModalOpen(true);
  };

  const handleDirectEditSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedPersonasIds.length === 0) {
      alert("Selecione pelo menos uma persona para o desafio.");
      return;
    }
    if (challengeAxes.length === 0) {
      alert("Adicione pelo menos um eixo de avaliação.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`http://localhost:3001/challenges/${editingChallengeId}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({
          title: challengeTitle,
          description: challengeDescription,
          personaIds: selectedPersonasIds,
          axes: challengeAxes,
          deadline: challengeDeadline ? new Date(challengeDeadline).toISOString() : null,
          numberOfCycles: challengeCycles
        })
      });
      if (res.ok) {
        setIsChallengeModalOpen(false);
        setChallengeTitle('');
        setChallengeDescription('');
        setSelectedPersonasIds([]);
        setChallengeAxes([]);
        fetchChallenges();
      } else {
        console.error('Failed to update challenge');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };


  const handleDeleteChallenge = async (id: number) => {
    if (!window.confirm('Tem certeza que deseja excluir este desafio?')) return;
    try {
      const res = await fetch(`http://localhost:3001/challenges/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        fetchChallenges();
      }
    } catch (err) {
      console.error('Error deleting challenge:', err);
    }
  };

  const handleSuggestWithAI = async () => {
    setIsAiThinking(true);
    
    try {
      // First, save the draft
      const draftUrl = editingChallengeId 
        ? `http://localhost:3001/challenges/${editingChallengeId}`
        : 'http://localhost:3001/challenges';
      const draftMethod = editingChallengeId ? 'PUT' : 'POST';

      const draftRes = await fetch(draftUrl, {
        method: draftMethod,
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({
          title: challengeTitle,
          description: challengeDescription,
          personaIds: selectedPersonasIds,
          axes: [],
          deadline: challengeDeadline ? new Date(challengeDeadline).toISOString() : null,
          numberOfCycles: challengeCycles
        })
      });

      if (draftRes.ok) {
        if (!editingChallengeId) {
          const draftData = await draftRes.json();
          setEditingChallengeId(draftData.challenge.id);
        }
        setChallengeStep(2);
      } else {
        console.error('Failed to save challenge draft');
        setIsAiThinking(false);
        return;
      }

      const selectedPersonasData = personas.filter(p => selectedPersonasIds.includes(p.id));
      const personasInfo = selectedPersonasData.map(p => `${p.name} (${p.role}) - Características: ${p.latestVersion?.textContent || 'Nenhuma característica definida.'}`);
      
      const res = await fetch('http://localhost:8000/suggest-challenge-setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: challengeTitle,
          description: challengeDescription,
          personas_info: personasInfo
        })
      });
      
      if (res.ok) {
        const data = await res.json();
        setChallengeAxes(data.suggested_axes || []);
      }
    } catch (err) {
      console.error('Error in step 1 / AI service:', err);
    } finally {
      setIsAiThinking(false);
    }
  };

  const handleSaveChallenge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedPersonasIds.length === 0) {
      alert("Selecione pelo menos uma persona para o desafio.");
      return;
    }
    if (challengeAxes.length === 0) {
      alert("Adicione pelo menos um eixo de avaliação.");
      return;
    }
    setLoading(true);
    try {
      if (!editingChallengeId) {
        alert("Erro: rascunho do desafio não encontrado.");
        setLoading(false);
        return;
      }

      const url = `http://localhost:3001/challenges/${editingChallengeId}/finalize-setup`;
      
      const res = await fetch(url, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({
          axes: challengeAxes,
          deadline: challengeDeadline ? new Date(challengeDeadline).toISOString() : null,
          numberOfCycles: challengeCycles
        })
      });
      if (res.ok) {
        setIsChallengeModalOpen(false);
        setChallengeTitle('');
        setChallengeDescription('');
        setSelectedPersonasIds([]);
        setChallengeAxes([]);
        fetchChallenges();
      } else {
        console.error('Failed to finalize challenge setup');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };


  const handleAddAxis = () => {
    setChallengeAxes([...challengeAxes, { name: '', type: 'governança', description: '' }]);
  };

  const handleUpdateAxis = (index: number, field: string, value: string) => {
    const newAxes = [...challengeAxes];
    newAxes[index] = { ...newAxes[index], [field]: value };
    setChallengeAxes(newAxes);
  };

  const handleRemoveAxis = (index: number) => {
    setChallengeAxes(challengeAxes.filter((_, i) => i !== index));
  };

  const handleStartChallenge = async (id: number) => {
    if (!window.confirm('Tem certeza que deseja iniciar o desafio?')) return;
    try {
      const res = await fetch(`http://localhost:3001/challenges/${id}/start`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        fetchChallenges();
      }
    } catch (err) {
      console.error('Error starting challenge:', err);
    }
  };

  const handleOpenFinisherModal = async (challenge: Challenge) => {
    setActiveChallengeForEval(challenge);
    try {
      const res = await fetch("http://localhost:3001/challenges/" + challenge.id + "/evaluations", {
        headers: { Authorization: "Bearer " + token }
      });
      if (res.ok) {
        const data = await res.json();
        const sortedCycles = data.cycles.sort((a: any, b: any) => b.cycleNumber - a.cycleNumber);
        const lastCycleId = sortedCycles.length > 0 ? sortedCycles[0].id : null;
        const lastEvals = data.evaluations.filter((e: any) => e.cycleId === lastCycleId);
        const initialDict: Record<number, any[]> = {};
        challenge.personaIds.forEach(pid => {
          const personaEvals = lastEvals.filter((e: any) => e.personaId === pid);
          initialDict[pid] = challenge.axes.map(a => {
            const existing = personaEvals.find((e: any) => e.axisId === a.id);
            return { axisId: a.id || 0, rating: existing ? existing.rating : 3, observation: existing ? existing.observation : '' };
          });
        });
        setEvaluationsDict(initialDict);
        setEvaluatedPersonas(new Set());
        setSelectedPersonaForEval(challenge.personaIds[0] || null);
        setIsFinisherModalOpen(true);
      }
    } catch (err) {
      console.error('Error', err);
    }
  };
  const handleSaveFinalEvaluation = async () => {
    if (!activeChallengeForEval || !selectedPersonaForEval) return;
    setLoading(true);
    try {
      const pEvals = evaluationsDict[selectedPersonaForEval as number] || [];
      const res = await fetch("http://localhost:3001/challenges/" + activeChallengeForEval.id + "/final-evaluation", {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: "Bearer " + token },
        body: JSON.stringify({ personaId: selectedPersonaForEval, evaluationsData: pEvals })
      });
      if (res.ok) {
        const data = await res.json();
        const newEvaluated = new Set(evaluatedPersonas);
        newEvaluated.add(selectedPersonaForEval);
        setEvaluatedPersonas(newEvaluated);
        setClosureReport({ text: data.reportText, isLastPersona: newEvaluated.size >= activeChallengeForEval.personaIds.length || data.isLastPersona });
      }
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };
  const handleContinueAfterClosure = () => {
    if (!closureReport || !activeChallengeForEval) return;
    if (closureReport.isLastPersona) { setIsFinisherModalOpen(false); fetchChallenges(); }
    else {
      const unevaluated = activeChallengeForEval.personaIds.filter(pid => !evaluatedPersonas.has(pid));
      if (unevaluated.length > 0) setSelectedPersonaForEval(unevaluated[0]);
    }
    setClosureReport(null);
  };

  const handleOpenEvaluateModal = async (challenge: Challenge) => {
    setActiveChallengeForEval(challenge);

    // Fetch existing evaluations for this challenge
    try {
      const res = await fetch(`http://localhost:3001/challenges/${challenge.id}/evaluations`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();

        // Find the current cycle from backend data
        const sortedCycles = data.cycles.sort((a: any, b: any) => b.cycleNumber - a.cycleNumber);
        const currentCycleId = sortedCycles.length > 0 ? sortedCycles[0].id : null;

        const currentEvals = data.evaluations.filter((e: any) => e.cycleId === currentCycleId);
        const alreadyEvaluatedIds = Array.from(new Set(currentEvals.map((e: any) => e.personaId))) as number[];

        const alreadyEvaluated = new Set(alreadyEvaluatedIds);
        setEvaluatedPersonas(alreadyEvaluated);

        const unevaluated = challenge.personaIds.filter(pid => !alreadyEvaluated.has(pid));
        if (unevaluated.length > 0) {
          setSelectedPersonaForEval(unevaluated[0]);
        } else if (challenge.personaIds && challenge.personaIds.length > 0) {
          setSelectedPersonaForEval(challenge.personaIds[0]);
        }

        const initialDict: Record<number, {axisId: number, rating: number, observation: string}[]> = {};
        challenge.personaIds.forEach(pid => {
          // Check if we have evaluations for this persona in the current cycle
          const personaEvals = currentEvals.filter((e: any) => e.personaId === pid);

          initialDict[pid] = challenge.axes.map(a => {
            const existing = personaEvals.find((e: any) => e.axisId === a.id);
            return { 
              axisId: a.id || 0, 
              rating: existing ? existing.rating : 3, 
              observation: existing ? existing.observation : '' 
            };
          });
        });
        setEvaluationsDict(initialDict);
      }
    } catch (err) {
      console.error('Error fetching evaluations for edit:', err);
    }

    setIsEvaluateModalOpen(true);
  };

  const handleViewEvaluations = async (challenge: Challenge) => {
    try {
      const res = await fetch(`http://localhost:3001/challenges/${challenge.id}/evaluations`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setViewChallengeData(data);
        setActiveChallengeForEval(challenge);

        // set active cycle to the last one
        const sortedCycles = data.cycles.sort((a: any, b: any) => b.cycleNumber - a.cycleNumber);
        if (sortedCycles.length > 0) {
          setActiveViewCycle(sortedCycles[0].id);
        }

        if (challenge.personaIds.length > 0) {
          setSelectedViewPersonaId(challenge.personaIds[0]);
        }

        setIsViewEvaluationsModalOpen(true);
      }
    } catch (err) {
      console.error('Error fetching evaluations:', err);
    }
  };

  const handleEvaluationChange = (axisId: number, field: 'rating' | 'observation', value: string | number) => {    if (!selectedPersonaForEval) return;
    setEvaluationsDict(prev => {
      const pEvals = prev[selectedPersonaForEval] || [];
      return {
        ...prev,
        [selectedPersonaForEval]: pEvals.map(ev => 
          ev.axisId === axisId ? { ...ev, [field]: value } : ev
        )
      };
    });
  };

  const handleSaveEvaluation = async () => {
    if (!activeChallengeForEval || !selectedPersonaForEval) return;
    setLoading(true);
    try {
      const pEvals = evaluationsDict[selectedPersonaForEval as number] || [];
      const res = await fetch(`http://localhost:3001/challenges/${activeChallengeForEval.id}/evaluate`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({
          personaId: selectedPersonaForEval,
          evaluationsData: pEvals
        })
      });
      if (res.ok) {
        const data = await res.json();
        
        const newEvaluated = new Set(evaluatedPersonas);
        newEvaluated.add(selectedPersonaForEval);
        
        // Step 3.2: Show projected persona feedback instead of alert
        setProjectedPersonaFeedback({
          text: data.projectedPersona,
          isLastPersona: newEvaluated.size >= activeChallengeForEval.personaIds.length || data.isLastPersona,
          newEvaluatedIds: Array.from(newEvaluated)
        });
        
      } else {
        console.error('Failed to save evaluation');
      }
    } catch (err) {
      console.error('Error saving evaluation:', err);
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="max-w-6xl mx-auto">
      <header className="mb-8">
        <div className="flex justify-between items-end mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Olá, Gestor {user?.name?.split(' ')[0]}!</h1>
            <p className="text-gray-500 mt-2">Gerencie as personas da sua equipe e crie desafios.</p>
          </div>
        {gamificationInfo && (
          <div className="bg-white px-5 py-3 rounded-xl shadow-sm border border-indigo-100 flex items-center gap-4 animate-in fade-in zoom-in duration-500">
            <div className="w-12 h-12 bg-gradient-to-tr from-indigo-100 to-blue-100 rounded-full flex items-center justify-center text-indigo-700 font-black text-xl shadow-inner border border-indigo-200">
              L{gamificationInfo.gamification.level}
            </div>
            <div>
              <div className="flex justify-between text-xs font-bold mb-1">
                <span className="text-gray-700 uppercase tracking-wide">Mentor Liderança</span>
                <span className="text-indigo-600">{gamificationInfo.gamification.xp} / {gamificationInfo.gamification.level * 100} XP</span>
              </div>
              <div className="w-48 h-2.5 bg-gray-100 rounded-full overflow-hidden shadow-inner">
                <div className="h-full bg-gradient-to-r from-indigo-500 to-blue-500 rounded-full relative" style={{ width: `${(gamificationInfo.gamification.xp % 100)}%` }}>
                  <div className="absolute top-0 right-0 bottom-0 left-0 bg-white/20 animate-pulse"></div>
                </div>
              </div>
            </div>
            {gamificationInfo.badges && gamificationInfo.badges.length > 0 && (
              <div className="flex gap-2 ml-2 pl-4 border-l border-indigo-100 flex-wrap max-w-[200px]">
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
        </div>
        
        <div className="flex space-x-4 border-b border-gray-200">
          <button 
            onClick={() => setActiveTab('personas')}
            className={`py-2 px-4 border-b-2 font-medium text-sm transition-colors ${activeTab === 'personas' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
          >
            Minhas Personas
          </button>
          <button 
            onClick={() => setActiveTab('challenges')}
            className={`py-2 px-4 border-b-2 font-medium text-sm transition-colors ${activeTab === 'challenges' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
          >
            Desafios
          </button>
          <button 
            onClick={() => setActiveTab('ranking')}
            className={`py-2 px-4 border-b-2 font-medium text-sm transition-colors ${activeTab === 'ranking' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
          >
            Ranking da Equipe
          </button>
        </div>
      </header>

      {activeTab === 'ranking' ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-indigo-50 to-white flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                <Trophy className="text-yellow-500" size={28} />
                Ranking de Gamificação
              </h2>
              <p className="text-gray-500 text-sm mt-1">Veja os líderes de engajamento e sinergia da equipe.</p>
            </div>
            <div className="bg-white px-4 py-2 rounded-lg shadow-sm border border-gray-200 text-center">
              <p className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-1">Seu XP Total</p>
              <p className="text-xl font-black text-indigo-600">{gamificationInfo?.gamification.xp || 0}</p>
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
                    <li key={userRank.userId} className={`flex items-center justify-between p-6 transition-colors ${isMe ? 'bg-indigo-50/50' : 'hover:bg-gray-50'}`}>
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
                            {isMe && <span className="bg-indigo-100 text-indigo-800 text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider">Você</span>}
                          </h3>
                          <p className="text-sm text-gray-500 flex items-center gap-1">
                            {userRank.role === 'MANAGER' || userRank.role === 'ADMIN' ? 'Gestor / Mentor' : 'Colaborador'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="text-right hidden md:block">
                          <p className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-1">Nível</p>
                          <div className="bg-indigo-100 text-indigo-800 font-bold px-3 py-1 rounded-full text-sm inline-block">
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
      ) : activeTab === 'personas' ? (
        <>
          <div className="mb-4 flex justify-end">
            <button 
              onClick={openCreateModal}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors shadow-sm"
            >
              <Plus size={20} />
              <span>Nova Persona</span>
            </button>
          </div>
          {personas.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center text-gray-500">
              <div className="flex justify-center mb-4">
                <div className="bg-indigo-50 p-4 rounded-full text-indigo-300">
                  <UserIcon size={48} />
                </div>
              </div>
              <p className="text-lg font-medium text-gray-900">Nenhuma persona cadastrada</p>
              <p className="text-sm mt-2 max-w-md mx-auto">Crie a primeira persona para começar a configurar os desafios de alinhamento com sua equipe.</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {paginatedPersonas.map(persona => (
                <div key={persona.id} className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden flex flex-col hover:shadow-lg transition-all duration-300">
                  <div className={`p-4 border-b ${
                    persona.latestVersion?.status === 'VALIDADA' ? 'bg-green-50 border-green-100' :
                    persona.latestVersion?.status === 'RECUSADA' ? 'bg-red-50 border-red-100' :
                    persona.latestVersion?.status === 'AJUSTADA' ? 'bg-yellow-50 border-yellow-100' :
                    persona.latestVersion?.status === 'Normalizado por IA' ? 'bg-indigo-50 border-indigo-100' :
                    'bg-gray-50 border-gray-100'
                  }`}>
                    <div className="flex justify-between items-start mb-2">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${
                        persona.latestVersion?.status === 'VALIDADA' ? 'bg-green-600 text-white' :
                        persona.latestVersion?.status === 'RECUSADA' ? 'bg-red-600 text-white' :
                        persona.latestVersion?.status === 'AJUSTADA' ? 'bg-yellow-600 text-white' :
                        persona.latestVersion?.status === 'Normalizado por IA' ? 'bg-indigo-600 text-white' :
                        'bg-gray-600 text-white'
                      }`}>
                        {formatStatus(persona.latestVersion?.status)}
                      </span>
                      <div className="flex space-x-1">
                        <button onClick={() => openEditModal(persona)} className="p-1.5 text-gray-500 hover:text-indigo-600 hover:bg-white rounded-md transition-colors">
                          <Edit2 size={16} />
                        </button>
                        <button onClick={() => handleDelete(persona.id)} className="p-1.5 text-gray-500 hover:text-red-500 hover:bg-white rounded-md transition-colors">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                    <h3 className="font-extrabold text-xl text-gray-900 leading-tight mb-1">{persona.name}</h3>
                    <div className="flex items-center text-xs text-gray-600 font-medium">
                      <UserIcon size={12} className="mr-1 text-gray-400" />
                      {persona.role}
                    </div>
                  </div>

                  <div className="p-5 flex-1 flex flex-col">
                    <p className="text-sm text-gray-600 line-clamp-4 flex-1">
                      {persona.latestVersion?.textContent || 'Sem descrição.'}
                    </p>
                  </div>
                  
                  <div className="px-5 py-4 bg-gray-50/50 border-t border-gray-100 flex flex-col gap-3">
                    <div className="flex justify-between items-center text-sm">
                      <div className="flex items-center text-gray-600 font-medium">
                        <Clock size={16} className="mr-1.5 text-gray-400" />
                        Versão {persona.latestVersion?.versionNumber || 1}
                      </div>
                      {persona.collaboratorId && (
                        <span className="text-xs text-indigo-700 font-bold bg-indigo-100 px-2 py-1 rounded">Vinculada</span>
                      )}
                    </div>
                    
                    <button 
                      onClick={() => setSelectedPersona(persona)}
                      className="w-full flex items-center justify-center py-2 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm font-bold hover:bg-gray-50 transition-colors shadow-sm"
                    >
                      <Eye size={16} className="mr-1.5" /> Ver Detalhes e Histórico
                    </button>
                  </div>
                </div>
                ))}
              </div>
              {totalPersonaPages > 1 && (
                <div className="mt-8 flex justify-center items-center gap-4">
                  <button
                    onClick={() => setPersonasPage(p => Math.max(1, p - 1))}
                    disabled={personasPage === 1}
                    className="flex items-center gap-1 px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft size={16} />
                    Anterior
                  </button>
                  <span className="text-sm font-medium text-gray-600">
                    Página {personasPage} de {totalPersonaPages}
                  </span>
                  <button
                    onClick={() => setPersonasPage(p => Math.min(totalPersonaPages, p + 1))}
                    disabled={personasPage === totalPersonaPages}
                    className="flex items-center gap-1 px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Próxima
                    <ChevronRight size={16} />
                  </button>
                </div>
              )}
            </>
          )}
        </>
      ) : (
        <>
          <div className="mb-4 flex justify-end">
            <button 
              onClick={openCreateChallengeModal}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors shadow-sm"
            >
              <Target size={20} />
              <span>Criar Novo Desafio</span>
            </button>
          </div>
          {challenges.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center text-gray-500">
              <div className="flex justify-center mb-4">
                <div className="bg-indigo-50 p-4 rounded-full text-indigo-300">
                  <Target size={48} />
                </div>
              </div>
              <p className="text-lg font-medium text-gray-900">Nenhum desafio cadastrado</p>
              <p className="text-sm mt-2 max-w-md mx-auto">Crie o primeiro desafio e vincule personas para avaliar sua equipe.</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {paginatedChallenges.map(challenge => (
                <div key={challenge.id} className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden flex flex-col hover:shadow-lg transition-all duration-300">
                  <div className={`p-4 border-b ${
                    challenge.status === 'RUNNING' ? 'bg-indigo-50 border-indigo-100' :
                    challenge.status === 'CLOSED' ? 'bg-green-50 border-green-100' :
                    'bg-gray-50 border-gray-100'
                  }`}>
                    <div className="flex justify-between items-start mb-2">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${
                        challenge.status === 'RUNNING' ? 'bg-indigo-600 text-white' :
                        challenge.status === 'CLOSED' ? 'bg-green-600 text-white' :
                        'bg-gray-600 text-white'
                      }`}>
                        {formatChallengeStatus(challenge.status)}
                      </span>
                      <div className="flex space-x-1">
                        <button onClick={() => openEditChallengeModal(challenge)} className="p-1.5 text-gray-500 hover:text-indigo-600 hover:bg-white rounded-md transition-colors">
                          <Edit2 size={16} />
                        </button>
                        <button onClick={() => handleDeleteChallenge(challenge.id)} className="p-1.5 text-gray-500 hover:text-red-500 hover:bg-white rounded-md transition-colors">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                    <h3 className="font-extrabold text-xl text-gray-900 leading-tight mb-1">{challenge.title}</h3>
                    {challenge.deadline && (
                      <div className="flex items-center text-xs text-gray-500 font-medium">
                        <Clock size={12} className="mr-1" />
                        Encerra em: {new Date(challenge.deadline).toLocaleDateString()}
                      </div>
                    )}
                  </div>

                  <div className="p-5 flex-1 flex flex-col">
                    <p className="text-sm text-gray-600 line-clamp-3 mb-4 flex-1">
                      {challenge.description}
                    </p>
                    
                    <div className="mb-4">
                      <div className="text-xs font-bold text-gray-400 mb-2 uppercase tracking-wider">Eixos de Avaliação</div>
                      <div className="flex flex-wrap gap-1.5">
                        {challenge.axes && challenge.axes.map((axis, i) => (
                          <span key={i} className="px-2 py-1 bg-gray-100 border border-gray-200 rounded text-xs font-medium text-gray-700">
                            {axis.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                  
                  <div className="px-5 py-4 bg-gray-50/50 border-t border-gray-100 flex flex-col gap-3">
                    <div className="flex justify-between items-center text-sm">
                      <div className="flex items-center text-gray-600 font-medium">
                        <UserIcon size={16} className="mr-1.5 text-gray-400" />
                        {challenge.personaIds?.length || 0} Personas
                      </div>
                      <div className="flex items-center text-gray-600 font-medium">
                        <CalendarDays size={16} className="mr-1.5 text-gray-400" />
                        {challenge.status === 'RUNNING' ? (
                          <span className="text-indigo-700">Ciclo {challenge.currentCycle} de {challenge.numberOfCycles}</span>
                        ) : challenge.status === 'CLOSED' ? (
                          <span className="text-green-700">{challenge.numberOfCycles} Ciclos</span>
                        ) : (
                          <span>{challenge.numberOfCycles} Ciclos</span>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-2 mt-1">
                      {challenge.status === 'PREPARATION' && (
                        <button onClick={() => handleStartChallenge(challenge.id)} className="flex-1 flex items-center justify-center py-2 bg-green-600 text-white rounded-lg text-sm font-bold hover:bg-green-700 transition-colors shadow-sm">
                          <Play size={16} className="mr-1.5" /> Iniciar Desafio
                        </button>
                      )}
                      
                      {(challenge.status === 'RUNNING' || challenge.status === 'CLOSED') && (
                        <button onClick={() => handleOpenEvaluateModal(challenge)} className="flex-1 flex items-center justify-center py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700 transition-colors shadow-sm">
                          <BarChart3 size={16} className="mr-1.5" /> Avaliar Ciclo {challenge.currentCycle}
                        </button>
                      )}

                      {challenge.status === 'FINISHER_PENDING' && (challenge.evaluatedPersonaIds?.length || 0) < challenge.personaIds.length && (
                        <button onClick={() => handleOpenFinisherModal(challenge)} className="flex-1 flex items-center justify-center py-2 bg-yellow-600 text-white rounded-lg text-sm font-bold hover:bg-yellow-700 transition-colors shadow-sm">
                          <Target size={16} className="mr-1.5" /> Fechamento Final
                        </button>
                      )}
                      {challenge.status === 'FINISHER_PENDING' && (challenge.evaluatedPersonaIds?.length || 0) >= challenge.personaIds.length && (
                        <div className="flex-1 flex items-center justify-center py-2 bg-gray-100 text-gray-500 rounded-lg text-sm font-bold shadow-sm">
                          <Target size={16} className="mr-1.5" /> Aguardando Assinaturas
                        </div>
                      )}

                      {(challenge.status === 'CLOSED' || challenge.status === 'RUNNING' || challenge.status === 'FINISHER_PENDING') && (
                        <button onClick={() => handleViewEvaluations(challenge)} title="Visualizar Avaliações" className="flex-none flex items-center justify-center px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm font-bold hover:bg-gray-50 transition-colors shadow-sm">
                          <Eye size={16} />
                        </button>
                      )}
                      {(challenge.status === 'CLOSED') && (
                        <button onClick={() => handleViewClosureReports(challenge)} title="Ver Relatório Final" className="flex-none flex items-center justify-center px-4 py-2 bg-blue-50 border border-blue-200 text-blue-700 rounded-lg text-sm font-bold hover:bg-blue-100 transition-colors shadow-sm">
                          <Eye size={16} className="mr-1.5" /> Relatório
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {totalChallengePages > 1 && (
              <div className="mt-8 flex justify-center items-center gap-4">
                <button
                  onClick={() => setChallengesPage(p => Math.max(1, p - 1))}
                  disabled={challengesPage === 1}
                  className="flex items-center gap-1 px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft size={16} />
                  Anterior
                </button>
                <span className="text-sm font-medium text-gray-600">
                  Página {challengesPage} de {totalChallengePages}
                </span>
                <button
                  onClick={() => setChallengesPage(p => Math.min(totalChallengePages, p + 1))}
                  disabled={challengesPage === totalChallengePages}
                  className="flex items-center gap-1 px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Próxima
                  <ChevronRight size={16} />
                </button>
              </div>
            )}
          </>
          )}
        </>
      )}

      {/* Modal Avaliação */}
      {isEvaluateModalOpen && activeChallengeForEval && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh] border-t-8 border-indigo-700">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h2 className="text-xl font-bold text-gray-800">
                Avaliação - Ciclo {activeChallengeForEval.currentCycle || 1} / {activeChallengeForEval.numberOfCycles}
              </h2>
              <button onClick={() => setIsEvaluateModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={24} />
              </button>
            </div>
            
            <div className="flex flex-1 overflow-hidden">
              <div className="w-1/3 border-r border-gray-200 bg-gray-50 p-4 overflow-y-auto">
                <h3 className="font-semibold text-sm text-gray-500 mb-3">SELECIONE A PERSONA</h3>
                <div className="space-y-2">
                  {activeChallengeForEval.personaIds.map(pid => {
                    const p = personas.find(x => x.id === pid);
                    const isEvaluated = evaluatedPersonas.has(pid);
                    const isSelected = selectedPersonaForEval === pid;
                    
                    let bgClass = 'bg-white border-gray-200 hover:border-indigo-200';
                    if (isEvaluated && isSelected) {
                      bgClass = 'bg-green-100 border-green-400';
                    } else if (isEvaluated) {
                      bgClass = 'bg-green-50 border-green-200 hover:bg-green-100';
                    } else if (isSelected) {
                      bgClass = 'bg-indigo-50 border-indigo-300';
                    }
                    
                    return p ? (
                      <button 
                        key={p.id}
                        onClick={() => setSelectedPersonaForEval(p.id)}
                        className={`w-full text-left p-3 rounded-lg border transition-colors ${bgClass}`}
                      >
                        <div className="flex justify-between items-center">
                          <div>
                            <p className={`font-bold text-sm ${isEvaluated ? 'text-green-900' : 'text-gray-900'}`}>{p.name}</p>
                            <p className={`text-xs ${isEvaluated ? 'text-green-700' : 'text-gray-500'}`}>{p.role}</p>
                          </div>
                          {isEvaluated && (
                            <div className="flex flex-col items-center">
                              <CheckCircle size={16} className="text-green-600 mb-0.5" />
                              <span className="text-[10px] text-green-700 font-bold uppercase">Editar</span>
                            </div>
                          )}
                        </div>
                      </button>
                    ) : null;
                  })}
                </div>
              </div>
              
              <div className="w-2/3 p-6 overflow-y-auto">
                <h3 className="text-lg font-bold text-gray-800 mb-4">Avaliar Eixos</h3>
                {selectedPersonaForEval ? (
                  <div className="space-y-6">
                    {activeChallengeForEval.axes.map(axis => {
                      const pEvals = evaluationsDict[selectedPersonaForEval as number] || [];
                      const ev = pEvals.find((e: any) => e.axisId === axis.id);
                      if (!ev) return null;
                      
                      return (
                        <div key={axis.id} className="p-4 border border-gray-200 rounded-xl bg-white shadow-sm">
                          <div className="mb-2">
                            <h4 className="font-bold text-gray-900">{axis.name}</h4>
                            {axis.description && <p className="text-xs text-gray-500">{axis.description}</p>}
                          </div>
                          
                          <div className="mb-4 mt-3">
                            <div className="flex justify-between mb-1">
                              <span className="text-xs font-medium text-red-500">Ruim (1)</span>
                              <span className="text-xs font-medium text-gray-400">Neutro (3)</span>
                              <span className="text-xs font-medium text-green-500">Excelente (5)</span>
                            </div>
                            <input 
                              type="range" 
                              min="1" max="5" step="1"
                              value={ev.rating}
                              onChange={e => handleEvaluationChange(axis.id!, 'rating', parseInt(e.target.value))}
                              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                            />
                            <div className="text-center mt-2 font-bold text-indigo-700 text-lg">Nota: {ev.rating}</div>
                          </div>
                          
                          <div>
                            <textarea 
                              placeholder="Observações adicionais (opcional)"
                              value={ev.observation}
                              onChange={e => handleEvaluationChange(axis.id!, 'observation', e.target.value)}
                              className="w-full text-sm px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 resize-none h-16"
                            />
                          </div>
                        </div>
                      );
                    })}
                    <div className="pt-4 flex justify-end">
                      <button
                        onClick={handleSaveEvaluation}
                        disabled={loading}
                        className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium shadow flex items-center disabled:opacity-50"
                      >
                        <CheckCircle size={18} className="mr-2" />
                        {loading ? 'Salvando...' : 'Salvar Avaliação Temporária'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm">Selecione uma persona ao lado para iniciar a avaliação.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Nova/Editar Persona */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] border-t-8 border-indigo-700">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h2 className="text-xl font-bold text-gray-800">
                {editingPersonaId ? 'Editar Persona' : 'Criar Nova Persona'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleSavePersona} className="p-6 overflow-y-auto flex-1">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nome da Persona</label>
                  <input
                    required
                    type="text"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    placeholder="Ex: João Silva"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cargo / Papel</label>
                  <select
                    required
                    value={formData.role}
                    onChange={e => setFormData({ ...formData, role: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white"
                  >
                    <option value="" disabled>Selecione um Cargo/Papel...</option>
                    <option value="Desenvolvedor">Desenvolvedor</option>
                    <option value="Analista de Requisitos">Analista de Requisitos</option>
                    <option value="Analista de Qualidade">Analista de Qualidade</option>
                    <option value="Analista de Negócios">Analista de Negócios</option>
                    <option value="Devops">Devops</option>
                    <option value="Tester">Tester</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Colaborador Vinculado</label>
                  <select
                    value={formData.collaboratorId}
                    onChange={e => setFormData({ ...formData, collaboratorId: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white"
                  >
                    <option value="">(Opcional) Selecione um colaborador...</option>
                    {collaborators.map(collab => (
                      <option key={collab.id} value={collab.id}>
                        {collab.name} ({collab.email})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Traços Base / Perfil Atual</label>
                  <textarea
                    required
                    rows={5}
                    value={formData.baseText}
                    onChange={e => setFormData({ ...formData, baseText: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 resize-none"
                    placeholder="Descreva as características atuais, pontos fortes e pontos a melhorar desta persona..."
                  ></textarea>
                </div>
              </div>

              <div className="mt-8 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium disabled:opacity-50"
                >
                  {loading ? 'Salvando...' : 'Salvar Persona'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Novo/Editar Desafio */}
      {isChallengeModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] border-t-8 border-indigo-700">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h2 className="text-xl font-bold text-gray-800">
                {editingChallengeId ? 'Editar Desafio' : 'Criar Novo Desafio'}
              </h2>
              <button onClick={() => setIsChallengeModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleSaveChallenge} className="p-6 overflow-y-auto flex-1 space-y-6">
              {challengeStep === 1 && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Título do Desafio</label>
                    <input required type="text" value={challengeTitle} onChange={e => setChallengeTitle(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500" placeholder="Ex: Evolução Técnica e Liderança" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Descrição / Contexto</label>
                    <textarea required rows={3} value={challengeDescription} onChange={e => setChallengeDescription(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 resize-none" placeholder="Qual o objetivo principal deste desafio..."></textarea>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Personas Vinculadas</label>
                    <div className="space-y-2 max-h-48 overflow-y-auto border border-gray-200 rounded-lg p-3 bg-gray-50/50">
                      {personas.length === 0 ? <p className="text-sm text-gray-500 p-2">Nenhuma persona cadastrada.</p> : personas.map(p => (
                        <label key={p.id} className="flex items-center space-x-3 p-2 bg-white hover:bg-indigo-50 rounded-lg cursor-pointer border border-gray-200 transition-colors">
                          <input type="checkbox" checked={selectedPersonasIds.includes(p.id)} onChange={(e) => {
                            if (e.target.checked) setSelectedPersonasIds([...selectedPersonasIds, p.id]);
                            else setSelectedPersonasIds(selectedPersonasIds.filter(id => id !== p.id));
                          }} className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-gray-300" />
                          <div>
                            <p className="text-sm font-bold text-gray-900">{p.name}</p>
                            <p className="text-xs text-gray-500 font-medium">{p.role}</p>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="pt-4 flex justify-end space-x-3">
                    <button type="button" onClick={() => setIsChallengeModalOpen(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium">
                      Cancelar
                    </button>
                    <button type="button" onClick={handleSuggestWithAI} disabled={!challengeTitle || !challengeDescription || selectedPersonasIds.length === 0} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium disabled:opacity-50">
                      Próximo: Sugerir com IA
                    </button>
                  </div>
                </>
              )}

              {challengeStep === 2 && (
                <>
                  {isAiThinking ? (
                    <div className="flex flex-col items-center justify-center py-12">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mb-4"></div>
                      <p className="text-indigo-600 font-medium">A IA está pensando...</p>
                      <p className="text-gray-500 text-sm text-center max-w-sm mt-2">Analisando o título, descrição e as personas para sugerir os melhores eixos de avaliação.</p>
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Data Limite (Encerramento)</label>
                          <input required type="date" value={challengeDeadline} onChange={e => setChallengeDeadline(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Número de Ciclos</label>
                          <input required type="number" min="1" max="12" value={challengeCycles} onChange={e => setChallengeCycles(parseInt(e.target.value))} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500" />
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <label className="block text-sm font-medium text-gray-700">Eixos de Avaliação</label>
                          <button type="button" onClick={handleAddAxis} className="text-sm text-indigo-600 hover:text-indigo-800 flex items-center font-medium">
                            <PlusCircle size={16} className="mr-1" /> Adicionar Eixo
                          </button>
                        </div>
                        {challengeAxes.length === 0 ? (
                          <p className="text-sm text-gray-500 p-3 bg-gray-50 rounded-lg border border-gray-200 text-center">Nenhum eixo adicionado.</p>
                        ) : (
                          <div className="space-y-3">
                            {challengeAxes.map((axis, index) => (
                              <div key={index} className="flex flex-col gap-2 p-3 border border-gray-200 rounded-lg bg-gray-50 shadow-sm">
                                <div className="flex gap-2">
                                  <input required type="text" placeholder="Nome do eixo (ex: Comunicação)" value={axis.name} onChange={e => handleUpdateAxis(index, 'name', e.target.value)} className="flex-1 px-3 py-1.5 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 text-sm font-medium" />
                                  <select value={axis.type} onChange={e => handleUpdateAxis(index, 'type', e.target.value)} className="w-32 px-3 py-1.5 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 text-sm bg-white">
                                    <option value="governança">Governança</option>
                                    <option value="social">Social</option>
                                    <option value="bem-estar">Bem-estar</option>
                                    <option value="misto">Misto</option>
                                  </select>
                                  <button type="button" onClick={() => handleRemoveAxis(index)} className="p-1.5 text-red-500 hover:bg-red-50 rounded">
                                    <Trash2 size={16} />
                                  </button>
                                </div>
                                <input type="text" placeholder="Descrição curta (opcional)" value={axis.description} onChange={e => handleUpdateAxis(index, 'description', e.target.value)} className="w-full px-3 py-1.5 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 text-sm" />
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="pt-4 flex justify-between">
                        <button type="button" onClick={() => setChallengeStep(1)} className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium">
                          Voltar
                        </button>
                        <button type="submit" disabled={loading || selectedPersonasIds.length === 0 || challengeAxes.length === 0} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium disabled:opacity-50">
                          {loading ? 'Salvando...' : 'Salvar Desafio'}
                        </button>
                      </div>
                    </>
                  )}
                </>
              )}

              {challengeStep === 3 && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Título do Desafio</label>
                    <input required type="text" value={challengeTitle} onChange={e => setChallengeTitle(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500" placeholder="Ex: Evolução Técnica e Liderança" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Descrição / Contexto</label>
                    <textarea required rows={3} value={challengeDescription} onChange={e => setChallengeDescription(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 resize-none" placeholder="Qual o objetivo principal deste desafio..."></textarea>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Personas Vinculadas</label>
                    <div className="space-y-2 max-h-48 overflow-y-auto border border-gray-200 rounded-lg p-3 bg-gray-50/50">
                      {personas.length === 0 ? <p className="text-sm text-gray-500 p-2">Nenhuma persona cadastrada.</p> : personas.map(p => (
                        <label key={p.id} className="flex items-center space-x-3 p-2 bg-white hover:bg-indigo-50 rounded-lg cursor-pointer border border-gray-200 transition-colors">
                          <input type="checkbox" checked={selectedPersonasIds.includes(p.id)} onChange={(e) => {
                            if (e.target.checked) setSelectedPersonasIds([...selectedPersonasIds, p.id]);
                            else setSelectedPersonasIds(selectedPersonasIds.filter(id => id !== p.id));
                          }} className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-gray-300" />
                          <div>
                            <p className="text-sm font-bold text-gray-900">{p.name}</p>
                            <p className="text-xs text-gray-500 font-medium">{p.role}</p>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Data Limite (Encerramento)</label>
                      <input required type="date" value={challengeDeadline} onChange={e => setChallengeDeadline(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Número de Ciclos</label>
                      <input required type="number" min="1" max="12" value={challengeCycles} onChange={e => setChallengeCycles(parseInt(e.target.value))} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500" />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="block text-sm font-medium text-gray-700">Eixos de Avaliação</label>
                      <button type="button" onClick={handleAddAxis} className="text-sm text-indigo-600 hover:text-indigo-800 flex items-center font-medium">
                        <PlusCircle size={16} className="mr-1" /> Adicionar Eixo
                      </button>
                    </div>
                    {challengeAxes.length === 0 ? (
                      <p className="text-sm text-gray-500 p-3 bg-gray-50 rounded-lg border border-gray-200 text-center">Nenhum eixo adicionado.</p>
                    ) : (
                      <div className="space-y-3">
                        {challengeAxes.map((axis, index) => (
                          <div key={index} className="flex flex-col gap-2 p-3 border border-gray-200 rounded-lg bg-gray-50 shadow-sm">
                            <div className="flex gap-2">
                              <input required type="text" placeholder="Nome do eixo (ex: Comunicação)" value={axis.name} onChange={e => handleUpdateAxis(index, 'name', e.target.value)} className="flex-1 px-3 py-1.5 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 text-sm font-medium" />
                              <select value={axis.type} onChange={e => handleUpdateAxis(index, 'type', e.target.value)} className="w-32 px-3 py-1.5 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 text-sm bg-white">
                                <option value="governança">Governança</option>
                                <option value="social">Social</option>
                                <option value="bem-estar">Bem-estar</option>
                                <option value="misto">Misto</option>
                              </select>
                              <button type="button" onClick={() => handleRemoveAxis(index)} className="p-1.5 text-red-500 hover:bg-red-50 rounded">
                                <Trash2 size={16} />
                              </button>
                            </div>
                            <input type="text" placeholder="Descrição curta (opcional)" value={axis.description} onChange={e => handleUpdateAxis(index, 'description', e.target.value)} className="w-full px-3 py-1.5 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 text-sm" />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="pt-4 flex justify-end space-x-3">
                    <button type="button" onClick={() => setIsChallengeModalOpen(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium">
                      Cancelar
                    </button>
                    <button type="button" onClick={handleDirectEditSave} disabled={loading || selectedPersonasIds.length === 0 || challengeAxes.length === 0} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium disabled:opacity-50">
                      {loading ? 'Salvando...' : 'Salvar Alterações'}
                    </button>
                  </div>
                </>
              )}
            </form>
          </div>
        </div>
      )}

      {/* Modal Detalhes da Persona */}
      {selectedPersona && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh] border-t-8 border-indigo-700">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-start bg-gray-50/50">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{selectedPersona.name}</h2>
                <p className="text-indigo-600 font-medium">{selectedPersona.role}</p>
              </div>
              <button onClick={() => setSelectedPersona(null)} className="text-gray-400 hover:text-gray-600 bg-white rounded-full p-1 shadow-sm">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 bg-gray-50/30">
              <h3 className="text-lg font-bold text-gray-800 mb-4">Histórico de Versões</h3>
              <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-gray-300 before:to-transparent">
                {selectedPersona.versions?.map((version) => (
                  <div key={version.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white bg-indigo-100 text-indigo-600 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                      <span className="font-bold text-sm">V{version.versionNumber}</span>
                    </div>
                    <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                      <div className="flex items-center justify-between mb-2">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          version.status === 'VALIDADA' ? 'bg-green-100 text-green-800' :
                          version.status === 'RECUSADA' ? 'bg-red-100 text-red-800' :
                          version.status === 'AJUSTADA' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-indigo-50 text-indigo-700'
                        }`}>
                          {formatStatus(version.status)}
                        </span>
                        <span className="text-xs text-gray-400">
                          {new Date(version.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-wrap bg-gray-50 p-3 rounded-lg border border-gray-100">
                        {version.textContent}
                      </div>
                      {version.feedback && (
                        <div className="mt-3 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                          <h4 className="text-xs font-bold text-yellow-800 mb-1 uppercase tracking-wider">Feedback do Colaborador:</h4>
                          <p className="text-sm text-yellow-900">{version.feedback}</p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-100 bg-white flex justify-end">
              <button
                onClick={() => setSelectedPersona(null)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Modal Finisher */}
      {isFinisherModalOpen && activeChallengeForEval && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh] border-t-8 border-yellow-500">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h2 className="text-xl font-bold text-gray-800">Reavaliação Final (Fechamento)</h2>
              <button onClick={() => setIsFinisherModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={24} /></button>
            </div>
            <div className="flex flex-1 overflow-hidden">
              <div className="w-1/3 border-r border-gray-200 bg-gray-50 p-4 overflow-y-auto">
                <div className="space-y-2">
                  {activeChallengeForEval.personaIds.map(pid => {
                    const p = personas.find(x => x.id === pid);
                    const isEvaluated = evaluatedPersonas.has(pid);
                    const isSelected = selectedPersonaForEval === pid;
                    let bgClass = 'bg-white border-gray-200 hover:border-yellow-200';
                    if (isEvaluated && isSelected) bgClass = 'bg-green-100 border-green-400';
                    else if (isEvaluated) bgClass = 'bg-green-50 border-green-200 hover:bg-green-100';
                    else if (isSelected) bgClass = 'bg-yellow-50 border-yellow-300';
                    return p ? (
                      <button key={p.id} onClick={() => setSelectedPersonaForEval(p.id)} className={"w-full text-left p-3 rounded-lg border transition-colors " + bgClass}>
                        <div><p className={"font-bold text-sm " + (isEvaluated ? 'text-green-900' : 'text-gray-900')}>{p.name}</p></div>
                      </button>
                    ) : null;
                  })}
                </div>
              </div>
              <div className="w-2/3 p-6 overflow-y-auto">
                {selectedPersonaForEval && (
                  <div className="space-y-6">
                    {activeChallengeForEval.axes.map(axis => {
                      const pEvals = evaluationsDict[selectedPersonaForEval as number] || [];
                      const ev = pEvals.find((e: any) => e.axisId === axis.id);
                      if (!ev) return null;
                      return (
                        <div key={axis.id} className="p-4 border border-gray-200 rounded-xl bg-white shadow-sm">
                          <div className="mb-2"><h4 className="font-bold text-gray-900">{axis.name}</h4></div>
                          <div className="mb-4 mt-3">
                            <div className="flex justify-between mb-1">
                              <span className="text-xs font-medium text-red-500">Ruim (1)</span>
                              <span className="text-xs font-medium text-gray-400">Neutro (3)</span>
                              <span className="text-xs font-medium text-green-500">Excelente (5)</span>
                            </div>
                            <input type="range" min="1" max="5" step="1" value={ev.rating} onChange={e => handleEvaluationChange(axis.id || 0, 'rating', parseInt(e.target.value))} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600" />
                            <div className="text-center mt-2 font-bold text-indigo-700 text-lg">Nota: {ev.rating}</div>
                          </div>
                          <div><textarea placeholder="Observações adicionais (opcional)" value={ev.observation} onChange={e => handleEvaluationChange(axis.id || 0, 'observation', e.target.value)} className="w-full text-sm px-3 py-2 border border-gray-300 rounded-lg" /></div>
                        </div>
                      );
                    })}
                    <div className="pt-4 flex justify-end">
                      <button onClick={handleSaveFinalEvaluation} disabled={loading} className="px-6 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 font-medium shadow flex items-center disabled:opacity-50">
                        {loading ? 'Processando IA...' : 'Consolidar e Gerar Relatorio'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Modal Relatorio */}
      {closureReport && (() => {
        let parsedReport = null;
        try { parsedReport = JSON.parse(closureReport.text); } catch(e) { console.error(e); }
        const chartData = activeChallengeForEval ? activeChallengeForEval.axes.map((axis: any) => {
          const ev = (evaluationsDict[selectedPersonaForEval as number] || []).find((e: any) => e.axisId === axis.id);
          return { subject: axis.name, nFinal: ev ? ev.rating : 0 }; 
        }) : [];
        return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-[60]">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl flex flex-col max-h-[90vh]">
            <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2"><span><svg className="w-6 h-6 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3l9 12m-9 10v2-9l-9-12li9 12m-9 10v2z" /></svg></span>Relatório de Fechamento IA</h2>
              <div className="bg-blue-100 text-blue-800 px-4 py-1 rounded-full font-bold">Acurácia: {parsedReport ? parsedReport.indiceAcuracia : '-'}%</div>
            </div>
            <div className="p-6 overflow-y-auto bg-gray-50 flex gap-6">
              <div className="w-1/2 bg-white p-5 rounded-xl shadow-sm">
                <h3 className="font-bold text-gray-700 mb-4">Evolução das Competências</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart cx="50%" cy="50%" outerRadius="80%" data={chartData}>
                      <PolarGrid />
                      <PolarAngleAxis dataKey="subject" tick={{fontSize: 10}}/>
                      <PolarRadiusAxis angle={30} domain={[0, 5]} />
                      <Radar name="Avaliação Final" dataKey="nFinal" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.6} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="w-1/2 flex flex-col gap-4">
                <div className="bg-white p-5 rounded-xl shadow-sm">
                  <h3 className="font-bold text-gray-700 mb-2">Resumo Analítico</h3>
                  <p className="text-gray-600 text-sm">{parsedReport ? parsedReport.resumoAnalitico : closureReport.text}</p>
                </div>
                <div className="bg-white p-5 rounded-xl shadow-sm flex-1">
                  <h3 className="font-bold text-gray-700 mb-3">Ações Recomendadas</h3>
                  <div className="space-y-3">
                    {parsedReport ? parsedReport.acoesRecomendadas.map((acao: any, idx: number) => (
                      <div key={idx} className="p-3 bg-blue-50 border-l-4 border-blue-500 rounded-r-ig">
                        <h4 className="font-bold text-blue-900">{acao.titulo}</h4>
                        <p className="text-sm text-blue-800 mt-1">{acao.descricao}</p>
                      </div>
                    )) : null}
                  </div>
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 bg-white flex justify-end">
              <button onClick={handleContinueAfterClosure} className="px-6 py-2.5 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 font-bold shadow-md">
                {closureReport.isLastPersona ? 'Finalizar Avaliacoes' : 'Próxima Persona'}
              </button>
            </div>
          </div>
        </div>
      );})()}

      {/* Modal View Closure Reports */}
      {isViewClosureReportsModalOpen && activeChallengeForEval && closureReportsData && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh] border-t-8 border-blue-500">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h2 className="text-xl font-bold text-gray-800 flex items-center">
                <Eye className="mr-2 text-blue-600" size={24} />
                Relatórios de Fechamento - {activeChallengeForEval.title}
              </h2>
              <button onClick={() => setIsViewClosureReportsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={24} />
              </button>
            </div>
            
            <div className="flex flex-1 overflow-hidden">
              <div className="w-1/3 border-r border-gray-200 bg-gray-50 p-4 overflow-y-auto">
                <h3 className="font-semibold text-sm text-gray-500 mb-3">SELECIONE A PERSONA</h3>
                <div className="space-y-2">
                  {activeChallengeForEval.personaIds.map(pid => {
                    const p = personas.find(x => x.id === pid);
                    const isSelected = selectedViewPersonaId === pid;
                    const hasReport = closureReportsData.reports.some((r: any) => r.personaId === pid);
                    return p && hasReport ? (
                      <button 
                        key={p.id}
                        onClick={() => setSelectedViewPersonaId(p.id)}
                        className={"w-full text-left p-3 rounded-lg border transition-colors " + (
                          isSelected ? 'bg-white border-blue-300 shadow-sm ring-1 ring-blue-300' : 'bg-white border-gray-200 hover:border-blue-200'
                        )}
                      >
                        <p className={"font-bold text-sm " + (isSelected ? 'text-blue-900' : 'text-gray-900')}>{p.name}</p>
                        <p className={"text-xs " + (isSelected ? 'text-blue-700' : 'text-gray-500')}>{p.role}</p>
                      </button>
                    ) : null;
                  })}
                </div>
              </div>
              
              <div className="w-2/3 p-6 overflow-y-auto">
                {selectedViewPersonaId && (() => {
                  const report = closureReportsData.reports.find((r: any) => r.personaId === selectedViewPersonaId);
                  if (!report) return <p className="text-gray-500">Relatório não encontrado.</p>;
                  
                  let parsed = null;
                  try { parsed = JSON.parse(report.summaryText); } catch(e) {}
                  
                  const chartData = activeChallengeForEval.axes.map((axis: any) => {
                    const ev = closureReportsData.finalEvaluations.find((e: any) => e.personaId === selectedViewPersonaId && e.axisId === axis.id);
                    return { subject: axis.name, score: ev ? ev.rating : 0 };
                  });

                  return (
                    <div className="space-y-6">
                      <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
                        <h3 className="font-bold text-gray-700 mb-4 flex items-center">
                          <BarChart3 size={20} className="mr-2 text-blue-600" />
                          Avaliação Final Consolidada
                        </h3>
                        <div className="h-64 mb-4 bg-gray-50 rounded-lg p-2 border border-gray-100">
                          <ResponsiveContainer width="100%" height="100%">
                            <RadarChart cx="50%" cy="50%" outerRadius="70%" data={chartData}>
                              <PolarGrid />
                              <PolarAngleAxis dataKey="subject" tick={{fontSize: 10}} />
                              <PolarRadiusAxis angle={30} domain={[0, 5]} />
                              <Radar name="Avaliação" dataKey="score" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.5} />
                            </RadarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>

                      <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="font-bold text-gray-700">Resumo Analítico</h3>
                          {parsed && parsed.indiceAcuracia && (
                            <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-xs font-bold">
                              Acurácia: {parsed.indiceAcuracia}%
                            </span>
                          )}
                        </div>
                        <p className="text-gray-600 text-sm">{parsed ? parsed.resumoAnalitico : report.summaryText}</p>
                      </div>
                      
                      <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
                        <h3 className="font-bold text-gray-700 mb-3">Ações Recomendadas</h3>
                        <div className="space-y-3">
                          {parsed && parsed.acoesRecomendadas ? parsed.acoesRecomendadas.map((acao: any, idx: number) => (
                            <div key={idx} className="p-3 bg-blue-50 border-l-4 border-blue-500 rounded-r-lg">
                              <h4 className="font-bold text-blue-900">{acao.titulo}</h4>
                              <p className="text-sm text-blue-800 mt-1">{acao.descricao}</p>
                            </div>
                          )) : null}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-gray-500 text-sm">Status da Assinatura:</span>
                        <span className={"px-3 py-1 rounded-full text-xs font-bold " + (
                          report.collaboratorStatus === 'ACCEPTED' ? 'bg-green-100 text-green-700' :
                          report.collaboratorStatus === 'REJECTED' ? 'bg-red-100 text-red-700' :
                          'bg-yellow-100 text-yellow-700'
                        )}>
                          {report.collaboratorStatus === 'ACCEPTED' ? 'Acatado' : report.collaboratorStatus === 'REJECTED' ? 'Recusado' : 'Pendente'}
                        </span>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal View Evaluations */}
      {isViewEvaluationsModalOpen && activeChallengeForEval && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh] border-t-8 border-indigo-700">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h2 className="text-xl font-bold text-gray-800 flex items-center">
                <Eye className="mr-2 text-indigo-600" size={24} />
                Visualizar Avaliações - {activeChallengeForEval.title}
              </h2>
              <button onClick={() => setIsViewEvaluationsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={24} />
              </button>
            </div>
            
            <div className="flex flex-col flex-1 overflow-hidden">
              <div className="px-6 py-3 border-b border-gray-200 bg-white flex space-x-2 overflow-x-auto">
                {viewChallengeData.cycles.sort((a: any, b: any) => a.cycleNumber - b.cycleNumber).map((cycle: any) => (
                  <button
                    key={cycle.id}
                    onClick={() => setActiveViewCycle(cycle.id)}
                    className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-all flex-shrink-0 border-0 outline-none ${
                      activeViewCycle === cycle.id
                        ? 'bg-indigo-100 text-indigo-800'
                        : 'bg-transparent text-gray-500 hover:bg-gray-100 hover:text-gray-800'
                    }`}
                  >
                    Ciclo {cycle.cycleNumber} {cycle.status === 'COMPLETED' ? '(Concluído)' : '(Atual)'}
                  </button>
                ))}
              </div>

              <div className="flex flex-1 overflow-hidden">
                <div className="w-1/3 border-r border-gray-200 bg-gray-50 p-4 overflow-y-auto">
                  <h3 className="font-semibold text-sm text-gray-500 mb-3">SELECIONE A PERSONA</h3>
                  <div className="space-y-2">
                    {activeChallengeForEval.personaIds.map(pid => {
                      const p = personas.find(x => x.id === pid);
                      const isSelected = selectedViewPersonaId === pid;
                      
                      return p ? (
                        <button 
                          key={p.id}
                          onClick={() => setSelectedViewPersonaId(p.id)}
                          className={`w-full text-left p-3 rounded-lg border transition-colors ${
                            isSelected ? 'bg-white border-indigo-300 shadow-sm ring-1 ring-indigo-300' : 'bg-white border-gray-200 hover:border-indigo-200'
                          }`}
                        >
                          <p className={`font-bold text-sm ${isSelected ? 'text-indigo-900' : 'text-gray-900'}`}>{p.name}</p>
                          <p className={`text-xs ${isSelected ? 'text-indigo-700' : 'text-gray-500'}`}>{p.role}</p>
                        </button>
                      ) : null;
                    })}
                  </div>
                </div>
                
                <div className="w-2/3 p-6 overflow-y-auto bg-gray-50/30">
                  {selectedViewPersonaId && activeViewCycle ? (
                    <div className="space-y-6">
                      {activeChallengeForEval.axes.map(axis => {
                        const evaluation = viewChallengeData.evaluations.find(
                          (e: any) => e.personaId === selectedViewPersonaId && e.cycleId === activeViewCycle && e.axisId === axis.id
                        );
                        
                        return (
                          <div key={axis.id} className="p-5 border border-gray-200 rounded-xl bg-white shadow-sm">
                            <div className="mb-3 flex justify-between items-start">
                              <div>
                                <h4 className="font-bold text-gray-900 text-lg">{axis.name}</h4>
                                {axis.description && <p className="text-xs text-gray-500">{axis.description}</p>}
                              </div>
                              <div className={`px-2 py-1 rounded-lg text-sm font-bold whitespace-nowrap flex-shrink-0 ${
                                !evaluation ? 'bg-gray-100 text-gray-400' :
                                evaluation.rating >= 4 ? 'bg-green-100 text-green-800' :
                                evaluation.rating <= 2 ? 'bg-red-100 text-red-800' :
                                'bg-yellow-100 text-yellow-800'
                              }`}>
                                {evaluation ? evaluation.rating : '-'} / 5
                              </div>
                            </div>
                            
                            <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden mb-4">
                              {evaluation && (
                                <div 
                                  className={`h-full rounded-full ${
                                    evaluation.rating >= 4 ? 'bg-green-500' :
                                    evaluation.rating <= 2 ? 'bg-red-500' :
                                    'bg-yellow-500'
                                  }`} 
                                  style={{ width: `${(evaluation.rating / 5) * 100}%` }}
                                ></div>
                              )}
                            </div>

                            {evaluation?.observation ? (
                              <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                                <h5 className="text-xs font-bold text-gray-500 uppercase mb-1">Observações do Gestor</h5>
                                <p className="text-sm text-gray-700">{evaluation.observation}</p>
                              </div>
                            ) : (
                              <div className="bg-gray-50 p-3 rounded-lg border border-gray-100 border-dashed text-center">
                                <p className="text-sm text-gray-400">Nenhuma observação registrada.</p>
                              </div>
                            )}
                            
                            {!evaluation && (
                              <div className="mt-2 text-center p-2 text-sm text-gray-500">
                                Esta persona ainda não foi avaliada neste ciclo.
                              </div>
                            )}
                          </div>
                        );
                      })}
                      {(() => {
                        const projected = viewChallengeData.projectedPersonas?.find(
                          (p: any) => p.personaId === selectedViewPersonaId && p.cycleId === activeViewCycle
                        );
                        if (projected) {
                          return (
                            <div className="mt-8 p-5 border border-indigo-200 rounded-xl bg-indigo-50/50 shadow-sm">
                              <div className="flex items-center space-x-2 mb-3">
                                <Sparkles size={20} className="text-indigo-600" />
                                <h4 className="font-bold text-indigo-900 text-lg">Nova Persona Projetada pela IA</h4>
                              </div>
                              <p className="text-sm text-indigo-800 whitespace-pre-wrap leading-relaxed">
                                {projected.textContent}
                              </p>
                            </div>
                          );
                        }
                        return null;
                      })()}
                      {(() => {
                        const validation = viewChallengeData.validations?.find(
                          (v: any) => v.personaId === selectedViewPersonaId && v.cycleId === activeViewCycle
                        );
                        if (validation) {
                          return (
                            <div className="mt-4 p-5 border border-purple-200 rounded-xl bg-purple-50/50 shadow-sm">
                              <h4 className="font-bold text-purple-900 text-lg mb-3">Retorno do Colaborador</h4>
                              <div className="flex items-center gap-2 mb-3">
                                <span className="text-sm font-bold text-gray-700">Status:</span>
                                <span className={`px-2 py-1 rounded text-xs font-bold uppercase tracking-wider ${validation.status === 'ACCEPTED' ? 'bg-green-100 text-green-800' : validation.status === 'PARTIAL' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}`}>
                                  {validation.status === 'ACCEPTED' ? 'Acatado' : validation.status === 'PARTIAL' ? 'Parcial' : 'Recusado'}
                                </span>
                              </div>
                              {validation.justification && (
                                <div>
                                  <span className="text-sm font-bold text-gray-700 block mb-1">Justificativa:</span>
                                  <p className="text-sm text-gray-800 bg-white p-3 rounded-lg border border-purple-100 whitespace-pre-wrap">{validation.justification}</p>
                                </div>
                              )}
                            </div>
                          );
                        }
                        return null;
                      })()}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-gray-400">
                      <Eye size={48} className="mb-4 opacity-20" />
                      <p>Selecione um ciclo e uma persona para visualizar.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Persona Projetada Feedback (Step 3.2) */}
      {projectedPersonaFeedback && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-[60] backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] border-t-8 border-indigo-500 animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-5 border-b border-gray-100 bg-gradient-to-r from-indigo-50 to-white flex justify-between items-center">
              <div className="flex items-center space-x-3">
                <div className="bg-indigo-100 text-indigo-600 p-2 rounded-lg">
                  <Sparkles size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-800">Feedback Inteligente</h2>
                  <p className="text-sm text-gray-500">A IA gerou uma projeção da persona com base na sua avaliação.</p>
                </div>
              </div>
            </div>
            
            <div className="p-6 overflow-y-auto bg-gray-50">
              <h3 className="font-bold text-gray-700 mb-3 text-sm uppercase tracking-wider">Nova Persona Projetada</h3>
              <div className="bg-white p-5 rounded-xl border border-indigo-100 shadow-sm whitespace-pre-wrap text-sm text-gray-700 leading-relaxed">
                {projectedPersonaFeedback.text}
              </div>
            </div>
            
            <div className="px-6 py-4 border-t border-gray-100 bg-white flex justify-end">
              <button 
                onClick={handleContinueAfterProjection}
                className="px-6 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-bold shadow-md flex items-center transition-colors"
              >
                {projectedPersonaFeedback.isLastPersona ? 'Concluir Avaliações' : 'Avaliar Próxima Persona'}
                <ArrowRight size={18} className="ml-2" />
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
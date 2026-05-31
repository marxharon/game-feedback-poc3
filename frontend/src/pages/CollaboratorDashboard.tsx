import { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { User as UserIcon, X, Check, Edit2, XCircle, FileText, BarChart2, Star, Sparkles, MessageSquare } from 'lucide-react';


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
  const [selectedChallenge, setSelectedChallenge] = useState<ChallengePending | null>(null);
  const [alignmentScore, setAlignmentScore] = useState<number | null>(null);


  
  
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

    useEffect(() => {


    if (token) {
      fetchPendingPersonas();
      fetchHistoryPersonas();
      fetchPendingChallenges();
      fetchHistoryChallenges();
      
    }


  }, [token]);

  
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
        
        // Timeout para ver o score antes de fechar
        setTimeout(() => {
            setSelectedChallenge(null);
            setJustification('');
            setActionType(null);
            setAlignmentScore(null);
            fetchPendingChallenges();
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
  };

  return (
    <div className="max-w-6xl mx-auto">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Olá, {user?.name?.split(' ')[0]}!</h1>
        <p className="text-gray-500 mt-2">Acompanhe seu desenvolvimento e desafios ativos.</p>
      </header>

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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {pendingPersonas.map(persona => (
            <div key={persona.id} className="bg-white rounded-xl shadow-sm border border-orange-200 overflow-hidden flex flex-col hover:shadow-md transition-shadow relative">
              <div className="absolute top-0 right-0 w-2 h-full bg-orange-400"></div>
              <div className="p-5 border-b border-gray-100 flex items-start justify-between pr-8">
                <div>
                  <h3 className="font-bold text-lg text-gray-900">{persona.name}</h3>
                  <p className="text-indigo-600 text-sm font-medium">{persona.role}</p>
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {pendingChallenges.map((item, index) => (
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
      )}

      {historyPersonas.length > 0 && (
        <div className="mt-12 mb-6">
          <h2 className="text-xl font-bold text-gray-800 flex items-center space-x-2">
            <span>Meu Histórico de Personas</span>
          </h2>
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {historyPersonas.map(persona => (
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
        </div>
      )}


      {historyChallenges.length > 0 && (
        <div className="mt-12 mb-6">
          <h2 className="text-xl font-bold text-gray-800 flex items-center space-x-2">
            <span>Meu Histórico de Desafios Avaliados</span>
          </h2>
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {historyChallenges.map((item, idx) => (
              <div key={idx} className="bg-white rounded-xl shadow-sm border border-purple-200 overflow-hidden flex flex-col">
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
                <div className="p-5 flex-1 flex flex-col items-center justify-center">
                  <div className="text-xs text-gray-500 mb-2 uppercase tracking-wide font-bold">Adequação / Alinhamento</div>
                  {item.validation?.alignmentScore !== null && item.validation?.alignmentScore !== undefined ? (
                    <div className="w-20 h-20 rounded-full flex items-center justify-center bg-gradient-to-tr from-purple-500 to-indigo-500 text-white shadow-md shadow-purple-200">
                      <span className="text-2xl font-black">{item.validation.alignmentScore}%</span>
                    </div>
                  ) : (
                    <span className="text-gray-400 italic text-sm">Não calculado</span>
                  )}
                </div>
              </div>
            ))}
          </div>
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
            
            {alignmentScore !== null ? (
               <div className="p-12 flex-1 flex flex-col items-center justify-center text-center">
                  <div className="w-32 h-32 rounded-full flex items-center justify-center mb-6 bg-gradient-to-tr from-purple-500 to-indigo-500 text-white shadow-lg shadow-purple-200">
                    <span className="text-4xl font-black">{alignmentScore}%</span>
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">Alinhamento Calculado!</h3>
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
                  
                  <div className="space-y-4">
                    {selectedChallenge.axes.map(axis => {
                      const ev = selectedChallenge.evaluations.find(e => e.axisId === axis.id);
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
                  </div>
                </div>
              </div>
            )}
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
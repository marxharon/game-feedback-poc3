import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';

interface Challenge {
  id: string;
  title: string;
  status: 'RUNNING' | 'CLOSURE_REVIEW' | 'COMPLETED' | 'CLOSED';
  collaboratorStatus?: string;
  finalEvaluation?: {
    axesScores: Record<string, number>;
    managerComments: string;
  };
  closureReport?: {
    aiComparativeAnalysis: string;
    developmentPlan: string;
  };
}

export default function DashboardColaborador() {
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [showReportFor, setShowReportFor] = useState<string | null>(null);

  useEffect(() => {
    async function loadDashboard() {
      try {
        const response = await api.get('/collaborator/dashboard');
        setChallenges(response.data.challenges);
      } catch (error) {
        console.error('Erro ao carregar o dashboard', error);
      } finally {
        setLoading(false);
      }
    }
    loadDashboard();
  }, []);

  if (loading) return <div className="p-6 text-center">Carregando dashboard...</div>;

  // O desafio vai para o histórico se o status global for concluído OU se o colaborador já validou a sua parte.
  const isFinishedForUser = (c: Challenge) => c.status === 'CLOSED' || c.status === 'COMPLETED' || c.collaboratorStatus === 'COMPLETED';

  const activeChallenges = challenges.filter(c => !isFinishedForUser(c));
  const completedChallenges = challenges.filter(c => isFinishedForUser(c));

  const renderChallengeCard = (challenge: Challenge) => {
    const finished = isFinishedForUser(challenge);
    const waitingForValidation = challenge.status === 'CLOSURE_REVIEW' && challenge.collaboratorStatus !== 'COMPLETED';
    
    return (
    <div key={challenge.id} className="bg-white p-5 rounded-xl shadow-md border border-gray-200 flex flex-col justify-between">
      <div>
        <h2 className="text-xl font-bold text-gray-800 mb-2">{challenge.title}</h2>
        <div className="mb-4">
          <span className={`px-2 py-1 rounded text-xs font-semibold ${
            finished ? 'bg-green-100 text-green-800' :
            waitingForValidation ? 'bg-yellow-100 text-yellow-800' :
            'bg-blue-100 text-blue-800'
          }`}>
            {waitingForValidation ? 'Aguardando Seu Aceite' : finished ? 'Fechamento Concluído' : challenge.status}
          </span>
        </div>
        
        {/* Área do Card: Exibição dos dados consolidados do fechamento */}
        {(waitingForValidation || finished) && challenge.finalEvaluation ? (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <h3 className="text-sm font-bold text-gray-700 mb-2">Fechamento Consolidado</h3>
            <div className="flex flex-wrap gap-2 mb-3">
              {Object.entries(challenge.finalEvaluation?.axesScores || {}).map(([axis, score]) => (
                <span key={axis} className="bg-blue-50 text-blue-700 text-xs px-2 py-1 rounded border border-blue-200 font-medium capitalize">
                  {axis}: {score}
                </span>
              ))}
            </div>
            <p className="text-sm text-gray-600 italic line-clamp-3">
              "{challenge.finalEvaluation.managerComments}"
            </p>
          </div>
        ) : !finished && !waitingForValidation ? (
          <div className="mt-4 text-sm text-gray-500">
            Desafio em andamento. Suas avaliações de ciclo aparecerão aqui.
          </div>
        ) : null}

        {challenge.closureReport && (
          <div className="mt-4">
            <button 
              onClick={() => setShowReportFor(showReportFor === challenge.id ? null : challenge.id)}
              className="text-sm text-purple-600 font-semibold hover:underline focus:outline-none"
            >
              {showReportFor === challenge.id ? 'Ocultar Relatório de Fechamento' : 'Ver Relatório de Fechamento'}
            </button>
            
            {showReportFor === challenge.id && (
              <div className="mt-3 p-3 bg-purple-50 rounded border border-purple-100 text-sm text-gray-700">
                <h4 className="font-bold text-purple-800 mb-1">Resumo Analítico</h4>
                <p className="mb-3 whitespace-pre-wrap">{challenge.closureReport.aiComparativeAnalysis}</p>
                <h4 className="font-bold text-purple-800 mb-1">Ações Recomendadas</h4>
                <p className="whitespace-pre-wrap">{challenge.closureReport.developmentPlan}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {waitingForValidation && (
        <Link 
          to={`/challenges/${challenge.id}/closure`}
          className="mt-6 block text-center bg-purple-600 text-white text-sm font-semibold py-2.5 rounded-lg hover:bg-purple-700 transition-colors shadow-sm"
        >
          Ver Detalhes e Validar Fechamento
        </Link>
      )}
    </div>
    );
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Meu Dashboard</h1>
      
      {activeChallenges.length > 0 && (
        <div className="mb-10">
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">Desafios em Andamento / Aguardando</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {activeChallenges.map(renderChallengeCard)}
          </div>
        </div>
      )}

      {completedChallenges.length > 0 && (
        <div>
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">Meu Histórico de Desafios Avaliados</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {completedChallenges.map(renderChallengeCard)}
          </div>
        </div>
      )}
      
      {challenges.length === 0 && (
        <div className="text-gray-500 text-center py-10">
          Você ainda não possui desafios.
        </div>
      )}
    </div>
  );
}
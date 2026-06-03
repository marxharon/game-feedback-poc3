import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api'; // Assumindo uma instância do axios pré-configurada

interface ClosureData {
  finalEvaluation: {
    id: string;
    axesScores: Record<string, number>;
    managerComments: string;
  };
  closureReport: {
    id: string;
    aiComparativeAnalysis: string;
    developmentPlan: string;
  };
}

export default function FechamentoDesafio() {
  const { challengeId } = useParams<{ challengeId: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<ClosureData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchClosureData() {
      try {
        const response = await api.get(`/challenges/${challengeId}/closure`);
        setData(response.data);
      } catch (error) {
        console.error("Erro ao carregar os dados de fechamento", error);
      } finally {
        setLoading(false);
      }
    }
    fetchClosureData();
  }, [challengeId]);

  const handleAction = async (action: 'ACCEPT' | 'REJECT') => {
    try {
      // Rota responsável por processar as recompensas (Step 4.3)
      await api.post(`/challenges/${challengeId}/closure/validate`, { action });
      
      if (action === 'ACCEPT') {
        alert('Avaliação final acatada com sucesso! Você desbloqueou a Badge "Finalizador" e ganhou Bônus de XP.');
      } else {
        alert('A recusa dos resultados foi registrada para análise.');
      }
      
      navigate('/dashboard');
    } catch (error) {
      console.error("Erro ao validar o fechamento do desafio", error);
    }
  };

  if (loading) return <div className="p-6 text-center">Carregando relatório final...</div>;
  if (!data) return <div className="p-6 text-center text-red-500">Dados de fechamento não encontrados.</div>;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Fechamento do Desafio</h1>
      <p className="text-gray-600 mb-8">
        O ciclo deste desafio foi concluído. Verifique a reavaliação final do seu gestor e os planos gerados pela IA.
      </p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Coluna da Reavaliação Final do Gestor (Obrigatoriedade solicitada) */}
        <div className="bg-white p-6 shadow-md rounded-xl border-t-4 border-blue-500">
          <h2 className="text-2xl font-semibold mb-4 text-blue-700">Reavaliação Final do Gestor</h2>
          
          <div className="mb-6">
            <h3 className="font-semibold text-lg text-gray-800 mb-3">Notas Consolidadas por Eixo</h3>
            <ul className="space-y-2">
              {Object.entries(data.finalEvaluation.axesScores).map(([axis, score]) => (
                <li key={axis} className="flex justify-between items-center bg-gray-50 p-3 rounded border border-gray-100">
                  <span className="font-medium text-gray-700 capitalize">{axis}</span>
                  <span className="bg-blue-100 text-blue-800 py-1 px-3 rounded-full font-bold shadow-sm">
                    Nota {score}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <h3 className="font-semibold text-lg text-gray-800 mb-2">Comentários Finais</h3>
          <p className="text-gray-700 whitespace-pre-wrap">{data.finalEvaluation.managerComments}</p>
        </div>

        {/* Coluna do Relatório e Plano de Desenvolvimento da IA */}
        <div className="bg-white p-6 shadow-md rounded-xl border-t-4 border-purple-500">
          <h2 className="text-2xl font-semibold mb-4 text-purple-700">Insights do Mentor IA</h2>
          <h3 className="font-semibold text-lg text-gray-800 mb-2">Análise Comparativa da Persona</h3>
          <p className="text-gray-700 whitespace-pre-wrap mb-6">{data.closureReport.aiComparativeAnalysis}</p>
          <h3 className="font-semibold text-lg text-gray-800 mb-2">Plano de Desenvolvimento Sugerido</h3>
          <p className="text-gray-700 whitespace-pre-wrap">{data.closureReport.developmentPlan}</p>
        </div>
      </div>

      <div className="mt-8 flex justify-end gap-4">
        <button onClick={() => handleAction('REJECT')} className="px-6 py-3 bg-red-50 text-red-600 font-semibold rounded-lg hover:bg-red-100 transition-colors">
          Recusar Resultados
        </button>
        <button onClick={() => handleAction('ACCEPT')} className="px-6 py-3 bg-green-500 text-white font-semibold rounded-lg hover:bg-green-600 shadow-lg shadow-green-500/30 transition-all">
          Acatar Fechamento e Resgatar XP
        </button>
      </div>
    </div>
  );
}
import { Router } from 'express';
import { db } from '../db/index';
import { finalEvaluations, closureReports, challengePersonas, challenges } from '../db/schema';
import { eq, and } from 'drizzle-orm';

const router = Router();

// Endpoint para o colaborador visualizar a avaliação final do gestor e o relatório da IA
router.get('/challenges/:challengeId/closure', async (req, res) => {
  const { challengeId } = req.params;
  const { userId } = (req as any).user; // Cast para evitar erro "Property 'user' does not exist on type 'Request'"

  try {
    // Busca o vínculo do colaborador com o desafio para descobrir a persona
    const challengePersonasData = await db.select().from(challengePersonas).where(
      and(
        eq(challengePersonas.challengeId, Number(challengeId)),
        eq(challengePersonas.collaboratorId, userId)
      )
    );
    const challengePersona = challengePersonasData.length > 0 ? challengePersonasData[0] : null;

    if (!challengePersona) {
      return res.status(404).json({ error: 'Colaborador não vinculado a este desafio.' });
    }

    // Busca as notas finais do gestor na tabela finalEvaluations usando a persona
    const finalEvaluationsData = await db.select().from(finalEvaluations).where(
      and(
        eq(finalEvaluations.challengeId, Number(challengeId)),
        eq(finalEvaluations.personaId, challengePersona.personaId)
      )
    );

    // Busca o relatório de fechamento gerado pela IA no Step 4.2
    const closureReportsData = await db.select().from(closureReports).where(
      and(
        eq(closureReports.challengeId, Number(challengeId)),
        eq(closureReports.personaId, challengePersona.personaId)
      )
    );
    const closureReport = closureReportsData.length > 0 ? closureReportsData[0] : null;

    if (!finalEvaluationsData || !closureReport) {
      return res.status(404).json({ 
        error: 'Dados de fechamento não encontrados para este desafio.' 
      });
    }

    // Formata a resposta da avaliação final para manter compatibilidade com o frontend (FechamentoDesafio.tsx)
    const challengeData = await db.query.challenges.findFirst({
      where: eq(challenges.id, Number(challengeId)),
      with: { axes: true }
    });
    const axesScores: Record<string, number> = {};
    let managerComments = '';
    finalEvaluationsData.forEach((ev: any) => {
      const axis = challengeData?.axes?.find((a: any) => a.id === ev.axisId);
      if (axis) axesScores[axis.name] = ev.rating;
      if (ev.observation) managerComments += ev.observation + '\n';
    });

    return res.json({
      finalEvaluation: { id: finalEvaluationsData[0]?.id || '1', axesScores, managerComments: managerComments.trim() },
      closureReport
    });
  } catch (error) {
    console.error('Erro ao buscar dados de fechamento:', error);
    return res.status(500).json({ 
      error: 'Erro interno ao carregar a tela de fechamento.' 
    });
  }
});

export default router;
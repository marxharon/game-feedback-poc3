import { Router } from 'express';
import { db } from '../db';
import { challenges, challengePersonas, closureReports, finalEvaluations } from '../db/schema';
import { eq, and } from 'drizzle-orm';

const router = Router();

router.get('/collaborator/dashboard', async (req, res) => {
  const { userId } = (req as any).user; // Cast para evitar erro de tipo estrito

  try {
    // 1. Busca os desafios em que o colaborador está envolvido
    const userChallengeRecords = await db.query.challengePersonas.findMany({
      where: eq(challengePersonas.collaboratorId, userId),
      with: {
        challenge: {
          with: {
            axes: true
          }
        }
      }
    });

    // 2. Itera sobre os desafios para incluir os dados da avaliação final (se existir)
    const challengesWithClosureData = await Promise.all(
      userChallengeRecords.map(async (record) => {
        const challenge = record.challenge;
        if (!challenge) return null;
        
        // Busca a avaliação final diretamente da tabela finalEvaluations
        const finalEvaluationData = await db.select().from(finalEvaluations).where(
          and(
            eq(finalEvaluations.challengeId, challenge.id),
            eq(finalEvaluations.personaId, record.personaId)
          )
        );

        // Formata os dados mantendo a tipagem esperada
        const axesScores: Record<string, number> = {};
        let managerComments = '';
        finalEvaluationData.forEach((ev: any) => {
          const axis = challenge.axes?.find((a: any) => a.id === ev.axisId);
          if (axis) axesScores[axis.name] = ev.rating;
          if (ev.observation) managerComments += ev.observation + '\n';
        });
        const formattedFinalEvaluation = finalEvaluationData.length > 0 ? { axesScores, managerComments: managerComments.trim() } : undefined;

        const closureReportsData = await db.select().from(closureReports).where(
          and(
            eq(closureReports.challengeId, challenge.id),
            eq(closureReports.personaId, record.personaId)
          )
        );
        const closureReport = closureReportsData.length > 0 ? closureReportsData[0] : null;

        return {
          id: challenge.id,
          title: challenge.title,
          status: challenge.status,
          collaboratorStatus: record.status,
          finalEvaluation: formattedFinalEvaluation,
          closureReport
        };
      })
    );

    return res.json({ challenges: challengesWithClosureData.filter(Boolean) });
  } catch (error) {
    console.error('Erro ao buscar dashboard do colaborador:', error);
    return res.status(500).json({ error: 'Erro ao carregar o dashboard.' });
  }
});

router.get('/collaborator/challenges/:challengeId/personas/:personaId/closure-report', async (req, res) => {
  const { challengeId, personaId } = req.params;

  if (!challengeId || !personaId || isNaN(Number(challengeId)) || isNaN(Number(personaId))) {
    return res.status(400).json({ error: 'IDs de desafio ou persona estão ausentes ou são inválidos.' });
  }

  try {
    const challengeData = await db.query.challenges.findFirst({
      where: eq(challenges.id, Number(challengeId)),
      with: {
        axes: true
      }
    });

    // Busca os registros da avaliação dos eixos a partir da tabela final_evaluations
    const finalEvals = await db.select().from(finalEvaluations).where(
      and(
        eq(finalEvaluations.challengeId, Number(challengeId)),
        eq(finalEvaluations.personaId, Number(personaId))
      )
    );

    const reports = await db.select().from(closureReports).where(
      and(
        eq(closureReports.challengeId, Number(challengeId)),
        eq(closureReports.personaId, Number(personaId))
      )
    );

    return res.json({ finalEvaluations: finalEvals, reports, axes: challengeData?.axes || [] });
  } catch (error) {
    console.error('Erro ao buscar relatorio de fechamento para o colaborador:', error);
    return res.status(500).json({ error: 'Erro ao carregar o relatorio de fechamento.' });
  }
});

export default router;
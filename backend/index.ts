import express from 'express';
import cors from 'cors';
import { db } from './src/db/db';
import { users, personas, personaVersions, challenges, challengePersonas, challengeAxes, cycles, evaluations, projectedPersonas, collaboratorValidations, finalEvaluations, closureReports } from './src/db/schema';
import { eq, desc, and } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { authMiddleware, AuthRequest } from './src/middleware/auth';
import * as dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey_for_poc';

app.get('/ping', (req, res) => {
  res.json({ message: 'Backend OK' });
});

app.post('/login', async (req, res): Promise<void> => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400).json({ error: 'Email and password are required' });
    return;
  }

  try {
    const userResult = await db.select().from(users).where(eq(users.email, email)).limit(1);
    const user = userResult[0];

    if (!user) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const token = jwt.sign(
      { userId: user.id, role: user.role, name: user.name, email: user.email },
      JWT_SECRET,
      { expiresIn: '1d' }
    );

    res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Protected route for testing
app.get('/protected', authMiddleware, (req: AuthRequest, res) => {
  res.json({ message: 'This is a protected route', user: req.user });
});

// --- USER ROUTES --- //
app.get('/users/collaborators', authMiddleware, async (req: AuthRequest, res): Promise<void> => {
  if (req.user?.role !== 'MANAGER' && req.user?.role !== 'ADMIN') {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }

  try {
    const collabs = await db.select({ id: users.id, name: users.name, email: users.email }).from(users).where(eq(users.role, 'COLLAB'));
    res.json(collabs);
  } catch (error) {
    console.error('Error fetching collaborators:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// --- PERSONA ROUTES --- //

// Create a new Persona (Manager)
app.post('/personas', authMiddleware, async (req: AuthRequest, res): Promise<void> => {
  const { name, role, baseText, collaboratorId } = req.body;
  const userId = req.user?.userId;

  if (req.user?.role !== 'MANAGER' && req.user?.role !== 'ADMIN') {
    res.status(403).json({ error: 'Forbidden: Only managers can create personas' });
    return;
  }

  if (!name || !role || !baseText) {
    res.status(400).json({ error: 'Name, role, and baseText are required' });
    return;
  }

  try {
    // 1. Create the persona
    const newPersona = await db.insert(personas).values({
      name,
      role,
      managerId: userId as number,
      collaboratorId: collaboratorId ? Number(collaboratorId) : null,
    }).returning();

    const personaId = newPersona[0].id;

    // 2. Create the initial draft version (V1)
    const draftVersion = await db.insert(personaVersions).values({
      personaId,
      versionNumber: 1,
      textContent: baseText,
      status: 'Em rascunho',
    }).returning();

    // 3. Call IA Service to normalize the text
    let normalizedText = '';
    try {
      const iaResponse = await fetch('http://localhost:8000/normalize-persona', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, role, base_text: baseText })
      });
      
      if (iaResponse.ok) {
        const iaData = await iaResponse.json();
        normalizedText = iaData.normalized_text;
      } else {
        console.error('IA Service returned error:', await iaResponse.text());
        normalizedText = '[Falha ao normalizar texto: IA Service indisponível]';
      }
    } catch (iaError) {
      console.error('Failed to communicate with IA Service:', iaError);
      normalizedText = '[Falha de conexão com IA Service]';
    }

    // 4. Create the normalized version (V2)
    const normalizedVersion = await db.insert(personaVersions).values({
      personaId,
      versionNumber: 2,
      textContent: normalizedText,
      status: 'Normalizado por IA',
    }).returning();

    res.status(201).json({ 
      persona: newPersona[0], 
      versions: [draftVersion[0], normalizedVersion[0]]
    });
  } catch (error) {
    console.error('Error creating persona:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all Personas for Manager
app.get('/personas', authMiddleware, async (req: AuthRequest, res): Promise<void> => {
  const userId = req.user?.userId;

  if (req.user?.role !== 'MANAGER' && req.user?.role !== 'ADMIN') {
    res.status(403).json({ error: 'Forbidden: Only managers can view their personas' });
    return;
  }

  try {
    const managerPersonas = await db.select().from(personas).where(eq(personas.managerId, userId as number));
    
    // Fetch latest versions for these personas
    // Note: for simplicity in POC, we query all versions and group in JS, or we could use Drizzle relational queries.
    // Doing simple parallel fetching for now.
    const results = await Promise.all(managerPersonas.map(async (persona) => {
      const versions = await db.select()
        .from(personaVersions)
        .where(eq(personaVersions.personaId, persona.id))
        .orderBy(desc(personaVersions.versionNumber));
        
      return {
        ...persona,
        versions,
        latestVersion: versions[0]
      };
    }));

    res.json(results);
  } catch (error) {
    console.error('Error fetching personas:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get pending Personas for Collaborator
app.get('/personas/pending', authMiddleware, async (req: AuthRequest, res): Promise<void> => {
  const userId = req.user?.userId;

  if (req.user?.role !== 'COLLAB' && req.user?.role !== 'ADMIN') {
    res.status(403).json({ error: 'Forbidden: Only collaborators can view their pending personas' });
    return;
  }

  try {
    const collabPersonas = await db.select().from(personas).where(eq(personas.collaboratorId, userId as number));
    
    const results = await Promise.all(collabPersonas.map(async (persona) => {
      const versions = await db.select()
        .from(personaVersions)
        .where(eq(personaVersions.personaId, persona.id))
        .orderBy(desc(personaVersions.versionNumber));
        
      return {
        ...persona,
        versions,
        latestVersion: versions[0]
      };
    }));

    // Filter to show only if latest version needs review (e.g. NORMALIZED or PENDING_COLLAB)
    const pendingResults = results.filter(r => r.latestVersion && r.latestVersion.status === 'Normalizado por IA');

    res.json(pendingResults);
  } catch (error) {
    console.error('Error fetching pending personas:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get validated personas for Collaborator
app.get('/personas/history', authMiddleware, async (req: AuthRequest, res): Promise<void> => {
  const userId = req.user?.userId;

  if (req.user?.role !== 'COLLAB' && req.user?.role !== 'ADMIN') {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }

  try {
    const collabPersonas = await db.select().from(personas).where(eq(personas.collaboratorId, userId as number));
    
    const results = await Promise.all(collabPersonas.map(async (persona) => {
      const versions = await db.select()
        .from(personaVersions)
        .where(eq(personaVersions.personaId, persona.id))
        .orderBy(desc(personaVersions.versionNumber));
        
      return {
        ...persona,
        versions,
        latestVersion: versions[0]
      };
    }));

    // Show those that are no longer pending
    const historyResults = results.filter(r => r.latestVersion && r.latestVersion.status !== 'Normalizado por IA' && r.latestVersion.status !== 'Em rascunho');

    res.json(historyResults);
  } catch (error) {
    console.error('Error fetching persona history:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update a Persona
app.put('/personas/:id', authMiddleware, async (req: AuthRequest, res): Promise<void> => {
  const { id } = req.params;
  const { name, role, baseText, collaboratorId } = req.body;
  const userId = req.user?.userId;

  if (req.user?.role !== 'MANAGER' && req.user?.role !== 'ADMIN') {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }

  try {
    const p = await db.select().from(personas).where(eq(personas.id, Number(id)));
    if (p.length === 0 || p[0].managerId !== userId) {
      res.status(403).json({ error: 'Forbidden or Not Found' });
      return;
    }

    await db.update(personas).set({ 
      name, 
      role,
      collaboratorId: collaboratorId ? Number(collaboratorId) : p[0].collaboratorId
    }).where(eq(personas.id, Number(id)));

    const latestVersion = await db.select()
      .from(personaVersions)
      .where(eq(personaVersions.personaId, Number(id)))
      .orderBy(desc(personaVersions.versionNumber))
      .limit(1);

    const nextVersionNumber = latestVersion.length > 0 ? latestVersion[0].versionNumber + 1 : 1;

    // Create new draft
    await db.insert(personaVersions).values({
      personaId: Number(id),
      versionNumber: nextVersionNumber,
      textContent: baseText,
      status: 'Em rascunho',
    });

    // Call IA Service to normalize the text again
    let normalizedText = '';
    try {
      const iaResponse = await fetch('http://localhost:8000/normalize-persona', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, role, base_text: baseText })
      });
      
      if (iaResponse.ok) {
        const iaData = await iaResponse.json();
        normalizedText = iaData.normalized_text;
      } else {
        console.error('IA Service returned error:', await iaResponse.text());
        normalizedText = '[Falha ao normalizar texto: IA Service indisponível]';
      }
    } catch (iaError) {
      console.error('Failed to communicate with IA Service:', iaError);
      normalizedText = '[Falha de conexão com IA Service]';
    }

    // Create the normalized version
    await db.insert(personaVersions).values({
      personaId: Number(id),
      versionNumber: nextVersionNumber + 1,
      textContent: normalizedText || baseText, // fallback to baseText if normalized fails entirely
      status: 'Normalizado por IA',
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Error updating persona:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete a Persona
app.delete('/personas/:id', authMiddleware, async (req: AuthRequest, res): Promise<void> => {
  const { id } = req.params;
  const userId = req.user?.userId;

  if (req.user?.role !== 'MANAGER' && req.user?.role !== 'ADMIN') {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }

  try {
    const p = await db.select().from(personas).where(eq(personas.id, Number(id)));
    if (p.length === 0 || p[0].managerId !== userId) {
      res.status(403).json({ error: 'Forbidden or Not Found' });
      return;
    }

    await db.delete(personaVersions).where(eq(personaVersions.personaId, Number(id)));
    await db.delete(personas).where(eq(personas.id, Number(id)));

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting persona:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Post Feedback (Collaborator)
app.post('/personas/:id/feedback', authMiddleware, async (req: AuthRequest, res): Promise<void> => {
  const { id } = req.params;
  const { action, justification } = req.body;
  const userId = req.user?.userId;

  if (req.user?.role !== 'COLLAB' && req.user?.role !== 'ADMIN') {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }

  try {
    const p = await db.select().from(personas).where(eq(personas.id, Number(id)));
    if (p.length === 0 || p[0].collaboratorId !== userId) {
      res.status(403).json({ error: 'Forbidden or Not Found' });
      return;
    }

    const latestVersion = await db.select()
      .from(personaVersions)
      .where(eq(personaVersions.personaId, Number(id)))
      .orderBy(desc(personaVersions.versionNumber))
      .limit(1);

    if (latestVersion.length === 0) {
      res.status(404).json({ error: 'No versions found' });
      return;
    }

    const currentVersion = latestVersion[0];
    const nextVersionNumber = currentVersion.versionNumber + 1;

    let newStatus = '';
    let newContent = currentVersion.textContent;

    if (action === 'ACCEPT') {
      newStatus = 'VALIDADA';
    } else if (action === 'REJECT') {
      newStatus = 'RECUSADA';
    } else if (action === 'ADJUST') {
      try {
        const iaResponse = await fetch('http://localhost:8000/readjust-persona', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            name: p[0].name, 
            role: p[0].role, 
            original_text: currentVersion.textContent,
            justification: justification || ''
          })
        });
        
        if (iaResponse.ok) {
          const iaData = await iaResponse.json();
          newContent = iaData.readjusted_text;
          newStatus = 'AJUSTADA'; // New status for IA consensus adjustment
        } else {
          console.error('IA Service returned error:', await iaResponse.text());
          res.status(502).json({ error: 'Failed to readjust via IA' });
          return;
        }
      } catch (iaError) {
        console.error('Failed to communicate with IA Service:', iaError);
        res.status(502).json({ error: 'IA Service unreachable' });
        return;
      }
    } else {
      res.status(400).json({ error: 'Invalid action' });
      return;
    }

    const newVersion = await db.insert(personaVersions).values({
      personaId: Number(id),
      versionNumber: nextVersionNumber,
      textContent: newContent,
      status: newStatus,
      feedback: justification || null // Save the feedback in the new version
    }).returning();

    res.json({ success: true, version: newVersion[0] });

  } catch (error) {
    console.error('Error handling persona feedback:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});


// --- COLLABORATOR VALIDATIONS (Step 3.3) --- //

// Get pending evaluations for collaborator
app.get('/challenges/pending-validations', authMiddleware, async (req: AuthRequest, res): Promise<void> => {
  const userId = req.user?.userId;

  if (req.user?.role !== 'COLLAB' && req.user?.role !== 'ADMIN') {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }

  try {
    // Encontrar personas vinculadas a este colaborador
    const myPersonas = await db.select().from(personas).where(eq(personas.collaboratorId, userId as number));
    const personaIds = myPersonas.map(p => p.id);

    if (personaIds.length === 0) {
      res.json([]);
      return;
    }

    // Buscar desafios em RUNNING ou CLOSED
    const activeChallenges = await db.select().from(challenges);

    const results = [];

    for (const c of activeChallenges) {
      if (c.status !== 'RUNNING' && c.status !== 'CLOSED') continue;
      
      // Vamos iterar por todos os ciclos do desafio
      const challengeCycles = await db.select().from(cycles).where(eq(cycles.challengeId, c.id));
      if (challengeCycles.length === 0) continue;

      for (const cycle of challengeCycles) {
        // para cada persona minha neste desafio, vamos ver se já tem validação
        for (const pId of personaIds) {
          // checar se estou nesse desafio
          const isParticipant = await db.select().from(challengePersonas).where(eq(challengePersonas.challengeId, c.id));
          if (!isParticipant.some(cp => cp.personaId === pId)) continue;
          
          // checar se o gestor JÁ avaliou esta persona neste ciclo
          const evals = await db.select().from(evaluations).where(eq(evaluations.cycleId, cycle.id));
          const myEvals = evals.filter(e => e.personaId === pId);
          
          if (myEvals.length > 0) {
            // Gestor já avaliou. Eu já validei?
            const myValidations = await db.select().from(collaboratorValidations)
              .where(eq(collaboratorValidations.cycleId, cycle.id));
            
            const hasValidated = myValidations.some(v => v.personaId === pId);
            
            if (!hasValidated) {
              // pegar os eixos
              const axes = await db.select().from(challengeAxes).where(eq(challengeAxes.challengeId, c.id));
              
              // pegar a persona projetada (Step 3.2)
              const projected = await db.select().from(projectedPersonas)
                .where(eq(projectedPersonas.cycleId, cycle.id));
              const myProjected = projected.find(p => p.personaId === pId);
              
              const pInfo = myPersonas.find(p => p.id === pId);

              results.push({
                challenge: c,
                cycle: cycle,
                persona: pInfo,
                evaluations: myEvals,
                axes: axes,
                projectedPersona: myProjected ? myProjected.textContent : null
              });
            }
          }
        }
      }
    }

    res.json(results);
  } catch (error) {
    console.error('Error fetching pending validations:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/challenges/history-validations', authMiddleware, async (req: AuthRequest, res): Promise<void> => {
  const userId = req.user?.userId;

  if (req.user?.role !== 'COLLAB' && req.user?.role !== 'ADMIN') {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }

  try {
    const myPersonas = await db.select().from(personas).where(eq(personas.collaboratorId, userId as number));
    const personaIds = myPersonas.map(p => p.id);

    if (personaIds.length === 0) {
      res.json([]);
      return;
    }

    const allChallenges = await db.select().from(challenges);
    const results = [];

    for (const c of allChallenges) {
      const challengeCycles = await db.select().from(cycles).where(eq(cycles.challengeId, c.id));
      if (challengeCycles.length === 0) continue;

      for (const cycle of challengeCycles) {
        for (const pId of personaIds) {
          const isParticipant = await db.select().from(challengePersonas).where(eq(challengePersonas.challengeId, c.id));
          if (!isParticipant.some(cp => cp.personaId === pId)) continue;
          
          const myValidations = await db.select().from(collaboratorValidations)
            .where(eq(collaboratorValidations.cycleId, cycle.id));
          
          const myValidation = myValidations.find(v => v.personaId === pId);
          
          if (myValidation) {
            const evals = await db.select().from(evaluations).where(eq(evaluations.cycleId, cycle.id));
            const myEvals = evals.filter(e => e.personaId === pId);
            
            const axes = await db.select().from(challengeAxes).where(eq(challengeAxes.challengeId, c.id));
            
            const projected = await db.select().from(projectedPersonas)
              .where(eq(projectedPersonas.cycleId, cycle.id));
            const myProjected = projected.find(p => p.personaId === pId);
            
            const pInfo = myPersonas.find(p => p.id === pId);

            results.push({
              challenge: c,
              cycle: cycle,
              persona: pInfo,
              evaluations: myEvals,
              axes: axes,
              projectedPersona: myProjected ? myProjected.textContent : null,
              validation: myValidation
            });
          }
        }
      }
    }

    // Sort by cycle creation descending
    results.sort((a, b) => b.cycle.id - a.cycle.id);
    
    res.json(results);
  } catch (error) {
    console.error('Error fetching history validations:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Submit Validation (Collaborator)
app.post('/challenges/:challengeId/cycles/:cycleId/personas/:personaId/validate', authMiddleware, async (req: AuthRequest, res): Promise<void> => {
  console.log('Received validation request!'); const { challengeId, cycleId, personaId } = req.params;
  const { status, justification } = req.body;
  const userId = req.user?.userId;

  if (req.user?.role !== 'COLLAB' && req.user?.role !== 'ADMIN') {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }

  try {
    // 1. Verify if I own this persona
    const p = await db.select().from(personas).where(eq(personas.id, Number(personaId)));
    if (p.length === 0 || p[0].collaboratorId !== userId) {
      res.status(403).json({ error: 'Forbidden or Not Found' });
      return;
    }

    // 2. Call AI Service to calculate alignment (Step 3.4)
    let alignmentScore = 100; // default perfect match
    
    // We need the original evaluations to send to the AI
    const evals = await db.select().from(evaluations).where(eq(evaluations.cycleId, Number(cycleId)));
    const myEvals = evals.filter(e => e.personaId === Number(personaId));
    const axes = await db.select().from(challengeAxes).where(eq(challengeAxes.challengeId, Number(challengeId)));
    
    const evaluationsForAI = myEvals.map(ev => {
      const ax = axes.find(a => a.id === ev.axisId);
      return {
        axis_name: ax ? ax.name : 'Unknown',
        rating: ev.rating,
        observation: ev.observation
      };
    });

    try {
      const iaResponse = await fetch('http://localhost:8000/calculate-alignment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          evaluations: evaluationsForAI,
          collaborator_status: status,
          collaborator_justification: justification || ''
        })
      });
      
      if (iaResponse.ok) {
        const iaData = await iaResponse.json();
        alignmentScore = iaData.alignment_score;
      } else {
        console.error('IA Service returned error for alignment:', await iaResponse.text());
        alignmentScore = status === 'ACCEPTED' ? 100 : (status === 'PARTIAL' ? 70 : 40); // Simple fallback logic
      }
    } catch (iaError) {
      console.error('Failed to communicate with IA Service for alignment:', iaError);
      alignmentScore = status === 'ACCEPTED' ? 100 : (status === 'PARTIAL' ? 70 : 40); // Simple fallback logic
    }

    // 3. Save validation
    await db.insert(collaboratorValidations).values({
      challengeId: Number(challengeId),
      cycleId: Number(cycleId),
      personaId: Number(personaId),
      status: status, // ACCEPTED, PARTIAL, REJECTED
      justification: justification || '',
      alignmentScore: alignmentScore
    });

    // --- Step 3.5: Rotação de Ciclos ---
    // Verificando se todas as personas deste desafio no ciclo atual já foram validadas
    const allChallengePersonas = await db.select().from(challengePersonas).where(eq(challengePersonas.challengeId, Number(challengeId)));
    const totalPersonas = allChallengePersonas.length;

    const currentValidations = await db.select().from(collaboratorValidations).where(eq(collaboratorValidations.cycleId, Number(cycleId)));
    const validatedPersonas = new Set(currentValidations.map(v => v.personaId));

    if (totalPersonas > 0 && validatedPersonas.size >= totalPersonas) {
      // Todos validaram. Fechar este ciclo.
      await db.update(cycles).set({ status: 'COMPLETED' }).where(eq(cycles.id, Number(cycleId)));

      const c = await db.select().from(challenges).where(eq(challenges.id, Number(challengeId)));
      const numCycles = c.length > 0 ? c[0].numberOfCycles : 1;
      
      const currentCycleInfo = await db.select().from(cycles).where(eq(cycles.id, Number(cycleId)));
      const currentCycleNumber = currentCycleInfo.length > 0 ? currentCycleInfo[0].cycleNumber : 1;

      if (currentCycleNumber < numCycles) {
        // Criar próximo ciclo
        await db.insert(cycles).values({
          challengeId: Number(challengeId),
          cycleNumber: currentCycleNumber + 1,
          status: 'PENDING'
        });
      } else {
        // Todos os ciclos concluídos. Fechar o desafio ou enviar para reavaliação final.
        // Step 4.1: Reavaliação Final (Finisher) -> muda status para FINISHER_PENDING
        await db.update(challenges).set({ status: 'FINISHER_PENDING' }).where(eq(challenges.id, Number(challengeId)));
      }
    }
    // -----------------------------------

    res.json({ success: true, alignmentScore });
  } catch (error) {
    console.error('Error saving validation:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// --- CHALLENGE ROUTES --- //

// Create Challenge Draft (Manager)
app.post('/challenges', authMiddleware, async (req: AuthRequest, res): Promise<void> => {
  const { title, description, personaIds, axes, deadline, numberOfCycles } = req.body;
  const userId = req.user?.userId;

  if (req.user?.role !== 'MANAGER' && req.user?.role !== 'ADMIN') {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }

  if (!title || !description || !Array.isArray(personaIds) || personaIds.length === 0) {
    res.status(400).json({ error: 'Title, description, and at least one persona are required' });
    return;
  }

  try {
    const newChallenge = await db.insert(challenges).values({
      title,
      description,
      managerId: userId as number,
      status: 'DRAFT',
      deadline: deadline ? new Date(deadline) : null,
      numberOfCycles: numberOfCycles || 1
    }).returning();

    const challengeId = newChallenge[0].id;

    for (const personaId of personaIds) {
      await db.insert(challengePersonas).values({
        challengeId,
        personaId: Number(personaId)
      });
    }

    if (axes && Array.isArray(axes)) {
      for (const axis of axes) {
        await db.insert(challengeAxes).values({
          challengeId,
          name: axis.name,
          type: axis.type,
          description: axis.description || ''
        });
      }
    }

    res.status(201).json({ challenge: newChallenge[0] });
  } catch (error) {
    console.error('Error creating challenge:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all Challenges for Manager
app.get('/challenges', authMiddleware, async (req: AuthRequest, res): Promise<void> => {
  const userId = req.user?.userId;
  if (req.user?.role !== 'MANAGER' && req.user?.role !== 'ADMIN') {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }
  try {
    const managerChallenges = await db.select().from(challenges).where(eq(challenges.managerId, userId as number));
    
    const results = await Promise.all(managerChallenges.map(async (c) => {
      const axes = await db.select().from(challengeAxes).where(eq(challengeAxes.challengeId, c.id));
      const personasList = await db.select({ personaId: challengePersonas.personaId })
        .from(challengePersonas).where(eq(challengePersonas.challengeId, c.id));
      
      const challengeCycles = await db.select().from(cycles).where(eq(cycles.challengeId, c.id)).orderBy(desc(cycles.cycleNumber)).limit(1);
      const currentCycleObj = challengeCycles.length > 0 ? challengeCycles[0] : null;
      const currentCycle = currentCycleObj ? currentCycleObj.cycleNumber : 1;
      
      let evaluatedPersonaIds: number[] = [];
      if (currentCycleObj) {
        const evals = await db.select().from(evaluations).where(eq(evaluations.cycleId, currentCycleObj.id));
        evaluatedPersonaIds = Array.from(new Set(evals.map(e => e.personaId)));
      }
      
      return { ...c, axes, personaIds: personasList.map(p => p.personaId), currentCycle, evaluatedPersonaIds };
    }));
    
    res.json(results);
  } catch (error) {
    console.error('Error fetching challenges:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update Challenge Draft (Manager)
app.put('/challenges/:id', authMiddleware, async (req: AuthRequest, res): Promise<void> => {
  const { id } = req.params;
  const { title, description, personaIds, axes, deadline, numberOfCycles } = req.body;
  const userId = req.user?.userId;

  if (req.user?.role !== 'MANAGER' && req.user?.role !== 'ADMIN') {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }

  try {
    const c = await db.select().from(challenges).where(eq(challenges.id, Number(id)));
    if (c.length === 0 || c[0].managerId !== userId) {
      res.status(403).json({ error: 'Forbidden or Not Found' });
      return;
    }

    await db.update(challenges).set({ 
      title, 
      description,
      deadline: deadline ? new Date(deadline) : null,
      numberOfCycles: numberOfCycles || c[0].numberOfCycles
    }).where(eq(challenges.id, Number(id)));

    await db.delete(challengePersonas).where(eq(challengePersonas.challengeId, Number(id)));
    for (const personaId of personaIds || []) {
      await db.insert(challengePersonas).values({
        challengeId: Number(id),
        personaId: Number(personaId)
      });
    }

    await db.delete(challengeAxes).where(eq(challengeAxes.challengeId, Number(id)));
    for (const axis of axes || []) {
      await db.insert(challengeAxes).values({
        challengeId: Number(id),
        name: axis.name,
        type: axis.type,
        description: axis.description || ''
      });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error updating challenge:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Finalize Challenge Setup (Step 2.3)
app.put('/challenges/:id/finalize-setup', authMiddleware, async (req: AuthRequest, res): Promise<void> => {
  const { id } = req.params;
  const { axes, deadline, numberOfCycles } = req.body;
  const userId = req.user?.userId;

  if (req.user?.role !== 'MANAGER' && req.user?.role !== 'ADMIN') {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }

  try {
    const c = await db.select().from(challenges).where(eq(challenges.id, Number(id)));
    if (c.length === 0 || c[0].managerId !== userId) {
      res.status(403).json({ error: 'Forbidden or Not Found' });
      return;
    }

    if (c[0].status !== 'DRAFT') {
      res.status(400).json({ error: 'Challenge is not in DRAFT status' });
      return;
    }

    // Update challenge
    await db.update(challenges).set({ 
      status: 'PREPARATION',
      deadline: deadline ? new Date(deadline) : null,
      numberOfCycles: numberOfCycles || c[0].numberOfCycles
    }).where(eq(challenges.id, Number(id)));

    // Update axes
    await db.delete(challengeAxes).where(eq(challengeAxes.challengeId, Number(id)));
    if (axes && Array.isArray(axes)) {
      for (const axis of axes) {
        await db.insert(challengeAxes).values({
          challengeId: Number(id),
          name: axis.name,
          type: axis.type,
          description: axis.description || ''
        });
      }
    }

    // Create initial cycle
    await db.insert(cycles).values({
      challengeId: Number(id),
      cycleNumber: 1,
      status: 'PENDING'
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Error finalizing challenge setup:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Start Challenge (Manager)
app.post('/challenges/:id/start', authMiddleware, async (req: AuthRequest, res): Promise<void> => {
  const { id } = req.params;
  const userId = req.user?.userId;

  if (req.user?.role !== 'MANAGER' && req.user?.role !== 'ADMIN') {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }

  try {
    const c = await db.select().from(challenges).where(eq(challenges.id, Number(id)));
    if (c.length === 0 || c[0].managerId !== userId) {
      res.status(403).json({ error: 'Forbidden or Not Found' });
      return;
    }

    if (c[0].status !== 'PREPARATION') {
      res.status(400).json({ error: 'Challenge must be in PREPARATION status to start' });
      return;
    }

    await db.update(challenges).set({ status: 'RUNNING' }).where(eq(challenges.id, Number(id)));
    
    // Ensure the first cycle is marked as running (or keep as pending based on logic, let's say we just keep it pending/running)
    // For simplicity, we just use RUNNING status on challenge
    res.json({ success: true });
  } catch (error) {
    console.error('Error starting challenge:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Evaluate Persona in a Challenge (Manager)
app.post('/challenges/:id/evaluate', authMiddleware, async (req: AuthRequest, res): Promise<void> => {
  const { id } = req.params;
  const { personaId, evaluationsData } = req.body;
  const userId = req.user?.userId;

  if (req.user?.role !== 'MANAGER' && req.user?.role !== 'ADMIN') {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }

  try {
    const c = await db.select().from(challenges).where(eq(challenges.id, Number(id)));
    if (c.length === 0 || c[0].managerId !== userId || (c[0].status !== 'RUNNING' && c[0].status !== 'CLOSED')) {
      res.status(403).json({ error: 'Forbidden or Challenge not active/closed' });
      return;
    }

    const challengeCycles = await db.select().from(cycles).where(eq(cycles.challengeId, Number(id))).orderBy(desc(cycles.cycleNumber)).limit(1);
    if (challengeCycles.length === 0) {
      res.status(400).json({ error: 'No active cycle found' });
      return;
    }
    const currentCycle = challengeCycles[0];

    const existingEvals = await db.select().from(evaluations).where(eq(evaluations.challengeId, Number(id)));
    const toDelete = existingEvals.filter(e => e.cycleId === currentCycle.id && e.personaId === Number(personaId));
    
    for (const ev of toDelete) {
      await db.delete(evaluations).where(eq(evaluations.id, ev.id));
    }

    if (evaluationsData && Array.isArray(evaluationsData)) {
      for (const ev of evaluationsData) {
        await db.insert(evaluations).values({
          challengeId: Number(id),
          cycleId: currentCycle.id,
          personaId: Number(personaId),
          axisId: Number(ev.axisId),
          managerId: userId as number,
          rating: Number(ev.rating),
          observation: ev.observation || ''
        });
      }
    }

    // --- Step 3.2: Persona Projetada ---
    let projectedPersonaText = '';
    try {
      const latestVersion = await db.select()
        .from(personaVersions)
        .where(eq(personaVersions.personaId, Number(personaId)))
        .orderBy(desc(personaVersions.versionNumber))
        .limit(1);
      
      const personaText = latestVersion.length > 0 ? latestVersion[0].textContent : '';

      const evalDataForIA = [];
      for (const ev of evaluationsData || []) {
        const axisInfo = await db.select().from(challengeAxes).where(eq(challengeAxes.id, Number(ev.axisId))).limit(1);
        const axisName = axisInfo.length > 0 ? axisInfo[0].name : 'Eixo Desconhecido';
        evalDataForIA.push({
          axis_name: axisName,
          rating: Number(ev.rating),
          observation: ev.observation || ''
        });
      }

      const iaResponse = await fetch('http://localhost:8000/project-persona', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          persona_text: personaText,
          evaluations: evalDataForIA
        })
      });
      
      if (iaResponse.ok) {
        const iaData = await iaResponse.json();
        projectedPersonaText = iaData.projected_persona;
      } else {
        console.error('IA Service returned error:', await iaResponse.text());
        projectedPersonaText = '[Falha ao projetar persona: IA Service indisponível]';
      }
      
      await db.insert(projectedPersonas).values({
        challengeId: Number(id),
        cycleId: currentCycle.id,
        personaId: Number(personaId),
        textContent: projectedPersonaText
      });
    } catch (iaError) {
      console.error('Failed to communicate with IA Service for projection:', iaError);
      projectedPersonaText = '[Falha de conexão com IA Service]';
    }
    // -----------------------------------

    const allChallengePersonas = await db.select().from(challengePersonas).where(eq(challengePersonas.challengeId, Number(id)));
    const totalPersonas = allChallengePersonas.length;

    const currentEvals = await db.select().from(evaluations).where(eq(evaluations.cycleId, currentCycle.id));
    const evaluatedPersonas = new Set(currentEvals.map(e => e.personaId));

    let isLastPersona = false;
    if (totalPersonas > 0 && evaluatedPersonas.size >= totalPersonas) {
      isLastPersona = true;
      // All personas evaluated by manager in this cycle. Now we wait for collaborators to validate.
      // We don't advance the cycle here anymore. It happens in the validation endpoint.
      await db.update(challenges).set({ status: 'RUNNING' }).where(eq(challenges.id, Number(id)));
    } else {
      await db.update(challenges).set({ status: 'RUNNING' }).where(eq(challenges.id, Number(id)));
    }

    res.json({ success: true, isLastPersona, evaluatedCount: evaluatedPersonas.size, totalPersonas, projectedPersona: projectedPersonaText });
  } catch (error) {
    console.error('Error saving evaluations:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get Evaluations for a Challenge
app.get('/challenges/:id/evaluations', authMiddleware, async (req: AuthRequest, res): Promise<void> => {
  const { id } = req.params;
  const userId = req.user?.userId;

  if (req.user?.role !== 'MANAGER' && req.user?.role !== 'ADMIN') {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }

  try {
    const c = await db.select().from(challenges).where(eq(challenges.id, Number(id)));
    if (c.length === 0 || c[0].managerId !== userId) {
      res.status(403).json({ error: 'Forbidden or Not Found' });
      return;
    }

    const evals = await db.select().from(evaluations).where(eq(evaluations.challengeId, Number(id)));
    const challengeCycles = await db.select().from(cycles).where(eq(cycles.challengeId, Number(id)));

    const projectedPersonasList = await db.select().from(projectedPersonas).where(eq(projectedPersonas.challengeId, Number(id)));
    res.json({ evaluations: evals, cycles: challengeCycles, projectedPersonas: projectedPersonasList });
  } catch (error) {
    console.error('Error fetching evaluations:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete Challenge
app.delete('/challenges/:id', authMiddleware, async (req: AuthRequest, res): Promise<void> => {
  const { id } = req.params;
  const userId = req.user?.userId;

  if (req.user?.role !== 'MANAGER' && req.user?.role !== 'ADMIN') {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }

  try {
    const c = await db.select().from(challenges).where(eq(challenges.id, Number(id)));
    if (c.length === 0 || c[0].managerId !== userId) {
      res.status(403).json({ error: 'Forbidden or Not Found' });
      return;
    }

    // 1. Deletar avaliações primeiro, pois dependem de ciclos, eixos e desafios
    await db.delete(evaluations).where(eq(evaluations.challengeId, Number(id)));
    
    // 1.5 Deletar validações e personas projetadas que dependem dos ciclos e do desafio
    await db.delete(collaboratorValidations).where(eq(collaboratorValidations.challengeId, Number(id)));
    await db.delete(projectedPersonas).where(eq(projectedPersonas.challengeId, Number(id)));
    
    // 2. Deletar os ciclos do desafio
    await db.delete(cycles).where(eq(cycles.challengeId, Number(id)));
    
    // 3. Deletar eixos e vínculos de personas
    await db.delete(challengeAxes).where(eq(challengeAxes.challengeId, Number(id)));
    await db.delete(challengePersonas).where(eq(challengePersonas.challengeId, Number(id)));
    
    // 4. Deletar o desafio
    await db.delete(challenges).where(eq(challenges.id, Number(id)));

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting challenge:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});


// --- PHASE 4: CLOSURE AND REPORTS --- //

app.post('/challenges/:id/final-evaluation', authMiddleware, async (req: AuthRequest, res): Promise<void> => {
  const { id } = req.params;
  const { personaId, evaluationsData } = req.body;
  const userId = req.user?.userId;

  if (req.user?.role !== 'MANAGER' && req.user?.role !== 'ADMIN') {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }

  try {
    const c = await db.select().from(challenges).where(eq(challenges.id, Number(id)));
    if (c.length === 0 || c[0].managerId !== userId) {
      res.status(403).json({ error: 'Forbidden or Not Found' });
      return;
    }

    if (c[0].status !== 'FINISHER_PENDING') {
      res.status(400).json({ error: 'Challenge must be in FINISHER_PENDING status' });
      return;
    }

    const existingFinals = await db.select().from(finalEvaluations).where(eq(finalEvaluations.challengeId, Number(id)));
    const toDelete = existingFinals.filter(e => e.personaId === Number(personaId));
    
    for (const ev of toDelete) {
      await db.delete(finalEvaluations).where(eq(finalEvaluations.id, ev.id));
    }

    if (evaluationsData && Array.isArray(evaluationsData)) {
      for (const ev of evaluationsData) {
        await db.insert(finalEvaluations).values({
          challengeId: Number(id),
          personaId: Number(personaId),
          axisId: Number(ev.axisId),
          managerId: userId as number,
          rating: Number(ev.rating),
          observation: ev.observation || ''
        });
      }
    }

    let reportText = '';
    try {
      const allVersions = await db.select().from(personaVersions)
        .where(eq(personaVersions.personaId, Number(personaId)))
        .orderBy(desc(personaVersions.versionNumber));
      
      const vInitial = allVersions.length > 0 ? allVersions[allVersions.length - 1].textContent : '';
      const vFinal = allVersions.length > 0 ? allVersions[0].textContent : '';

      const evalDataForIA = evaluationsData.map((ev: any) => ({
        axis_id: ev.axisId,
        rating: Number(ev.rating),
        observation: ev.observation || ''
      }));

      const iaResponse = await fetch('http://localhost:8000/generate-closure-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          initial_persona: vInitial,
          final_persona: vFinal,
          final_evaluations: evalDataForIA
        })
      });
      
      if (iaResponse.ok) {
        const iaData = await iaResponse.json();
        reportText = iaData.report_text;
      } else {
        console.error('IA Service returned error:', await iaResponse.text());
        reportText = '[Falha ao gerar relatório: IA Service indisponível]';
      }
    } catch (iaError) {
      console.error('Failed to communicate with IA Service for closure report:', iaError);
      reportText = '[Falha de conexão com IA Service]';
    }

    const existingReports = await db.select().from(closureReports).where(eq(closureReports.challengeId, Number(id)));
    const toDeleteReports = existingReports.filter(e => e.personaId === Number(personaId));
    for(const r of toDeleteReports) {
      await db.delete(closureReports).where(eq(closureReports.id, r.id));
    }
    
    await db.insert(closureReports).values({
      challengeId: Number(id),
      personaId: Number(personaId),
      summaryText: reportText,
      collaboratorStatus: 'PENDING'
    });

    const allChallengePersonas = await db.select().from(challengePersonas).where(eq(challengePersonas.challengeId, Number(id)));
    const totalPersonas = allChallengePersonas.length;

    const currentFinals = await db.select().from(finalEvaluations).where(eq(finalEvaluations.challengeId, Number(id)));
    const evaluatedPersonas = new Set(currentFinals.map(e => e.personaId));

    let isLastPersona = false;
    if (totalPersonas > 0 && evaluatedPersonas.size >= totalPersonas) {
      isLastPersona = true;
    }

    res.json({ success: true, isLastPersona, reportText });
  } catch (error) {
    console.error('Error in final evaluation:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});


// Step 4.3: Collaborator signs closure report
app.post('/challenges/:id/closure-reports/:personaId/sign', authMiddleware, async (req: AuthRequest, res): Promise<void> => {
  const { id, personaId } = req.params;
  const { status } = req.body; // ACCEPTED or REJECTED
  const userId = req.user?.userId;

  if (req.user?.role !== 'COLLAB' && req.user?.role !== 'ADMIN') {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }

  try {
    const p = await db.select().from(personas).where(eq(personas.id, Number(personaId)));
    if (p.length === 0 || p[0].collaboratorId !== userId) {
      res.status(403).json({ error: 'Forbidden or Not Found' });
      return;
    }

    const report = await db.select().from(closureReports).where(and(eq(closureReports.challengeId, Number(id)), eq(closureReports.personaId, Number(personaId))));
    if (report.length === 0) {
      res.status(404).json({ error: 'Closure report not found' });
      return;
    }

    await db.update(closureReports).set({ collaboratorStatus: status }).where(eq(closureReports.id, report[0].id));

    // Phase 5: Check if all personas are completed
    const allChallengePersonas = await db.select().from(challengePersonas).where(eq(challengePersonas.challengeId, Number(id)));
    const totalPersonas = allChallengePersonas.length;

    const allReports = await db.select().from(closureReports).where(eq(closureReports.challengeId, Number(id)));
    const completedReports = allReports.filter(r => r.collaboratorStatus === 'ACCEPTED' || r.collaboratorStatus === 'REJECTED');

    if (totalPersonas > 0 && completedReports.length >= totalPersonas) {
      // Step 5.1: Motor de Conclusao Global -> status CLOSED
      await db.update(challenges).set({ status: 'CLOSED' }).where(eq(challenges.id, Number(id)));
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error signing closure report:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/challenges/pending-closure-reports', authMiddleware, async (req: AuthRequest, res): Promise<void> => {
  const userId = req.user?.userId;

  if (req.user?.role !== 'COLLAB' && req.user?.role !== 'ADMIN') {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }

  try {
    const myPersonas = await db.select().from(personas).where(eq(personas.collaboratorId, userId as number));
    const personaIds = myPersonas.map(p => p.id);

    if (personaIds.length === 0) {
      res.json([]);
      return;
    }

    const pendingReports = [];
    for (const pId of personaIds) {
      const reports = await db.select().from(closureReports).where(and(eq(closureReports.personaId, pId), eq(closureReports.collaboratorStatus, 'PENDING')));
      
      for (const r of reports) {
        const c = await db.select().from(challenges).where(eq(challenges.id, r.challengeId));
        const p = myPersonas.find(x => x.id === pId);
        if (c.length > 0) {
          pendingReports.push({ report: r, challenge: c[0], persona: p });
        }
      }
    }

    res.json(pendingReports);
  } catch (error) {
    console.error('Error fetching pending closure reports:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Backend listening on port ${PORT}`);
});

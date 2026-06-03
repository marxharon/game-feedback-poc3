import { db } from './src/db/db';
import { 
  users, personas, personaVersions, challenges, challengePersonas, 
  challengeAxes, cycles, evaluations, projectedPersonas, 
  collaboratorValidations, finalEvaluations, closureReports, gamification 
} from './src/db/schema';
import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import * as dotenv from 'dotenv';

dotenv.config();

const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const randomItem = <T>(arr: T[]): T => arr[randomInt(0, arr.length - 1)];
const shuffle = <T>(arr: T[]): T[] => {
  const newArr = [...arr];
  for (let i = newArr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
  }
  return newArr;
};

// Dados para randomização
const names = ["Ana", "Bruno", "Carlos", "Daniela", "Eduardo", "Fernanda", "Gabriel", "Helena", "Igor", "Julia", "Lucas", "Mariana", "Nicolas", "Olivia", "Pedro", "Quintino", "Rafaela", "Samuel", "Tatiana", "Vinicius", "Wagner", "Yuri", "Zelia", "Alice", "Breno", "Clara", "Diego", "Elisa", "Felipe", "Giovana"];
const lastNames = ["Silva", "Santos", "Oliveira", "Souza", "Rodrigues", "Ferreira", "Alves", "Pereira", "Lima", "Gomes", "Costa", "Ribeiro", "Martins", "Carvalho", "Almeida", "Mendes", "Nunes", "Rocha", "Melo", "Barros"];
const roles = ["Desenvolvedor Senior", "Desenvolvedor Pleno", "Desenvolvedor Junior", "Analista de Dados", "UX Designer", "DevOps Engineer", "QA Tester", "Tech Lead", "Product Owner", "Scrum Master"];

const baseTexts = [
  "Profissional muito técnico, porém precisa melhorar a comunicação em reuniões.",
  "Ótimo espírito de equipe, mas apresenta dificuldades com prazos apertados.",
  "Entregas impecáveis. Foca demais no trabalho e esquece das pausas de descanso.",
  "Muito criativo, mas precisa se organizar melhor com a documentação do código.",
  "Líder nato, auxilia a todos, mas centraliza muitas tarefas em si mesmo."
];

const normalizedTexts = [
  "Perfil analítico com forte base técnica. Ponto a desenvolver: Clareza na comunicação síncrona.",
  "Perfil colaborativo e empático. Ponto a desenvolver: Gestão de tempo sob pressão.",
  "Perfil focado e de alta qualidade. Ponto a desenvolver: Gestão de bem-estar e pausas ativas.",
  "Perfil inovador. Ponto a desenvolver: Governança e documentação técnica.",
  "Perfil de liderança e mentoria. Ponto a desenvolver: Delegação de tarefas."
];

const axesPool = [
  { name: 'Qualidade de Código', type: 'governança' },
  { name: 'Cumprimento de Prazos', type: 'governança' },
  { name: 'Comunicação Assertiva', type: 'social' },
  { name: 'Mentoria e Ajuda', type: 'social' },
  { name: 'Gestão de Estresse', type: 'bem-estar' },
  { name: 'Equilíbrio e Pausas', type: 'bem-estar' },
  { name: 'Trabalho em Equipe', type: 'misto' },
  { name: 'Visão de Negócio', type: 'misto' }
];

const validationStatuses = ['ACCEPTED', 'ACCEPTED', 'ACCEPTED', 'PARTIAL', 'PARTIAL', 'REJECTED']; 
const justifications = [
  "Concordo plenamente com a avaliação.",
  "Acho que a nota poderia ser maior, entreguei os projetos X e Y.",
  "Discordo, minha comunicação foi ativa em todas as dailies.",
  "Concordo em partes, o atraso ocorreu devido a bloqueios externos.",
  "Avaliação justa, vou focar em melhorar esse ponto."
];

async function runMonteCarlo() {
  console.log("🚀 Iniciando Simulação de Monte Carlo V3...");
  
  const runId = Date.now();
  const defaultPassword = await bcrypt.hash('123', 10);

  // 1. Criar Gestor Principal
  console.log("👤 Criando Gestor...");
  const manager = await db.insert(users).values({
    name: "Gestor Monte Carlo V3",
    email: `gestor_mc3_${runId}@teste.com`,
    passwordHash: defaultPassword,
    role: "MANAGER"
  }).returning();
  const managerId = manager[0].id;

  // 2. Criar 300 Colaboradores
  console.log("👥 Criando 300 Colaboradores e Personas...");
  const collabIds: number[] = [];
  const personaIds: number[] = [];

  for (let i = 0; i < 300; i++) {
    const fullName = `${randomItem(names)} ${randomItem(lastNames)}`;
    const user = await db.insert(users).values({
      name: fullName,
      email: `collab_mc3_${i+1}_${runId}@teste.com`,
      passwordHash: defaultPassword,
      role: "COLLAB"
    }).returning();
    collabIds.push(user[0].id);

    const persona = await db.insert(personas).values({
      name: `Persona - ${fullName}`,
      role: randomItem(roles),
      managerId: managerId,
      collaboratorId: user[0].id
    }).returning();
    personaIds.push(persona[0].id);

    await db.insert(personaVersions).values({
      personaId: persona[0].id,
      versionNumber: 1,
      textContent: randomItem(baseTexts),
      status: 'Em rascunho'
    });

    await db.insert(personaVersions).values({
      personaId: persona[0].id,
      versionNumber: 2,
      textContent: randomItem(normalizedTexts),
      status: 'Normalizado por IA'
    });
  }

  // 3. Estruturar Desafios (300 pessoas * 10 desafios = 3000 participações)
  console.log("🎯 Estruturando a distribuição matemática dos desafios...");
  let pCounts = new Map<number, number>();
  for(let pid of personaIds) pCounts.set(pid, 0);
  
  let challengesList: number[][] = [];
  let totalAllocated = 0;
  
  while(totalAllocated < 3000) {
      let size = randomInt(4, 6); // De 4 a 6 personas por desafio
      let available = Array.from(pCounts.keys()).filter(id => pCounts.get(id)! < 10);
      if (available.length === 0) break;
      
      available = shuffle(available);
      let selected = available.slice(0, Math.min(size, available.length));
      
      for(let s of selected) {
          pCounts.set(s, pCounts.get(s)! + 1);
          totalAllocated++;
      }

      // Garantir no mínimo 4 personas envolvidas por desafio, preenchendo caso a fila de disponíveis seja insuficiente
      while (selected.length < 4) {
          const extra = randomItem(personaIds);
          if (!selected.includes(extra)) {
              selected.push(extra);
          }
      }

      challengesList.push(selected);
  }

  const personaAxisBoost: Record<string, boolean> = {};

  console.log(`⚔️ Criando ${challengesList.length} Desafios, Eixos e Ciclos...`);
  for (let i = 0; i < challengesList.length; i++) {
    const numCycles = randomInt(1, 3); // De 1 a 3 ciclos por desafio
    const challenge = await db.insert(challenges).values({
      title: `Desafio Sprint ${i+1} MC3`,
      description: "Desafio gerado pela simulação de Monte Carlo para análise de engajamento e ciclos dinâmicos.",
      managerId: managerId,
      status: 'CLOSED',
      numberOfCycles: numCycles
    }).returning();
    const challengeId = challenge[0].id;

    const cAxes = shuffle(axesPool).slice(0, 5);
    const axisIds: number[] = [];
    for (let ax of cAxes) {
      const insertedAxis = await db.insert(challengeAxes).values({
        challengeId, name: ax.name, type: ax.type, description: "Gerado por simulação"
      }).returning();
      axisIds.push(insertedAxis[0].id);
    }

    const currentPersonas = challengesList[i];
    for (let pid of currentPersonas) {
      await db.insert(challengePersonas).values({ challengeId, personaId: pid });
    }

    // Execução dos Ciclos (O Gestor avalia, o colaborador valida)
    for (let cycleNum = 1; cycleNum <= numCycles; cycleNum++) {
      const cycle = await db.insert(cycles).values({
        challengeId, cycleNumber: cycleNum, status: 'COMPLETED'
      }).returning();
      const cycleId = cycle[0].id;

      for (let pid of currentPersonas) {
        for (let j = 0; j < axisIds.length; j++) {
          const axId = axisIds[j];
          const axName = cAxes[j].name;
          const key = `${pid}_${axName}`;
          
          let baseMin = 1;
          let baseMax = 4;
          if (personaAxisBoost[key]) {
            baseMin = 3;
            baseMax = 5;
          }

          let rating = cycleNum === 1 ? randomInt(baseMin, baseMax) : randomInt(baseMin + 1, 5);
          if (rating > 5) rating = 5;

          await db.insert(evaluations).values({
            challengeId, cycleId, personaId: pid, axisId: axId, managerId, rating, observation: "Feedback simulado MC3"
          });
        }

        await db.insert(projectedPersonas).values({
          challengeId, cycleId, personaId: pid, textContent: "[IA] - Evolução e nuances identificadas nos eixos avaliados."
        });

        let status = randomItem(validationStatuses);
        // Simulando Convergência: Em ciclos posteriores, o gap e as resistências diminuem (Acatar aumenta)
        if (cycleNum > 1 && Math.random() < 0.6) {
          status = 'ACCEPTED';
        }
        const alignScore = status === 'ACCEPTED' ? randomInt(90, 100) : (status === 'PARTIAL' ? randomInt(60, 89) : randomInt(10, 50));
        
        await db.insert(collaboratorValidations).values({
          challengeId, cycleId, personaId: pid, status, justification: randomItem(justifications), alignmentScore: alignScore
        });

        await addXp(pid, alignScore);
      }
    }

    // Fase Final: O sistema cria as Notas de Fechamento Consolidado (Tabela Final Evaluations e Reports)
    for (let pid of currentPersonas) {
      const recs: any[] = [];
      for (let j = 0; j < axisIds.length; j++) {
        const axId = axisIds[j];
        const axName = cAxes[j].name;
        const key = `${pid}_${axName}`;
        
        let baseMin = 2;
        let baseMax = 4;
        if (personaAxisBoost[key]) {
          baseMin = 4;
          baseMax = 5;
        }

        const rating = randomInt(baseMin, baseMax);
        await db.insert(finalEvaluations).values({
          challengeId, personaId: pid, axisId: axId, managerId, rating, observation: "Consolidado Final"
        });

        // Se a nota final ainda for baixa, a IA recomendaria ações e isso serve como marcação para boost no prox desafio
        if (rating <= 3) {
          personaAxisBoost[key] = true;
          recs.push({ titulo: `Foco em ${axName}`, descricao: `Sugerido plano de ação ou mentoria.` });
        } else {
          personaAxisBoost[key] = false;
        }
      }

      await db.insert(closureReports).values({
        challengeId, personaId: pid, summaryText: JSON.stringify({
          resumoAnalitico: "Relatório gerado sinteticamente pela simulação ampliada.",
          acoesRecomendadas: recs.length > 0 ? recs : [{ titulo: "Estudo e Reforço", descricao: "Manter bom rendimento" }],
          indiceAcuracia: randomInt(75, 100)
        }),
        collaboratorStatus: 'ACCEPTED'
      });
      await addXp(pid, 500); // Bonificação de Fechamento de Ciclo
    }
  }
  
  console.log("✅ Nova Simulação (300 Colab/Multi-ciclos) finalizada com sucesso!");
  process.exit(0);
}

async function addXp(personaId: number, xpToAdd: number) {
  const pInfo = await db.select().from(personas).where(eq(personas.id, personaId));
  if (pInfo.length > 0 && pInfo[0].collaboratorId) {
    const uid = pInfo[0].collaboratorId;
    const gList = await db.select().from(gamification).where(eq(gamification.userId, uid));
    if (gList.length === 0) {
      await db.insert(gamification).values({ userId: uid, xp: xpToAdd, level: Math.floor(xpToAdd / 100) + 1 });
    } else {
      const newXp = gList[0].xp + xpToAdd;
      await db.update(gamification).set({ xp: newXp, level: Math.floor(newXp / 100) + 1 }).where(eq(gamification.userId, uid));
    }
  }
}

runMonteCarlo().catch(e => {
  console.error("❌ Erro na simulação:", e);
  process.exit(1);
});
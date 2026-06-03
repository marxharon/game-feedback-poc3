import { db } from './src/db/db';
import { 
  users, personas, personaVersions, challenges, challengePersonas, 
  challengeAxes, cycles, evaluations, projectedPersonas, 
  collaboratorValidations, finalEvaluations, closureReports, gamification 
} from './src/db/schema';
import { like } from 'drizzle-orm';

async function cleanDB() {
  console.log("🧹 Limpando os dados da Simulação de Monte Carlo...");
  
  try {
    // Excluindo os dados nas tabelas filhas primeiro para evitar erros de Foreign Key
    console.log("- Removendo relatórios finais e avaliações...");
    await db.delete(closureReports);
    await db.delete(finalEvaluations);
    await db.delete(collaboratorValidations);
    await db.delete(projectedPersonas);
    await db.delete(evaluations);
    
    console.log("- Removendo eixos, ciclos e associações...");
    await db.delete(cycles);
    await db.delete(challengePersonas);
    await db.delete(challengeAxes);
    
    console.log("- Removendo desafios e versões de personas...");
    await db.delete(challenges);
    await db.delete(personaVersions);
    await db.delete(personas);
    
    console.log("- Removendo dados de gamificação e usuários gerados pelo Monte Carlo...");
    await db.delete(gamification);
    await db.delete(users).where(like(users.email, '%_mc_%'));
    
    console.log("✅ Base de dados limpa com sucesso!");
  } catch (error) {
    console.error("❌ Erro ao limpar o banco de dados:", error);
  }
  process.exit(0);
}

cleanDB();
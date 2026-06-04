# 🎮 LevelUP Feedback Game

Bem-vindo ao **LevelUP Feedback**, uma plataforma inovadora de *People Analytics* baseada em Gamificação e Inteligência Artificial (Gêmeos Digitais) com foco na agenda ESG e na prevenção de Burnout.

Este projeto transforma a avaliação de desempenho burocrática em uma cultura de feedback contínuo, orquestrada por uma IA que atua como mentora e mediadora.

---

## 🛠️ Pré-requisitos

Antes de iniciar, certifique-se de ter as seguintes ferramentas instaladas em sua máquina:
- **Node.js** (v18 ou superior)
- **Python** (3.10 ou superior)
- **PostgreSQL** (Rodando localmente)
- **Git**

---

## ⚙️ Configuração do Ambiente

### 1. Clonando o repositório
```bash
git clone <url-do-repositorio>
cd LevelUP-Feedback-POC3
```

### 2. Configurando o Banco de Dados
Certifique-se de que o PostgreSQL está rodando. Crie um banco de dados vazio chamado `levelup_db`:
```sql
CREATE DATABASE levelup_db;
```
*Nota: O backend está pré-configurado para conectar usando o usuário `postgres` e senha `postgres`. Se o seu ambiente for diferente, você precisará configurar as variáveis de ambiente.*

### 3. Instalando as Dependências
O projeto utiliza a biblioteca `concurrently` na raiz para rodar os três serviços (Frontend, Backend e IA Service) de uma só vez.

```bash
# Instale as dependências da raiz
npm install

# Instale as dependências do Backend (Node.js)
cd backend
npm install

# Instale as dependências do Frontend (React/Vite)
cd ../frontend
npm install

# Instale as dependências do IA Service (Python/FastAPI)
cd ../ia-service
pip install -r requirements.txt
cd ..
```

### 4. Variáveis de Ambiente
Crie um arquivo `.env` dentro da pasta `ia-service` (ou configure no seu ambiente virtual) contendo sua chave da OpenAI, necessária para o Agente LLM funcionar:
```env
OPENAI_API_KEY=sk-sua-chave-aqui
```

### 5. Migrations e Seed (Backend)
Para criar as tabelas no banco e popular com usuários de teste (1 Gestor e 2 Colaboradores):
```bash
cd backend
npx drizzle-kit push
npm run seed
cd ..
```

---

## 🚀 Executando o Projeto

Com tudo configurado, você pode iniciar toda a infraestrutura com um único comando na **raiz do projeto**:

```bash
npm run dev:all
```

Isso iniciará simultaneamente:
- **Frontend (React)** (ex: http://localhost:5173)
- **Backend (Express)** (ex: http://localhost:3000)
- **IA Service (FastAPI)** (ex: http://localhost:8000)

---

## 🕹️ Como Jogar: O Fluxo do Game

O fluxo do *LevelUP Feedback* é um ciclo contínuo de evolução. Siga o passo a passo abaixo para testar o *Core Loop* do sistema:

### Fase 1: Configuração de Persona
1. **Visão Gestor:** Faça login como Gestor. Clique em "Nova Persona" e descreva os traços iniciais de um colaborador.
2. **Ação da IA:** O sistema automaticamente envia o texto para a IA, que retorna uma versão normalizada, polida e humanizada.
3. **Visão Colaborador:** Faça login como Colaborador. Acesse a persona recebida e escolha **Acatar**, **Ajustar** (sugerir mudanças) ou **Recusar**.
4. *Resultado:* A IA recalcula os ajustes e cria o "Gêmeo Digital" (Persona Consolidada).

### Fase 2: Preparação do Desafio
1. **Visão Gestor:** Inicie um novo Desafio e selecione as personas participantes.
2. **Ação da IA:** A Inteligência Artificial analisará a equipe e vai sugerir os **Eixos de Avaliação** (ex: Governança, Social, Bem-Estar).
3. **Ação do Gestor:** Aceite, edite ou recuse os eixos sugeridos e inicie o desafio.

### Fase 3: Execução e Avaliação (Core Loop)
1. **Visão Gestor:** Dê notas (Ruim a Excelente) em cada eixo para o colaborador e adicione observações.
2. **Ação da IA:** A IA recebe a avaliação, gera a **Persona Projetada** (feedback em tempo real) e sugere melhorias específicas.
3. **Visão Colaborador:** Visualize as notas e a Persona Projetada. Responda justificando sua percepção (Acatar, Acatar Parcialmente ou Recusar).
4. **Recompensas:** A IA lê a justificativa e calcula o *Alignment Score* (Sinergia). O sistema recompensa ambos com **Sinergy XP** e concede *Badges* (Conquistas).

### Fase 4 e 5: Fechamento e Resultados
1. **Encerramento:** O Gestor realiza a reavaliação final.
2. **Plano de Ação:** A IA gera um relatório comparativo com gráficos e sugere ações de *Upskilling* (cursos, mentorias).
3. **Gamificação Final:** O Colaborador aceita o encerramento, e todos veem seus perfis atualizados no Ranking, suas Barras de Nível e novas Conquistas desbloqueadas!

---

## 📊 Simulações de Monte Carlo e Análises Estatísticas

Para validar a eficácia da plataforma (Design Science Research), o projeto inclui scripts para geração de dados sintéticos e extração de métricas de pesquisa.

### 1. Limpeza do Banco de Dados
Antes de iniciar uma nova simulação em larga escala, é necessário limpar o banco de dados. Na pasta `backend`, execute o script de limpeza:
```bash
cd backend
npx tsx limpa-banco.ts # ou npm run limpa-banco (caso o atalho esteja no package.json)
```

### 2. Rodando as Simulações de Monte Carlo
Para popular o banco de dados com interações randômicas e testar a escala da plataforma, utilize os scripts na pasta `backend`:
```bash
cd backend
# Rodada 2: Simulação para 100 colaboradores e dezenas de desafios
npx tsx script_monte_carlo_2.ts

# Rodada 3: Simulação massiva para 300 colaboradores
npx tsx script_monte_carlo_3.ts
```

### 3. Executando as Análises (Analytics)
Com o banco populado, você pode processar as validações estatísticas (como K-Means para clusterização de comportamento, Kaplan-Meier para engajamento e DiD para eficácia da IA).

Os scripts de análise estão organizados dentro das subpastas da pasta `analytics` (ex: `analise_clusterizacao`, `analise_eficacia`, `analise_engajamento`, `convergencia_gap`, `eficacia_ia`).

Para executar, navegue até a pasta da análise desejada e rode o script correspondente:
```bash
cd analytics/<nome-da-subpasta>
# Execute o script de análise presente na pasta (exemplo via tsx ou python)
npx tsx nome_do_script_de_analise.ts 
```
*Nota: A execução das análises gerará novos arquivos de dados `relatorio_*.json` e gráficos explicativos em `.png` salvos dentro das pastas `resultados_0` ou `resultados_1` presentes em cada subpasta.*
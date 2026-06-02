from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import os
import openai
from dotenv import load_dotenv

load_dotenv()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class NormalizeRequest(BaseModel):
    name: str
    role: str
    base_text: str

class NormalizeResponse(BaseModel):
    normalized_text: str

class SuggestChallengeRequest(BaseModel):
    title: str
    description: str
    personas_info: list[str]

class SuggestedAxis(BaseModel):
    name: str
    type: str
    description: str

class SuggestChallengeResponse(BaseModel):
    suggested_axes: list[SuggestedAxis]

class EvaluationData(BaseModel):
    axis_name: str
    rating: int
    observation: str

class ProjectPersonaRequest(BaseModel):
    persona_text: str
    evaluations: list[EvaluationData]

class ProjectPersonaResponse(BaseModel):
    projected_persona: str

class AlignmentRequest(BaseModel):
    evaluations: list[EvaluationData]
    collaborator_status: str
    collaborator_justification: str

class AlignmentResponse(BaseModel):
    alignment_score: int
    feedback: str

OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY")
if OPENAI_API_KEY:
    openai.api_key = OPENAI_API_KEY

@app.post("/project-persona", response_model=ProjectPersonaResponse)
def project_persona(request: ProjectPersonaRequest):
    prompt = f"""
Você é um mentor especialista em Recursos Humanos e desenvolvimento de carreiras.
Sua tarefa é gerar uma "Persona Projetada". Você receberá o perfil atual de um colaborador e as avaliações que ele acabou de receber em um ciclo de desafio.
Você deve reescrever o perfil da persona, incorporando os feedbacks recebidos (tanto notas quanto observações) para refletir seu estado atual e sua evolução.
Também recomende melhorias específicas ao final do texto.

Perfil Atual:
{request.persona_text}

Avaliações deste ciclo:
"""
    for ev in request.evaluations:
        prompt += f"- Eixo: {ev.axis_name} | Nota (1 a 5): {ev.rating} | Observação: {ev.observation}\n"

    prompt += "\nRetorne APENAS um objeto JSON válido com a exata chave 'projected_persona' contendo o novo texto da persona projetada com as recomendações de melhorias."

    if OPENAI_API_KEY:
        import json
        try:
            client = openai.OpenAI(api_key=OPENAI_API_KEY)
            response = client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": "Você é um mentor de RH focado em feedback construtivo e desenvolvimento. Retorne sempre em JSON."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.7, response_format={ "type": "json_object" }
            )
            data = json.loads(response.choices[0].message.content.strip())
            return ProjectPersonaResponse(projected_persona=data.get("projected_persona", ""))
        except Exception as e:
            print("Error calling OpenAI:", e)
            pass
    
    # Mock fallback
    mock_projected = f"""[Persona Projetada pela IA]

Evolução Identificada:
Com base nas recentes avaliações, o perfil demonstra engajamento. As notas refletem o esforço no ciclo atual.

Perfil Atualizado:
{request.persona_text}

Recomendações:
- Continuar focando nos pontos fortes apontados nas avaliações recentes.
- Observar atentamente as observações do gestor nos eixos com notas menores para o próximo ciclo."""
    
    return ProjectPersonaResponse(projected_persona=mock_projected)

class ReadjustRequest(BaseModel):
    name: str
    role: str
    original_text: str
    justification: str

class ReadjustResponse(BaseModel):
    readjusted_text: str

@app.post("/readjust-persona", response_model=ReadjustResponse)
def readjust_persona(request: ReadjustRequest):
    prompt = f"""
Você é um mediador especialista em Recursos Humanos.
Temos uma persona de colaborador criada pelo gestor e o colaborador propôs um ajuste. 
Seu papel é criar uma versão de consenso que seja justa, profissional e mantenha os pontos principais de ambos.

Nome: {request.name}
Cargo: {request.role}
Texto Original (do gestor): {request.original_text}
Ajuste/Justificativa do Colaborador: {request.justification}

Retorne APENAS um objeto JSON válido com a exata chave "readjusted_text" contendo o novo texto revisado, integrando o ajuste de forma equilibrada, sem introduções.
"""
    if OPENAI_API_KEY:
        import json
        try:
            client = openai.OpenAI(api_key=OPENAI_API_KEY)
            response = client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": "Você é um mediador de RH focando em consenso e comunicação não violenta. Retorne sempre em JSON."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.7, response_format={ "type": "json_object" }
            )
            data = json.loads(response.choices[0].message.content.strip())
            return ReadjustResponse(readjusted_text=data.get("readjusted_text", ""))
        except Exception as e:
            print("Error calling OpenAI:", e)
            # Fallback to mock
            pass
    
    # Mock fallback
    mock_readjusted = f"""[Texto de Consenso Gerado pela IA]
Persona: {request.name}
Cargo: {request.role}

Análise Revisada:
O perfil demonstra forte base técnica. Consideramos a ressalva do colaborador quanto à comunicação, e acordou-se que a comunicação assíncrona é eficiente, devendo-se focar apenas na dinâmica de reuniões síncronas.

Ajuste integrado com sucesso."""
    
    return ReadjustResponse(readjusted_text=mock_readjusted)


@app.post("/suggest-challenge-setup", response_model=SuggestChallengeResponse)
def suggest_challenge_setup(request: SuggestChallengeRequest):
    prompt = f"""
Você é um especialista em Recursos Humanos e gamificação de desempenho.
O gestor está criando um desafio de avaliação para sua equipe com os seguintes dados:

Título: {request.title}
Descrição: {request.description}
Personas Envolvidas (com suas características): {', '.join(request.personas_info)}

Com base nisso, sugira:
1. Uma lista de 3 a 5 eixos de avaliação. Tipos válidos: governança, social, bem-estar, misto.
Verifique as características das personas envolvidas no desafio, juntamente com a descrição do desafio, para propor eixos de avaliação que tanto verifiquem o solicitado no desafio, mas que também promovam o aprimoramento dos pontos da persona a serem melhorados.

O retorno DEVE ser um objeto JSON estrito com as exatas chaves abaixo:
{{
  "suggested_axes": [
    {{
      "name": "nome curto do eixo",
      "type": "tipo (governança, social, bem-estar ou misto)",
      "description": "descrição do eixo"
    }}
  ]
}}
"""
    if OPENAI_API_KEY:
        import json
        try:
            client = openai.OpenAI(api_key=OPENAI_API_KEY)
            response = client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": "Você é um assistente de RH. Retorne apenas JSON válido."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.7, response_format={ "type": "json_object" },
            )
            data = json.loads(response.choices[0].message.content.strip())
            axes = []
            for ax in data.get("suggested_axes", []):
                axes.append(SuggestedAxis(name=ax.get("name"), type=ax.get("type"), description=ax.get("description")))
            return SuggestChallengeResponse(
                suggested_axes=axes
            )
        except Exception as e:
            print("Error calling OpenAI:", e)
            pass
    
    # Mock fallback
    mock_axes = [
        SuggestedAxis(name="Comunicação Assertiva", type="social", description="Avalia a clareza e empatia na comunicação com a equipe."),
        SuggestedAxis(name="Entrega de Resultados", type="governança", description="Foco no cumprimento de prazos e qualidade técnica."),
        SuggestedAxis(name="Colaboração", type="misto", description="Capacidade de trabalhar em grupo e ajudar colegas.")
    ]
    return SuggestChallengeResponse(
        suggested_axes=mock_axes
    )


@app.post("/calculate-alignment", response_model=AlignmentResponse)
def calculate_alignment(request: AlignmentRequest):
    prompt = f"""
Você é um analista de dados de Recursos Humanos. 
Seu objetivo é avaliar a consistência e o alinhamento entre a avaliação do gestor e a resposta do colaborador.

Avaliações do Gestor:
"""
    for ev in request.evaluations:
        prompt += f"- Eixo: {ev.axis_name} | Nota: {ev.rating} | Obs: {ev.observation}\n"

    prompt += f"""
Resposta do Colaborador:
Status: {request.collaborator_status} (ACCEPTED, PARTIAL, REJECTED)
Justificativa: {request.collaborator_justification}

Analise os dados e retorne um objeto JSON estrito com as exatas chaves:
{{
  "alignment_score": (um inteiro de 0 a 100 representando o nível de alinhamento, onde 100 é total concordância),
  "feedback": "Uma breve frase explicando a análise de consistência"
}}
"""
    if OPENAI_API_KEY:
        import json
        try:
            client = openai.OpenAI(api_key=OPENAI_API_KEY)
            response = client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": "Você é um analista de RH. Retorne apenas JSON válido."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.3,
                response_format={ "type": "json_object" }
            )
            data = json.loads(response.choices[0].message.content.strip())
            return AlignmentResponse(
                alignment_score=data.get("alignment_score", 50),
                feedback=data.get("feedback", "Análise não processada corretamente.")
            )
        except Exception as e:
            print("Error calling OpenAI for alignment:", e)
            pass
            
    # Mock fallback
    score = 100 if request.collaborator_status == "ACCEPTED" else (70 if request.collaborator_status == "PARTIAL" else 40)
    return AlignmentResponse(
        alignment_score=score,
        feedback="[Mock] Nível de alinhamento estimado com base na ação escolhida."
    )

@app.get("/ping")
def ping():
    return {"message": "IA OK"}

@app.post("/normalize-persona", response_model=NormalizeResponse)
def normalize_persona(request: NormalizeRequest):
    prompt = f"""
Você é um especialista em Recursos Humanos e desenvolvimento organizacional.
O gestor forneceu o seguinte rascunho de características de um colaborador para ser usado em um jogo de avaliação de feedback:

Nome: {request.name}
Cargo: {request.role}
Rascunho atual: {request.base_text}

Sua tarefa é "normalizar" esse texto:
1. Tornar a linguagem mais profissional e objetiva.
2. Organizar os pontos fortes e os pontos a desenvolver de forma clara.
3. Manter a essência do que o gestor escreveu, mas melhorar a clareza para que possa ser usado como descrição oficial da Persona no jogo.

Retorne APENAS um objeto JSON válido com a exata chave "normalized_text" contendo o texto normalizado final, sem introduções ou saudações.
"""
    if OPENAI_API_KEY:
        import json
        try:
            client = openai.OpenAI(api_key=OPENAI_API_KEY)
            response = client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": "Você é um assistente de RH focado em clareza e profissionalismo. Retorne sempre em JSON."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.7, response_format={ "type": "json_object" }
            )
            data = json.loads(response.choices[0].message.content.strip())
            return NormalizeResponse(normalized_text=data.get("normalized_text", ""))
        except Exception as e:
            print("Error calling OpenAI:", e)
            # Fallback to mock
            pass
    
    # Mock fallback
    mock_normalized = f"""[Texto Normalizado pela IA]
Persona: {request.name}
Cargo: {request.role}

Análise de Perfil:
Apresenta bom embasamento técnico em suas funções atuais. No entanto, observa-se a necessidade de aprimorar as habilidades de comunicação interpessoal e alinhamento com a equipe.

Pontos Fortes:
- Conhecimento técnico sólido.

Pontos a Desenvolver:
- Comunicação e articulação interpessoal.
- Trabalho em equipe."""
    
    return NormalizeResponse(normalized_text=mock_normalized)

class CycleEvaluation(BaseModel):
    cycle_number: int
    evaluations: list[dict]

class ClosureReportRequest(BaseModel):
    initial_persona: str
    final_persona: str
    historical_evaluations: list[CycleEvaluation]
    final_evaluations: list[dict]

class ClosureReportResponse(BaseModel):
    report_text: str

@app.post('/generate-closure-report', response_model=ClosureReportResponse)
def generate_closure_report(request: ClosureReportRequest):
    prompt = f"""
Voce e um especialista em Recursos Humanos. 
Ele e o final de um ciclo de desafio para uma persona. Gere um relatorio de fechamento.

Persona Inicial (V1):
{request.initial_persona}

Persona Final (Validada pelo gestor e colaborador):
{request.final_persona}

Histórico de Avaliações (Ciclos Anteriores):
"""
    for cycle in request.historical_evaluations:
        prompt += f"Ciclo {cycle.cycle_number}:\n"
        for ev in cycle.evaluations:
            prompt += f"- Eixo ID {ev.get('axis_id', 'N/A')} | Nota: {ev.get('rating', 'N/A')} | Obs: {ev.get('observation', '')}\n"
    
    prompt += """
Avaliacao Final Consolidada:
"""
    for ev in request.final_evaluations:
        prompt += f"- Eixo ID {ev.get('axis_id', 'N/A')} | Nota: {ev.get('rating', 'N/A')} | Obs: {ev.get('observation', '')}\n"
    
    prompt += """
Sua tarefa:
Retorne um objeto JSON ESTRITAMENTE com a seguinte estrutura:
{
  "resumoAnalitico": "Uma breve analise comparativa...",
  "acoesRecomendadas": [
    {"titulo": "Nome", "descricao": "Detalhes"}
  ],
  "indiceAcuracia": 85
}
"""
    if OPENAI_API_KEY:
        try:
            client = openai.OpenAI(api_key=OPENAI_API_KEY) 
            response = client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": "Voce e um analista de RH senior. Retorne APENAS JSON valido."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.7, response_format={ "type": "json_object" }
            )
            report = response.choices[0].message.content.strip()
            return ClosureReportResponse(report_text=report)
        except Exception as e:
            print("Error calling OpenAI:", e)
            pass
    
    mock_report = """{
  "resumoAnalitico": "A persona apresentou uma evolucao solida desde a versao inicial.",
  "acoesRecomendadas": [
    {"titulo": "Treinamento avancado", "descricao": "Foco nas areas de menor nota do eixo tecnico."},
    {"titulo": "Mentoria continua", "descricao": "Para manter a comunicacao assertiva alinhada."}
  ],
  "indiceAcuracia": 90
}"""
    return ClosureReportResponse(report_text=mock_report)

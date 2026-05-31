import os
import openai
import json
from dotenv import load_dotenv

load_dotenv(dotenv_path=r'c:\Users\S703922263\Documents\Serpro\Premio Inovacao\2026\Proposta 04 - Game Feedback\POC3\ia_service\.env')
openai.api_key = os.environ.get('OPENAI_API_KEY')

prompt = """
Você é um especialista em Recursos Humanos e gamificação de desempenho.
O gestor está criando um desafio de avaliação para sua equipe com os seguintes dados:

Título: Teste
Descrição: Teste de descricao
Personas Envolvidas: João (Desenvolvedor)

Com base nisso, sugira:
1. Uma lista de 3 a 5 eixos de avaliação (name, type, description). Tipos válidos: governança, social, bem-estar, misto.
2. Um prazo recomendado (formato YYYY-MM-DD, para daqui a 30-90 dias).
3. Número recomendado de ciclos (1 a 4).

Retorne em formato JSON estrito aderindo à estrutura solicitada.
"""

client = openai.OpenAI(api_key=openai.api_key)
response = client.chat.completions.create(
    model='gpt-4o-mini',
    messages=[
        {'role': 'system', 'content': 'Você é um assistente de RH. Retorne apenas JSON válido.'},
        {'role': 'user', 'content': prompt}
    ],
    temperature=0.7,
    response_format={ 'type': 'json_object' }
)

print(response.choices[0].message.content.strip())

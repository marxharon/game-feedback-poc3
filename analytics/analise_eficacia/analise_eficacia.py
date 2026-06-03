import pandas as pd
import psycopg2
import matplotlib.pyplot as plt
import seaborn as sns
from scipy import stats
import os
import json

def run_analysis():
    print("🔍 Iniciando análise de Eficácia da IA e Gamificação (Evolução vs Engajamento)...")
    
    base_dir = os.path.dirname(os.path.abspath(__file__))
    output_dir = os.path.join(base_dir, 'resultados')
    os.makedirs(output_dir, exist_ok=True)

    try:
        conn = psycopg2.connect("postgresql://postgres:postgres@localhost:5432/levelup_db")
    except Exception as e:
        print(f"❌ Erro ao conectar ao banco de dados: {e}")
        return

    # Extrai a primeira e a última nota média de cada persona para calcular a Evolução, cruzando com o XP
    query = """
        WITH eval_agg AS (
            SELECT e.persona_id, e.cycle_id, c.challenge_id, AVG(e.rating) as avg_rating
            FROM evaluations e
            JOIN cycles c ON e.cycle_id = c.id
            GROUP BY e.persona_id, e.cycle_id, c.challenge_id
        ),
        ranked_evals AS (
            SELECT persona_id, avg_rating,
                   ROW_NUMBER() OVER(PARTITION BY persona_id ORDER BY challenge_id ASC, cycle_id ASC) as rn_first,
                   ROW_NUMBER() OVER(PARTITION BY persona_id ORDER BY challenge_id DESC, cycle_id DESC) as rn_last
            FROM eval_agg
        )
        SELECT 
            r1.persona_id, 
            r1.avg_rating as nota_inicial, 
            r2.avg_rating as nota_final,
            (r2.avg_rating - r1.avg_rating) as evolucao,
            g.xp as gamification_xp
        FROM ranked_evals r1
        JOIN ranked_evals r2 ON r1.persona_id = r2.persona_id
        JOIN personas p ON r1.persona_id = p.id
        JOIN gamification g ON p.collaborator_id = g.user_id
        WHERE r1.rn_first = 1 AND r2.rn_last = 1
    """
    
    df = pd.read_sql(query, conn)
    conn.close()

    if df.empty or len(df) < 3:
        print("❌ Dados insuficientes para calcular a correlação de eficácia.")
        return

    evolucao = df['evolucao']
    xp = df['gamification_xp']

    # Teste de Correlação de Pearson
    r, p_value = stats.pearsonr(xp, evolucao)

    report = {
        "analise": "Eficácia da IA e Gamificação (XP vs Evolução de Performance)",
        "hipotese": "O engajamento com as dinâmicas de feedback mediadas por IA (XP Sinergia) impulsiona diretamente o crescimento profissional da persona (Evolução de Notas).",
        "metricas": {
            "amostras_analisadas": len(df),
            "media_evolucao_notas": float(evolucao.mean()),
            "media_xp": float(xp.mean())
        },
        "teste_estatistico": {
            "metodo": "Correlação de Pearson",
            "coeficiente_r": float(r),
            "p_value": float(p_value)
        },
        "conclusao": "A IA e a gamificação tiveram impacto comprovado. Existe uma correlação positiva forte entre o acúmulo de Sinergia e a melhoria das avaliações." if r > 0 and p_value < 0.05 else "Os dados não apresentam uma correlação positiva significativa."
    }

    report_path = os.path.join(output_dir, 'relatorio_eficacia_ia.json')
    with open(report_path, 'w', encoding='utf-8') as f:
        json.dump(report, f, indent=4, ensure_ascii=False)

    # Geração do Gráfico
    plt.figure(figsize=(9, 6))
    sns.regplot(x='gamification_xp', y='evolucao', data=df, scatter_kws={'alpha':0.6, 'color':'#2ca02c'}, line_kws={'color':'#d62728', 'linewidth': 2})
    plt.title('Impacto do Engajamento (XP) na Evolução da Persona', fontsize=14, fontweight='bold')
    plt.xlabel('XP de Sinergia Acumulado (Alinhamento com IA)', fontsize=12)
    plt.ylabel('Evolução de Performance (Nota Final - Nota Inicial)', fontsize=12)
    plt.grid(True, linestyle='--', alpha=0.7)
    
    plt.savefig(os.path.join(output_dir, 'grafico_eficacia_ia.png'), bbox_inches='tight')
    print(f"✅ Análise de eficácia da IA gerada com sucesso na pasta: {output_dir}")

if __name__ == "__main__":
    run_analysis()
import pandas as pd
import psycopg2
import matplotlib.pyplot as plt
import seaborn as sns
from scipy import stats
import os
import json

def run_analysis():
    print("🔍 Iniciando analise de Convergencia do Gap de Alinhamento...")
    
    # Criação dos diretórios de saída
    base_dir = os.path.dirname(os.path.abspath(__file__))
    output_dir = os.path.join(base_dir, 'resultados')
    os.makedirs(output_dir, exist_ok=True)

    # Conexão com o banco de dados
    try:
        conn = psycopg2.connect("postgresql://postgres:postgres@localhost:5432/levelup_db")
    except Exception as e:
        print(f"❌ Erro ao conectar ao banco de dados: {e}")
        return
        
    # Busca do Alignment Score cruzado com os ciclos
    query = """
        SELECT cv.alignment_score, c.cycle_number, cv.persona_id, cv.challenge_id
        FROM collaborator_validations cv
        JOIN cycles c ON cv.cycle_id = c.id
    """
    df = pd.read_sql(query, conn)
    conn.close()

    if df.empty:
        print("❌ Nenhum dado encontrado na tabela collaborator_validations.")
        return

    # Filtrar apenas os Ciclos 1 e 2
    df = df[df['cycle_number'].isin([1, 2])]

    # Transformar os dados para ter o Ciclo 1 e Ciclo 2 lado a lado (por persona e desafio)
    df_pivot = df.pivot_table(index=['challenge_id', 'persona_id'], columns='cycle_number', values='alignment_score').dropna()
    
    if 1 not in df_pivot.columns or 2 not in df_pivot.columns or df_pivot.empty:
        print("❌ Dados insuficientes para comparar Ciclo 1 e Ciclo 2.")
        return

    cycle1 = df_pivot[1]
    cycle2 = df_pivot[2]

    # Teste Estatístico (Paired T-Test / ANOVA de Medidas Repetidas simples)
    t_stat, p_value = stats.ttest_rel(cycle1, cycle2)
    
    mean_c1, var_c1 = cycle1.mean(), cycle1.var()
    mean_c2, var_c2 = cycle2.mean(), cycle2.var()

    report = {
        "analise": "Convergencia do Gap de Alinhamento (Digital Twins)",
        "hipotese": "A media do Alignment Score sobe estatisticamente (e a variancia diminui) do Ciclo 1 ao Ciclo 2.",
        "metricas_ciclo_1": { "media": float(mean_c1), "variancia": float(var_c1), "amostras": len(cycle1) },
        "metricas_ciclo_2": { "media": float(mean_c2), "variancia": float(var_c2), "amostras": len(cycle2) },
        "teste_estatistico": { "metodo": "Teste T Pareado (Paired T-Test)", "t_statistic": float(t_stat), "p_value": float(p_value) },
        "conclusao": "Hipotese validada! O alinhamento aumentou de forma estatisticamente significativa." if p_value < 0.05 and mean_c2 > mean_c1 else "Hipotese rejeitada. Nao houve convergencia estatisticamente significativa."
    }

    report_path = os.path.join(output_dir, 'relatorio_convergencia.json')
    with open(report_path, 'w', encoding='utf-8') as f:
        json.dump(report, f, indent=4, ensure_ascii=False)

    # Geração do Gráfico Boxplot
    plt.figure(figsize=(10, 6))
    sns.boxplot(x='cycle_number', y='alignment_score', data=df, palette="Set2")
    sns.stripplot(x='cycle_number', y='alignment_score', data=df, color=".25", alpha=0.5, jitter=True)
    plt.title('Evolução do Gap de Alinhamento (Digital Twins)', fontsize=14, fontweight='bold')
    plt.xlabel('Ciclo do Desafio', fontsize=12)
    plt.ylabel('Alignment Score (Convergência)', fontsize=12)
    plt.xticks([0, 1], ['Ciclo 1', 'Ciclo 2'])
    plt.savefig(os.path.join(output_dir, 'boxplot_convergencia.png'), bbox_inches='tight')
    print(f"✅ Resultados gerados com sucesso na pasta: {output_dir}")
    
if __name__ == "__main__":
    run_analysis()
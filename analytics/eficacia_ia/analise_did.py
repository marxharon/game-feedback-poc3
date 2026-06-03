import pandas as pd
import psycopg2
import matplotlib.pyplot as plt
import seaborn as sns
from scipy import stats
import os
import json

def run_analysis():
    print("🔍 Iniciando analise de Eficácia dos Insights da IA (DiD)...")
    
    base_dir = os.path.dirname(os.path.abspath(__file__))
    output_dir = os.path.join(base_dir, 'resultados')
    os.makedirs(output_dir, exist_ok=True)

    try:
        conn = psycopg2.connect("postgresql://postgres:postgres@localhost:5432/levelup_db")
    except Exception as e:
        print(f"❌ Erro ao conectar ao banco de dados: {e}")
        return

    # Extrai o histórico final de todas as personas ordenado por data
    query = """
        SELECT fe.rating, fe.challenge_id, fe.persona_id, a.name as axis_name, c.created_at
        FROM final_evaluations fe
        JOIN challenges c ON fe.challenge_id = c.id
        JOIN challenge_axes a ON fe.axis_id = a.id
        ORDER BY fe.persona_id, c.created_at
    """
    df = pd.read_sql(query, conn)
    conn.close()

    if df.empty:
        print("❌ Nenhum dado encontrado na tabela final_evaluations.")
        return

    # Identifica a ordem cronológica dos desafios para o DiD
    df['challenge_order'] = df.groupby('persona_id')['created_at'].rank(method='dense').astype(int)
    
    did_data = []
    diff_treated = []
    diff_control = []
    
    personas = df['persona_id'].unique()
    for pid in personas:
        pdf = df[df['persona_id'] == pid]
        max_order = pdf['challenge_order'].max()
        for t in range(1, max_order):
            df_t = pdf[pdf['challenge_order'] == t]
            df_t_next = pdf[pdf['challenge_order'] == t + 1]
            
            for _, row in df_t.iterrows():
                axis = row['axis_name']
                rating_t = row['rating']
                
                next_row = df_t_next[df_t_next['axis_name'] == axis]
                if not next_row.empty:
                    rating_t_next = next_row.iloc[0]['rating']
                    
                    is_treated = 1 if rating_t <= 3 else 0
                    diff = rating_t_next - rating_t
                    
                    if is_treated:
                        diff_treated.append(diff)
                    else:
                        diff_control.append(diff)

                    did_data.append({'persona_id': pid, 'axis_name': axis, 'time': '0_Pre', 'treated': is_treated, 'rating': rating_t})
                    did_data.append({'persona_id': pid, 'axis_name': axis, 'time': '1_Pos', 'treated': is_treated, 'rating': rating_t_next})

    df_did = pd.DataFrame(did_data)
    
    if df_did.empty or len(diff_treated) == 0 or len(diff_control) == 0:
        print("❌ Dados insuficientes para DiD.")
        return

    # Teste Estatístico (T-Test de Diferenças - Equivalente à Regressão DiD)
    t_stat, p_value = stats.ttest_ind(diff_treated, diff_control, equal_var=False)
    
    mean_treated_pre = df_did[(df_did['treated'] == 1) & (df_did['time'] == '0_Pre')]['rating'].mean()
    mean_treated_pos = df_did[(df_did['treated'] == 1) & (df_did['time'] == '1_Pos')]['rating'].mean()
    mean_control_pre = df_did[(df_did['treated'] == 0) & (df_did['time'] == '0_Pre')]['rating'].mean()
    mean_control_pos = df_did[(df_did['treated'] == 0) & (df_did['time'] == '1_Pos')]['rating'].mean()
    
    did_coef = (mean_treated_pos - mean_treated_pre) - (mean_control_pos - mean_control_pre)

    report = {
        "analise": "Eficácia dos Insights da IA (Difference-in-Differences)",
        "hipotese": "Eixos que receberam recomendação da IA apresentam crescimento superior aos demais eixos nos desafios seguintes.",
        "medias": { "tratados_pre": float(mean_treated_pre), "tratados_pos": float(mean_treated_pos), "controle_pre": float(mean_control_pre), "controle_pos": float(mean_control_pos) },
        "teste_estatistico": { "metodo": "Teste T Independente das Diferenças (DiD)", "coeficiente_did": float(did_coef), "p_value": float(p_value) },
        "conclusao": "Hipotese validada! Os eixos com intervenção da IA apresentaram evolução significativamente maior." if p_value < 0.05 and did_coef > 0 else "Hipotese rejeitada."
    }

    report_path = os.path.join(output_dir, 'relatorio_did.json')
    with open(report_path, 'w', encoding='utf-8') as f:
        json.dump(report, f, indent=4, ensure_ascii=False)

    # Geração do Gráfico DiD (Pointplot)
    plt.figure(figsize=(10, 6))
    sns.pointplot(x='time', y='rating', hue='treated', data=df_did, dodge=True, markers=['o', 's'], capsize=.1, palette='Set1')
    plt.title('Eficácia das Recomendações da IA (DiD)', fontsize=14, fontweight='bold')
    plt.xlabel('Momento', fontsize=12)
    plt.ylabel('Nota Média do Eixo', fontsize=12)
    plt.xticks([0, 1], ['Desafio Anterior (Diagnóstico)', 'Desafio Seguinte (Avaliação da Melhoria)'])
    
    L = plt.legend()
    L.get_texts()[0].set_text('Grupo Controle (S/ Recomendação)')
    L.get_texts()[1].set_text('Grupo Tratado (Recomendado pela IA)')
    
    plt.savefig(os.path.join(output_dir, 'grafico_did.png'), bbox_inches='tight')
    print(f"✅ Resultados DiD gerados com sucesso na pasta: {output_dir}")

if __name__ == "__main__":
    run_analysis()
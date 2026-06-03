import pandas as pd
import psycopg2
import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.cluster import KMeans
from sklearn.decomposition import PCA
import os
import json

def run_analysis():
    print("🔍 Iniciando análise de Identificação de Padrões Comportamentais (Clusterização)...")
    
    base_dir = os.path.dirname(os.path.abspath(__file__))
    output_dir = os.path.join(base_dir, 'resultados')
    os.makedirs(output_dir, exist_ok=True)

    try:
        conn = psycopg2.connect("postgresql://postgres:postgres@localhost:5432/levelup_db")
    except Exception as e:
        print(f"❌ Erro ao conectar ao banco de dados: {e}")
        return

    # Extrai as notas finais consolidadas agrupadas por tipo e persona
    query = """
        SELECT fe.persona_id, a.type, AVG(fe.rating) as avg_rating
        FROM final_evaluations fe
        JOIN challenge_axes a ON fe.axis_id = a.id
        GROUP BY fe.persona_id, a.type
    """
    
    try:
        df = pd.read_sql(query, conn)
    except Exception as e:
        print(f"❌ Erro ao consultar o banco: {e}")
        conn.close()
        return
        
    conn.close()

    if df.empty:
        print("❌ Nenhum dado encontrado na tabela final_evaluations.")
        return

    # Pivotar os dados: Personas x Eixos
    df_pivot = df.pivot_table(index='persona_id', columns='type', values='avg_rating').fillna(3.0)
    
    if df_pivot.empty or len(df_pivot) < 4:
        print("❌ Dados insuficientes para clusterização (mínimo de 4 personas recomendadas).")
        return

    # Executar K-Means
    num_clusters = min(4, len(df_pivot)) # Garantir um número máximo seguro de 4 clusters
    kmeans = KMeans(n_clusters=num_clusters, random_state=42, n_init=10)
    df_pivot['cluster'] = kmeans.fit_predict(df_pivot)

    # Obter os centroides para análise
    centroids = pd.DataFrame(kmeans.cluster_centers_, columns=df_pivot.columns[:-1])
    
    # Preparar dados para o JSON (Convertendo tipos NumPy para serialização JSON)
    cluster_summary = {}
    cluster_labels = {}
    for i in range(num_clusters):
        cluster_data = df_pivot[df_pivot['cluster'] == i]
        centroide_dict = centroids.iloc[i].to_dict()
        
        # Identificar o traço dominante para a legenda do gráfico
        dominant_trait = max(centroide_dict, key=centroide_dict.get)
        cluster_labels[i] = f"Cluster {i} (Dominante: {str(dominant_trait).capitalize()})"

        cluster_summary[f"Cluster {i}"] = {
            "tamanho": int(len(cluster_data)),
            "perfil_dominante": dominant_trait,
            "centroide_medias": {k: float(v) for k, v in centroide_dict.items()}
        }
        
    df_pivot['cluster_label'] = df_pivot['cluster'].map(cluster_labels)

    report = {
        "analise": "Identificação de Padrões Comportamentais (Clusterização K-Means)",
        "hipotese": "O algoritmo agrupará colaboradores com 'dores' parecidas, permitindo recomendações de treinamentos em lote.",
        "metricas": {
            "amostras_personas": len(df_pivot),
            "numero_clusters": num_clusters
        },
        "resultados_clusters": cluster_summary,
        "conclusao": "Clusters identificados com sucesso. O RH pode agora direcionar treinamentos específicos para os grupos baseados nos seus centroides (ex: Cluster com alta governança e baixo bem-estar precisa de apoio focado em saúde mental)."
    }

    report_path = os.path.join(output_dir, 'relatorio_clusterizacao.json')
    with open(report_path, 'w', encoding='utf-8') as f:
        json.dump(report, f, indent=4, ensure_ascii=False)

    # Visualização com PCA (Redução de dimensionalidade para plotagem 2D)
    pca = PCA(n_components=2)
    components = pca.fit_transform(df_pivot.drop(columns=['cluster', 'cluster_label']))
    df_pivot['PCA1'] = components[:, 0]
    df_pivot['PCA2'] = components[:, 1]

    plt.figure(figsize=(10, 7))
    sns.scatterplot(x='PCA1', y='PCA2', hue='cluster_label', palette=sns.color_palette("tab10", num_clusters), data=df_pivot, s=150, alpha=0.8, edgecolor='k')
    plt.title('Clusterização de Personas (PCA de 2 Componentes)', fontsize=14, fontweight='bold')
    plt.xlabel(f'Componente Principal 1 ({pca.explained_variance_ratio_[0]:.2%} variância)')
    plt.ylabel(f'Componente Principal 2 ({pca.explained_variance_ratio_[1]:.2%} variância)')
    plt.legend(title='Grupos (Clusters)', bbox_to_anchor=(1.05, 1), loc='upper left')
    plt.grid(True, linestyle='--', alpha=0.7)
    
    plt.savefig(os.path.join(output_dir, 'grafico_clusterizacao.png'), bbox_inches='tight')
    print(f"✅ Resultados da análise de clusterização gerados com sucesso na pasta: {output_dir}")

if __name__ == "__main__":
    run_analysis()
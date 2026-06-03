import os

def consolidar_jsons():
    print("📊 Consolidando resultados das análises...\n")
    base_dir = os.path.dirname(os.path.abspath(__file__))
    
    # Adicione aqui os nomes exatos das pastas onde os resultados foram salvos
    pastas_alvo = ['resultados_0', 'resultados_1'] 
    
    for root, dirs, files in os.walk(base_dir):
        dir_name = os.path.basename(root)
        if dir_name in pastas_alvo:
            print(f"==================================================")
            print(f"📁 CONTEÚDO DA PASTA: {os.path.relpath(root, base_dir)}")
            print(f"==================================================")
            for arquivo in files:
                if arquivo.endswith('.json'):
                    with open(os.path.join(root, arquivo), 'r', encoding='utf-8') as f:
                        print(f"\n📄 Arquivo: {arquivo}")
                        print(f.read())
            print("\n")

if __name__ == "__main__":
    consolidar_jsons()
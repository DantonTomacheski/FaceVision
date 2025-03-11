# Facial Recognition Web App

Uma aplicação web moderna para reconhecimento facial em tempo real, usando TensorFlow.js para processamento de machine learning diretamente no navegador.

## Funcionalidades

- Detecção e rastreamento de rostos em tempo real via webcam
- Identificação de pontos faciais (landmarks) utilizando modelo FaceMesh
- Análise de expressões faciais utilizando modelos de classificação
- Processamento em thread separada com Web Workers
- Métricas de desempenho e controles de ajuste
- Design responsivo com suporte a tema claro/escuro
- Visualização gráfica dos pontos faciais e malha facial

## Stack Tecnológica

- **Frontend**: React com TypeScript, construído com Vite
- **Estilização**: Tailwind CSS
- **Gerenciamento de Estado**: Zustand
- **Reconhecimento Facial**: TensorFlow.js com modelos BlazeFace e FaceMesh
- **Performance**: Web Workers para processamento em thread separada

## Começando

### Pré-requisitos

- Node.js (v18 ou mais recente)
- npm ou yarn

### Instalação

1. Clone o repositório:

   ```bash
   git clone https://github.com/seu-usuario/facial-recognition-app.git
   cd facial-recognition-app
   ```

2. Instale as dependências:

   ```bash
   npm install
   ```

3. Inicie o servidor de desenvolvimento:

   ```bash
   npm run dev
   ```

4. Abra seu navegador e acesse `http://localhost:5173`

## Uso

1. Permita o acesso à câmera quando solicitado
2. O aplicativo detectará rostos em tempo real e mostrará:

   - Caixas delimitadoras ao redor dos rostos detectados
   - Pontos de referência faciais (landmarks)
   - Malha facial completa
   - Análise de expressões faciais
   - Métricas de desempenho

3. Recursos adicionais:
   - Alternar entre tema claro/escuro
   - Ativar/desativar o processamento em thread separada (Web Worker)
   - Controles de ajuste para balancear desempenho e qualidade

## Construindo para Produção

Para criar um build de produção:

```bash
npm run build
```

Os arquivos compilados estarão no diretório `dist`.

## Estrutura do Projeto

```
facial-recognition-app/
├── public/             # Arquivos públicos estáticos
├── src/
│   ├── components/     # Componentes React
│   ├── hooks/          # Hooks personalizados
│   ├── store/          # Gerenciamento de estado Zustand
│   ├── types/          # Definições de tipos TypeScript
│   ├── utils/          # Funções utilitárias
│   ├── workers/        # Web Workers para processamento paralelo
│   ├── App.tsx         # Componente principal
│   └── main.tsx        # Ponto de entrada
├── package.json        # Dependências e scripts
└── vite.config.ts      # Configuração do Vite
```

## Próximas Implementações

- Implementação de PWA para funcionamento offline
- Testes unitários e de integração
- Suporte para múltiplas câmeras
- Otimização para dispositivos de baixa performance
- Quantização de modelos para melhor desempenho

## Licença

MIT

## Agradecimentos

- Equipe do TensorFlow.js pelos incríveis modelos de machine learning
- Comunidades do Vite, React, Zustand e Tailwind CSS

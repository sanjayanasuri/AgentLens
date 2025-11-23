# AgentLens

**Visualize, debug, and understand LangGraph agent runs in real time.**

AgentLens is a comprehensive debugging and visualization tool for LangGraph agents. It provides real-time insights into agent execution, state changes, performance metrics, and quality analysis.

![AgentLens](https://img.shields.io/badge/AgentLens-v1.0-blue)
![Python](https://img.shields.io/badge/Python-3.11+-green)
![Next.js](https://img.shields.io/badge/Next.js-14.0+-black)
![LangGraph](https://img.shields.io/badge/LangGraph-latest-orange)

## 🎯 Features

### Real-Time Visualization
- **Graph Execution**: Interactive React Flow visualization showing agent workflow
- **Color-Coded States**: Visual indicators for executing, next, completed, and pending nodes
- **Status Messages**: Human-readable status updates ("Thinking...", "Searching...", etc.)
- **Live Updates**: WebSocket-based real-time streaming of agent events

### Debugging & Analysis
- **State Inspector**: View agent state at any point in execution
- **State Diff Viewer**: See exactly what changed between steps
- **Event Timeline**: Chronological log of all agent events
- **Replay Controls**: Scrub through execution history with a slider

### Performance Monitoring
- **Per-Node Latency**: Average execution time for each node
- **Token Usage**: Track total tokens consumed
- **Cost Estimation**: Real-time cost calculations
- **Performance Metrics**: Detailed analytics per node

### Quality Assurance
- **Drift Detection**: Identify when answers drift from the question
- **Hallucination Detection**: Heuristic-based quality checks
- **Citation Analysis**: Verify source coverage
- **Answer Quality Metrics**: Overlap, length, and citation scores

### Integration
- **LangSmith Tracing**: Full integration with LangSmith for detailed traces
- **Real Web Search**: Tavily Search (with DuckDuckGo fallback)
- **LLM Integration**: OpenAI GPT-4o-mini for research and synthesis

## 🏗️ Architecture

```
AgentLens/
├── backend/           # FastAPI backend
│   ├── agents/       # LangGraph agent definitions
│   ├── api/          # REST and WebSocket endpoints
│   ├── services/     # Business logic (drift, analytics, LangSmith)
│   └── core/         # Configuration and utilities
├── frontend/         # Next.js frontend
│   ├── app/          # Next.js App Router pages
│   └── components/   # React components
└── docs/             # Documentation
```

## 🚀 Quick Start

### Prerequisites

- Python 3.11 or higher
- Node.js 18+ and npm
- OpenAI API key (required)
- Tavily API key (optional, but recommended)
- LangSmith API key (optional, for tracing)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/AgentLens.git
   cd AgentLens
   ```

2. **Set up the backend**
   ```bash
   cd backend
   pip install -r requirements.txt
   ```

3. **Configure environment variables**
   
   Create a `.env` file in the `backend/` directory:
   ```bash
   cd backend
   touch .env
   ```
   
   Add your API keys to `backend/.env`:
   ```env
   # Required
   OPENAI_API_KEY=sk-your-actual-openai-key-here
   
   # Optional: Model selection (default: gpt-4o-mini)
   OPENAI_MODEL=gpt-4o-mini
   
   # Optional but recommended: Tavily Search
   TAVILY_API_KEY=tvly-your-actual-tavily-key-here
   
   # Optional: LangSmith Tracing
   LANGSMITH_TRACING=true
   LANGSMITH_API_KEY=your-langsmith-key-here
   LANGSMITH_PROJECT=agentlens
   ```

4. **Set up the frontend**
   ```bash
   cd ../frontend
   npm install
   ```

5. **Run the application**
   
   **Terminal 1 - Backend:**
   ```bash
   cd backend
   uvicorn main:app --reload --port 8000
   ```
   
   **Terminal 2 - Frontend:**
   ```bash
   cd frontend
   npm run dev
   ```

6. **Open your browser**
   
   Navigate to http://localhost:3000

## 📖 Usage

### Running an Agent

1. Enter a research question in the input field on the home page
2. Click "Run Agent" or press `Cmd/Ctrl + Enter`
3. Watch the real-time visualization as the agent:
   - Plans the research approach (supervisor)
   - Searches the web for sources (researcher)
   - Synthesizes an answer (synthesizer)
   - Verifies quality and citations (verifier)

### Using Replay

1. After a run completes, use the replay slider to scrub through execution history
2. Toggle "Pause live" to stop auto-updating
3. All components (graph, state, diffs, costs) update based on the slider position
4. Click "New Run" to start a fresh execution

### Analyzing Performance

- **Graph Execution**: See which nodes are active, completed, or pending
- **Performance Metrics**: Check latency and token usage per node
- **Quality Metrics**: Review drift scores and warning flags
- **State Inspector**: Examine the full agent state at any point
- **LangSmith Trace**: View detailed traces in the integrated viewer

## 🔧 Configuration

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `OPENAI_API_KEY` | Yes | Your OpenAI API key |
| `OPENAI_MODEL` | No | Model to use (default: `gpt-4o-mini`) |
| `TAVILY_API_KEY` | No | Tavily Search API key (falls back to DuckDuckGo if not set) |
| `LANGSMITH_TRACING` | No | Enable LangSmith tracing (`true`/`false`) |
| `LANGSMITH_API_KEY` | No | LangSmith API key |
| `LANGSMITH_PROJECT` | No | LangSmith project name (default: `agentlens`) |

### API Endpoints

- `GET /api/graph-schema` - Get the LangGraph structure
- `POST /api/run-agent` - Run agent synchronously
- `GET /api/trace/{run_id}` - Fetch LangSmith trace
- `GET /api/analytics/{run_id}` - Get analytics for a run
- `POST /api/drift` - Compute drift metrics for a state
- `WS /ws/run` - WebSocket endpoint for streaming agent execution

## 🧪 Agent Workflow

The research agent follows this workflow:

1. **Supervisor**: Analyzes the question and plans the research approach
2. **Researcher**: Searches the web using Tavily or DuckDuckGo
3. **Synthesizer**: Combines research notes into a coherent answer
4. **Verifier**: Checks citations, quality, and relevance
5. **Loop**: If issues are found, returns to researcher for more information

## 🛠️ Development

### Project Structure

- **Backend**: FastAPI with async/await, WebSocket support
- **Frontend**: Next.js 14 with App Router, TypeScript, Tailwind CSS
- **Agent**: LangGraph with state management
- **Visualization**: React Flow with dagre auto-layout

### Key Technologies

- **Backend**: FastAPI, LangGraph, LangChain, LangSmith
- **Frontend**: Next.js, React, TypeScript, Tailwind CSS, React Flow
- **Search**: Tavily Search, DuckDuckGo
- **LLM**: OpenAI GPT-4o-mini

### Running Tests

```bash
# Backend tests (when implemented)
cd backend
pytest

# Frontend tests (when implemented)
cd frontend
npm test
```

## 📝 License

This project is licensed under the MIT License.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 🙏 Acknowledgments

- [LangGraph](https://github.com/langchain-ai/langgraph) for the agent framework
- [LangSmith](https://smith.langchain.com/) for tracing capabilities
- [React Flow](https://reactflow.dev/) for graph visualization
- [Tavily](https://tavily.com/) for web search capabilities

## 📧 Support

For issues, questions, or contributions, please open an issue on GitHub.

---

**Built with ❤️ for the LangGraph community**

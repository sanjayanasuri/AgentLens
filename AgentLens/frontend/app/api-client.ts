export async function runAgent(question: string) {
  const res = await fetch("http://localhost:8000/api/run-agent", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question })
  });
  return res.json();
}

export function openRunWebsocket(question: string) {
  const ws = new WebSocket("ws://localhost:8000/ws/run");
  ws.onopen = () => ws.send(JSON.stringify({ question }));
  return ws;
}


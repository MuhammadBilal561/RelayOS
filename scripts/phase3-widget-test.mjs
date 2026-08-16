// Phase 3: test widget /api/widget/message against the live dev server
const res = await fetch("http://localhost:3003/api/widget/message", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    widgetKey: "demo-widget-key",
    sessionId: "test-session-phase3-" + Date.now(),
    message: "How much does AC repair cost?",
  }),
});
console.log("Widget response status:", res.status);
const data = await res.json();
console.log("Widget response:", JSON.stringify(data, null, 2));
async function groqChatCompletion({ apiKey, model, systemPrompt, userMessage, maxTokens }) {
  const resp = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
      max_tokens: maxTokens,
    }),
  });

  if (!resp.ok) {
    const text = await resp.text().catch(() => "");
    const err = new Error(`Groq API error: ${resp.status} ${resp.statusText}`);
    err.details = text;
    throw err;
  }

  const data = await resp.json();
  const reply = data?.choices?.[0]?.message?.content;
  if (typeof reply !== "string") {
    throw new Error("Groq API returned an unexpected response shape.");
  }
  return reply;
}

module.exports = { groqChatCompletion };

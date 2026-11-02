const tools = require('./tools');

const SYSTEM = (user) => `You are KisanMitra, a friendly, practical AI farm advisor for Indian farmers.
Farmer: ${user.name}${user.district ? `, ${user.district}` : ''}${user.state ? `, ${user.state}` : ''}.
You are an autonomous agent: use your tools to look up the farmer's real crops, market prices and weather before advising.
Give specific, actionable advice in simple language (short sentences). Mention costs/quantities where useful.
If the farmer asks you to set an alert or log an activity, do it with the tools and confirm.
For pesticide/chemical advice, recommend following label doses and consulting the local Krishi Vigyan Kendra (KVK) for serious outbreaks.
Reply in the same language the farmer writes in.`;

const MAX_STEPS = 6;

// ---------- Provider selection (set AI_PROVIDER, or it is auto-detected from whichever key exists) ----------
function getProvider() {
  const forced = (process.env.AI_PROVIDER || '').toLowerCase();
  if (forced === 'gemini' && process.env.GEMINI_API_KEY) return 'gemini';
  if (forced === 'openai' && process.env.OPENAI_API_KEY) return 'openai';
  if (forced === 'anthropic' && process.env.ANTHROPIC_API_KEY) return 'anthropic';
  if (process.env.GEMINI_API_KEY) return 'gemini';
  if (process.env.OPENAI_API_KEY) return 'openai';
  if (process.env.ANTHROPIC_API_KEY) return 'anthropic';
  return null;
}

async function post(url, headers, body, label) {
  let lastErr;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(url, { method: 'POST', signal: AbortSignal.timeout(45000), headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(body) });
      if (res.ok) return await res.json();
      const err = new Error(`${label} API error ${res.status}: ${await res.text()}`);
      err.retry = [429, 500, 503].includes(res.status);
      throw err;
    } catch (e) {
      lastErr = e;
      if (e.retry === false) throw e;
      await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)));
    }
  }
  throw lastErr;
}

// ---------- Anthropic (Claude) ----------
async function runAnthropic(history, user) {
  const messages = history.map((m) => ({ role: m.role, content: m.content }));
  const toolsUsed = [];
  for (let i = 0; i < MAX_STEPS; i++) {
    const data = await post(
      'https://api.anthropic.com/v1/messages',
      { 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
      { model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-5-5', max_tokens: 1024, system: SYSTEM(user), tools: tools.definitions, messages },
      'Claude'
    );
    if (data.stop_reason !== 'tool_use') {
      return { reply: data.content.filter((b) => b.type === 'text').map((b) => b.text).join('\n'), toolsUsed };
    }
    messages.push({ role: 'assistant', content: data.content });
    const results = [];
    for (const b of data.content.filter((x) => x.type === 'tool_use')) {
      toolsUsed.push(b.name);
      results.push({ type: 'tool_result', tool_use_id: b.id, content: JSON.stringify(await tools.run(b.name, b.input, user)) });
    }
    messages.push({ role: 'user', content: results });
  }
  return { reply: 'Please ask in a simpler way.', toolsUsed };
}

// ---------- OpenAI (ChatGPT) ----------
async function runOpenAI(history, user) {
  const messages = [{ role: 'system', content: SYSTEM(user) }, ...history.map((m) => ({ role: m.role, content: m.content }))];
  const defs = tools.definitions.map((t) => ({ type: 'function', function: { name: t.name, description: t.description, parameters: t.input_schema } }));
  const toolsUsed = [];
  for (let i = 0; i < MAX_STEPS; i++) {
    const data = await post(
      'https://api.openai.com/v1/chat/completions',
      { authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
      { model: process.env.OPENAI_MODEL || 'gpt-4o-mini', messages, tools: defs },
      'OpenAI'
    );
    const msg = data.choices[0].message;
    if (!msg.tool_calls || !msg.tool_calls.length) return { reply: msg.content || '', toolsUsed };
    messages.push(msg);
    for (const call of msg.tool_calls) {
      toolsUsed.push(call.function.name);
      let args = {};
      try { args = JSON.parse(call.function.arguments || '{}'); } catch { /* keep {} */ }
      messages.push({ role: 'tool', tool_call_id: call.id, content: JSON.stringify(await tools.run(call.function.name, args, user)) });
    }
  }
  return { reply: 'Please ask in a simpler way.', toolsUsed };
}

// ---------- Google Gemini ----------
const toGeminiSchema = (s) => {
  if (!s || typeof s !== 'object') return s;
  const out = { ...s };
  if (out.type) out.type = String(out.type).toUpperCase();
  if (out.properties) out.properties = Object.fromEntries(Object.entries(out.properties).map(([k, v]) => [k, toGeminiSchema(v)]));
  return out;
};

async function runGemini(history, user) {
  const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
  const declarations = tools.definitions.map((t) => {
    const d = { name: t.name, description: t.description };
    if (t.input_schema.properties && Object.keys(t.input_schema.properties).length) d.parameters = toGeminiSchema(t.input_schema);
    return d;
  });
  const contents = history.map((m) => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] }));
  const toolsUsed = [];
  for (let i = 0; i < MAX_STEPS; i++) {
    const data = await post(
      url,
      { 'x-goog-api-key': process.env.GEMINI_API_KEY },
      { systemInstruction: { parts: [{ text: SYSTEM(user) }] }, contents, tools: [{ functionDeclarations: declarations }] },
      'Gemini'
    );
    const cand = data.candidates && data.candidates[0];
    const parts = (cand && cand.content && cand.content.parts) || [];
    const calls = parts.filter((p) => p.functionCall);
    if (!calls.length) return { reply: parts.map((p) => p.text || '').join('') || 'Sorry, I could not answer that.', toolsUsed };
    contents.push({ role: 'model', parts });
    const responses = [];
    for (const p of calls) {
      toolsUsed.push(p.functionCall.name);
      const out = await tools.run(p.functionCall.name, p.functionCall.args, user);
      responses.push({ functionResponse: { name: p.functionCall.name, response: { result: out } } });
    }
    contents.push({ role: 'user', parts: responses });
  }
  return { reply: 'Please ask in a simpler way.', toolsUsed };
}

const RUNNERS = { anthropic: runAnthropic, openai: runOpenAI, gemini: runGemini };

// ---------- Offline fallback so the demo never breaks without any API key ----------
const KNOWLEDGE = [
  { k: /yellow|पीला|पीले|pila|pile|peela|peele/, a: 'Yellowing leaves usually mean nitrogen deficiency, waterlogging or early fungal infection. Check drainage first; if soil is fine, apply 20–25 kg urea per acre in split doses and look under leaves for spots or pests.' },
  { k: /pest|insect|कीट|aphid|whitefly|bollworm|keet|keede|kide/, a: 'Scout 10 plants across the field. If more than 10% show damage, spray neem oil (5 ml/litre) first. Use a recommended insecticide only if neem fails, and follow the label dose. Contact your local KVK for severe outbreaks.' },
  { k: /water|irrigat|सिंचाई|पानी|pani|sinchai/, a: 'Irrigate early morning or evening. For most field crops, water at critical stages (crown root, flowering, grain filling). Drip or sprinkler saves 30–50% water. Skip irrigation if rain is forecast within 24 hours.' },
  { k: /fertili|खाद|urea|dap|npk|khad/, a: 'Get a soil test (free at many KVKs) before buying fertilizer. A common split: full phosphorus and potash at sowing, nitrogen in 2–3 doses. Add farmyard manure (2–4 tonnes/acre) to improve soil health.' },
  { k: /sell|price|mandi|भाव|market|bhav|bhaav/, a: 'Check the Prices tab for the 7-day trend. If prices are rising, consider staggering sales; if falling and storage is limited, sell soon. Set a price alert so you are notified at your target.' },
  { k: /disease|blight|rust|fung|रोग|rog|bimari/, a: 'Remove infected leaves, avoid overhead irrigation, and improve spacing for airflow. For fungal disease, a copper-based fungicide or mancozeb (as per label) is commonly used. Rotate crops next season.' },
];

async function runFallbackAgent(history, user) {
  const last = history[history.length - 1].content;
  const toolsUsed = [];

  if (/my crop|मेरी फसल|what.*(growing|planted)/i.test(last)) {
    const crops = await tools.run('get_my_crops', {}, user);
    toolsUsed.push('get_my_crops');
    return {
      reply: crops.length
        ? 'Your crops:\n' + crops.map((c) => `• ${c.name} – ${c.areaAcres} acres, ${c.daysSinceSowing} days since sowing (${c.status})`).join('\n')
        : 'You have not added any crops yet. Add one in the Crops tab.',
      toolsUsed,
    };
  }

  const commodity = (last.match(/(wheat|rice|paddy|tomato|onion|potato|maize|cotton|soybean|mustard)/i) || [])[1];
  if (commodity && /price|sell|mandi|भाव|rate/i.test(last)) {
    const p = await tools.run('get_market_prices', { commodity }, user);
    toolsUsed.push('get_market_prices');
    return {
      reply: p.latestPrice
        ? `${p.commodity} is ₹${p.latestPrice}/quintal at ${p.market}, ${p.trend} (${p.weekChangePct}% in 7 days). ${p.trend === 'rising' ? 'You may hold a little longer if you can store safely.' : p.trend === 'falling' ? 'If storage is limited, consider selling soon.' : 'Prices are steady.'}`
        : p.message,
      toolsUsed,
    };
  }

  const hit = KNOWLEDGE.find((e) => e.k.test(last));
  return {
    reply: hit
      ? hit.a
      : 'I can help with crop problems, irrigation, fertilizer, pests, and market prices. Tell me your crop and what you are seeing. (Live AI mode is off – add GEMINI_API_KEY, OPENAI_API_KEY or ANTHROPIC_API_KEY in server/.env for full agent reasoning.)',
    toolsUsed,
  };
}

async function runAgent(history, user) {
  const provider = getProvider();
  if (provider) {
    try {
      return await RUNNERS[provider](history, user);
    } catch (e) {
      console.error(`${provider} agent failed, using fallback:`, e.message);
    }
  }
  return runFallbackAgent(history, user);
}

module.exports = { runAgent, getProvider };

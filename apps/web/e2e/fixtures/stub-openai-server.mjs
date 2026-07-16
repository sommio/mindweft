// 确定性的本地 OpenAI-compatible 流式 Stub Provider，仅供 Playwright E2E 使用。
// 不记录请求体或 API Key。通过 model 名称路由不同行为。
import { createServer } from 'node:http';

const PORT = Number(process.env.STUB_OPENAI_PORT ?? 8787);
const HOST = '127.0.0.1';

function chunk(content) {
  return `data: ${JSON.stringify({
    id: 'chatcmpl-stub',
    object: 'chat.completion.chunk',
    created: 1,
    model: 'stub-model',
    choices: [{ index: 0, delta: { content }, finish_reason: null }],
  })}\n\n`;
}

const DONE = 'data: [DONE]\n\n';

function stopChunk() {
  return `data: ${JSON.stringify({
    id: 'chatcmpl-stub',
    object: 'chat.completion.chunk',
    created: 1,
    model: 'stub-model',
    choices: [{ index: 0, delta: {}, finish_reason: 'stop' }],
  })}\n\n`;
}

function sendJson(res, status, body) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(payload),
  });
  res.end(payload);
}

function streamReply(res, body, { delay = 0 } = {}) {
  res.writeHead(200, {
    'content-type': 'text/event-stream; charset=utf-8',
    'cache-control': 'no-store',
    'x-accel-buffering': 'no',
  });
  const writeOne = (text, cb) => {
    res.write(chunk(text), cb);
  };
  const parts = Array.from(body);
  let i = 0;
  const next = () => {
    if (i >= parts.length) {
      res.write(stopChunk(), () => res.end(DONE));
      return;
    }
    const text = parts[i++];
    if (delay > 0) {
      setTimeout(() => writeOne(text, next), delay);
    } else {
      writeOne(text, next);
    }
  };
  next();
}

function handleCompletions(req, res) {
  let raw = '';
  req.on('data', (data) => {
    raw += data.toString();
  });
  req.on('end', () => {
    let parsed = {};
    try {
      parsed = JSON.parse(raw);
    } catch {
      sendJson(res, 400, { error: { message: 'bad json' } });
      return;
    }
    const model = parsed.model;
    const messages = Array.isArray(parsed.messages) ? parsed.messages : [];

    if (model === 'error-401') {
      sendJson(res, 401, { error: { message: 'unauthorized' } });
      return;
    }
    if (model === 'error-500') {
      sendJson(res, 500, { error: { message: 'boom' } });
      return;
    }
    if (model === 'error-network') {
      res.destroy();
      return;
    }
    if (model === 'stub-slow') {
      streamReply(res, `第${messages.length}条:你好!`, { delay: 50 });
      return;
    }
    streamReply(res, `第${messages.length}条:你好!`);
  });
}

function handleEmbeddings(req, res) {
  let raw = '';
  req.on('data', (data) => {
    raw += data.toString();
  });
  req.on('end', () => {
    let parsed = {};
    try {
      parsed = JSON.parse(raw);
    } catch {
      sendJson(res, 400, { error: { message: 'bad json' } });
      return;
    }
    if (parsed.model === 'error-401' || parsed.model === 'error-500') {
      sendJson(res, parsed.model === 'error-401' ? 401 : 500, {
        error: { message: 'stub error' },
      });
      return;
    }
    const value = String(parsed.input ?? '');
    const vector = Array.from(
      { length: 8 },
      (_, i) => (value.charCodeAt(i) || 0) / 255,
    );
    sendJson(res, 200, {
      object: 'list',
      data: [{ object: 'embedding', index: 0, embedding: vector }],
      model: parsed.model,
      usage: { prompt_tokens: value.length, total_tokens: value.length },
    });
  });
}

const server = createServer((req, res) => {
  if (req.method === 'GET' && req.url === '/health') {
    sendJson(res, 200, { ok: true });
    return;
  }
  if (req.method === 'POST' && req.url === '/v1/chat/completions') {
    handleCompletions(req, res);
    return;
  }
  if (req.method === 'POST' && req.url === '/v1/embeddings') {
    handleEmbeddings(req, res);
    return;
  }
  sendJson(res, 404, { error: { message: 'not found' } });
});

server.listen(PORT, HOST, () => {
  // 准备就绪。不打印任何请求内容。
});

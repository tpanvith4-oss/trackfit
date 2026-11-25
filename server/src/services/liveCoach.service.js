import { Modality, Type } from '@google/genai';
import { WebSocketServer } from 'ws';
import { prisma } from '../config/db.js';
import { env } from '../config/env.js';
import { getGeminiClient } from '../config/gemini.js';
import { verifyToken } from './auth.service.js';

const STAGE_MEAL_DRAFT_DECLARATION = {
  name: 'stage_meal_draft',
  description:
    'Calculates and sends a structured meal macro breakdown to the user interface so they can inspect calories, protein, carbs, and fat and click Record Meal to save it. Call this whenever the user tells you what they ate or drank.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      mealTitle: {
        type: Type.STRING,
        description: 'Short readable name for the meal, e.g. "2 Masala Dosas & Whey Shake".',
      },
      suggestedMealType: {
        type: Type.STRING,
        description: 'One of: breakfast, lunch, dinner, snack.',
      },
      items: {
        type: Type.ARRAY,
        description: 'Individual food items with calculated macros.',
        items: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            quantity: { type: Type.STRING, description: 'Portion size, e.g. "200 g" or "2 eggs"' },
            calories: { type: Type.NUMBER, description: 'Whole kilocalories' },
            protein: { type: Type.NUMBER, description: 'Protein in grams' },
            carbs: { type: Type.NUMBER, description: 'Carbs in grams' },
            fat: { type: Type.NUMBER, description: 'Fat in grams' },
          },
          required: ['name', 'calories', 'protein', 'carbs', 'fat'],
        },
      },
    },
    required: ['mealTitle', 'suggestedMealType', 'items'],
  },
};

const GET_DAILY_SUMMARY_DECLARATION = {
  name: 'get_daily_summary',
  description:
    'Fetches the user’s live TrackFit nutrition totals logged today, daily calorie and protein targets, remaining budget, and latest recorded weight.',
  parameters: {
    type: Type.OBJECT,
    properties: {},
  },
};

const round1 = (val) => Math.round((Number(val) || 0) * 10) / 10;

function normalizeMealDraft(args) {
  const validTypes = new Set(['breakfast', 'lunch', 'dinner', 'snack']);
  const rawType = String(args?.suggestedMealType ?? 'lunch').toLowerCase();
  const suggestedMealType = validTypes.has(rawType) ? rawType : 'lunch';
  const items = (Array.isArray(args?.items) ? args.items : [])
    .filter((item) => item?.name)
    .slice(0, 20)
    .map((item) => ({
      name: String(item.name).trim().slice(0, 80),
      quantity: String(item.quantity || '1 serving').trim().slice(0, 40),
      calories: Math.max(0, Math.min(5000, Math.round(Number(item.calories) || 0))),
      protein: Math.max(0, Math.min(500, round1(item.protein))),
      carbs: Math.max(0, Math.min(500, round1(item.carbs))),
      fat: Math.max(0, Math.min(500, round1(item.fat))),
    }));

  const totalCalories = items.reduce((s, i) => s + i.calories, 0);
  const totalProtein = round1(items.reduce((s, i) => s + i.protein, 0));
  const totalCarbs = round1(items.reduce((s, i) => s + i.carbs, 0));
  const totalFat = round1(items.reduce((s, i) => s + i.fat, 0));

  return {
    mealTitle:
      String(args?.mealTitle || '')
        .trim()
        .slice(0, 120) ||
      items
        .map((i) => i.name)
        .join(', ')
        .slice(0, 120) ||
      'Voice Logged Meal',
    suggestedMealType,
    items,
    totalCalories,
    totalProtein,
    totalCarbs,
    totalFat,
    sources: [],
    grounded: false,
    fromLiveVoice: true,
  };
}

async function fetchUserSummary(userId) {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(startOfDay.getTime() + 86_400_000);

  const [user, todayFoods, latestWeight] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        name: true,
        dailyCalories: true,
        dailyProtein: true,
        baselineWeight: true,
        targetWeightMin: true,
        targetWeightMax: true,
      },
    }),
    prisma.foodEntry.findMany({
      where: { userId, loggedAt: { gte: startOfDay, lt: endOfDay } },
      select: { name: true, calories: true, proteinG: true, carbsG: true, fatG: true, mealType: true },
    }),
    prisma.weightEntry.findFirst({
      where: { userId },
      orderBy: { loggedAt: 'desc' },
      select: { weightKg: true, loggedAt: true },
    }),
  ]);

  const totals = todayFoods.reduce(
    (acc, item) => ({
      calories: acc.calories + (Number(item.calories) || 0),
      proteinG: round1(acc.proteinG + (Number(item.proteinG) || 0)),
      carbsG: round1(acc.carbsG + (Number(item.carbsG) || 0)),
      fatG: round1(acc.fatG + (Number(item.fatG) || 0)),
    }),
    { calories: 0, proteinG: 0, carbsG: 0, fatG: 0 },
  );

  const dailyCalories = user?.dailyCalories ?? 1800;
  const dailyProtein = user?.dailyProtein ?? 135;

  return {
    name: user?.name ?? 'Athlete',
    dailyTargets: { calories: dailyCalories, proteinG: dailyProtein },
    loggedToday: {
      mealCount: todayFoods.length,
      ...totals,
      meals: todayFoods.map((f) => `${f.name} (${f.calories} kcal)`),
    },
    remaining: {
      calories: Math.max(0, dailyCalories - totals.calories),
      proteinG: Math.max(0, round1(dailyProtein - totals.proteinG)),
    },
    latestWeightKg: latestWeight?.weightKg ?? user?.baselineWeight ?? null,
    targetWeightRangeKg: user ? [user.targetWeightMin, user.targetWeightMax] : null,
  };
}

function sendJson(ws, payload) {
  if (ws.readyState === ws.OPEN) {
    ws.send(JSON.stringify(payload));
  }
}

async function authenticateWsRequest(req) {
  const url = new URL(req.url || '/', 'http://localhost');
  const token = url.searchParams.get('token');
  if (!token) return null;
  try {
    const payload = verifyToken(token);
    if (payload.scope) return null;
    const user = await prisma.user.findUnique({ where: { id: payload.userId }, select: { id: true, name: true } });
    return user;
  } catch {
    return null;
  }
}

export function attachLiveCoachWebSocket(httpServer) {
  const wss = new WebSocketServer({ noServer: true });

  httpServer.on('upgrade', async (req, socket, head) => {
    const pathname = new URL(req.url || '/', 'http://localhost').pathname;
    if (pathname !== '/api/live') return;

    const user = await authenticateWsRequest(req);
    if (!user) {
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
      socket.destroy();
      return;
    }

    wss.handleUpgrade(req, socket, head, (ws) => {
      wss.emit('connection', ws, req, user);
    });
  });

  wss.on('connection', async (clientWs, _req, user) => {
    let session = null;
    let closed = false;

    const cleanup = () => {
      if (closed) return;
      closed = true;
      try {
        session?.close?.();
      } catch {
        // ignore close errors
      }
      session = null;
    };

    clientWs.on('close', cleanup);
    clientWs.on('error', cleanup);

    try {
      const ai = getGeminiClient();
      const summary = await fetchUserSummary(user.id);
      const systemInstruction = `You are TrackFit's live voice nutrition and fitness coach speaking with ${summary.name}.
Current daily context:
- Calorie target: ${summary.dailyTargets.calories} kcal (logged so far: ${summary.loggedToday.calories} kcal, remaining: ${summary.remaining.calories} kcal)
- Protein target: ${summary.dailyTargets.proteinG} g (logged so far: ${summary.loggedToday.proteinG} g, remaining: ${summary.remaining.proteinG} g)
- Latest weight: ${summary.latestWeightKg ?? 'not recorded yet'} kg

Your job:
1. Have natural, concise, energetic spoken conversations about what the user ate today, their macros, and their fitness progress.
2. Whenever the user tells you any food or meal they ate or plan to log, IMMEDIATELY call the \`stage_meal_draft\` tool with accurate calories, protein, carbs, and fat for each item so the macros appear in the TrackFit UI. Tell them the totals aloud and let them know it is ready on screen to tap "Record Meal" to save.
3. Whenever the user asks about today's intake, remaining calories/protein, or progress, call \`get_daily_summary\` for fresh live numbers.
4. Keep spoken answers crisp (2-3 short sentences) unless asked for deeper advice.`;

      const sessionPromise = ai.live.connect({
        model: env.liveModel || 'gemini-3.8-live',
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } },
          },
          inputAudioTranscription: {},
          outputAudioTranscription: {},
          tools: [{ functionDeclarations: [STAGE_MEAL_DRAFT_DECLARATION, GET_DAILY_SUMMARY_DECLARATION] }],
          systemInstruction,
        },
        callbacks: {
          onopen: () => {
            sendJson(clientWs, { type: 'ready' });
          },
          onmessage: async (message) => {
            if (closed) return;

            const content = message?.serverContent;
            if (content?.inputTranscription?.text) {
              sendJson(clientWs, { type: 'input_transcript', text: content.inputTranscription.text });
            }
            if (content?.outputTranscription?.text) {
              sendJson(clientWs, { type: 'output_transcript', text: content.outputTranscription.text });
            }
            for (const part of content?.modelTurn?.parts ?? []) {
              if (part?.inlineData?.data) {
                sendJson(clientWs, { type: 'audio', data: part.inlineData.data });
              }
            }
            if (content?.interrupted) {
              sendJson(clientWs, { type: 'interrupted' });
            }
            if (content?.turnComplete) {
              sendJson(clientWs, { type: 'turn_complete' });
            }

            const calls = message?.toolCall?.functionCalls ?? [];
            if (calls.length > 0 && session) {
              const functionResponses = [];
              for (const call of calls) {
                if (call.name === 'stage_meal_draft') {
                  const draft = normalizeMealDraft(call.args);
                  sendJson(clientWs, { type: 'meal_draft', draft });
                  functionResponses.push({
                    id: call.id,
                    name: call.name,
                    response: {
                      status: 'staged_in_ui',
                      mealTitle: draft.mealTitle,
                      totalCalories: draft.totalCalories,
                      totalProtein: draft.totalProtein,
                      totalCarbs: draft.totalCarbs,
                      totalFat: draft.totalFat,
                      note: 'Macros are now visible in the UI. Waiting for the user to click Record Meal.',
                    },
                  });
                } else if (call.name === 'get_daily_summary') {
                  const fresh = await fetchUserSummary(user.id);
                  functionResponses.push({
                    id: call.id,
                    name: call.name,
                    response: fresh,
                  });
                }
              }
              if (functionResponses.length > 0) {
                session.sendToolResponse({ functionResponses });
              }
            }
          },
          onerror: (err) => {
            console.error('[live] Gemini Live error:', err);
            sendJson(clientWs, {
              type: 'error',
              message: err?.message || 'Live voice session encountered an error.',
            });
          },
          onclose: () => {
            if (!closed) {
              sendJson(clientWs, { type: 'closed' });
              clientWs.close();
            }
          },
        },
      });

      session = await sessionPromise;

      clientWs.on('message', (raw) => {
        if (closed || !session) return;
        try {
          const msg = JSON.parse(raw.toString());
          if (msg.type === 'audio' && typeof msg.data === 'string') {
            session.sendRealtimeInput({
              audio: { data: msg.data, mimeType: 'audio/pcm;rate=16000' },
            });
          } else if (msg.type === 'text' && typeof msg.text === 'string' && msg.text.trim()) {
            session.sendRealtimeInput({ text: msg.text.trim() });
          }
        } catch (err) {
          console.error('[live] Bad client message:', err);
        }
      });
    } catch (err) {
      console.error('[live] Failed to start Gemini Live session:', err);
      sendJson(clientWs, {
        type: 'error',
        message: err?.message || 'Could not start Gemini Live voice session. Check GEMINI_API_KEY in Settings > Secrets.',
      });
      cleanup();
      clientWs.close();
    }
  });

  return wss;
}

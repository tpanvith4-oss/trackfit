import crypto from 'node:crypto';
import fs from 'node:fs';
import { Prisma } from '@prisma/client';
import { MEAL_TEMPLATE_SEEDS, PROTOCOL_DEADLINE_ISO, PROTOCOL_START_ISO } from '../constants/cutProtocol.js';

const STORE_FILE = '/tmp/trackfit-dev-store.json';
const CLIENT_VERSION = '6.19.3';

const DATE_FIELDS = new Set([
  'createdAt',
  'updatedAt',
  'loggedAt',
  'date',
  'syncDay',
  'startedAt',
  'endedAt',
  'protocolStart',
  'targetDeadline',
  'bedtimeAt',
  'wakeAt',
  'alarmSolvedAt',
]);

function prismaError(code, message) {
  return new Prisma.PrismaClientKnownRequestError(message, { code, clientVersion: CLIENT_VERSION });
}

function toDate(value) {
  if (value === null || value === undefined) return value;
  return value instanceof Date ? value : new Date(value);
}

function dayIso(value) {
  if (!value) return null;
  return toDate(value).toISOString().slice(0, 10);
}

function cloneValue(val) {
  if (val instanceof Date) return new Date(val.getTime());
  if (Array.isArray(val)) return val.map(cloneValue);
  if (val && typeof val === 'object') {
    const copy = {};
    for (const [k, v] of Object.entries(val)) copy[k] = cloneValue(v);
    return copy;
  }
  return val;
}

function reviveDates(record) {
  if (!record || typeof record !== 'object') return record;
  const copy = { ...record };
  for (const field of DATE_FIELDS) {
    if (copy[field] !== undefined && copy[field] !== null) {
      copy[field] = new Date(copy[field]);
    }
  }
  return copy;
}

function compareValues(a, b) {
  if (a === b) return 0;
  if (a === null || a === undefined) return -1;
  if (b === null || b === undefined) return 1;
  if (a instanceof Date && b instanceof Date) return a.getTime() - b.getTime();
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  return String(a).localeCompare(String(b));
}

function applyOrderBy(rows, orderBy) {
  if (!orderBy) return rows;
  const clauses = Array.isArray(orderBy) ? orderBy : [orderBy];
  return [...rows].sort((a, b) => {
    for (const clause of clauses) {
      for (const [field, dir] of Object.entries(clause)) {
        const cmp = compareValues(a[field], b[field]);
        if (cmp !== 0) return dir === 'desc' ? -cmp : cmp;
      }
    }
    return 0;
  });
}

function applySelect(record, select) {
  if (!select || !record) return record;
  const out = {};
  for (const [key, enabled] of Object.entries(select)) {
    if (enabled) out[key] = cloneValue(record[key]);
  }
  return out;
}

function matchCondition(actual, expected, fieldName) {
  if (expected === undefined) return true;
  if (expected === null) return actual === null || actual === undefined;

  if (
    expected &&
    typeof expected === 'object' &&
    !(expected instanceof Date) &&
    !Array.isArray(expected)
  ) {
    const actualVal = actual instanceof Date ? actual.getTime() : actual;
    if (expected.gte !== undefined) {
      const bound = expected.gte instanceof Date ? expected.gte.getTime() : expected.gte;
      if (actualVal === null || actualVal === undefined || actualVal < bound) return false;
    }
    if (expected.gt !== undefined) {
      const bound = expected.gt instanceof Date ? expected.gt.getTime() : expected.gt;
      if (actualVal === null || actualVal === undefined || actualVal <= bound) return false;
    }
    if (expected.lte !== undefined) {
      const bound = expected.lte instanceof Date ? expected.lte.getTime() : expected.lte;
      if (actualVal === null || actualVal === undefined || actualVal > bound) return false;
    }
    if (expected.lt !== undefined) {
      const bound = expected.lt instanceof Date ? expected.lt.getTime() : expected.lt;
      if (actualVal === null || actualVal === undefined || actualVal >= bound) return false;
    }
    if (expected.equals !== undefined) {
      return matchCondition(actual, expected.equals, fieldName);
    }
    return true;
  }

  if (fieldName === 'date' || fieldName === 'syncDay') {
    return dayIso(actual) === dayIso(expected);
  }
  if (actual instanceof Date || expected instanceof Date) {
    return toDate(actual)?.getTime() === toDate(expected)?.getTime();
  }
  return actual === expected;
}

function createEmptyTables() {
  return {
    user: [],
    foodEntry: [],
    weightEntry: [],
    sleepSchedule: [],
    activityEntry: [],
    bodyMeasurement: [],
    dailyCheckin: [],
    workoutSession: [],
    workoutSet: [],
    mealTemplate: [],
  };
}

function loadStore() {
  const tables = createEmptyTables();
  try {
    if (fs.existsSync(STORE_FILE)) {
      const parsed = JSON.parse(fs.readFileSync(STORE_FILE, 'utf8'));
      for (const key of Object.keys(tables)) {
        if (Array.isArray(parsed[key])) {
          tables[key] = parsed[key].map(reviveDates);
        }
      }
    }
  } catch {
    // Ignore corrupt cache and start clean.
  }
  return tables;
}

function persistStore(tables) {
  try {
    fs.writeFileSync(STORE_FILE, JSON.stringify(tables), 'utf8');
  } catch {
    // Ephemeral / read-only FS fallback: stay in memory.
  }
}

export function createMemoryDb() {
  const tables = loadStore();

  const save = () => persistStore(tables);

  function expandWhere(where) {
    if (!where) return {};
    const expanded = {};
    for (const [key, value] of Object.entries(where)) {
      if (value === undefined) continue;
      if (key === 'userId_date' && value && typeof value === 'object') {
        expanded.userId = value.userId;
        expanded.date = value.date;
      } else if (key === 'userId_source_syncDay' && value && typeof value === 'object') {
        expanded.userId = value.userId;
        expanded.source = value.source;
        expanded.syncDay = value.syncDay;
      } else if (key === 'userId_clientId' && value && typeof value === 'object') {
        expanded.userId = value.userId;
        expanded.clientId = value.clientId;
      } else {
        expanded[key] = value;
      }
    }
    return expanded;
  }

  function matchesRow(model, row, where) {
    const filters = expandWhere(where);
    for (const [key, expected] of Object.entries(filters)) {
      if (expected === undefined) continue;
      if (model === 'workoutSet' && key === 'session' && expected && typeof expected === 'object') {
        const parent = tables.workoutSession.find((s) => s.id === row.workoutSessionId);
        if (!parent || !matchesRow('workoutSession', parent, expected)) return false;
        continue;
      }
      if (!matchCondition(row[key], expected, key)) return false;
    }
    return true;
  }

  function formatRow(model, row, { select, include } = {}) {
    if (!row) return null;
    const base = cloneValue(row);
    if (include && model === 'workoutSession' && include.sets) {
      let sets = tables.workoutSet
        .filter((s) => s.workoutSessionId === row.id)
        .map(cloneValue);
      if (typeof include.sets === 'object' && include.sets.orderBy) {
        sets = applyOrderBy(sets, include.sets.orderBy);
      }
      base.sets = sets;
    }
    return select ? applySelect(base, select) : base;
  }

  function checkUnique(model, candidate, ignoreId = null) {
    const rows = tables[model];
    for (const existing of rows) {
      if (ignoreId && existing.id === ignoreId) continue;
      if (model === 'user' && existing.username === candidate.username) {
        throw prismaError('P2002', 'Unique constraint failed on the fields: (`username`)');
      }
      if (model === 'sleepSchedule' && existing.userId === candidate.userId) {
        throw prismaError('P2002', 'Unique constraint failed on the fields: (`user_id`)');
      }
      if (
        model === 'dailyCheckin' &&
        existing.userId === candidate.userId &&
        dayIso(existing.date) === dayIso(candidate.date)
      ) {
        throw prismaError('P2002', 'Unique constraint failed on the fields: (`user_id`, `date`)');
      }
      if (model === 'activityEntry') {
        if (
          candidate.syncDay != null &&
          existing.syncDay != null &&
          existing.userId === candidate.userId &&
          existing.source === candidate.source &&
          dayIso(existing.syncDay) === dayIso(candidate.syncDay)
        ) {
          throw prismaError('P2002', 'Unique constraint failed on (`user_id`, `source`, `sync_day`)');
        }
        if (
          candidate.clientId != null &&
          existing.clientId != null &&
          existing.userId === candidate.userId &&
          existing.clientId === candidate.clientId
        ) {
          throw prismaError('P2002', 'Unique constraint failed on (`user_id`, `client_id`)');
        }
      }
    }
  }

  const UUID_MODELS = new Set(['foodEntry', 'weightEntry', 'bodyMeasurement']);
  let cuidCounter = 0;

  function generateCuid() {
    cuidCounter = (cuidCounter + 1) % 1679616;
    const ts = Date.now().toString(36).padStart(8, '0').slice(-8);
    const cnt = cuidCounter.toString(36).padStart(4, '0');
    const rand = crypto.randomBytes(8).toString('hex').slice(0, 12);
    return `c${ts}${cnt}${rand}`;
  }

  function buildRecord(model, data) {
    const now = new Date();
    const id = data.id ?? (UUID_MODELS.has(model) ? crypto.randomUUID() : generateCuid());
    switch (model) {
      case 'user':
        return {
          id,
          username: data.username,
          passwordHash: data.passwordHash,
          name: data.name,
          baselineWeight: data.baselineWeight ?? 64.0,
          targetWeightMin: data.targetWeightMin ?? 58.0,
          targetWeightMax: data.targetWeightMax ?? 60.0,
          dailyCalories: data.dailyCalories ?? 1800,
          dailyProtein: data.dailyProtein ?? 135,
          heightCm: data.heightCm ?? 165.0,
          neckCm: data.neckCm ?? 37.0,
          baselineWaistCm: data.baselineWaistCm ?? null,
          targetWaistCm: data.targetWaistCm ?? 76.2,
          profileCompleted: data.profileCompleted ?? true,
          protocolStart: toDate(data.protocolStart) ?? new Date(PROTOCOL_START_ISO),
          targetDeadline: toDate(data.targetDeadline) ?? new Date(PROTOCOL_DEADLINE_ISO),
          createdAt: toDate(data.createdAt) ?? now,
        };
      case 'foodEntry':
        return {
          id,
          userId: data.userId,
          name: data.name,
          calories: data.calories,
          proteinG: data.proteinG ?? null,
          carbsG: data.carbsG ?? null,
          fatG: data.fatG ?? null,
          mealType: data.mealType ?? 'SNACK',
          weightG: data.weightG ?? null,
          isRawWeight: data.isRawWeight ?? true,
          fiberG: data.fiberG ?? 0,
          addedOilMl: data.addedOilMl ?? 0,
          diaasScore: data.diaasScore ?? 1.0,
          effectiveProteinG: data.effectiveProteinG ?? null,
          atwaterCalories: data.atwaterCalories ?? null,
          isMacroVerified: data.isMacroVerified ?? true,
          loggedAt: toDate(data.loggedAt) ?? now,
          createdAt: toDate(data.createdAt) ?? now,
          updatedAt: now,
        };
      case 'weightEntry':
        return {
          id,
          userId: data.userId,
          weightKg: data.weightKg,
          note: data.note ?? null,
          loggedAt: toDate(data.loggedAt) ?? now,
          createdAt: toDate(data.createdAt) ?? now,
          updatedAt: now,
        };
      case 'sleepSchedule':
        return {
          id,
          userId: data.userId,
          targetWakeTime: data.targetWakeTime ?? '06:30',
          targetSleepHours: data.targetSleepHours ?? 7.5,
          latencyMinutes: data.latencyMinutes ?? 15,
          enableCognitiveAlarm: data.enableCognitiveAlarm ?? true,
          alarmChallengeType: data.alarmChallengeType ?? 'math',
          createdAt: toDate(data.createdAt) ?? now,
          updatedAt: now,
        };
      case 'activityEntry':
        return {
          id,
          userId: data.userId,
          date: toDate(data.date) ?? now,
          syncDay: data.syncDay != null ? toDate(data.syncDay) : null,
          steps: data.steps ?? 0,
          activeCalories: data.activeCalories ?? 0,
          distanceKm: data.distanceKm ?? 0.0,
          exerciseType: data.exerciseType ?? null,
          durationMinutes: data.durationMinutes ?? null,
          source: data.source ?? 'manual',
          clientId: data.clientId ?? null,
          createdAt: toDate(data.createdAt) ?? now,
          updatedAt: now,
        };
      case 'bodyMeasurement':
        return {
          id,
          userId: data.userId,
          loggedAt: toDate(data.loggedAt) ?? now,
          weightKg: data.weightKg,
          waistUmbilicalCm: data.waistUmbilicalCm,
          waistNarrowestCm: data.waistNarrowestCm ?? null,
          neckCm: data.neckCm ?? 37.0,
          estimatedBfPct: data.estimatedBfPct,
          fatMassKg: data.fatMassKg,
          leanMassKg: data.leanMassKg,
          whtr: data.whtr,
          isFasted: data.isFasted ?? true,
          giBloatScore: data.giBloatScore ?? 1,
          note: data.note ?? null,
          createdAt: toDate(data.createdAt) ?? now,
        };
      case 'dailyCheckin':
        return {
          id,
          userId: data.userId,
          date: toDate(data.date),
          isFoodLogComplete: data.isFoodLogComplete ?? false,
          waterMl: data.waterMl ?? 0,
          creatineTaken: data.creatineTaken ?? false,
          vacuumSetsCompleted: data.vacuumSetsCompleted ?? 0,
          soyaTripleRinsed: data.soyaTripleRinsed ?? false,
          bedtimeAt: toDate(data.bedtimeAt) ?? null,
          wakeAt: toDate(data.wakeAt) ?? null,
          actualSleepHours: data.actualSleepHours ?? null,
          alarmSolvedAt: toDate(data.alarmSolvedAt) ?? null,
          alarmSolveDurationSec: data.alarmSolveDurationSec ?? null,
          createdAt: toDate(data.createdAt) ?? now,
          updatedAt: now,
        };
      case 'workoutSession':
        return {
          id,
          userId: data.userId,
          splitDay: data.splitDay,
          mesocycleWeek: data.mesocycleWeek ?? 1,
          startedAt: toDate(data.startedAt) ?? now,
          endedAt: toDate(data.endedAt) ?? null,
          durationMinutes: data.durationMinutes ?? null,
          sessionRpe: data.sessionRpe ?? null,
          notes: data.notes ?? null,
        };
      case 'workoutSet':
        return {
          id,
          workoutSessionId: data.workoutSessionId,
          exerciseName: data.exerciseName,
          primaryMuscle: data.primaryMuscle,
          secondaryMuscles: data.secondaryMuscles ?? [],
          setNumber: data.setNumber,
          weightKg: data.weightKg ?? 0,
          reps: data.reps,
          rir: data.rir ?? 1,
          isWarmup: data.isWarmup ?? false,
          isCompleted: data.isCompleted ?? true,
          createdAt: toDate(data.createdAt) ?? now,
        };
      case 'mealTemplate':
        return {
          id,
          userId: data.userId,
          name: data.name,
          mealType: data.mealType,
          calories: data.calories,
          proteinG: data.proteinG,
          carbsG: data.carbsG,
          fatG: data.fatG,
          fiberG: data.fiberG ?? 0,
          diaasScore: data.diaasScore ?? 1.0,
          isRawWeight: data.isRawWeight ?? true,
          costInr: data.costInr ?? 0,
          recipeNotes: data.recipeNotes ?? null,
          sortOrder: data.sortOrder ?? 0,
        };
      default:
        return { id, ...data };
    }
  }

  function makeDelegate(model) {
    return {
      async findUnique({ where, select, include } = {}) {
        const row = tables[model].find((r) => matchesRow(model, r, where)) ?? null;
        return formatRow(model, row, { select, include });
      },

      async findFirst({ where, orderBy, select, include } = {}) {
        let rows = tables[model].filter((r) => matchesRow(model, r, where));
        rows = applyOrderBy(rows, orderBy);
        return formatRow(model, rows[0] ?? null, { select, include });
      },

      async findMany({ where, orderBy, take, select, include } = {}) {
        let rows = tables[model].filter((r) => matchesRow(model, r, where));
        rows = applyOrderBy(rows, orderBy);
        if (typeof take === 'number') rows = rows.slice(0, take);
        return rows.map((r) => formatRow(model, r, { select, include }));
      },

      async create({ data, select, include } = {}) {
        const { sets: nestedSets, ...scalarData } = data ?? {};
        const record = buildRecord(model, scalarData);
        checkUnique(model, record);
        tables[model].push(record);

        if (model === 'workoutSession' && Array.isArray(nestedSets?.create)) {
          for (const setInput of nestedSets.create) {
            const setRecord = buildRecord('workoutSet', {
              ...setInput,
              workoutSessionId: record.id,
            });
            tables.workoutSet.push(setRecord);
          }
        }

        if (model === 'user') {
          for (const seed of MEAL_TEMPLATE_SEEDS) {
            tables.mealTemplate.push(
              buildRecord('mealTemplate', { ...seed, userId: record.id, isRawWeight: true }),
            );
          }
        }

        save();
        return formatRow(model, record, { select, include });
      },

      async createMany({ data = [], skipDuplicates = false } = {}) {
        const items = Array.isArray(data) ? data : [data];
        let count = 0;
        for (const item of items) {
          const record = buildRecord(model, item);
          try {
            checkUnique(model, record);
          } catch (err) {
            if (skipDuplicates && err?.code === 'P2002') continue;
            throw err;
          }
          tables[model].push(record);
          count += 1;
        }
        if (count > 0) save();
        return { count };
      },

      async update({ where, data, select, include } = {}) {
        const idx = tables[model].findIndex((r) => matchesRow(model, r, where));
        if (idx === -1) {
          throw prismaError('P2025', `Record to update not found in ${model}`);
        }
        const current = tables[model][idx];
        const next = { ...current };
        for (const [k, v] of Object.entries(data ?? {})) {
          if (v !== undefined) {
            next[k] = DATE_FIELDS.has(k) ? toDate(v) : v;
          }
        }
        if ('updatedAt' in next) next.updatedAt = new Date();
        checkUnique(model, next, current.id);
        tables[model][idx] = next;
        save();
        return formatRow(model, next, { select, include });
      },

      async upsert({ where, create, update, select, include } = {}) {
        const existing = tables[model].find((r) => matchesRow(model, r, where));
        if (existing) {
          return this.update({ where: { id: existing.id }, data: update, select, include });
        }
        return this.create({ data: create, select, include });
      },

      async delete({ where, select } = {}) {
        const idx = tables[model].findIndex((r) => matchesRow(model, r, where));
        if (idx === -1) {
          throw prismaError('P2025', `Record to delete not found in ${model}`);
        }
        const [removed] = tables[model].splice(idx, 1);
        if (model === 'workoutSession') {
          tables.workoutSet = tables.workoutSet.filter((s) => s.workoutSessionId !== removed.id);
        }
        save();
        return formatRow(model, removed, { select });
      },

      async deleteMany({ where } = {}) {
        const before = tables[model].length;
        tables[model] = tables[model].filter((r) => !matchesRow(model, r, where));
        const count = before - tables[model].length;
        if (count > 0) save();
        return { count };
      },

      async count({ where } = {}) {
        return tables[model].filter((r) => matchesRow(model, r, where)).length;
      },
    };
  }

  const maxNonNull = (a, b) => {
    if (b === null || b === undefined) return a;
    if (a === null || a === undefined) return b;
    return Math.max(a, b);
  };

  const client = {
    async $connect() {},
    async $disconnect() {},
    async $queryRaw() {
      return [{ '?column?': 1 }];
    },
    async $executeRaw(strings, ...values) {
      const sql = Array.isArray(strings) ? strings.join(' ') : String(strings);
      // Supports the atomic GREATEST/COALESCE sync update in activity.service.js.
      if (sql.includes('UPDATE activity_entries')) {
        const [steps, activeCalories, distanceKm, durationMinutes, exerciseType, userId, source, syncDayStr] = values;
        const row = tables.activityEntry.find(
          (r) => r.userId === userId && r.source === source && dayIso(r.syncDay) === syncDayStr,
        );
        if (row) {
          row.steps = maxNonNull(row.steps, steps);
          row.activeCalories = maxNonNull(row.activeCalories, activeCalories);
          row.distanceKm = maxNonNull(row.distanceKm, distanceKm);
          row.durationMinutes = maxNonNull(row.durationMinutes, durationMinutes);
          if (exerciseType != null) row.exerciseType = exerciseType;
          row.updatedAt = new Date();
          save();
          return 1;
        }
      }
      return 0;
    },
    async $transaction(operations) {
      if (typeof operations === 'function') {
        return operations(client);
      }
      return Promise.all(operations);
    },
  };

  for (const model of Object.keys(tables)) {
    client[model] = makeDelegate(model);
  }

  return client;
}

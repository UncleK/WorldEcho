export interface QuizPhoto {
  id: string; url: string; pageUrl: string; author: string | null; capturedAt: string | null;
  license: { text: string; url: string };
}
export interface QuizEntry {
  id: string; label: string; countryName: string; countryCode?: string; summary: string; currentUses: string[]; photos: QuizPhoto[];
}
export interface QuizSet { id: string; version: '1'; entries: QuizEntry[] }
export type QuizChoice = 'A' | 'B';
export interface QuizQuestion {
  id: string; target: QuizEntry; choices: [{ entry: QuizEntry; photo: QuizPhoto }, { entry: QuizEntry; photo: QuizPhoto }]; correct: QuizChoice;
}
export interface QuizAnswers { readonly [questionId: string]: QuizChoice }

export const QUIZ_LENGTH = 5;
export const validQuizSetId = (value: string) => /^[A-Za-z0-9][A-Za-z0-9_-]{0,79}$/.test(value);
export const validQuizSeed = (value: string) => value.length > 0 && value.length <= 96;
export const validOpponentScore = (value: unknown): value is number => typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= QUIZ_LENGTH;

const text = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0;
const webUrl = (value: unknown): value is string => typeof value === 'string' && /^https?:\/\//i.test(value);
const photoUrl = (value: unknown): value is string => typeof value === 'string' && (/^\/(?!\/)/.test(value) || webUrl(value));
const placeKey = (entry: QuizEntry) => `${entry.label.trim().normalize('NFKC').toLocaleLowerCase('en')}|${entry.countryName.trim().normalize('NFKC').toLocaleLowerCase('en')}`;

export function parseQuizSet(value: unknown, expectedId: string): QuizSet {
  if (!value || typeof value !== 'object') throw new Error('题组格式暂时无法识别');
  const candidate = value as Partial<QuizSet>;
  if (candidate.id !== expectedId || candidate.version !== '1' || !Array.isArray(candidate.entries)) throw new Error('这个挑战的题组版本暂时无法打开');
  const ids = new Set<string>();
  for (const entry of candidate.entries) {
    if (!entry || !text(entry.id) || ids.has(entry.id) || !text(entry.label) || !text(entry.countryName)
      || typeof entry.summary !== 'string' || !Array.isArray(entry.currentUses) || !entry.currentUses.every(text) || !Array.isArray(entry.photos)) throw new Error('题组资料不完整，请换一组挑战');
    if (entry.countryCode !== undefined && !/^[A-Z]{2}$/.test(entry.countryCode)) throw new Error('题组资料不完整，请换一组挑战');
    ids.add(entry.id);
    const photoIds = new Set<string>();
    for (const photo of entry.photos) {
      if (!photo || !text(photo.id) || photoIds.has(photo.id) || !photoUrl(photo.url) || !webUrl(photo.pageUrl)
        || !photo.license || !text(photo.license.text) || !webUrl(photo.license.url)
        || (photo.author !== null && typeof photo.author !== 'string')
        || (photo.capturedAt !== null && typeof photo.capturedAt !== 'string')) throw new Error('实景照片的资料不完整，请换一组挑战');
      photoIds.add(photo.id);
    }
  }
  return candidate as QuizSet;
}

function randomFromSeed(seed: string): () => number {
  let hash = 2166136261;
  for (let index = 0; index < seed.length; index += 1) hash = Math.imul(hash ^ seed.charCodeAt(index), 16777619) >>> 0;
  return () => {
    hash = (hash + 0x6d2b79f5) >>> 0;
    let value = Math.imul(hash ^ hash >>> 15, 1 | hash);
    value ^= value + Math.imul(value ^ value >>> 7, 61 | value);
    return ((value ^ value >>> 14) >>> 0) / 4294967296;
  };
}
function shuffle<T>(values: readonly T[], random: () => number): T[] {
  const result = [...values];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const other = Math.floor(random() * (index + 1));
    [result[index], result[other]] = [result[other], result[index]];
  }
  return result;
}

/** Version 1 algorithm: immutable sets + seed reproduce target, photos and A/B order. */
export function makeQuiz(set: QuizSet, seed: string): QuizQuestion[] {
  if (!validQuizSeed(seed)) throw new Error('挑战编号不完整，请开启新挑战');
  const random = randomFromSeed(`quiz-v1|${set.id}|${seed}`);
  const entries = [...set.entries].filter((entry) => entry.photos.length > 0).sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
  const targetPlaces = new Set<string>(), questions: QuizQuestion[] = [];
  for (const target of shuffle(entries, random)) {
    if (targetPlaces.has(placeKey(target))) continue;
    const targetPhotos = [...target.photos].sort((a, b) => a.id < b.id ? -1 : 1);
    const targetPhoto = targetPhotos[Math.floor(random() * targetPhotos.length)];
    const distractors = entries.filter((entry) => entry.id !== target.id && placeKey(entry) !== placeKey(target)
      && entry.photos.some((photo) => photo.url !== targetPhoto.url));
    if (!distractors.length) continue;
    const distractor = distractors[Math.floor(random() * distractors.length)];
    const photos = distractor.photos.filter((photo) => photo.url !== targetPhoto.url).sort((a, b) => a.id < b.id ? -1 : 1);
    const otherPhoto = photos[Math.floor(random() * photos.length)];
    const correct: QuizChoice = random() < 0.5 ? 'A' : 'B';
    const right = { entry: target, photo: targetPhoto }, wrong = { entry: distractor, photo: otherPhoto };
    questions.push({ id: `${set.id}:${seed}:${questions.length}:${target.id}`, target, correct, choices: correct === 'A' ? [right, wrong] : [wrong, right] });
    targetPlaces.add(placeKey(target));
    if (questions.length === QUIZ_LENGTH) return questions;
  }
  throw new Error('这组实景还不够组成 5 道不同地点的题，请换一组挑战');
}

/** First answer wins. Repeated taps, key repeats and stale handlers cannot change a result. */
export function answerQuestion(answers: QuizAnswers, questions: QuizQuestion[], id: string, choice: QuizChoice): QuizAnswers {
  if (Object.hasOwn(answers, id) || !questions.some((question) => question.id === id) || (choice !== 'A' && choice !== 'B')) return answers;
  return { ...answers, [id]: choice };
}
export function quizScore(answers: QuizAnswers, questions: QuizQuestion[]): number {
  return questions.reduce((score, question) => score + Number(answers[question.id] === question.correct), 0);
}
export function quizChallengeUrl(origin: string, setId: string, seed: string, score: number, language?: 'zh-CN' | 'en' | 'fr'): string {
  if (!validQuizSetId(setId) || !validQuizSeed(seed) || !validOpponentScore(score)) throw new Error('挑战链接参数不完整');
  const url = new URL('/', origin);
  if(language)url.searchParams.set('lang',language);
  url.searchParams.set('quiz', setId); url.searchParams.set('seed', seed); url.searchParams.set('vs', String(score));
  return url.toString();
}

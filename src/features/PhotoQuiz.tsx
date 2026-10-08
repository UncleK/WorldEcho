import { t, useLanguage, getLanguage } from '../i18n';
import { getEditorial } from '../i18n/editorial';
import { useEffect, useId, useMemo, useRef, useState, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import { ArrowRight, Check, Compass, Copy, ExternalLink, MapPin, RefreshCw, Sparkles, Trophy, X } from 'lucide-react';
import {
  answerQuestion, makeQuiz, parseQuizSet, quizChallengeUrl, quizScore, validOpponentScore, validQuizSeed, validQuizSetId,
  type QuizAnswers, type QuizChoice, type QuizQuestion, type QuizSet, type QuizEntry,
} from '../domain/quiz';
import { metricCopy } from '../domain/measurements.mjs';
import { parseRetiredQuizSets, isRetiredQuizSet } from '../../scripts/quiz-retirement.mjs';
import './photo-quiz.css';

export interface PhotoQuizProps {
  setId: string; seed: string; opponentScore?: number;
  onClose: () => void; onExplore: (id: string) => void; onNewGame: () => void; onToast?: (message: string) => void;
}

function useQuizFocus(dialog: RefObject<HTMLDivElement | null>, onClose: () => void) {
  const close = useRef(onClose); close.current = onClose;
  useEffect(() => {
    const panel = dialog.current;
    if (!panel) return;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const focusable = () => [...panel.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], input:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])')]
      .filter((element) => element.getClientRects().length > 0 && !element.closest('[inert]'));
    const focusFirst = () => (focusable()[0] ?? panel).focus();
    focusFirst();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); close.current(); return; }
      if (event.key !== 'Tab') return;
      const items = focusable(), first = items[0], last = items.at(-1);
      if (!first || !last) { event.preventDefault(); panel.focus(); return; }
      if (!panel.contains(document.activeElement) || document.activeElement === panel
        || (event.shiftKey && document.activeElement === first) || (!event.shiftKey && document.activeElement === last)) {
        event.preventDefault(); (event.shiftKey ? last : first).focus();
      }
    };
    const containFocus = (event: FocusEvent) => { if (!panel.contains(event.target as Node)) focusFirst(); };
    document.addEventListener('keydown', onKey, true);
    document.addEventListener('focusin', containFocus);
    return () => {
      document.removeEventListener('keydown', onKey, true);
      document.removeEventListener('focusin', containFocus);
      document.body.style.overflow = previousOverflow;
      requestAnimationFrame(() => { if (previous?.isConnected && !previous.closest('[inert]')) previous.focus(); });
    };
  }, [dialog]);
}

export default function PhotoQuiz(props: PhotoQuizProps) {
  const dialog = useRef<HTMLDivElement>(null);
  const titleId = useId();
  useQuizFocus(dialog, props.onClose);
  return createPortal(<div className="photo-quiz-backdrop" onPointerDown={(event) => { if (event.target === event.currentTarget) props.onClose(); }}>
    <div ref={dialog} className="photo-quiz-dialog" role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1}>
      <header className="photo-quiz-header">
        <div className="photo-quiz-brand"><span><Compass size={23} /></span><div><p>LOOK CLOSER · GO FURTHER</p><h2 id={titleId}>{t("看图，猜一座城")}</h2></div></div>
        <button type="button" className="photo-quiz-icon-button" onClick={props.onClose} aria-label={t("关闭看图挑战")}><X size={21} /></button>
      </header>
      <QuizLoader key={`${props.setId}|${props.seed}`} {...props} />
    </div>
  </div>, document.body);
}

function QuizUnavailable({ message, title, onNewGame, onClose }: { message: string; title?: string; onNewGame: () => void; onClose: () => void }) {
  return <div className="photo-quiz-empty" role="alert"><Compass size={42} /><h3>{title ?? t("这次旅行需要换一条路线")}</h3><p>{message}</p>
    <button type="button" className="photo-quiz-primary" onClick={onNewGame}><RefreshCw size={17} />{t("开启新挑战")}</button>
    <button type="button" className="photo-quiz-text-button" onClick={onClose}>{t("回到地球")}</button>
  </div>;
}

function QuizLoader(props: PhotoQuizProps) {
  const [set, setSet] = useState<QuizSet | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retired, setRetired] = useState(false);
  useEffect(() => {
    if (!validQuizSetId(props.setId) || !validQuizSeed(props.seed)) { setError(t("挑战链接不完整，可以从最新的实景题组重新开始。")); return; }
    const controller = new AbortController();
    fetch(`${import.meta.env.BASE_URL}quiz/retired-sets.json`, { signal: controller.signal, cache: 'no-store' })
      .then(async (response) => {
        if (!response.ok || !response.headers.get('content-type')?.includes('application/json')) throw new Error(t("题组暂时没能载入，请稍后重试或开启新挑战。"));
        const manifest = parseRetiredQuizSets(await response.json());
        if (isRetiredQuizSet(manifest, props.setId)) { setRetired(true); return null; }
        return fetch(`${import.meta.env.BASE_URL}quiz/sets/${encodeURIComponent(props.setId)}.json`, { signal: controller.signal });
      })
      .then(async (response) => {
        if (!response || controller.signal.aborted) return;
        if (!response.ok) throw new Error(response.status === 404 ? t("这份旧挑战暂时不在资料库里，试试最新题组。") : t("题组暂时没能载入，请稍后重试或开启新挑战。"));
        if (!response.headers.get('content-type')?.includes('application/json')) throw new Error(t("这份挑战的题组暂时无法找到，可以从最新题组重新开始。"));
        const data: unknown = await response.json();
        setSet(parseQuizSet(data, props.setId));
      })
      .catch((failure: unknown) => {
        if (controller.signal.aborted) return;
        setError(failure instanceof Error && /[\u4e00-\u9fff]/.test(failure.message) ? failure.message : t("网络暂时没有连接上题组，可以稍后再试。"));
      });
    return () => controller.abort();
  }, [props.setId, props.seed]);
  if (retired) return <QuizUnavailable title={t("题组已更新")} message={t("这份旧题组已归档，不能继续计分。你可以开启新挑战；原来的挑战编号和朋友成绩不会套用到新题组。")} onNewGame={props.onNewGame} onClose={props.onClose} />;
  if (error) return <QuizUnavailable message={error} onNewGame={props.onNewGame} onClose={props.onClose} />;
  if (!set) return <div className="photo-quiz-loading" role="status"><Compass size={38} /><p>{t("正在挑选旅途中的风景…")}</p></div>;
  return <QuizGame {...props} set={set} />;
}

function QuizGame(props: PhotoQuizProps & { set: QuizSet }) {
  const plan = useMemo(() => {
    try { return { questions: makeQuiz(props.set, props.seed), error: null }; }
    catch (failure) { return { questions: [], error: failure instanceof Error ? failure.message : t("暂时无法组成这场挑战") }; }
  }, [props.set, props.seed]);
  const [answers, setAnswers] = useState<QuizAnswers>({});
  const [index, setIndex] = useState(0);
  if (plan.error) return <QuizUnavailable message={plan.error} onNewGame={props.onNewGame} onClose={props.onClose} />;
  const score = quizScore(answers, plan.questions);
  if (index >= plan.questions.length) return <QuizResult {...props} score={score} questions={plan.questions} answers={answers} />;
  const question = plan.questions[index];
  return <QuestionRound key={question.id} question={question} index={index} total={plan.questions.length}
    answered={answers[question.id]} score={score} opponentScore={props.opponentScore}
    onAnswer={(choice) => setAnswers((previous) => answerQuestion(previous, plan.questions, question.id, choice))}
    onNext={() => { if (Object.hasOwn(answers, question.id)) setIndex((value) => value === index ? Math.min(plan.questions.length, value + 1) : value); }}
    onExplore={props.onExplore} onNewGame={props.onNewGame} />;
}

function displayQuestion(question:QuizQuestion):QuizQuestion {
  const lang=getLanguage();if(lang==='zh-CN')return question;
  const translations=getEditorial(lang).towers as Record<string,{label:string;summary:string;currentUses:string[]}>;
  const countries=new Intl.DisplayNames([lang],{type:'region'});
  const copy=(entry:QuizEntry):QuizEntry=>({...entry,label:translations[entry.id]?.label??entry.label,summary:translations[entry.id]?.summary??entry.summary,currentUses:translations[entry.id]?.currentUses??entry.currentUses,countryName:countries.of(entry.countryCode??entry.id.slice(0,2).toUpperCase())??entry.countryName});
  return {...question,target:copy(question.target),choices:question.choices.map(choice=>({...choice,entry:copy(choice.entry)})) as QuizQuestion['choices']};
}
function QuestionRound({ question: rawQuestion, index, total, answered, score, opponentScore, onAnswer, onNext, onExplore, onNewGame }: {
  question: QuizQuestion; index: number; total: number; answered?: QuizChoice; score: number; opponentScore?: number;
  onAnswer: (choice: QuizChoice) => void; onNext: () => void; onExplore: (id: string) => void; onNewGame: () => void;
}) {
  const lang=useLanguage(); const question=useMemo(()=>displayQuestion(rawQuestion),[rawQuestion,lang]);
  const [loaded, setLoaded] = useState<string[]>([]);
  const [failed, setFailed] = useState<string[]>([]);
  const [retry, setRetry] = useState(0);
  const heading = useRef<HTMLHeadingElement>(null);
  const reveal = useRef<HTMLDivElement>(null);
  useEffect(() => { heading.current?.focus(); heading.current?.scrollIntoView({ block: 'nearest' }); }, []);
  useEffect(() => { if (answered) reveal.current?.focus(); }, [answered]);
  const allLoaded = question.choices.every((choice) => loaded.includes(choice.photo.url));
  const correct = answered === question.correct;
  return <div className="photo-quiz-game">
    <div className="photo-quiz-progress" aria-label={t("第{0}题，共{1}题", index + 1, total)}>{Array.from({ length: total }, (_, step) => <span key={step} className={step < index ? 'is-complete' : step === index ? 'is-current' : ''} />)}</div>
    <div className="photo-quiz-question-top"><span>{t("第")}{index + 1} / {total}{t("站")}</span><span>{score}{t("题答对")}{validOpponentScore(opponentScore) ? t(" · 朋友的目标：{0}/{1}", opponentScore, total) : ''}</span></div>
    <h3 ref={heading} tabIndex={-1} className="photo-quiz-question"><span>{t("哪一张拍在")}</span>{question.target.label}<small>· {question.target.countryName}？</small></h3>
    <p className="photo-quiz-invitation">{t("看一眼建筑，再看看它身边的风景。")}</p>
    {failed.length > 0 && <div className="photo-quiz-image-error" role="alert"><p>{t("有一张实景暂时没能打开，等照片完整出现再猜。")}</p><button type="button" onClick={() => { setFailed([]); setLoaded([]); setRetry((value) => value + 1); }}>{t("重新加载图片")}</button><button type="button" onClick={onNewGame}>{t("换一组挑战")}</button></div>}
    <div className="photo-quiz-options">
      {question.choices.map(({ entry, photo }, optionIndex) => {
        const letter: QuizChoice = optionIndex === 0 ? 'A' : 'B';
        const isRight = letter === question.correct;
        const status = answered ? isRight ? 'is-right' : answered === letter ? 'is-wrong' : 'is-revealed' : '';
        return <article className={`photo-quiz-option ${status}`} key={letter}>
          <button type="button" className="photo-quiz-photo-button" onClick={() => onAnswer(letter)} disabled={!!answered || !allLoaded || failed.length > 0}
            aria-label={answered ? t("照片{0}：{1}，{2}{3}", letter, entry.label, entry.countryName, isRight ? t("，正确答案") : '') : t("选择照片{0}", letter)}>
            <span className="photo-quiz-letter">{letter}</span>
            <img key={`${photo.url}:${retry}`} src={photo.url} alt={answered ? t("{0}的建筑实景", entry.label) : t("候选照片{0}：建筑及其周围环境", letter)} decoding="async"
              onLoad={() => setLoaded((previous) => previous.includes(photo.url) ? previous : [...previous, photo.url])}
              onError={() => setFailed((previous) => previous.includes(photo.url) ? previous : [...previous, photo.url])} />
            {!loaded.includes(photo.url) && !failed.includes(photo.url) && <span className="photo-quiz-photo-loading">{t("实景载入中")}</span>}
            {answered && <span className={`photo-quiz-verdict ${isRight ? 'is-right' : ''}`}>{isRight ? <Check size={15} /> : <MapPin size={14} />}{isRight ? t("就是这里") : t("另一座城")}</span>}
          </button>
          <div className="photo-quiz-credit"><span>{t("摄影：")}{photo.author || t("作者未注明")}</span><a href={photo.license.url} target="_blank" rel="noreferrer">{photo.license.text}<ExternalLink size={10} /></a></div>
          {answered && <div className="photo-quiz-place"><h4>{entry.label}<small>{entry.countryName}</small></h4><p>{entry.summary ? metricCopy(entry.summary,getLanguage()) : t("这座建筑的更多故事还在收集中。")}</p>
            {entry.currentUses.length > 0 && <div className="photo-quiz-uses">{entry.currentUses.map((use) => <span key={use}>{use}</span>)}</div>}
            <div className="photo-quiz-place-actions"><a href={photo.pageUrl} target="_blank" rel="noreferrer">{t("原始照片与出处")}<ExternalLink size={12} /></a><button type="button" onClick={() => onExplore(entry.id)}>{t("去地球上看看")}<ArrowRight size={13} /></button></div>
          </div>}
        </article>;
      })}
    </div>
    <div className="photo-quiz-round-footer">
      {answered ? <><div ref={reveal} className={`photo-quiz-answer ${correct ? 'is-correct' : ''}`} tabIndex={-1} role="status"><strong>{correct ? t("认出来了！") : t("差一点，这次是另一张。")}</strong><span>{question.correct} · {question.target.label} · {question.target.countryName}</span></div>
        <button type="button" className="photo-quiz-primary" onClick={onNext}>{index + 1 === total ? t("看看我的成绩") : t("下一站")}<ArrowRight size={17} /></button></>
        : <p>{allLoaded ? t("选 A 或 B，揭晓它们各自的故事。") : t("正在加载两张实景照片…")}</p>}
    </div>
  </div>;
}

function QuizResult({ setId, seed, score, opponentScore, onNewGame, onClose, onExplore, onToast, questions, answers }: PhotoQuizProps & {
  score: number; questions: QuizQuestion[]; answers: QuizAnswers;
}) {
  const [copyLink, setCopyLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [copying, setCopying] = useState(false);
  const resultHeading = useRef<HTMLHeadingElement>(null);
  const fallbackInput = useRef<HTMLInputElement>(null);
  useEffect(() => { resultHeading.current?.focus(); resultHeading.current?.scrollIntoView({ block: 'nearest' }); }, []);
  useEffect(() => { if (copyLink) { fallbackInput.current?.focus(); fallbackInput.current?.select(); } }, [copyLink]);
  const title = score === 5 ? t("五座城，都被你认出来了。") : score >= 3 ? t("你的眼里，装着不少世界。") : t("还有很多地方，等你亲眼看看。");
  const share = async () => {
    if (copying) return;
    setCopying(true);
    const link = quizChallengeUrl(window.location.origin, setId, seed, score, getLanguage());
    try { await navigator.clipboard.writeText(link); setCopied(true); onToast?.(t("同一组 5 道题的挑战链接已复制")); }
    catch { setCopied(false); setCopyLink(link); }
    finally { setCopying(false); }
  };
  return <div className="photo-quiz-result">
    <div className="photo-quiz-result-icon"><Trophy size={34} /></div>
    <p className="photo-quiz-result-kicker">{t("五站旅程 · 已完成")}</p><div className="photo-quiz-score"><strong>{score}</strong><span>/ {questions.length}</span></div>
    <h3 ref={resultHeading} tabIndex={-1}>{title}</h3><p>{t("把这组实景发给朋友，看看谁更认得这些城市。")}</p>
    {validOpponentScore(opponentScore) && <div className="photo-quiz-opponent"><strong>{score > opponentScore ? t("这次你领先了") : score === opponentScore ? t("这次打成平手") : t("还差一点，再逛一圈")}</strong><span>{t("你")}{score}/{questions.length}{t("· 朋友分享的成绩")}{opponentScore}/{questions.length}</span><small>{t("同一组照片，也可以换个朋友来挑战。")}</small></div>}
    <div className="photo-quiz-result-actions"><button type="button" className="photo-quiz-primary" onClick={share} disabled={copying}>{copied ? <Check size={17} /> : <Copy size={17} />}{copied ? t("挑战链接已复制") : copying ? t("正在复制…") : t("邀请朋友来 PK")}</button><button type="button" className="photo-quiz-secondary" onClick={onNewGame}><RefreshCw size={16} />{t("再来 5 题")}</button></div>
    {copyLink && <div className="photo-quiz-copy-fallback"><label htmlFor="photo-quiz-share-link">{t("自动复制暂时不可用，可以直接复制下面的链接：")}</label><input ref={fallbackInput} id="photo-quiz-share-link" value={copyLink} readOnly onFocus={(event) => event.currentTarget.select()} /></div>}
    <div className="photo-quiz-passport"><h4><Sparkles size={15} />{t("这一路，你遇见了")}</h4>{questions.map(displayQuestion).map((question) => <button key={question.id} type="button" onClick={() => onExplore(question.target.id)}><span className={answers[question.id] === question.correct ? 'is-correct' : ''}>{answers[question.id] === question.correct ? <Check size={14} /> : <MapPin size={14} />}</span><strong>{question.target.label}</strong><small>{question.target.countryName}</small><ArrowRight size={14} /></button>)}</div>
    <button type="button" className="photo-quiz-text-button" onClick={onClose}>{t("回到地球，继续闲逛")}</button>
  </div>;
}

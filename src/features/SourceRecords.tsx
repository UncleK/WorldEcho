import { evidenceText } from "../i18n/evidence";
import { useEffect, useRef } from 'react';
import { ArrowUpRight, X } from 'lucide-react';
import { t } from '../i18n';
import type { Tower, AppCatalog } from '../domain/catalog';
import type { EarthStyle } from '../types';
import './detail-records.css';

export default function SourceRecords({ tower, earthStyle, geographicCredit, onClose }: {
  tower: Tower; earthStyle: EarthStyle; geographicCredit?: AppCatalog['geographicCredit']; onClose: () => void;
}) {
  const section = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!matchMedia('(min-width: 761px)').matches) return;
    const element = section.current;
    const panel = element?.closest<HTMLElement>('.detail-panel');
    if (element && panel) panel.scrollTo({ top: panel.scrollTop + element.getBoundingClientRect().top - panel.getBoundingClientRect().top - 16, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
  }, []);
  return <section ref={section} id="source-records" className="source-records source-scroll" aria-label={t('资料来源')}>
    <header><h3>{t('· 资料与依据')}</h3><button onClick={onClose} aria-label={t('关闭资料来源')}><X size={16}/></button></header>
    <p className="source-intro">{t('模型根据实景保留建筑特点。探索尺寸经过可读性调整，高度对照则按档案中的米数同比例显示。')}</p>
    <h3>{t('位置')}</h3><p>{tower.coordinates.lat.toLocaleString('en', { maximumFractionDigits: 6 })}, {tower.coordinates.lon.toLocaleString('en', { maximumFractionDigits: 6 })} · WGS84</p>
    {tower.status && <p>{t('记录现状：{0}', t(tower.status.value === 'existing' ? '现存' : tower.status.value === 'removed' ? '已移除' : tower.status.value === 'temporary' ? '临时设置' : '待核对'))}{tower.status.evidenceDate ? ` · ${tower.status.evidenceDate}` : ''}</p>}
    <p>{tower.coordinates.derived ? t('地图锚点由已命名塔体轮廓推导，是近似位置点，尚无测绘误差资料。') : t('位置是来源明确指向塔体的近似锚点，按名称与国家城市匹配；并非测绘结果。')}</p>
    <h3>{t('尺寸口径')}</h3><p className="source-precision">{tower.height?.scope === 'unknown' ? t('主页面的参考高度来自现有资料，测量端点或版本仍有待核对，不进入同口径高度比较。') : t('高度按资料给出的总高或结构高度展示；复制比例是建筑原型关系，并不保证与今天巴黎原塔的高度严格相除一致。')}</p>
    <h3>{t('事实来源')}</h3>{tower.sources.map((source) => <a className="source-link" key={source.id} href={source.url} target="_blank" rel="noreferrer"><span><strong>{source.title ?? source.publisher ?? t('原始资料')}</strong><small>{source.publisher ?? new URL(source.url).hostname}</small></span><ArrowUpRight size={15}/></a>)}
    <h3>{t('照片与归属')}</h3>{tower.photos.map((item) => <div className="photo-credit" key={item.id}><a href={item.originPageUrl ?? item.pageUrl} target="_blank" rel="noreferrer">{item.author ?? t('作者资料待核')}<ArrowUpRight size={12}/></a><p>{item.capturedAt ?? t('拍摄日期未确认')} · {item.license.url ? <a href={item.license.url} target="_blank" rel="noreferrer">{evidenceText(item.license.text)}</a> : <span>{t('许可待核')}</span>}</p><small>{evidenceText(item.modification)}</small></div>)}
    <h3>{t('地球底图')}</h3><a className="source-link" href={earthStyle === 'satellite' ? geographicCredit?.url : 'https://www.naturalearthdata.com/downloads/50m-physical-vectors/50m-land/'} target="_blank" rel="noreferrer">{earthStyle === 'satellite' ? geographicCredit?.name : t('Natural Earth · 1:50m 海陆轮廓')}<ArrowUpRight size={15}/></a>
    <p className="source-intro">{earthStyle === 'satellite' ? t('地表采用NASA Blue Marble 2004历史影像。') : t('海陆为独立三维几何，细纹和起伏为微缩造型设计。')}{t('夜色为艺术光照预设，不表示实时日照或城市灯光。')}</p>
    <a className="source-link" href="https://www.solarsystemscope.com/textures/" target="_blank" rel="noreferrer">Solar System Scope · CC BY 4.0<ArrowUpRight size={15}/></a><p className="source-intro">{t('夜灯、云与地表凹凸来自历史纹理，经缩放与格式转换；起伏为展示浮雕，风与水波为艺术动画，不表示实时天气或测量海拔。')}</p><a href="/earth-rendering-notices.txt" target="_blank" rel="noreferrer">{t('渲染与素材署名')}</a>
  </section>;
}

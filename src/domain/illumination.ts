import { t } from '../i18n/messages';
import { getLanguage } from '../i18n/messages';

export function illuminationLabel(scheme: { id: string; localDesign?: { title: { 'zh-CN': string; en: string; fr: string }; cue: string }; referenceCity?: string }) {
  if (scheme.localDesign) return getLanguage() === 'zh-CN'
    ? `艺术夜景 · ${scheme.localDesign.title['zh-CN']}：${scheme.localDesign.cue}。`
    : t('艺术夜景 · {0}，根据当地风貌创作。', scheme.localDesign.title[getLanguage()]);
  if (scheme.referenceCity) return t('配色参考该塔实景照片；柔和呼吸为艺术编排，未确认现场动态节目。');
  if (scheme.id === 'paris-golden') return t('金黄常亮与白色闪烁参考巴黎官方夜景；节奏为加速演示。');
  if (scheme.id === 'macao-blue-violet') return t('蓝紫基准与上行彩光参考澳门灯光秀；渐变节奏为演示编排。');
  if (scheme.id === 'vegas-color-wash') return t('流动彩光与白色闪烁参考 Vegas 灯光系统；节目为演示编排。');
  if (scheme.id === 'tianducheng-multicolor-2016') return t('按天都城2016年记录的五色渐变演示，未确认当前节目。');
  if (scheme.id === 'mini-siam-amber-2010') return t('琥珀金光色参考 Mini Siam 2010年夜景照片。');
  if (scheme.id === 'dagbreek-warm-photo-unknown-date') return t('暖金光色参考 Dagbreek 夜景照片，拍摄日期未确认。');
  if (scheme.id === 'texas-seasonal-led') return t('参考德州巴黎塔的节庆换色灯光；连续渐变为艺术编排。');
  if (scheme.id === 'tianducheng-copper-moonlight') return t('铜色塔身与月光的艺术夜景，现场灯光尚待核对。');
  return t('保留塔身颜色的艺术月光展示，现场灯光尚待核对。');
}

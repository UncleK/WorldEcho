import type { ModelView } from '../types';
import { t } from '../i18n';
import './model-view-buttons.css';
export default function ModelViewButtons({value,onChange}:{value:ModelView;onChange:(view:ModelView)=>void}){
  return <div className="model-view-buttons" role="group" aria-label={t('模型视角')}>{([{id:'axonometric',label:'3D',title:'轴测视角'},{id:'front',label:'正面',title:'正视图'},{id:'side',label:'侧面',title:'侧视图'}] as const).map(view=><button key={view.id} title={t(view.title)} aria-label={t(view.title)} aria-pressed={value===view.id} onClick={()=>onChange(view.id)}>{t(view.label)}</button>)}</div>;
}

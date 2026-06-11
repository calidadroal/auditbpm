import React from 'react';
import { Camera, HelpCircle } from 'lucide-react';
import StandardBadge from '../common/StandardBadge';

interface QuestionItemProps {
  item: {
    id: string;
    text: string;
    description: string;
    standard: string;
    category: string;
    critical: boolean;
  };
  index: number;
  answer: {
    status: string;
    comment: string;
    photo: string | null;
  };
  onStatusChange: (id: string, status: 'C' | 'CP' | 'NC' | 'NA') => void;
  onCommentChange: (id: string, comment: string) => void;
  onPhotoSelect: (id: string, e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemovePhoto: (id: string) => void;
}

const QuestionItem: React.FC<QuestionItemProps> = ({
  item, index, answer, onStatusChange, onCommentChange, onPhotoSelect, onRemovePhoto
}) => {
  const [showInfo, setShowInfo] = React.useState(false);

  return (
    <div className={`p-4 rounded-xl border bg-white ${answer?.status === 'NC' ? 'border-red-300' : answer?.status === 'CP' ? 'border-amber-300' : 'border-slate-200'}`}>
      <div className="flex justify-between items-start text-xs mb-1.5">
        <div className="flex items-center space-x-2">
          <span className="bg-slate-100 text-[10px] py-0.5 px-2 rounded font-extrabold text-slate-500">#{index + 1}</span>
          <StandardBadge name={item.standard} />
          {item.critical && (
            <span className="bg-red-600 text-white text-[9px] font-black px-1.5 py-0.2 rounded animate-pulse">PCC CRÍTICO</span>
          )}
        </div>
        <button onClick={() => setShowInfo(!showInfo)} className="text-[11px] text-slate-400 font-semibold flex items-center gap-1">
          <HelpCircle className="w-3.5 h-3.5" />
          Guía
        </button>
      </div>

      <h4 className="text-xs md:text-sm font-bold text-slate-900 mb-2.5">{item.text}</h4>

      {showInfo && (
        <div className="bg-blue-50 p-3 rounded text-[11px] text-blue-900 border border-blue-100 mb-3">
          {item.description}
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-1.5 mb-3.5">
        {[
          { status: 'C', label: 'Cumple', activeClass: 'bg-green-600 text-white border-transparent' },
          { status: 'CP', label: 'Parcial', activeClass: 'bg-amber-500 text-white border-transparent' },
          { status: 'NC', label: 'No Cumple', activeClass: 'bg-red-600 text-white border-transparent' },
          { status: 'NA', label: 'No Aplica', activeClass: 'bg-slate-800 text-white border-transparent' }
        ].map(st => (
          <button
            key={st.status}
            type="button"
            onClick={() => onStatusChange(item.id, st.status as any)}
            className={`py-2 text-xs rounded border font-bold transition-all ${
              answer?.status === st.status
                ? st.activeClass
                : 'bg-white text-slate-500 hover:bg-slate-50 border-slate-200'
            }`}
          >
            {st.label}
          </button>
        ))}
      </div>

      <div className="space-y-2 text-xs">
        <input
          type="text"
          value={answer?.comment || ''}
          onChange={(e) => onCommentChange(item.id, e.target.value)}
          placeholder="Evidencias y notas (obligatorio si es NC/CP)..."
          className="w-full rounded border border-slate-200 p-2 text-xs"
        />

        <div className="flex items-center space-x-3">
          <label className="bg-slate-100 border rounded py-1.5 px-3 flex items-center space-x-1.5 font-bold cursor-pointer text-slate-700 text-xs">
            <Camera className="w-4 h-4 text-slate-500" />
            <span>Foto evidencia</span>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={(e) => onPhotoSelect(item.id, e)}
              className="hidden"
            />
          </label>
          {answer?.photo && (
            <div className="relative">
              <img src={answer.photo} alt="Evidencia" className="w-14 h-10 object-cover rounded border" />
              <button
                onClick={() => onRemovePhoto(item.id)}
                className="absolute -top-1.5 -right-1.5 bg-red-600 text-white rounded-full w-4 h-4 flex items-center justify-center text-[9px] font-bold"
              >
                ✕
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default QuestionItem;
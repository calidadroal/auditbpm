import React from 'react';
import { getStandardColor } from '../../utils/calculations';

interface Props {
  name: string;
}

const StandardBadge: React.FC<Props> = ({ name }) => {
  const cls = getStandardColor(name);
  return (
    <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${cls}`}>
      {name}
    </span>
  );
};

export default StandardBadge;
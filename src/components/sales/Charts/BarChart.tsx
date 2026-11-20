import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { formatRand, formatRandWhole } from '@/lib/currency';
import { axisStyle, useChartColors } from './chartTheme';

interface BarChartProps {
  data: Array<{
    name: string;
    value: number;
  }>;
}

export const BarChart: React.FC<BarChartProps> = ({ data }) => {
  const [primary] = useChartColors();
  return (
    <ResponsiveContainer width="100%" height={300}>
      <RechartsBarChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke="#EEEEF0" />
        <XAxis dataKey="name" tick={axisStyle} axisLine={false} tickLine={false} />
        <YAxis
          tick={axisStyle}
          axisLine={false}
          tickLine={false}
          width={80}
          tickFormatter={(v: number) => formatRandWhole(v)}
        />
        <Tooltip
          cursor={{ fill: 'rgba(0,0,0,0.04)' }}
          formatter={(v: number) => [formatRand(v), 'Revenue']}
          contentStyle={{ borderRadius: 10, border: '1px solid #E4E4E7', boxShadow: '0 4px 16px rgba(0,0,0,0.06)' }}
        />
        <Bar dataKey="value" fill={primary} radius={[6, 6, 0, 0]} maxBarSize={48} />
      </RechartsBarChart>
    </ResponsiveContainer>
  );
};

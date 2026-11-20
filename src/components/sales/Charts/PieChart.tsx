import { PieChart as RechartsPieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { formatRand } from '@/lib/currency';
import { useChartColors } from './chartTheme';

interface PieChartProps {
  data: Array<{
    name: string;
    value: number;
  }>;
}

export const PieChart: React.FC<PieChartProps> = ({ data }) => {
  const colors = useChartColors();
  return (
    <ResponsiveContainer width="100%" height={300}>
      <RechartsPieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={62}
          outerRadius={96}
          paddingAngle={data.filter((d) => d.value > 0).length > 1 ? 2 : 0}
          stroke="none"
          dataKey="value"
        >
          {data.map((_, index) => (
            <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
          ))}
        </Pie>
        <Tooltip
          formatter={(v: number, name: string) => [formatRand(v), name]}
          contentStyle={{ borderRadius: 10, border: '1px solid #E4E4E7', boxShadow: '0 4px 16px rgba(0,0,0,0.06)' }}
        />
        <Legend iconType="circle" wrapperStyle={{ fontSize: 13 }} />
      </RechartsPieChart>
    </ResponsiveContainer>
  );
};

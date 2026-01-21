'use client';

import { Line, LineChart, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock } from 'lucide-react';

interface RetardData {
  date: string;
  retards: number;
  moyenneRetard: number;
}

interface RetardChartProps {
  data: RetardData[];
  title?: string;
  description?: string;
}

export function RetardChart({ data, title = "Retards du mois", description = "Nombre de retards et temps moyen par jour" }: RetardChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis 
              dataKey="date" 
              tick={{ fontSize: 12 }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis 
              tick={{ fontSize: 12 }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              content={({ active, payload, label }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload as RetardData;
                  return (
                    <div className="rounded-lg border bg-background p-2 shadow-sm">
                      <div className="space-y-1">
                        <div className="text-sm font-medium">{label}</div>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="flex flex-col">
                            <span className="text-[0.70rem] uppercase text-muted-foreground">Retards</span>
                            <span className="font-bold text-orange-600">{data.retards}</span>
                          </div>
                          <div className="flex flex-col">
                            <span className="text-[0.70rem] uppercase text-muted-foreground">Moyenne</span>
                            <span className="font-bold text-blue-600">{data.moyenneRetard} min</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Line 
              type="monotone" 
              dataKey="retards" 
              stroke="hsl(25, 95%, 53%)"
              strokeWidth={2}
              dot={{ 
                fill: "hsl(25, 95%, 53%)",
                r: 4,
                strokeWidth: 2,
              }}
              activeDot={{
                r: 6,
                style: { fill: "hsl(25, 95%, 53%)" },
              }}
            />
            <Line 
              type="monotone" 
              dataKey="moyenneRetard" 
              stroke="hsl(221, 83%, 53%)"
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={{ 
                fill: "hsl(221, 83%, 53%)",
                r: 3,
              }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

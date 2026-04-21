// AttackDailyBarChart.tsx
import React, { useEffect, useState } from 'react';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface AttackDailyProps {
  honeypotId: string;
  days?: number;
}

const AttackDailyBarChart: React.FC<AttackDailyProps> = ({ 
  honeypotId, 
  days = 7 
}) => {
  const [attackData, setAttackData] = useState<{ [date: string]: number }>({});
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchAttackData = async () => {
      try {
        const response = await fetch(`/honeypots/${honeypotId}/attacks?limit=1000`);
        const data = await response.json();
        
        // Group attacks by day
        const attacksByDay: { [day: string]: number } = {};
        
        // Create last X days
        const today = new Date();
        for (let i = 0; i < days; i++) {
          const date = new Date();
          date.setDate(today.getDate() - i);
          const dayKey = date.toLocaleDateString();
          attacksByDay[dayKey] = 0;
        }
        
        data.attacks.forEach((attack: any) => {
          const date = new Date(attack.timestamp);
          const dayKey = date.toLocaleDateString();
          
          if (attacksByDay[dayKey] !== undefined) {
            attacksByDay[dayKey]++;
          }
        });
        
        setAttackData(attacksByDay);
        setIsLoading(false);
      } catch (error) {
        console.error("Failed to fetch attack data:", error);
        setIsLoading(false);
      }
    };

    fetchAttackData();
  }, [honeypotId, days]);

  // Sort by date (most recent last)
  const sortedLabels = Object.keys(attackData).sort((a, b) => {
    return new Date(a).getTime() - new Date(b).getTime();
  });
  const counts = sortedLabels.map(label => attackData[label]);
  
  const chartData = {
    labels: sortedLabels,
    datasets: [
      {
        label: 'Attacks',
        data: counts,
        backgroundColor: 'rgba(54, 162, 235, 0.5)',
        borderColor: 'rgb(54, 162, 235)',
        borderWidth: 1
      }
    ]
  };
  
  const options = {
    responsive: true,
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'Number of Attacks'
        },
        ticks: {
          precision: 0
        }
      },
      x: {
        title: {
          display: true,
          text: 'Date'
        }
      }
    },
    plugins: {
      title: {
        display: true,
        text: `Daily Attack Summary (Last ${days} days)`,
        font: {
          size: 16
        }
      }
    }
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow">
      <h3 className="text-lg font-semibold mb-4">Daily Attack Summary</h3>
      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        <div className="h-64">
          <Bar data={chartData} options={options} />
        </div>
      )}
    </div>
  );
};

export default AttackDailyBarChart;
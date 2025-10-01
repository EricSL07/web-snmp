// app/dashboard/ChartComponent.tsx
"use client";
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

const options = {
  responsive: true,
  plugins: {
    legend: {
      display: false, // Esconde as legendas das linhas
    },
  },
  scales: {
    y: {
      beginAtZero: true,
    },
  },
};

const labels = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

// Dados de exemplo
const data = {
  labels,
  datasets: [
    {
      label: 'Dataset 1',
      data: labels.map(() => Math.random() * 8000),
      borderColor: 'rgb(53, 162, 235)',
      backgroundColor: 'rgba(53, 162, 235, 0.5)',
    },
    {
      label: 'Dataset 2',
      data: labels.map(() => Math.random() * 8000),
      borderColor: 'rgb(75, 192, 192)',
      backgroundColor: 'rgba(75, 192, 192, 0.5)',
    },
     {
      label: 'Dataset 3',
      data: labels.map(() => Math.random() * 8000),
      borderColor: 'rgb(255, 159, 64)',
      backgroundColor: 'rgba(255, 159, 64, 0.5)',
    },
  ],
};

export function ChartComponent() {
  return <Line options={options} data={data} />;
}
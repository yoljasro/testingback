import React from "react";
import { Box, Text } from "@adminjs/design-system";
import { Chart } from "react-chartjs-2";
import { CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from "chart.js";

Chart.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const InterpretationChart = (props) => {
  const { record } = props;
  if (!record?.params?.calculatedScores) {
    return <Text>❌ Данные отсутствуют</Text>;
  }

  const { tensiya, rezistensiya, charchash } = record.params.calculatedScores;

  const data = {
    labels: ["Эмоциональное выгорание", "Деперсонализация", "Снижение достижений"],
    datasets: [
      {
        label: "Баллы",
        data: [tensiya, rezistensiya, charchash],
        backgroundColor: ["#FF5733", "#33CFFF", "#33FF57"],
      },
    ],
  };

  return (
    <Box>
      <Text fontSize={20} fontWeight="bold" mb={3}>📊 Результаты теста</Text>
      <Chart type="bar" data={data} />
    </Box>
  );
};

export default InterpretationChart;

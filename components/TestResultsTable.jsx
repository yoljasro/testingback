import React from "react";
import { Box, Table, TableRow, TableCell, TableHead, TableBody, Text } from "@adminjs/design-system";

const TestResultsTable = ({ record }) => {
  const results = record?.params?.testResults;
  if (!results || !Array.isArray(results) || results.length === 0) {
    return <Text>❌ Результаты теста отсутствуют</Text>;
  }

  return (
    <Box>
      <Text fontSize={20} fontWeight="bold" mb={3}>📊 Результаты теста</Text>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell><b>№</b></TableCell>
            <TableCell><b>Вопрос</b></TableCell>
            <TableCell><b>Ответ</b></TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {results.map((r, i) => (
            <TableRow key={i}>
              <TableCell>{i + 1}</TableCell>
              <TableCell>{r.questionText || 'Вопрос отсутствует'}</TableCell>
              <TableCell>{r.answer || 'Ответ отсутствует'}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Box>
  );
};

export default TestResultsTable;

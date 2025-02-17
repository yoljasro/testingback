import React from "react";
import { Box } from "@adminjs/design-system";

const JsonTest = ({ record }) => {
  const testResults = record?.params?.testResults;

  if (!testResults) {
    return <Box textAlign="center">Test natijalari mavjud emas</Box>;
  }

  return (
    <Box
      style={{
        backgroundColor: "#f8f9fa",
        padding: "10px",
        borderRadius: "5px",
        fontFamily: "monospace",
      }}
    >
      <pre>{JSON.stringify(testResults, null, 2)}</pre>
    </Box>
  );
};

export default JsonTest;

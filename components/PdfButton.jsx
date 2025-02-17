import React from "react";
import { Box, Button } from "@adminjs/design-system";

const PdfButton = ({ record }) => {
  const filePath = record?.params?.testResults;

  if (!filePath) {
    return <Box textAlign="center">PDF fayl mavjud emas</Box>;
  }

  return (
    <Box textAlign="center">
      <Button
        as="a"
        href={`/uploads/testResults/${filePath}`}
        target="_blank"
        variant="primary"
        style={{ textDecoration: "none" }}
      >
        📄 PDF-ni ochish
      </Button>
    </Box>
  );
};

export default PdfButton;

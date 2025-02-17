import React, { useState } from "react";
import { Box, Button, Modal } from "@adminjs/design-system";

const ModalTestResults = ({ record }) => {
  const [isOpen, setIsOpen] = useState(false);
  const testResults = record?.params?.testResults;

  if (!testResults) {
    return <Box textAlign="center">Test natijalari mavjud emas</Box>;
  }

  return (
    <Box textAlign="center">
      <Button variant="primary" onClick={() => setIsOpen(true)}>
        📊 Test natijalarini ko‘rish
      </Button>

      {isOpen && (
        <Modal title="Test natijalari" onClose={() => setIsOpen(false)}>
          <Box p="20px">
            <pre>{JSON.stringify(testResults, null, 2)}</pre>
          </Box>
        </Modal>
      )}
    </Box>
  );
};

export default ModalTestResults;

import React from "react";

const LinkTestResults = (props) => {
  const filePath = props?.record?.params?.testResults;

  if (!filePath) {
    return <span>Test natijalari mavjud emas</span>;
  }

  return (
    <a
      href={filePath}
      target="_blank"
      rel="noopener noreferrer"
      style={{ color: "#007bff", textDecoration: "underline", cursor: "pointer" }}
    >
      📄 Test natijalarini ochish
    </a>
  );
};

export default LinkTestResults;

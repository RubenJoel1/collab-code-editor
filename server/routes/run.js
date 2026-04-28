const express = require("express");
const router = express.Router();

// Monaco language ID → Wandbox compiler name
const COMPILERS = {
  javascript: { compiler: "nodejs-20.17.0" },
  typescript: { compiler: "typescript-5.6.2" },
  python:     { compiler: "cpython-3.12.7" },
  cpp:        { compiler: "gcc-13.2.0", options: "warning,gnu++17" },
  go:         { compiler: "go-1.23.2" },
  rust:       { compiler: "rust-1.82.0" },
  ruby:       { compiler: "ruby-3.4.1" },
  php:        { compiler: "php-8.3.12" },
  csharp:     { compiler: "dotnetcore-8.0.402" },
  java:       { compiler: "openjdk-jdk-22+36" },
  shell:      { compiler: "bash" },
};

router.post("/", async (req, res) => {
  const { language, code } = req.body;

  const config = COMPILERS[language];
  if (!config) {
    return res.status(400).json({
      error: `Execution not supported for language: ${language}`,
    });
  }

  try {
    const response = await fetch("https://wandbox.org/api/compile.json", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, ...config }),
    });

    if (!response.ok) {
      const text = await response.text();
      return res.status(502).json({ error: `Wandbox error: ${text}` });
    }

    const data = await response.json();

    res.json({
      stdout: data.program_output ?? "",
      stderr: (data.program_error ?? "") + (data.compiler_error ?? ""),
      exitCode: parseInt(data.status ?? "0", 10),
    });
  } catch (err) {
    res.status(502).json({ error: `Failed to reach execution service: ${err.message}` });
  }
});

module.exports = router;

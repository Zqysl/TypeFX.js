import { exec } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import express from 'express';

const projectRoot = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const port = Number(process.env.PORT ?? '3000');
const app = express();

app.use(express.static(projectRoot));

app.get('/', (_req, res) => {
  res.redirect('/test/tests.html');
});

app.listen(port, () => {
  const url = `http://localhost:${port}/`;
  const openCommand = process.platform === 'darwin'
    ? 'open'
    : process.platform === 'win32'
      ? 'start'
      : 'xdg-open';

  console.log(`Server running at ${url}`);
  exec(`${openCommand} ${url}`);
});

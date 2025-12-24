import express from 'express';
import path from 'path';
import { exec } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;
const ROOT = path.join(__dirname, '..');

// Serve static files from the root directory
app.use(express.static(ROOT));

// Specific route for the root to redirect to tests
app.get('/', (req, res) => {
    res.redirect('/test/tests.html');
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}/`);
    const url = `http://localhost:${PORT}/test/tests.html`;
    const start = (process.platform == 'darwin'? 'open': process.platform == 'win32'? 'start': 'xdg-open');
    exec(`${start} ${url}`);
});

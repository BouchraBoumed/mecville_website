import dotenv from 'dotenv';
import { createApp } from './app.js';

dotenv.config();

const app = createApp();
const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`Mecville backend running on http://localhost:${PORT}`);
  console.log(`CORS origin: ${process.env.CORS_ORIGIN || 'http://localhost:5173'}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

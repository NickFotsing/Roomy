import app from './app.js';
import config from './config/config.js';

const PORT = config.port;

app.listen(PORT, () => {
  console.log(`Server running in ${config.nodeEnv} mode on port ${PORT}`);
  console.log(`Openfort configuration: ${config.openfort.secretKey ? 'REAL API' : 'MOCK MODE'}`);
  if (config.openfort.secretKey) {
    console.log(`Openfort Chain ID: ${process.env.OPENFORT_CHAIN_ID}`);
  }
});
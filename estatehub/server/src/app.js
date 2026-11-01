const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');
const env = require('./config/env');
const routes = require('./routes');
const { notFound, errorHandler } = require('./middleware/errorHandler');

const app = express();

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(
  cors({
    origin: env.clientUrl, // only our React app may call the API
    credentials: true, // allow the HTTP-only auth cookie
  })
);
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());

// Uploaded property photos (development: local disk)
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

app.use('/api', routes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;

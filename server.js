require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const instagramController = require('./controllers/instagram.controller');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());

// Routes
app.get('/', (req, res) => {
    res.json({
        message: 'Welcome to Instagram Scraper Pro API',
        endpoints: {
            profile: '/v1/profile/:username',
            posts: '/v1/posts/:username'
        }
    });
});

app.get('/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// V1 API
const v1Router = express.Router();
v1Router.get('/profile/:username', instagramController.getProfile);
v1Router.get('/posts/:username', instagramController.getPosts);

app.use('/v1', v1Router);

// Global Error Handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ status: 'error', message: 'Something went wrong on our end.' });
});

app.listen(PORT, () => {
    console.log(`Instagram Scraper Pro is running on port ${PORT}`);
});

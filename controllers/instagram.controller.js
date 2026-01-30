const scraperService = require('../services/scraper.service');

exports.getProfile = async (req, res) => {
    try {
        const { username } = req.params;
        if (!username) {
            return res.status(400).json({ status: 'fail', message: 'Username is required' });
        }

        const profile = await scraperService.getProfile(username);
        res.status(200).json({ status: 'success', data: profile });
    } catch (error) {
        console.error('Instagram Scrape Error:', error);
        res.status(500).json({ status: 'error', message: 'Failed to fetch Instagram profile. Platform may be rate-limiting.' });
    }
};

exports.getPosts = async (req, res) => {
    try {
        const { username } = req.params;
        const posts = await scraperService.getRecentPosts(username);
        res.status(200).json({ status: 'success', data: posts });
    } catch (error) {
        res.status(500).json({ status: 'error', message: error.message });
    }
};

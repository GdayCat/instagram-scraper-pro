// selectors.js - Centralized Instagram selectors for easy maintenance
module.exports = {
    profile: {
        username: 'header section h2',
        bio: 'header section span._ap33',
        followers: 'header ul li:nth-child(2) span[title]',
        following: 'header ul li:nth-child(3) span',
        posts_count: 'header ul li:nth-child(1) span',
        avatar: 'header img'
    },
    post: {
        container: 'article div._ac7p',
        links: 'article a[href*="/p/"]'
    }
};

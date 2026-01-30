const { chromium } = require('playwright-extra');
const stealth = require('puppeteer-extra-plugin-stealth')();
const selectors = require('./selectors');

chromium.use(stealth);

class InstagramService {
    async getProfile(username) {
        const browser = await chromium.launch({ headless: true });
        const context = await browser.newContext({
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        });
        const page = await context.newPage();

        try {
            await page.goto(`https://www.instagram.com/${username}/`, { waitUntil: 'networkidle' });

            // Check if we hit a login wall or block
            const isLoginWall = await page.isVisible('form#loginForm');
            if (isLoginWall) {
                await browser.close();
                throw new Error('Hit Instagram login wall. Proxy or authenticated session required.');
            }

            // Wait for profile header content
            await page.waitForSelector('header section', { timeout: 10000 }).catch(() => { });

            const profileData = await page.evaluate((sel, user) => {
                const getTxt = (s) => document.querySelector(s)?.innerText || '';

                // Final fallback: if username selector fails, try to find any H2
                let foundUser = getTxt(sel.profile.username);
                if (!foundUser) foundUser = document.querySelector('h2')?.innerText || user;

                return {
                    username: foundUser,
                    bio: getTxt(sel.profile.bio),
                    followers: document.querySelector(sel.profile.followers)?.getAttribute('title') || getTxt(sel.profile.followers),
                    following: getTxt(sel.profile.following),
                    posts_count: getTxt(sel.profile.posts_count),
                    avatar: document.querySelector(sel.profile.avatar)?.src
                };
            }, selectors, username);

            await browser.close();
            return profileData;
        } catch (error) {
            await browser.close();
            throw error;
        }
    }

    async getRecentPosts(username) {
        const browser = await chromium.launch({ headless: true });
        const page = await browser.newPage();

        try {
            await page.goto(`https://www.instagram.com/${username}/`, { waitUntil: 'networkidle' });

            // Extract post links
            const posts = await page.evaluate((sel) => {
                const links = Array.from(document.querySelectorAll(sel.post.links));
                return links.slice(0, 12).map(link => ({
                    url: link.href,
                    shortcode: link.href.split('/p/')[1]?.replace('/', '')
                }));
            }, selectors);

            await browser.close();
            return posts;
        } catch (error) {
            await browser.close();
            throw error;
        }
    }
}

module.exports = new InstagramService();

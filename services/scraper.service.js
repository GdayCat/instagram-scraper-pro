const { chromium } = require('playwright-extra');
const stealth = require('puppeteer-extra-plugin-stealth')();
const selectors = require('./selectors');

chromium.use(stealth);

const USER_AGENTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/121.0',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1'
];

class InstagramService {
    async delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async getRandomUserAgent() {
        return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
    }

    async humanLikeActions(page) {
        // Random scroll
        await page.mouse.wheel(0, Math.floor(Math.random() * 500) + 200);
        await this.delay(Math.floor(Math.random() * 1000) + 500);
        await page.mouse.wheel(0, -Math.floor(Math.random() * 200));
    }

    async retryWithBackoff(fn, maxRetries = 3, initialDelay = 5000) {
        let lastError;
        for (let i = 0; i < maxRetries; i++) {
            try {
                return await fn();
            } catch (error) {
                lastError = error;
                if (error.message.includes('login wall')) throw error; // Don't retry on login wall

                const waitTime = initialDelay * Math.pow(2, i);
                console.log(`Retry ${i + 1}/${maxRetries} after ${waitTime}ms due to: ${error.message}`);
                await this.delay(waitTime);
            }
        }
        throw lastError;
    }

    async getProfile(username) {
        return this.retryWithBackoff(async () => {
            const browser = await chromium.launch({ headless: true });
            const context = await browser.newContext({
                userAgent: await this.getRandomUserAgent(),
                viewport: { width: 1280, height: 720 }
            });
            const page = await context.newPage();

            try {
                await page.goto(`https://www.instagram.com/${username}/`, { waitUntil: 'networkidle' });

                // Check for block or login wall
                const isLoginWall = await page.isVisible('form#loginForm');
                if (isLoginWall) {
                    throw new Error('Hit Instagram login wall. Proxy or authenticated session required.');
                }

                await this.humanLikeActions(page);
                await page.waitForSelector('header section', { timeout: 15000 }).catch(() => { });

                const profileData = await page.evaluate((sel, user) => {
                    const getTxt = (s) => document.querySelector(s)?.innerText || '';
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

                if (!profileData.username || profileData.username === username && !profileData.followers) {
                    throw new Error('Data extraction failed or returned empty. Possible soft block.');
                }

                await browser.close();
                return profileData;
            } catch (error) {
                await browser.close();
                throw error;
            }
        });
    }

    async getRecentPosts(username) {
        return this.retryWithBackoff(async () => {
            const browser = await chromium.launch({ headless: true });
            const context = await browser.newContext({ userAgent: await this.getRandomUserAgent() });
            const page = await context.newPage();

            try {
                await page.goto(`https://www.instagram.com/${username}/`, { waitUntil: 'networkidle' });
                await this.humanLikeActions(page);

                const posts = await page.evaluate((sel) => {
                    const links = Array.from(document.querySelectorAll(sel.post.links));
                    return links.slice(0, 12).map(link => ({
                        url: link.href,
                        shortcode: link.href.split('/p/')[1]?.replace('/', '')
                    }));
                }, selectors);

                if (posts.length === 0) {
                    throw new Error('No posts found. Possible rate limit or private profile.');
                }

                await browser.close();
                return posts;
            } catch (error) {
                await browser.close();
                throw error;
            }
        });
    }
}

module.exports = new InstagramService();

/**
 * BetExplorer Scraping Test v2
 * With Opening/Closing odds extraction
 * Run: node backend/test/testBetExplorer.js
 */

const puppeteer = require('puppeteer');
const path = require('path');

// Example match URL - provided by user
const TEST_URL = 'https://www.betexplorer.com/football/algeria/ligue-1/cr-belouizdad-es-setif/S2GzkIbs/';

async function testBetExplorerScraping() {
    console.log('🔄 Starting BetExplorer scraping test v2...');
    console.log('📍 URL:', TEST_URL);

    let browser;
    try {
        // Launch browser
        browser = await puppeteer.launch({
            headless: 'new',
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu'
            ]
        });

        const page = await browser.newPage();

        // Set user agent to avoid bot detection
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

        console.log('🌐 Navigating to page...');
        await page.goto(TEST_URL, {
            waitUntil: 'networkidle2',
            timeout: 30000
        });

        // Accept cookie consent if present
        try {
            await page.evaluate(() => {
                const buttons = Array.from(document.querySelectorAll('button, a, span'));
                const acceptButton = buttons.find(b => b.textContent.includes('I Accept'));
                if (acceptButton) acceptButton.click();
            });
            await new Promise(r => setTimeout(r, 1000));
            console.log('✅ Cookie consent handled');
        } catch (e) {
            console.log('⚠️ No cookie consent or already accepted');
        }

        // Wait for odds table to load
        await page.waitForSelector('.archiveOdds', { timeout: 10000 });
        console.log('📊 Odds table found');

        // Extract current odds first
        const currentOdds = await page.evaluate(() => {
            const results = [];
            const rows = document.querySelectorAll('table tbody tr');

            rows.forEach(row => {
                const bookmakerEl = row.querySelector('.in-bookmaker-logo-link');
                if (!bookmakerEl) return;

                const bookmaker = bookmakerEl.getAttribute('title') || bookmakerEl.textContent.trim();

                // Get current odds
                const oddsCells = row.querySelectorAll('.archiveOdds');
                const odds = [];
                oddsCells.forEach(cell => {
                    odds.push(cell.textContent.trim());
                });

                // Get movement icons
                const decreasing = row.querySelectorAll('.icon__decreasing').length;
                const increasing = row.querySelectorAll('.icon__increasing').length;

                if (bookmaker && odds.length > 0) {
                    results.push({
                        bookmaker,
                        currentOdds: odds,
                        movement: decreasing > 0 ? 'DOWN' : (increasing > 0 ? 'UP' : 'STABLE')
                    });
                }
            });

            return results.slice(0, 10);
        });

        console.log('\n📈 Current Odds with Movement:');
        currentOdds.forEach((row, i) => {
            const icon = row.movement === 'DOWN' ? '📉' : (row.movement === 'UP' ? '📈' : '➡️');
            console.log(`  ${i + 1}. ${row.bookmaker}: ${row.currentOdds.join(' | ')} ${icon}`);
        });

        // Now try to extract opening odds by clicking on cells
        console.log('\n🔍 Extracting opening odds (via tooltips)...');

        const openingOddsData = [];

        // Get all clickable odds cells
        const cellsInfo = await page.evaluate(() => {
            const cells = document.querySelectorAll('.js-has-aodds');
            return cells.length;
        });

        console.log(`  Found ${cellsInfo} clickable cells`);

        // Click on first few cells to get opening odds
        for (let i = 0; i < Math.min(3, currentOdds.length); i++) {
            const bookmaker = currentOdds[i].bookmaker;
            console.log(`\n  📌 Checking ${bookmaker}...`);

            // Click on the first odds cell for this bookmaker
            try {
                await page.evaluate((index) => {
                    const rows = document.querySelectorAll('table tbody tr');
                    let count = 0;
                    for (const row of rows) {
                        if (row.querySelector('.in-bookmaker-logo-link')) {
                            if (count === index) {
                                const cell = row.querySelector('.js-has-aodds');
                                if (cell) cell.click();
                                break;
                            }
                            count++;
                        }
                    }
                }, i);

                // Wait for tooltip
                await new Promise(r => setTimeout(r, 800));

                // Try to find tooltip content
                const tooltipData = await page.evaluate(() => {
                    // Look for tooltip elements
                    const allText = document.body.innerText;

                    // Check for "Opening odds" text anywhere on page
                    const openingMatch = allText.match(/Opening odds[:\s]+(\d+\.\d+)/i);
                    const archiveMatch = allText.match(/Archive odds[:\s]+(\d+\.\d+)/i);

                    // Also check for tooltips
                    const tooltip = document.querySelector('[role="tooltip"], .tooltip, .bubble, .ui-tooltip');

                    return {
                        openingOdds: openingMatch ? openingMatch[1] : null,
                        archiveOdds: archiveMatch ? archiveMatch[1] : null,
                        tooltipFound: !!tooltip,
                        tooltipHTML: tooltip ? tooltip.outerHTML.slice(0, 200) : null
                    };
                });

                if (tooltipData.openingOdds) {
                    console.log(`     Opening: ${tooltipData.openingOdds} → Current: ${tooltipData.archiveOdds || currentOdds[i].currentOdds[0]}`);
                    openingOddsData.push({
                        bookmaker,
                        opening: tooltipData.openingOdds,
                        current: tooltipData.archiveOdds || currentOdds[i].currentOdds[0]
                    });
                } else {
                    console.log('     ⚠️ Opening odds not found in tooltip');
                }

                // Close tooltip by clicking elsewhere
                await page.click('body');
                await new Promise(r => setTimeout(r, 300));

            } catch (e) {
                console.log(`     ❌ Error: ${e.message}`);
            }
        }

        // Take screenshot
        const screenshotPath = path.join(__dirname, 'betexplorer_test.png');
        await page.screenshot({
            path: screenshotPath,
            fullPage: true
        });
        console.log('\n📸 Screenshot saved:', screenshotPath);

        // Summary
        console.log('\n' + '='.repeat(50));
        console.log('📊 SUMMARY:');
        console.log(`  • Current odds extracted: ${currentOdds.length} bookmakers`);
        console.log(`  • Opening odds extracted: ${openingOddsData.length} bookmakers`);
        console.log('='.repeat(50));

        return { currentOdds, openingOddsData };

    } catch (error) {
        console.error('❌ Error:', error.message);
        throw error;
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}

// Run test
testBetExplorerScraping()
    .then(() => {
        console.log('\n✅ Test completed successfully!');
        process.exit(0);
    })
    .catch((err) => {
        console.error('\n❌ Test failed:', err.message);
        process.exit(1);
    });

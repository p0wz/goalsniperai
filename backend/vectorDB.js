/**
 * Vector Database Module
 * Uses Pinecone for storing and querying match embeddings
 * Embeddings generated via Gemini API
 */

require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Pinecone configuration
const PINECONE_API_KEY = process.env.PINECONE_API_KEY || '';
const PINECONE_INDEX = process.env.PINECONE_INDEX || 'goalsniper-matches';
const PINECONE_HOST = process.env.PINECONE_HOST || ''; // e.g., xxx.svc.pinecone.io

// Gemini for embeddings
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

let pineconeClient = null;

// ============================================
// 🔌 Initialize Pinecone
// ============================================

async function initVectorDB() {
    if (!PINECONE_API_KEY || !PINECONE_HOST) {
        console.log('[VectorDB] ⚠️ Pinecone not configured (PINECONE_API_KEY or PINECONE_HOST missing)');
        return false;
    }

    try {
        // Test connection
        const response = await fetch(`https://${PINECONE_HOST}/describe_index_stats`, {
            method: 'POST',
            headers: {
                'Api-Key': PINECONE_API_KEY,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({})
        });

        if (response.ok) {
            const stats = await response.json();
            console.log(`[VectorDB] ✅ Connected to Pinecone. Vectors: ${stats.totalVectorCount || 0}`);
            pineconeClient = { host: PINECONE_HOST, apiKey: PINECONE_API_KEY };
            return true;
        } else {
            console.error('[VectorDB] ❌ Pinecone connection failed:', response.status);
            return false;
        }
    } catch (e) {
        console.error('[VectorDB] ❌ Init error:', e.message);
        return false;
    }
}

// ============================================
// 🧠 Generate Embedding using Gemini
// ============================================

async function generateEmbedding(text) {
    try {
        const model = genAI.getGenerativeModel({ model: 'embedding-001' });
        const result = await model.embedContent(text);
        return result.embedding.values;
    } catch (e) {
        console.error('[VectorDB] Embedding error:', e.message);
        return null;
    }
}

// Create embedding text from match data
function createEmbeddingText(matchData) {
    const {
        homeTeam, awayTeam, league, market,
        homeAvgGoals, awayAvgGoals, h2hAvgGoals,
        homePPG, awayPPG, homeFormGoals, awayFormGoals
    } = matchData.stats || matchData;

    return `
Football match: ${matchData.homeTeam || homeTeam} vs ${matchData.awayTeam || awayTeam}
League: ${matchData.league || league}
Market: ${matchData.market || market}
Home Avg Goals: ${homeAvgGoals || 'N/A'}
Away Avg Goals: ${awayAvgGoals || 'N/A'}
H2H Avg Goals: ${h2hAvgGoals || 'N/A'}
Home PPG: ${homePPG || 'N/A'}
Away PPG: ${awayPPG || 'N/A'}
Home Form Goals: ${homeFormGoals || 'N/A'}
Away Form Goals: ${awayFormGoals || 'N/A'}
    `.trim();
}

// ============================================
// 💾 Store Match in Vector DB
// ============================================

async function storeMatch(matchData) {
    if (!pineconeClient) {
        console.log('[VectorDB] Not connected, skipping store');
        return { success: false, error: 'Not connected' };
    }

    try {
        const embeddingText = createEmbeddingText(matchData);
        const embedding = await generateEmbedding(embeddingText);

        if (!embedding) {
            return { success: false, error: 'Embedding failed' };
        }

        const vectorId = `${matchData.eventId || matchData.id}_${matchData.market}`.replace(/[^a-zA-Z0-9_-]/g, '_');

        const response = await fetch(`https://${pineconeClient.host}/vectors/upsert`, {
            method: 'POST',
            headers: {
                'Api-Key': pineconeClient.apiKey,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                vectors: [{
                    id: vectorId,
                    values: embedding,
                    metadata: {
                        match: matchData.match || `${matchData.homeTeam} vs ${matchData.awayTeam}`,
                        homeTeam: matchData.homeTeam,
                        awayTeam: matchData.awayTeam,
                        league: matchData.league,
                        market: matchData.market,
                        result: matchData.result,
                        finalScore: matchData.finalScore,
                        homeGoals: matchData.homeGoals,
                        awayGoals: matchData.awayGoals,
                        settledAt: matchData.settledAt || new Date().toISOString()
                    }
                }]
            })
        });

        if (response.ok) {
            console.log(`[VectorDB] ✅ Stored: ${matchData.match} - ${matchData.market}`);
            return { success: true };
        } else {
            const err = await response.text();
            console.error('[VectorDB] Store error:', err);
            return { success: false, error: err };
        }
    } catch (e) {
        console.error('[VectorDB] Store error:', e.message);
        return { success: false, error: e.message };
    }
}

// ============================================
// 🔍 Find Similar Matches
// ============================================

async function findSimilarMatches(matchData, topK = 5) {
    if (!pineconeClient) {
        console.log('[VectorDB] Not connected, returning empty');
        return [];
    }

    try {
        const embeddingText = createEmbeddingText(matchData);
        const embedding = await generateEmbedding(embeddingText);

        if (!embedding) {
            return [];
        }

        const response = await fetch(`https://${pineconeClient.host}/query`, {
            method: 'POST',
            headers: {
                'Api-Key': pineconeClient.apiKey,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                vector: embedding,
                topK: topK,
                includeMetadata: true
            })
        });

        if (response.ok) {
            const result = await response.json();
            const matches = result.matches || [];

            console.log(`[VectorDB] 🔍 Found ${matches.length} similar matches`);

            return matches.map(m => ({
                id: m.id,
                score: m.score,
                ...m.metadata
            }));
        } else {
            console.error('[VectorDB] Query error:', await response.text());
            return [];
        }
    } catch (e) {
        console.error('[VectorDB] Query error:', e.message);
        return [];
    }
}

// ============================================
// 📊 Format Similar Matches for Prompt
// ============================================

function formatSimilarMatchesForPrompt(similarMatches) {
    if (!similarMatches || similarMatches.length === 0) {
        return '';
    }

    const won = similarMatches.filter(m => m.result === 'WON').length;
    const total = similarMatches.length;
    const winRate = ((won / total) * 100).toFixed(0);

    let text = `
📊 BENZER GEÇMİŞ MAÇLAR (${total} maç, %${winRate} başarı):
`;

    similarMatches.forEach((m, i) => {
        const icon = m.result === 'WON' ? '✅' : '❌';
        text += `${i + 1}. ${icon} ${m.match} | ${m.market} | ${m.finalScore} | ${m.result}\n`;
    });

    text += `\n⚠️ Bu geçmiş verileri dikkate alarak analiz yap.\n`;

    return text;
}

// ============================================
// 📈 Get Stats
// ============================================

async function getStats() {
    if (!pineconeClient) {
        return { connected: false, totalVectors: 0 };
    }

    try {
        const response = await fetch(`https://${pineconeClient.host}/describe_index_stats`, {
            method: 'POST',
            headers: {
                'Api-Key': pineconeClient.apiKey,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({})
        });

        if (response.ok) {
            const stats = await response.json();
            return {
                connected: true,
                totalVectors: stats.totalVectorCount || 0,
                namespaces: stats.namespaces || {}
            };
        }
    } catch (e) {
        console.error('[VectorDB] Stats error:', e.message);
    }

    return { connected: false, totalVectors: 0 };
}

// ============================================
// 🗑️ Delete All (for testing)
// ============================================

async function deleteAll() {
    if (!pineconeClient) {
        return { success: false, error: 'Not connected' };
    }

    try {
        const response = await fetch(`https://${pineconeClient.host}/vectors/delete`, {
            method: 'POST',
            headers: {
                'Api-Key': pineconeClient.apiKey,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ deleteAll: true })
        });

        if (response.ok) {
            console.log('[VectorDB] 🗑️ All vectors deleted');
            return { success: true };
        }
    } catch (e) {
        console.error('[VectorDB] Delete error:', e.message);
    }

    return { success: false };
}

module.exports = {
    initVectorDB,
    generateEmbedding,
    storeMatch,
    findSimilarMatches,
    formatSimilarMatchesForPrompt,
    getStats,
    deleteAll
};

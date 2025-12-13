/**
 * Allowed Leagues Configuration
 * Shared between Live Bot (server.js) and Daily Analyst (dailyAnalyst.js)
 */

const ALLOWED_LEAGUES = [
    // --- SPECIAL INTERANTIONAL ---
    'WORLD: Friendly International',
    'WORLD: Club Friendly',
    'EUROPE: Champions League',
    'EUROPE: Europa League',
    'EUROPE: Conference League',
    'EUROPE: Euro',
    'EUROPE: UEFA Nations League',

    // --- TIER 1 (The Big 5 + Top Leagues) ---
    'ENGLAND: Premier League',
    'ENGLAND: Championship',
    'ENGLAND: League One',
    'SPAIN: La Liga',
    'SPAIN: LaLiga',
    'SPAIN: LaLiga2',
    'GERMANY: Bundesliga',
    'GERMANY: 2. Bundesliga',
    'ITALY: Serie A',
    'ITALY: Serie B',
    'FRANCE: Ligue 1',
    'FRANCE: Ligue 2',
    'NETHERLANDS: Eredivisie',
    'PORTUGAL: Liga Portugal',
    'PORTUGAL: Primeira Liga',
    'TURKEY: Super Lig',
    'TURKIYE: Super Lig',
    'TURKEY: 1. Lig',
    'BELGIUM: Pro League',
    'BELGIUM: Jupiler',

    // --- SOUTH AMERICA (High Volatility but good volume) ---
    'BRAZIL: Serie A',
    'BRAZIL: Serie B',
    'ARGENTINA: Liga Profesional',
    'ARGENTINA: Primera Division',
    'COLOMBIA: Primera A',
    'CHILE: Primera Division',
    'URUGUAY: Primera Division',

    // --- SCANDINAVIA / NORDICS ---
    'DENMARK: Superliga',
    'SWEDEN: Allsvenskan',
    'NORWAY: Eliteserien',
    'FINLAND: Veikkausliiga',
    'ICELAND: Besta deild karla',

    // --- REST OF EUROPE (Solid tiers) ---
    'AUSTRIA: Bundesliga',
    'SWITZERLAND: Super League',
    'SCOTLAND: Premiership',
    'POLAND: Ekstraklasa',
    'CZECH REPUBLIC: 1. Liga',
    'CZECHIA: 1. Liga',
    'GREECE: Super League',
    'ROMANIA: Liga I',
    'ROMANIA: Liga 1',
    'CROATIA: HNL',
    'SERBIA: Super Liga',
    'HUNGARY: OTP Bank Liga',
    'BULGARIA: Parva Liga',
    'SLOVAKIA: Nike liga',
    'SLOVENIA: Prva Liga',

    // --- ASIA / OCEANIA / USA ---
    'USA: MLS',
    'AUSTRALIA: A-League',
    'JAPAN: J1 League',
    'JAPAN: J2 League',
    'SOUTH KOREA: K League 1',
    'SOUTH KOREA: K League 2',
    'SAUDI ARABIA: Pro League',
    'SAUDI ARABIA: Saudi Professional',
    'CHINA: Super League'
];

module.exports = ALLOWED_LEAGUES;

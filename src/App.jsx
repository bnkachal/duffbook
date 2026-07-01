import { storage } from './firebase';
import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Flag, Trophy, Coins, Receipt, Plus, Minus, Settings, ChevronLeft, ChevronRight,
  ChevronDown, ChevronUp, X, UserPlus, Trash2, Check, Camera, Send, Bell,
  MessageCircle, Swords, Shuffle, Copy, LogOut, Loader2, Home, Ticket, KeyRound,
  Calendar, User, ChevronsUpDown, RefreshCw,
} from 'lucide-react';

/* ============================== DESIGN TOKENS ============================== */
const C = {
  pine: '#0A1322', pineDark: '#050911', turf: '#111D33', turfLight: '#1C2E4F',
  turfBorder: '#2B3D5E', ivory: '#F3F6FB', ivoryDim: '#94A1BD',
  gold: '#D4A93A', goldBright: '#E8C158', flagRed: '#D32C3F', bunker: '#9AA1AE',
  blue: '#2F5FD0', blueBright: '#5C87E8',
};
const CHIP_COLORS = ['#D4A93A', '#D32C3F', '#2F5FD0', '#7E8FB8', '#C9783D', '#5C87E8', '#B3567A', '#7A93A8'];
const FLIGHT_COLORS = ['#D32C3F', '#2F5FD0', '#D4A93A', '#7E8FB8'];
const TABS = ['home', 'card', 'leaderboard', 'games', 'bets', 'settle'];

/* ============================== COURSE DATA MODEL ==============================
   Shape every course-data provider (mock today, a real one later) must return:
   { courseId, providerId, courseName, address, city, state, latitude, longitude,
     numberOfHoles, teeBoxes: [{teeName, totalYards, rating, slope}],
     holes: [{holeNumber, par, handicap, yardagesByTee: {teeName: yards}}] } */

/* Procedurally fills in per-tee yardages for each hole from a course's par sequence and each
   tee's overall declared length \u2014 keeps the mock dataset internally consistent without
   hand-typing hundreds of yardage numbers. Swap this whole module out once a real provider
   (GolfAPI.io, GolfCourseAPI, iGolf, etc.) is wired up; the UI never needs to know the source. */
function buildMockHoles(pars, handicaps, teeBoxes) {
  const baseByPar = { 3: 165, 4: 400, 5: 540 };
  const baseTotal = pars.reduce((sum, par) => sum + (baseByPar[par] || 400), 0);
  return pars.map((par, i) => {
    const yardagesByTee = {};
    teeBoxes.forEach(tee => {
      const scale = tee.totalYards / baseTotal;
      yardagesByTee[tee.teeName] = Math.round((baseByPar[par] || 400) * scale / 5) * 5;
    });
    return { holeNumber: i + 1, par, handicap: handicaps[i], yardagesByTee };
  });
}
function buildMockCourse({ courseId, courseName, address, city, state, latitude, longitude, pars, handicaps, teeBoxes }) {
  return {
    courseId, providerId: 'mock', courseName, address, city, state, latitude, longitude,
    numberOfHoles: pars.length, teeBoxes,
    holes: buildMockHoles(pars, handicaps, teeBoxes),
  };
}
/* Two reusable 18-hole par/handicap patterns for the courses below where we don't have a
   verified real routing on file \u2014 illustrative, not surveyed. The four Sandhills-area
   courses keep their previously verified par + stroke-index data. */
const PATTERN_A_PARS = [4,4,3,5,4,3,4,5,4, 4,3,5,4,4,3,4,5,4];
const PATTERN_A_SI =   [7,11,15,1,9,17,3,13,5, 6,10,14,2,8,16,4,12,18];
const PATTERN_B_PARS = [4,5,3,4,4,3,4,4,4, 4,3,5,4,4,3,4,5,4];
const PATTERN_B_SI =   [9,1,17,7,3,15,11,5,13, 6,18,2,10,4,16,8,12,14];

const MOCK_COURSES = [
  buildMockCourse({
    courseId: 'mock-tobacco-road', courseName: 'Tobacco Road Golf Club',
    address: '442 Tobacco Rd', city: 'Sanford', state: 'NC', latitude: 35.478, longitude: -79.181,
    pars: [5,4,3,5,4,3,4,3,4, 4,5,4,5,3,4,4,3,4], handicaps: [3,11,17,9,15,13,7,5,1, 6,10,14,2,8,12,16,18,4],
    teeBoxes: [
      { teeName: 'The Ripper', totalYards: 6554, rating: 72.5, slope: 145 },
      { teeName: 'Strantz', totalYards: 6100, rating: 70.2, slope: 138 },
      { teeName: 'Member', totalYards: 5450, rating: 66.9, slope: 128 },
      { teeName: 'Forward', totalYards: 4700, rating: 67.8, slope: 122 },
    ],
  }),
  buildMockCourse({
    courseId: 'mock-mid-south', courseName: 'Mid South Club',
    address: '1010 Midland Rd', city: 'Southern Pines', state: 'NC', latitude: 35.193, longitude: -79.392,
    pars: [4,4,3,5,4,3,4,4,4, 4,4,3,5,4,4,3,5,4], handicaps: [7,11,15,1,9,17,3,13,5, 6,10,14,2,8,16,4,12,18],
    teeBoxes: [
      { teeName: 'Black', totalYards: 7083, rating: 73.8, slope: 146 },
      { teeName: 'Blue', totalYards: 6600, rating: 71.5, slope: 138 },
      { teeName: 'White', totalYards: 6050, rating: 69.0, slope: 130 },
      { teeName: 'Red', totalYards: 5100, rating: 69.8, slope: 121 },
    ],
  }),
  buildMockCourse({
    courseId: 'mock-talamore', courseName: 'Talamore Golf Resort',
    address: '1595 Midland Rd', city: 'Southern Pines', state: 'NC', latitude: 35.198, longitude: -79.404,
    pars: [4,5,3,4,4,3,4,4,4, 4,3,5,4,4,3,4,5,4], handicaps: [9,1,17,7,3,15,11,5,13, 6,18,2,10,4,16,8,12,14],
    teeBoxes: [
      { teeName: 'Gold', totalYards: 6840, rating: 71.4, slope: 140 },
      { teeName: 'Blue', totalYards: 6350, rating: 69.6, slope: 133 },
      { teeName: 'White', totalYards: 5800, rating: 67.5, slope: 125 },
      { teeName: 'Red', totalYards: 4950, rating: 68.1, slope: 119 },
    ],
  }),
  buildMockCourse({
    courseId: 'mock-ironwood', courseName: 'Ironwood Golf & Country Club',
    address: '1455 Bell\u2019s Fork Rd', city: 'Greenville', state: 'NC', latitude: 35.633, longitude: -77.366,
    pars: [4,5,3,4,4,3,4,5,4, 4,3,5,4,4,3,5,4,4], handicaps: [7,1,17,9,3,15,11,5,13, 6,18,2,10,4,16,8,12,14],
    teeBoxes: [
      { teeName: 'Championship', totalYards: 6750, rating: 72.3, slope: 134 },
      { teeName: 'Member', totalYards: 6200, rating: 70.1, slope: 127 },
      { teeName: 'Forward', totalYards: 5150, rating: 69.4, slope: 118 },
    ],
  }),
  buildMockCourse({
    courseId: 'mock-pebble-beach', courseName: 'Pebble Beach Golf Links',
    address: '1700 17 Mile Dr', city: 'Pebble Beach', state: 'CA', latitude: 36.5683, longitude: -121.9494,
    pars: PATTERN_A_PARS, handicaps: PATTERN_A_SI,
    teeBoxes: [
      { teeName: 'Black', totalYards: 6828, rating: 75.5, slope: 145 },
      { teeName: 'Blue', totalYards: 6350, rating: 72.9, slope: 139 },
      { teeName: 'White', totalYards: 5800, rating: 70.0, slope: 130 },
      { teeName: 'Gold', totalYards: 5100, rating: 70.6, slope: 124 },
    ],
  }),
  buildMockCourse({
    courseId: 'mock-bethpage-black', courseName: 'Bethpage Black Course',
    address: '99 Quaker Meeting House Rd', city: 'Farmingdale', state: 'NY', latitude: 40.7421, longitude: -73.4587,
    pars: PATTERN_B_PARS, handicaps: PATTERN_B_SI,
    teeBoxes: [
      { teeName: 'Black', totalYards: 7468, rating: 76.6, slope: 148 },
      { teeName: 'Blue', totalYards: 6970, rating: 74.0, slope: 142 },
      { teeName: 'White', totalYards: 6295, rating: 71.0, slope: 132 },
    ],
  }),
  buildMockCourse({
    courseId: 'mock-pinehurst-2', courseName: 'Pinehurst No. 2',
    address: '1 Carolina Vista Dr', city: 'Pinehurst', state: 'NC', latitude: 35.1953, longitude: -79.4694,
    pars: PATTERN_A_PARS, handicaps: PATTERN_A_SI,
    teeBoxes: [
      { teeName: 'Black', totalYards: 7588, rating: 75.9, slope: 138 },
      { teeName: 'Blue', totalYards: 7117, rating: 73.6, slope: 133 },
      { teeName: 'White', totalYards: 6334, rating: 70.6, slope: 126 },
      { teeName: 'Red', totalYards: 5378, rating: 71.0, slope: 124 },
    ],
  }),
  buildMockCourse({
    courseId: 'mock-bandon-dunes', courseName: 'Bandon Dunes Golf Resort',
    address: '57744 Round Lake Dr', city: 'Bandon', state: 'OR', latitude: 43.1659, longitude: -124.3973,
    pars: PATTERN_B_PARS, handicaps: PATTERN_B_SI,
    teeBoxes: [
      { teeName: 'Black', totalYards: 6732, rating: 73.6, slope: 144 },
      { teeName: 'Blue', totalYards: 6200, rating: 71.0, slope: 136 },
      { teeName: 'White', totalYards: 5650, rating: 68.5, slope: 127 },
    ],
  }),
  buildMockCourse({
    courseId: 'mock-whistling-straits', courseName: 'Whistling Straits (Straits Course)',
    address: 'N8501 County Road LS', city: 'Kohler', state: 'WI', latitude: 43.8425, longitude: -87.7188,
    pars: PATTERN_A_PARS, handicaps: PATTERN_A_SI,
    teeBoxes: [
      { teeName: 'Black', totalYards: 7790, rating: 77.2, slope: 152 },
      { teeName: 'Blue', totalYards: 7142, rating: 74.3, slope: 144 },
      { teeName: 'White', totalYards: 6479, rating: 71.5, slope: 135 },
    ],
  }),
  buildMockCourse({
    courseId: 'mock-tpc-sawgrass', courseName: 'TPC Sawgrass (Stadium Course)',
    address: '110 Championship Way', city: 'Ponte Vedra Beach', state: 'FL', latitude: 30.1975, longitude: -81.3953,
    pars: PATTERN_B_PARS, handicaps: PATTERN_B_SI,
    teeBoxes: [
      { teeName: 'Black', totalYards: 7245, rating: 75.3, slope: 155 },
      { teeName: 'Blue', totalYards: 6750, rating: 72.8, slope: 145 },
      { teeName: 'White', totalYards: 6100, rating: 69.7, slope: 132 },
    ],
  }),
  buildMockCourse({
    courseId: 'mock-torrey-pines', courseName: 'Torrey Pines Golf Course (South)',
    address: '11480 N Torrey Pines Rd', city: 'La Jolla', state: 'CA', latitude: 32.9006, longitude: -117.2531,
    pars: PATTERN_A_PARS, handicaps: PATTERN_A_SI,
    teeBoxes: [
      { teeName: 'Black', totalYards: 7765, rating: 78.0, slope: 145 },
      { teeName: 'Blue', totalYards: 7055, rating: 74.2, slope: 137 },
      { teeName: 'White', totalYards: 6308, rating: 70.4, slope: 126 },
    ],
  }),
  buildMockCourse({
    courseId: 'mock-chambers-bay', courseName: 'Chambers Bay',
    address: '6320 Grandview Dr W', city: 'University Place', state: 'WA', latitude: 47.205, longitude: -122.5654,
    pars: PATTERN_B_PARS, handicaps: PATTERN_B_SI,
    teeBoxes: [
      { teeName: 'Black', totalYards: 7585, rating: 76.4, slope: 146 },
      { teeName: 'Blue', totalYards: 6900, rating: 73.0, slope: 138 },
      { teeName: 'White', totalYards: 6150, rating: 69.5, slope: 128 },
    ],
  }),
  buildMockCourse({
    courseId: 'mock-erin-hills', courseName: 'Erin Hills',
    address: '7169 County Road O', city: 'Erin', state: 'WI', latitude: 43.2272, longitude: -88.3551,
    pars: PATTERN_A_PARS, handicaps: PATTERN_A_SI,
    teeBoxes: [
      { teeName: 'Black', totalYards: 7741, rating: 76.7, slope: 146 },
      { teeName: 'Blue', totalYards: 7028, rating: 73.2, slope: 138 },
      { teeName: 'White', totalYards: 6262, rating: 69.8, slope: 128 },
    ],
  }),
  buildMockCourse({
    courseId: 'mock-kiawah-ocean', courseName: 'Kiawah Island Golf Resort (Ocean Course)',
    address: '1000 Ocean Course Dr', city: 'Kiawah Island', state: 'SC', latitude: 32.6151, longitude: -80.0889,
    pars: PATTERN_B_PARS, handicaps: PATTERN_B_SI,
    teeBoxes: [
      { teeName: 'Black', totalYards: 7356, rating: 76.8, slope: 155 },
      { teeName: 'Blue', totalYards: 6800, rating: 73.5, slope: 144 },
      { teeName: 'White', totalYards: 6100, rating: 70.0, slope: 131 },
    ],
  }),
  buildMockCourse({
    courseId: 'mock-river-ridge', courseName: 'River Ridge Golf Club',
    address: '3224 Auburn-Knightdale Rd', city: 'Raleigh', state: 'NC', latitude: 35.745, longitude: -78.565,
    pars: PATTERN_A_PARS, handicaps: PATTERN_A_SI,
    teeBoxes: [
      { teeName: 'Black', totalYards: 6769, rating: 72.6, slope: 141 },
      { teeName: 'Blue', totalYards: 6206, rating: 70.3, slope: 134 },
      { teeName: 'White', totalYards: 5756, rating: 68.6, slope: 125 },
    ],
  }),
];

/* ============================== COURSE PROVIDER SERVICE ==============================
   The UI only ever talks to courseProviderService. Every method returns a Promise, even
   though the mock provider resolves from an in-memory array \u2014 that's deliberate, so
   dropping in a real fetch()-based provider (GolfAPI.io, GolfCourseAPI, iGolf, or another)
   later is a one-file swap with no UI changes. Worth a fresh look at each provider's current
   free-tier terms before wiring one up for real. */
function mockDelay() { return new Promise(resolve => setTimeout(resolve, 280 + Math.random() * 280)); }
function haversineMiles(lat1, lon1, lat2, lon2) {
  const toRad = d => d * Math.PI / 180, R = 3958.8;
  const dLat = toRad(lat2 - lat1), dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
const mockCourseProvider = {
  providerId: 'mock',
  async searchByName(query) {
    await mockDelay();
    const q = (query || '').trim().toLowerCase();
    if (!q) return MOCK_COURSES.slice(0, 8);
    return MOCK_COURSES.filter(c => c.courseName.toLowerCase().includes(q));
  },
  async searchByCityState(city, state) {
    await mockDelay();
    const c = (city || '').trim().toLowerCase(), s = (state || '').trim().toLowerCase();
    if (!c && !s) return MOCK_COURSES.slice(0, 8);
    return MOCK_COURSES.filter(course =>
      (!c || course.city.toLowerCase().includes(c)) && (!s || course.state.toLowerCase() === s)
    );
  },
  async searchByLocation(latitude, longitude, radiusMiles = 100) {
    await mockDelay();
    return MOCK_COURSES
      .map(course => ({ course, distanceMiles: haversineMiles(latitude, longitude, course.latitude, course.longitude) }))
      .filter(x => x.distanceMiles <= radiusMiles)
      .sort((a, b) => a.distanceMiles - b.distanceMiles)
      .map(x => ({ ...x.course, distanceMiles: Math.round(x.distanceMiles) }));
  },
  async getCourseDetails(courseId) {
    await mockDelay();
    const course = MOCK_COURSES.find(c => c.courseId === courseId);
    if (!course) throw new Error('Course not found');
    return course;
  },
};
const courseProviderService = {
  activeProviderId: 'mock',
  searchByName: (query) => mockCourseProvider.searchByName(query),
  searchByCityState: (city, state) => mockCourseProvider.searchByCityState(city, state),
  searchByLocation: (latitude, longitude, radiusMiles) => mockCourseProvider.searchByLocation(latitude, longitude, radiusMiles),
  getCourseDetails: (courseId) => mockCourseProvider.getCourseDetails(courseId),
};
/* Adapter: turns a provider Course + chosen tee into the flat fields this app's round object
   already understands (courseId/courseName/courseRating/courseSlope/numHoles/pars/strokeIndex).
   This is the one place that would need updating if the Course shape ever changes. */
function roundFieldsFromCourse(course, teeName) {
  const tee = course.teeBoxes.find(t => t.teeName === teeName) || course.teeBoxes[0];
  return {
    courseId: course.courseId, courseName: course.courseName, providerId: course.providerId,
    courseRating: tee.rating, courseSlope: tee.slope, teeName: tee.teeName,
    numHoles: course.numberOfHoles,
    pars: course.holes.map(h => h.par), strokeIndex: course.holes.map(h => h.handicap),
    yardage: course.holes.map(h => h.yardagesByTee[tee.teeName] ?? null),
  };
}

const DEFAULT_PARS_18 = [4,4,3,5,4,3,4,5,4, 4,3,5,4,4,3,4,5,4];
const DEFAULT_PARS_9 = [4,4,3,5,4,3,4,5,4];
const DEFAULT_SI_18 = Array.from({ length: 18 }, (_, i) => i + 1);
const DEFAULT_SI_9 = Array.from({ length: 9 }, (_, i) => i + 1);

/* ============================== HELPERS ============================== */
function genCode() { const chars = 'ABCDEFGHJKMNPQRSTUVWXY3456789'; let s = ''; for (let i = 0; i < 5; i++) s += chars[Math.floor(Math.random() * chars.length)]; return s; }
function genPin() { return String(Math.floor(1000 + Math.random() * 9000)); }
function tournamentKey(code) { return `round-${code}-state`; }
function chatKey(code) { return `round-${code}-chat`; }
function whoamiKey(code) { return `whoami-${code}`; }
function isAdminKey(code) { return `isadmin-${code}`; }
function initials(name) { return (name || '?').trim().split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase(); }
function fmtToPar(n) { return n === 0 ? 'E' : n > 0 ? `+${n}` : `${n}`; }
function fmtMoney(n) { const s = n < 0 ? '-' : ''; return `${s}$${Math.abs(n).toFixed(n % 1 ? 2 : 0)}`; }
function fmtClockTime(ms) { if (ms == null) return ''; return new Date(ms).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }); }
function fmtTimeAgo(ms, now) { if (ms == null) return ''; const mins = Math.max(0, Math.round((now - ms) / 60000)); if (mins < 1) return 'just now'; if (mins === 1) return '1 min ago'; if (mins < 60) return `${mins} min ago`; const hrs = Math.round(mins / 60); return `${hrs} hr${hrs !== 1 ? 's' : ''} ago`; }
function termForDiff(diff) {
  if (diff <= -2) return 'Eagle'; if (diff === -1) return 'Birdie'; if (diff === 0) return 'Par';
  if (diff === 1) return 'Bogey'; if (diff === 2) return 'Double'; return `+${diff}`;
}

/* ---- handicap math (operates on a flat round-view object) ---- */
function getCourseHandicap(player, state) {
  if (!state.handicapsEnabled) return 0;
  const idx = parseFloat(player.handicapIndex);
  if (isNaN(idx)) return 0;
  const totalPar = state.pars.reduce((a, b) => a + (b || 4), 0);
  return Math.round(idx * ((state.courseSlope || 113) / 113) + ((state.courseRating || totalPar) - totalPar));
}
function strokesOnHole(h, strokeIndexArr, holeIdx) {
  if (!h) return 0;
  const si = strokeIndexArr[holeIdx] || (holeIdx + 1);
  if (h > 0) { const base = Math.floor(h / 18); return base + ((h % 18) >= si ? 1 : 0); }
  const ah = Math.abs(h); const base = -Math.floor(ah / 18); const rem = ah % 18; const thresh = 19 - rem;
  return base + (rem > 0 && si >= thresh ? -1 : 0);
}
function holeScoreFn(state, useNet) {
  const chMap = {}; state.players.forEach(p => { chMap[p.id] = getCourseHandicap(p, state); });
  return (playerId, holeIdx) => {
    const g = state.scores[playerId]?.[holeIdx];
    if (g == null) return null;
    if (!useNet) return g;
    return g - strokesOnHole(chMap[playerId] || 0, state.strokeIndex, holeIdx);
  };
}

/* ============================== TOURNAMENT / ROUND DATA MODEL ==============================
   A "tournament" is the container created/joined via a code. It holds the shared roster
   (players, flights, handicaps, admin PIN) plus an ordered list of "rounds" \u2014 one per day.
   Each round has its own course, scores, games, and custom bets. A "round view" flattens the
   active round + the tournament's shared fields into one object shaped exactly like the old
   single-round state, so every existing compute function and tab component below is unchanged. */
function defaultRound(index) {
  return {
    id: 'round_' + Date.now() + '_' + index + '_' + Math.random().toString(36).slice(2, 5),
    name: `Round ${index + 1}`,
    courseId: null, providerId: null, teeName: null, courseName: '', courseRating: 72, courseSlope: 113,
    numHoles: 18, pars: DEFAULT_PARS_18.slice(), strokeIndex: DEFAULT_SI_18.slice(), yardage: Array(18).fill(null),
    scores: {},
    games: {
      skins: { enabled: true, value: 5, net: false },
      nassau: { enabled: true, value: 10, net: false },
      stableford: { enabled: false, value: 1, net: true },
      matchplay: { enabled: false, value: 20, matches: [] },
      wolf: { enabled: false, value: 5, net: false, choices: {} },
      parimutuel: { enabled: false, marketType: 'players', net: false, lockAfterHole: 0, resolved: false, winnerId: null, tickets: [] },
    },
    customBets: [],
    flowGroups: [], scoreUpdatedAt: {},
    started: false,
  };
}
function defaultTournament() {
  const r0 = defaultRound(0);
  return {
    name: 'DuffBook Trip', adminPin: null,
    players: [], flights: [], handicapsEnabled: false,
    rounds: [r0], activeRoundId: r0.id,
    tournamentCustomBets: [],
    ryderCup: { enabled: false, teamAName: 'USA', teamBName: 'Europe', totalPlayers: null },
  };
}
function getRoundView(tournament, roundId) {
  const round = tournament.rounds.find(r => r.id === roundId) || tournament.rounds[0] || defaultRound(0);
  const players = Array.isArray(tournament.players) ? tournament.players.filter(p => p && p.id) : [];
  const flights = Array.isArray(tournament.flights) ? tournament.flights.filter(f => f && f.id) : [];
  const pars = Array.isArray(round.pars) ? round.pars : DEFAULT_PARS_18.slice();
  const strokeIndex = Array.isArray(round.strokeIndex) ? round.strokeIndex : DEFAULT_SI_18.slice();
  const scores = round.scores && typeof round.scores === 'object' ? round.scores : {};
  const safeScores = {};
  players.forEach(p => { safeScores[p.id] = Array.isArray(scores[p.id]) ? scores[p.id] : Array(round.numHoles || 18).fill(null); });
  return {
    ...round,
    pars, strokeIndex, scores: safeScores,
    players, flights, handicapsEnabled: tournament.handicapsEnabled,
    adminPin: tournament.adminPin, roundName: round.name, tournamentName: tournament.name,
  };
}
function roundIsFullyPlayed(round) {
  if (!round.started) return false;
  const ids = Object.keys(round.scores);
  return ids.length > 0 && ids.every(id => (round.scores[id] || []).filter(s => s != null).length === round.numHoles);
}

/* ============================== DEMO DATA ============================== */
const DEMO_PEOPLE = [
  { name: 'Mike', handicapIndex: 8.2 },
  { name: 'Steve', handicapIndex: 14.5 },
  { name: 'Brij', handicapIndex: 5.0 },
  { name: 'Josh', handicapIndex: 18.4 },
  { name: 'Dave', handicapIndex: 11.3 },
];
function genDemoScore(par, handicapIndex) {
  const bias = handicapIndex / 18;
  const variance = 0.8 + bias * 0.6;
  const raw = par + bias * 1.1 + (Math.random() - 0.5) * 2 * variance;
  return Math.max(par - 2, Math.min(par + 5, Math.round(raw)));
}
function generateDemoTournament() {
  const course1 = MOCK_COURSES.find(c => c.courseId === 'mock-tobacco-road'), course2 = MOCK_COURSES.find(c => c.courseId === 'mock-mid-south');
  const players = DEMO_PEOPLE.map((d, i) => ({
    id: `demo_p${i + 1}`, name: d.name, color: CHIP_COLORS[i % CHIP_COLORS.length],
    handicapIndex: String(d.handicapIndex), flightId: i % 2 === 0 ? 'f1' : 'f2',
  }));
  const [mike, steve, brij, josh, dave] = players;

  const round1 = defaultRound(0);
  round1.name = 'Round 1 \u2014 Tobacco Road';
  Object.assign(round1, roundFieldsFromCourse(course1, course1.teeBoxes[0].teeName));
  const thruMap = { [mike.id]: 18, [steve.id]: 18, [brij.id]: 16, [josh.id]: 15, [dave.id]: 13 };
  players.forEach(p => {
    const thru = thruMap[p.id];
    const arr = Array(18).fill(null);
    for (let h = 0; h < thru; h++) arr[h] = genDemoScore(round1.pars[h], parseFloat(p.handicapIndex));
    round1.scores[p.id] = arr;
  });
  round1.games.stableford.enabled = true;
  round1.games.matchplay.enabled = true;
  round1.games.matchplay.matches = [
    { id: 'demo_m1', sideA: [mike.id], sideB: [steve.id] },
    { id: 'demo_m2', sideA: [brij.id], sideB: [josh.id] },
    { id: 'demo_m3', sideA: [mike.id, brij.id], sideB: [steve.id, josh.id] },
  ];
  round1.games.wolf.enabled = true;
  round1.games.wolf.choices = {
    0: { partnerId: steve.id, lone: false }, 1: { partnerId: null, lone: true },
    2: { partnerId: josh.id, lone: false }, 3: { partnerId: dave.id, lone: false }, 4: { partnerId: null, lone: true },
  };
  round1.games.parimutuel.enabled = true;
  round1.games.parimutuel.lockAfterHole = 17;
  round1.games.parimutuel.tickets = [
    { id: 'demo_t1', bettorId: mike.id, bettorName: mike.name, entrantId: brij.id, count: 2, ts: Date.now() - 900000 },
    { id: 'demo_t2', bettorId: steve.id, bettorName: steve.name, entrantId: steve.id, count: 1, ts: Date.now() - 800000 },
    { id: 'demo_t3', bettorId: brij.id, bettorName: brij.name, entrantId: brij.id, count: 3, ts: Date.now() - 700000 },
  ];
  round1.customBets = [
    { id: 'demo_cb1', betName: 'Birdie Pot', betType: 'birdiepot', entryAmount: 5, participants: players.map(p => p.id), holeIndex: null, scoringMethod: null, settlementMethod: 'automatic', notes: 'Most birdies-or-better wins the pot', resolved: false, winnerIds: null },
    { id: 'demo_cb2', betName: 'Closest to Pin #7', betType: 'closesttopin', entryAmount: 5, participants: [mike.id, steve.id, brij.id], holeIndex: 6, scoringMethod: null, settlementMethod: 'manual', notes: '', resolved: false, winnerIds: null },
    { id: 'demo_cb4', betName: 'First to 3-putt buys beer', betType: 'custom', entryAmount: 10, participants: [mike.id, steve.id], holeIndex: null, scoringMethod: null, settlementMethod: 'manual', notes: 'Loser buys the first round', resolved: true, winnerIds: [steve.id] },
  ];
  round1.started = true;

  const round2 = defaultRound(1);
  round2.name = 'Round 2 \u2014 Mid South';
  Object.assign(round2, roundFieldsFromCourse(course2, course2.teeBoxes[0].teeName));
  players.forEach(p => { round2.scores[p.id] = Array(18).fill(null); });
  round2.started = false;

  const tournament = {
    name: 'Spring Trip 2026', adminPin: genPin(),
    players, flights: [{ id: 'f1', name: 'Red', color: FLIGHT_COLORS[0] }, { id: 'f2', name: 'Blue', color: FLIGHT_COLORS[1] }],
    handicapsEnabled: true, rounds: [round1, round2], activeRoundId: round1.id,
    ryderCup: { enabled: true, teamAName: 'Red', teamBName: 'Blue', totalPlayers: 5 },
    tournamentCustomBets: [
      { id: 'demo_tcb1', betName: 'Most birdies, whole trip', betType: 'birdiepot', entryAmount: 10, participants: players.map(p => p.id), scoringMethod: null, settlementMethod: 'automatic', notes: 'Across every round', resolved: false, winnerIds: null },
    ],
  };
  const chat = [
    { id: 'demo_c1', authorId: brij.id, authorName: brij.name, text: "Anyone else's GPS app dying out here?", ts: Date.now() - 600000 },
    { id: 'demo_c2', authorId: mike.id, authorName: mike.name, text: 'Brij is already under par, somebody stop him', ts: Date.now() - 500000 },
    { id: 'demo_c3', authorId: josh.id, authorName: josh.name, text: 'I need a mulligan on 4. Several mulligans actually.', ts: Date.now() - 400000 },
  ];
  return { tournament, chat, whoamiId: mike.id };
}

/* ============================== DERIVED STATS ============================== */
function computeStats(state) {
  return state.players.map(p => {
    const ch = getCourseHandicap(p, state);
    let strokes = 0, parSum = 0, thru = 0, netStrokes = 0;
    for (let i = 0; i < state.numHoles; i++) {
      const s = state.scores[p.id]?.[i];
      if (s == null) continue;
      const par = state.pars[i] ?? 4;
      strokes += s; parSum += par; thru++;
      netStrokes += s - strokesOnHole(ch, state.strokeIndex, i);
    }
    return { ...p, strokes, parSum, thru, toPar: strokes - parSum, netToPar: netStrokes - parSum, courseHandicap: ch };
  });
}

function computeSkins(state, scoreFn) {
  const players = state.players, value = state.games.skins.value || 0;
  const results = []; let carry = 1;
  const winnings = {}, contributions = {};
  players.forEach(p => { winnings[p.id] = 0; contributions[p.id] = 0; });
  for (let h = 0; h < state.numHoles; h++) {
    const vals = players.map(p => ({ id: p.id, s: scoreFn(p.id, h) }));
    const allIn = players.length > 0 && vals.every(x => x.s != null);
    if (!allIn) { results.push({ hole: h, status: 'pending' }); continue; }
    vals.forEach(x => { contributions[x.id] += value; });
    const min = Math.min(...vals.map(x => x.s));
    const winners = vals.filter(x => x.s === min);
    if (winners.length === 1) { winnings[winners[0].id] += value * players.length * carry; results.push({ hole: h, status: 'won', winnerId: winners[0].id, pot: value * players.length * carry }); carry = 1; }
    else { results.push({ hole: h, status: 'push' }); carry += 1; }
  }
  const net = {}; players.forEach(p => { net[p.id] = winnings[p.id] - contributions[p.id]; });
  return { results, net };
}

function nassauSegments(numHoles) {
  if (numHoles === 18) return [{ label: 'Front 9', range: [0, 9] }, { label: 'Back 9', range: [9, 18] }, { label: 'Total', range: [0, 18] }];
  return [{ label: 'Overall', range: [0, numHoles] }];
}
function computeNassau(state, scoreFn) {
  const players = state.players, value = state.games.nassau.value || 0;
  const net = {}; players.forEach(p => { net[p.id] = 0; });
  const segmentResults = nassauSegments(state.numHoles).map(seg => {
    const [start, end] = seg.range;
    if (players.length === 0) return { ...seg, status: 'pending', totals: [] };
    const totals = players.map(p => {
      let sum = 0, parSum = 0, complete = true;
      for (let i = start; i < end; i++) { const s = scoreFn(p.id, i); if (s == null) { complete = false; break; } sum += s; parSum += (state.pars[i] ?? 4); }
      return { id: p.id, toPar: sum - parSum, complete };
    });
    if (!totals.every(t => t.complete)) return { ...seg, status: 'pending', totals };
    const min = Math.min(...totals.map(t => t.toPar));
    const winners = totals.filter(t => t.toPar === min);
    if (winners.length === 1) { net[winners[0].id] += value * (players.length - 1); players.forEach(p => { if (p.id !== winners[0].id) net[p.id] -= value; }); return { ...seg, status: 'won', winnerId: winners[0].id, totals }; }
    return { ...seg, status: 'push', totals };
  });
  return { segmentResults, net };
}

function stablefordPoints(diff) { if (diff >= 2) return 0; if (diff === 1) return 1; if (diff === 0) return 2; if (diff === -1) return 3; if (diff === -2) return 4; return 5; }
function computeStableford(state, scoreFn) {
  const totals = {};
  state.players.forEach(p => {
    let pts = 0, thru = 0;
    for (let i = 0; i < state.numHoles; i++) { const s = scoreFn(p.id, i); if (s == null) continue; pts += stablefordPoints(s - (state.pars[i] ?? 4)); thru++; }
    totals[p.id] = { points: pts, thru };
  });
  const value = state.games.stableford.value || 0, ids = state.players.map(p => p.id);
  const avg = ids.length ? ids.reduce((a, id) => a + totals[id].points, 0) / ids.length : 0;
  const net = {}; ids.forEach(id => { net[id] = value * (totals[id].points - avg); });
  return { totals, net };
}

function sideNames(ids, state) { return ids.map(id => state.players.find(p => p.id === id)?.name || '?').join(' & '); }
function matchSideScore(side, scoreFn, holeIdx) { const vals = side.map(id => scoreFn(id, holeIdx)).filter(v => v != null); return vals.length ? Math.min(...vals) : null; }
function buildMatchScoreFn(match, state) {
  const allIds = [...match.sideA, ...match.sideB]; const chMap = {};
  allIds.forEach(id => { const p = state.players.find(pp => pp.id === id); chMap[id] = p ? getCourseHandicap(p, state) : 0; });
  const minCh = allIds.length ? Math.min(...allIds.map(id => chMap[id])) : 0;
  return (playerId, holeIdx) => { const g = state.scores[playerId]?.[holeIdx]; if (g == null) return null; return g - strokesOnHole((chMap[playerId] || 0) - minCh, state.strokeIndex, holeIdx); };
}
function computeMatch(match, state) {
  const scoreFn = buildMatchScoreFn(match, state);
  let upA = 0; const log = []; let decidedAt = null;
  for (let h = 0; h < state.numHoles; h++) {
    const a = matchSideScore(match.sideA, scoreFn, h), b = matchSideScore(match.sideB, scoreFn, h);
    if (a == null || b == null) { log.push({ hole: h, status: 'pending' }); continue; }
    if (a < b) { upA++; log.push({ hole: h, status: 'A' }); } else if (b < a) { upA--; log.push({ hole: h, status: 'B' }); } else log.push({ hole: h, status: 'halved' });
    const remaining = state.numHoles - (h + 1);
    if (decidedAt == null && Math.abs(upA) > remaining) decidedAt = { hole: h, upA, remaining };
  }
  const holesPlayed = log.filter(l => l.status !== 'pending').length;
  const finished = !!decidedAt || holesPlayed === state.numHoles;
  return { upA, log, decidedAt, holesPlayed, finished, outcome: finished ? (upA > 0 ? 'A' : upA < 0 ? 'B' : 'halved') : null };
}
function describeMatch(m, state, r) {
  const aN = sideNames(m.sideA, state), bN = sideNames(m.sideB, state);
  if (r.upA === 0) return `${aN} halved with ${bN}.`;
  const winner = r.upA > 0 ? aN : bN, loser = r.upA > 0 ? bN : aN;
  if (r.decidedAt) return `${winner} beat ${loser} ${Math.abs(r.decidedAt.upA)}&${r.decidedAt.remaining}.`;
  return `${winner} beat ${loser} ${Math.abs(r.upA)} up.`;
}
function computeMatchplay(state) {
  const net = {}; state.players.forEach(p => { net[p.id] = 0; });
  const value = state.games.matchplay.value || 0;
  const results = (state.games.matchplay.matches || []).map(m => {
    const r = computeMatch(m, state);
    const perMatchNet = {};
    if (r.outcome === 'A') {
      m.sideA.forEach(id => { net[id] += value / m.sideA.length; perMatchNet[id] = value / m.sideA.length; });
      m.sideB.forEach(id => { net[id] -= value / m.sideB.length; perMatchNet[id] = -value / m.sideB.length; });
    } else if (r.outcome === 'B') {
      m.sideB.forEach(id => { net[id] += value / m.sideB.length; perMatchNet[id] = value / m.sideB.length; });
      m.sideA.forEach(id => { net[id] -= value / m.sideA.length; perMatchNet[id] = -value / m.sideA.length; });
    } else {
      [...m.sideA, ...m.sideB].forEach(id => { perMatchNet[id] = 0; });
    }
    return { ...m, ...r, perMatchNet };
  });
  return { results, net };
}
function computeTeamRace(state, matchResults) {
  if (!state.flights || state.flights.length !== 2) return null;
  const [f1, f2] = state.flights; const points = { [f1.id]: 0, [f2.id]: 0 };
  const sideFlight = (side) => { const counts = {}; side.forEach(id => { const p = state.players.find(pp => pp.id === id); if (p?.flightId) counts[p.flightId] = (counts[p.flightId] || 0) + 1; }); return Object.keys(counts).sort((a, b) => counts[b] - counts[a])[0]; };
  matchResults.forEach(m => {
    if (!m.finished) return;
    const fa = sideFlight(m.sideA), fb = sideFlight(m.sideB);
    if (m.outcome === 'A' && fa) points[fa] = (points[fa] || 0) + 1;
    else if (m.outcome === 'B' && fb) points[fb] = (points[fb] || 0) + 1;
    else if (m.outcome === 'halved') { if (fa) points[fa] = (points[fa] || 0) + 0.5; if (fb) points[fb] = (points[fb] || 0) + 0.5; }
  });
  const total = (state.games.matchplay.matches || []).length;
  return { f1, f2, points, total, target: total / 2 + 0.5 };
}

/* ---- Ryder Cup: reuses flights + match play, just aggregates team points round-by-round ---- */
function computeRyderCupStandings(tournament) {
  const rc = tournament.ryderCup;
  if (!rc || !rc.enabled || !tournament.flights || tournament.flights.length !== 2) return null;
  const [teamA, teamB] = tournament.flights;
  const rows = tournament.rounds.map(round => {
    const matches = round.games.matchplay.matches || [];
    if (!round.games.matchplay.enabled || matches.length === 0) return { roundId: round.id, name: round.name, aPts: 0, bPts: 0, matchCount: 0, anyPlayed: false };
    const rv = getRoundView(tournament, round.id);
    const matchplay = computeMatchplay(rv);
    const teamRace = computeTeamRace(rv, matchplay.results);
    return {
      roundId: round.id, name: round.name, matchCount: matches.length,
      aPts: teamRace ? (teamRace.points[teamA.id] || 0) : 0, bPts: teamRace ? (teamRace.points[teamB.id] || 0) : 0,
      anyPlayed: matchplay.results.some(m => m.holesPlayed > 0),
    };
  });
  const totalA = rows.reduce((s, r) => s + r.aPts, 0), totalB = rows.reduce((s, r) => s + r.bPts, 0);
  const totalMatches = rows.reduce((s, r) => s + r.matchCount, 0);
  return { teamA, teamB, rows, totalA, totalB, totalMatches, target: totalMatches > 0 ? totalMatches / 2 + 0.5 : null };
}
function makeSetRyderCup(updateTournament) {
  return (field, val) => updateTournament(prev => {
    const base = prev.ryderCup || { enabled: false, teamAName: 'USA', teamBName: 'Europe', totalPlayers: null };
    const rc = { ...base, [field]: val };
    let flights = prev.flights;
    if (rc.enabled) {
      flights = flights.length === 2
        ? flights.map((f, i) => ({ ...f, name: i === 0 ? rc.teamAName : rc.teamBName }))
        : [{ id: 'f1', name: rc.teamAName, color: FLIGHT_COLORS[0] }, { id: 'f2', name: rc.teamBName, color: FLIGHT_COLORS[1] }];
    }
    return { ...prev, ryderCup: rc, flights };
  });
}

/* ============================== ROUND FLOW (pace-of-play command center) ==============================
   Everything here is derived \u2014 current hole, hole-by-hole progress, and pace all come from score
   entries and tee time, never GPS, so they can't drift out of sync with what's actually been scored.
   Functions take plain data (not React state), so the same logic works for a real round's scores or
   the self-contained mock dataset built later in this file. */
const HOLE_DURATION_BY_PAR = { 3: 12, 4: 14, 5: 16 };

function computeGroupCompletedCount(group, scores, numHoles) {
  let completed = 0;
  for (let h = 0; h < numHoles; h++) {
    const allIn = group.playerIds.length > 0 && group.playerIds.every(pid => scores[pid]?.[h] != null);
    if (allIn) completed++; else break;
  }
  return completed;
}
function computeGroupHoleProgress(group, scores, pars, numHoles, betWinnersByHole, scoreUpdatedAt) {
  const holes = [];
  for (let h = 0; h < numHoles; h++) {
    const par = pars[h] ?? 4;
    const playerScores = group.playerIds.map(pid => scores[pid]?.[h]).filter(s => s != null);
    const completed = group.playerIds.length > 0 && playerScores.length === group.playerIds.length;
    const hasBirdieOrBetter = playerScores.some(s => s - par <= -1);
    const winnersHere = (betWinnersByHole && betWinnersByHole[h]) || [];
    const winnerPlayerId = group.playerIds.find(pid => winnersHere.includes(pid)) || null;
    const completedAt = completed ? (Math.max(0, ...group.playerIds.map(pid => (scoreUpdatedAt || {})[`${pid}-${h}`] || 0)) || null) : null;
    holes.push({ holeNumber: h + 1, par, completed, scoresEntered: playerScores.length, hasBirdieOrBetter, hasBetWin: !!winnerPlayerId, winnerPlayerId, completedAt });
  }
  return holes;
}
function computeGroupStatus(group, completedCount, numHoles, now) {
  const teeTimeMs = group.teeTime ? new Date(group.teeTime).getTime() : null;
  if (completedCount >= numHoles) return { status: 'finished', currentHole: numHoles, notStarted: false, finished: true };
  if (teeTimeMs != null && now < teeTimeMs && completedCount === 0) return { status: 'not-started', currentHole: null, notStarted: true, finished: false };
  return { status: 'in-progress', currentHole: Math.min(completedCount + 1, numHoles), notStarted: false, finished: false };
}
function computeGroupPace(group, holeProgress, notStarted, finished, now) {
  if (notStarted) return { paceStatus: 'Not Started', deltaMinutes: null, projectedFinishTime: null };
  if (finished) return { paceStatus: 'Finished', deltaMinutes: null, projectedFinishTime: null };
  const teeTimeMs = group.teeTime ? new Date(group.teeTime).getTime() : now;
  const expectedMinutesSoFar = holeProgress.filter(h => h.completed).reduce((sum, h) => sum + (HOLE_DURATION_BY_PAR[h.par] || 14), 0);
  const elapsedMinutes = (now - teeTimeMs) / 60000;
  const delayMinutes = group.delayedMinutes || 0;
  const delta = (elapsedMinutes - delayMinutes) - expectedMinutesSoFar;
  let paceStatus;
  if (delta <= -15) paceStatus = 'Ahead';
  else if (delta <= 10) paceStatus = 'On Pace';
  else if (delta <= 20) paceStatus = 'Slightly Behind';
  else paceStatus = 'Slow';
  const totalExpectedMinutes = holeProgress.reduce((sum, h) => sum + (HOLE_DURATION_BY_PAR[h.par] || 14), 0);
  const projectedFinishTime = teeTimeMs + (totalExpectedMinutes + delta + delayMinutes) * 60000;
  return { paceStatus, deltaMinutes: Math.round(delta), projectedFinishTime };
}
function computeGroupFlow(group, source, betWinnersByHole, now) {
  const numHoles = source.numHoles || 18;
  const scoreUpdatedAt = source.scoreUpdatedAt || {};
  const completedCount = computeGroupCompletedCount(group, source.scores, numHoles);
  const holeProgress = computeGroupHoleProgress(group, source.scores, source.pars, numHoles, betWinnersByHole, scoreUpdatedAt);
  const { status, currentHole, notStarted, finished } = computeGroupStatus(group, completedCount, numHoles, now);
  const effectiveCurrentHole = group.overrideCurrentHole != null ? group.overrideCurrentHole : currentHole;
  const pace = computeGroupPace(group, holeProgress, notStarted, finished, now);
  const stamps = group.playerIds.flatMap(pid => Array.from({ length: numHoles }, (_, h) => scoreUpdatedAt[`${pid}-${h}`] || 0));
  const lastUpdated = Math.max(0, ...stamps) || null;
  return {
    ...group, completedHolesCount: completedCount, currentHole: effectiveCurrentHole, holeProgress,
    status, notStarted, finished, paceStatus: pace.paceStatus, deltaMinutes: pace.deltaMinutes,
    projectedFinishTime: pace.projectedFinishTime, lastUpdated, numHoles,
  };
}
function computeRoundFlowSummary(groupsFlow) {
  const active = groupsFlow.filter(g => !g.notStarted).slice().sort((a, b) => new Date(a.teeTime || 0) - new Date(b.teeTime || 0));
  const finished = groupsFlow.filter(g => g.finished);
  const firstGroup = active[0] || null, lastGroup = active.length ? active[active.length - 1] : null;
  const firstGroupCurrentHole = firstGroup ? firstGroup.currentHole : null;
  const lastGroupCurrentHole = lastGroup ? lastGroup.currentHole : null;
  const holeSpread = (firstGroupCurrentHole != null && lastGroupCurrentHole != null) ? Math.abs(firstGroupCurrentHole - lastGroupCurrentHole) : null;
  const withProjection = groupsFlow.filter(g => g.projectedFinishTime != null);
  const projectedTournamentFinish = withProjection.length ? Math.max(...withProjection.map(g => g.projectedFinishTime)) : null;
  const ranked = groupsFlow.filter(g => !g.notStarted && !g.finished && g.deltaMinutes != null);
  const slowest = ranked.length ? ranked.reduce((a, b) => (b.deltaMinutes > a.deltaMinutes ? b : a)) : null;
  const fastest = ranked.length ? ranked.reduce((a, b) => (b.deltaMinutes < a.deltaMinutes ? b : a)) : null;
  return {
    firstGroupCurrentHole, lastGroupCurrentHole, totalGroups: groupsFlow.length, groupsFinished: finished.length,
    holeSpread, projectedTournamentFinish, slowestGroupId: slowest ? slowest.id : null, fastestGroupId: fastest ? fastest.id : null,
  };
}
/* Pulls "who won a bet on hole N" out of the existing betting engine \u2014 skins (always hole-indexed) plus
   any custom bet that's tied to a specific hole \u2014 so the timeline's money markers reflect real bets,
   not a separate parallel system. */
function computeBetWinnersByHole(state) {
  const byHole = {};
  const add = (hole, winnerIds) => { if (hole == null) return; byHole[hole] = [...(byHole[hole] || []), ...winnerIds]; };
  if (state.games.skins.enabled) {
    computeSkins(state, holeScoreFn(state, state.games.skins.net)).results.forEach(r => { if (r.status === 'won') add(r.hole, [r.winnerId]); });
  }
  (state.customBets || []).forEach(bet => {
    if (bet.holeIndex == null) return;
    const result = computeCustomBet(bet, state);
    if (result.resolved && result.winnerIds) add(bet.holeIndex, result.winnerIds);
  });
  return byHole;
}

/* Self-contained illustrative dataset \u2014 its own 16 players, not tied to the real roster, shown only
   when no real groups have been set up for the active round yet. Covers every required demo scenario:
   one finished group, one on-pace, one slow, one not-started; a few birdies; a few bet wins. */
function generateMockFlowGroups() {
  const now = Date.now();
  const pars = PATTERN_A_PARS;
  const mk = (gid, names) => names.map((name, i) => ({ id: `${gid}_p${i + 1}`, name, handicap: 8 + i * 3, teamId: null }));
  const g1Players = mk('mockflow_g1', ['Alex', 'Jordan', 'Casey', 'Morgan']);
  const g2Players = mk('mockflow_g2', ['Taylor', 'Riley', 'Drew', 'Sam']);
  const g3Players = mk('mockflow_g3', ['Jamie', 'Avery', 'Quinn', 'Reese']);
  const g4Players = mk('mockflow_g4', ['Blake', 'Cameron', 'Skyler', 'Parker']);
  const playersById = {}; [...g1Players, ...g2Players, ...g3Players, ...g4Players].forEach(p => { playersById[p.id] = p; });

  const scores = {
    mockflow_g1_p1: [4,3,3,5,4,3,4,4,4, 4,3,5,4,4,2,4,5,4],
    mockflow_g1_p2: [5,4,3,5,5,4,5,4,5, 5,4,6,5,5,3,5,6,5],
    mockflow_g1_p3: [4,4,4,5,4,3,4,5,4, 4,3,5,4,4,3,4,5,4],
    mockflow_g1_p4: [4,4,3,4,4,3,4,5,4, 4,3,5,3,4,3,4,5,4],
    mockflow_g2_p1: [4,4,3,5,4,3,4,4,4,4],
    mockflow_g2_p2: [5,5,3,6,5,3,4,5,5,5],
    mockflow_g2_p3: [4,4,2,5,4,3,3,5,4,4],
    mockflow_g2_p4: [4,4,3,5,5,4,4,6,4,5],
    mockflow_g3_p1: [5,5,4,6,5,4],
    mockflow_g3_p2: [4,4,3,5,4,3],
    mockflow_g3_p3: [5,4,4,6,5,4],
    mockflow_g3_p4: [4,5,3,5,5,3],
    mockflow_g4_p1: [], mockflow_g4_p2: [], mockflow_g4_p3: [], mockflow_g4_p4: [],
  };
  const scoreUpdatedAt = {};
  Object.entries(scores).forEach(([pid, arr]) => arr.forEach((s, h) => { if (s != null) scoreUpdatedAt[`${pid}-${h}`] = now - (arr.length - h) * 12 * 60000; }));

  const expectedMinutes = (n) => pars.slice(0, n).reduce((sum, p) => sum + (HOLE_DURATION_BY_PAR[p] || 14), 0);
  const groups = [
    { id: 'mockflow_group1', groupNumber: 1, teeTime: new Date(now - 270 * 60000).toISOString(), startingHole: 1, playerIds: g1Players.map(p => p.id), adminNotes: '', delayedMinutes: 0, overrideCurrentHole: null },
    { id: 'mockflow_group2', groupNumber: 2, teeTime: new Date(now - expectedMinutes(10) * 60000).toISOString(), startingHole: 1, playerIds: g2Players.map(p => p.id), adminNotes: '', delayedMinutes: 0, overrideCurrentHole: null },
    { id: 'mockflow_group3', groupNumber: 3, teeTime: new Date(now - (expectedMinutes(6) + 30) * 60000).toISOString(), startingHole: 1, playerIds: g3Players.map(p => p.id), adminNotes: 'Waiting on the group ahead at the par 5', delayedMinutes: 0, overrideCurrentHole: null },
    { id: 'mockflow_group4', groupNumber: 4, teeTime: new Date(now + 15 * 60000).toISOString(), startingHole: 1, playerIds: g4Players.map(p => p.id), adminNotes: '', delayedMinutes: 0, overrideCurrentHole: null },
  ];
  const betWinnersByHole = { 1: ['mockflow_g1_p1'], 4: ['mockflow_g1_p3'], 2: ['mockflow_g2_p3'] };
  return {
    groups, playersById,
    source: { scores, pars, numHoles: 18, scoreUpdatedAt },
    betWinnersByHole,
  };
}


function computeWolf(state, scoreFn) {
  const players = state.players, n = players.length, value = state.games.wolf.value || 0;
  const net = {}; players.forEach(p => { net[p.id] = 0; });
  const results = []; if (n < 3) return { results, net };
  for (let h = 0; h < state.numHoles; h++) {
    const wolfPlayer = players[h % n], choice = state.games.wolf.choices[h];
    const allIn = players.every(p => scoreFn(p.id, h) != null);
    if (!choice || !allIn) { results.push({ hole: h, wolfId: wolfPlayer.id, status: 'pending' }); continue; }
    const others = players.filter(p => p.id !== wolfPlayer.id);
    let wolfTeam, oppTeam, mult = 1;
    if (choice.lone) { wolfTeam = [wolfPlayer.id]; oppTeam = others.map(p => p.id); mult = 2; }
    else { wolfTeam = [wolfPlayer.id, choice.partnerId]; oppTeam = others.filter(p => p.id !== choice.partnerId).map(p => p.id); }
    const wolfBest = Math.min(...wolfTeam.map(id => scoreFn(id, h))), oppBest = Math.min(...oppTeam.map(id => scoreFn(id, h)));
    let status;
    if (wolfBest < oppBest) { status = 'wolf'; wolfTeam.forEach(id => { net[id] += value * mult * oppTeam.length; }); oppTeam.forEach(id => { net[id] -= value * mult * wolfTeam.length; }); }
    else if (oppBest < wolfBest) { status = 'opp'; oppTeam.forEach(id => { net[id] += value * mult * wolfTeam.length; }); wolfTeam.forEach(id => { net[id] -= value * mult * oppTeam.length; }); }
    else status = 'push';
    results.push({ hole: h, wolfId: wolfPlayer.id, lone: !!choice.lone, partnerId: choice.partnerId, status });
  }
  return { results, net };
}

function parimutuelEntrants(state) {
  const pm = state.games.parimutuel;
  if (pm.marketType === 'flights') return state.flights.map(f => ({ id: f.id, name: f.name, color: f.color }));
  return state.players.map(p => ({ id: p.id, name: p.name, color: p.color }));
}
function computeParimutuel(state) {
  const pm = state.games.parimutuel, entrants = parimutuelEntrants(state), tickets = pm.tickets || [];
  const ticketCount = {}, spendByBettor = {};
  entrants.forEach(e => { ticketCount[e.id] = 0; });
  tickets.forEach(t => { ticketCount[t.entrantId] = (ticketCount[t.entrantId] || 0) + t.count; spendByBettor[t.bettorId] = (spendByBettor[t.bettorId] || 0) + t.count * 5; });
  const totalTickets = tickets.reduce((a, t) => a + t.count, 0), pot = totalTickets * 5;
  const stats = computeStats(state);
  let suggestedId = null;
  if (pm.marketType === 'players') {
    const finished = stats.filter(s => s.thru === state.numHoles);
    const pool = (finished.length === state.players.length && state.players.length > 0) ? finished : stats.filter(s => s.thru > 0);
    if (pool.length) suggestedId = [...pool].sort((a, b) => (pm.net ? a.netToPar - b.netToPar : a.toPar - b.toPar))[0].id;
  } else {
    const byFlight = {};
    stats.filter(s => s.thru > 0 && s.flightId).forEach(s => { byFlight[s.flightId] = byFlight[s.flightId] || []; byFlight[s.flightId].push(pm.net ? s.netToPar : s.toPar); });
    let best = Infinity;
    Object.entries(byFlight).forEach(([fid, arr]) => { const avg = arr.reduce((a, b) => a + b, 0) / arr.length; if (avg < best) { best = avg; suggestedId = fid; } });
  }
  let payoutNet = {};
  if (pm.resolved && pm.winnerId) {
    const winnerTickets = ticketCount[pm.winnerId] || 0, perTicket = winnerTickets > 0 ? pot / winnerTickets : 0;
    const grossByBettor = {};
    tickets.forEach(t => { if (t.entrantId === pm.winnerId) grossByBettor[t.bettorId] = (grossByBettor[t.bettorId] || 0) + t.count * perTicket; });
    new Set(tickets.map(t => t.bettorId)).forEach(id => { payoutNet[id] = (grossByBettor[id] || 0) - (spendByBettor[id] || 0); });
  }
  return { entrants, ticketCount, spendByBettor, totalTickets, pot, suggestedId, payoutNet };
}

/* ============================== UNIVERSAL BETTING ENGINE ==============================
   Every enabled game (and every custom bet) becomes a standard Bet record. Builders take a
   round VIEW (flat, like the old single-round state) plus the tournament code and the actual
   round id, so each Bet can be traced back to exactly which day it came from. */
const BET_TYPES = {
  HEAD_TO_HEAD: 'Head-to-Head', GROUP_LOW_SCORE: 'Group Low Score', NASSAU: 'Nassau',
  WOLF: 'Wolf', SKINS: 'Skins', STABLEFORD: 'Stableford', PARIMUTUEL: 'Pari-Mutuel',
  CLOSEST_TO_PIN: 'Closest to Pin', LONGEST_DRIVE: 'Longest Drive', BIRDIE_POT: 'Birdie Pot', CUSTOM: 'Custom',
};
function buildSkinsBets(state, tournamentId, roundId) {
  const g = state.games.skins; if (!g.enabled) return [];
  const skins = computeSkins(state, holeScoreFn(state, g.net));
  const pending = skins.results.some(r => r.status === 'pending');
  return [{
    id: `bet-skins-${roundId}`, tournamentId, roundId, betName: `Skins \u00b7 ${state.roundName}`, betType: BET_TYPES.SKINS,
    participants: state.players.map(p => p.id), fakeMoneyStake: g.value * state.players.length,
    scoringMethod: g.net ? 'net' : 'gross', settlementMethod: 'automatic',
    currentStatus: pending ? 'pending' : 'settled',
    winningPlayer: Object.entries(skins.net).filter(([, v]) => v > 0).map(([id]) => id),
    calculatedPayout: skins.net, notes: `$${g.value} per hole, ties carry over`,
  }];
}
function buildNassauBets(state, tournamentId, roundId) {
  const g = state.games.nassau; if (!g.enabled) return [];
  const nassau = computeNassau(state, holeScoreFn(state, g.net));
  const ids = state.players.map(p => p.id);
  return nassau.segmentResults.map((seg, i) => {
    const payout = {}; ids.forEach(id => { payout[id] = 0; });
    if (seg.status === 'won') ids.forEach(id => { payout[id] = id === seg.winnerId ? g.value * (ids.length - 1) : -g.value; });
    return {
      id: `bet-nassau-${roundId}-${i}`, tournamentId, roundId, betName: `Nassau \u2013 ${seg.label} \u00b7 ${state.roundName}`, betType: BET_TYPES.NASSAU,
      participants: ids, fakeMoneyStake: g.value * (ids.length - 1), scoringMethod: g.net ? 'net' : 'gross', settlementMethod: 'automatic',
      currentStatus: seg.status === 'pending' ? 'pending' : 'settled',
      winningPlayer: seg.status === 'won' ? seg.winnerId : (seg.status === 'push' ? ids : null),
      calculatedPayout: payout, notes: seg.status === 'push' ? 'Tied \u2014 push' : '',
    };
  });
}
function buildStablefordBets(state, tournamentId, roundId) {
  const g = state.games.stableford; if (!g.enabled) return [];
  const stableford = computeStableford(state, holeScoreFn(state, g.net));
  const allFinished = state.players.length > 0 && computeStats(state).every(s => s.thru === state.numHoles);
  return [{
    id: `bet-stableford-${roundId}`, tournamentId, roundId, betName: `Stableford \u00b7 ${state.roundName}`, betType: BET_TYPES.STABLEFORD,
    participants: state.players.map(p => p.id), fakeMoneyStake: g.value, scoringMethod: 'points', settlementMethod: 'automatic',
    currentStatus: allFinished ? 'settled' : 'pending',
    winningPlayer: Object.entries(stableford.net).filter(([, v]) => v > 0).map(([id]) => id),
    calculatedPayout: stableford.net, notes: `$${g.value} per point above the field average`,
  }];
}
function buildMatchplayBets(state, tournamentId, roundId) {
  const g = state.games.matchplay; if (!g.enabled) return [];
  const matchplay = computeMatchplay(state);
  return matchplay.results.map(m => {
    const isH2H = m.sideA.length === 1 && m.sideB.length === 1;
    return {
      id: `bet-match-${roundId}-${m.id}`, tournamentId, roundId,
      betName: `${sideNames(m.sideA, state)} vs ${sideNames(m.sideB, state)} \u00b7 ${state.roundName}`,
      betType: isH2H ? BET_TYPES.HEAD_TO_HEAD : BET_TYPES.GROUP_LOW_SCORE,
      participants: [...m.sideA, ...m.sideB], fakeMoneyStake: g.value, scoringMethod: 'net', settlementMethod: 'automatic',
      currentStatus: m.finished ? 'settled' : 'pending',
      winningPlayer: !m.finished ? null : (m.outcome === 'halved' ? [...m.sideA, ...m.sideB] : (m.outcome === 'A' ? m.sideA : m.sideB)),
      calculatedPayout: m.perMatchNet || {},
      notes: m.finished ? describeMatch(m, state, m) : (m.upA === 0 ? `All square thru ${m.holesPlayed}` : `${Math.abs(m.upA)} UP thru ${m.holesPlayed}`),
    };
  });
}
function buildWolfBets(state, tournamentId, roundId) {
  const g = state.games.wolf; if (!g.enabled || state.players.length < 3) return [];
  const wolf = computeWolf(state, holeScoreFn(state, g.net));
  const pending = wolf.results.some(r => r.status === 'pending');
  return [{
    id: `bet-wolf-${roundId}`, tournamentId, roundId, betName: `Wolf \u00b7 ${state.roundName}`, betType: BET_TYPES.WOLF,
    participants: state.players.map(p => p.id), fakeMoneyStake: g.value, scoringMethod: g.net ? 'net' : 'gross', settlementMethod: 'automatic',
    currentStatus: pending ? 'pending' : 'settled',
    winningPlayer: Object.entries(wolf.net).filter(([, v]) => v > 0).map(([id]) => id),
    calculatedPayout: wolf.net, notes: `$${g.value} per point, rotates each hole`,
  }];
}
function buildParimutuelBets(state, tournamentId, roundId) {
  const g = state.games.parimutuel; if (!g.enabled) return [];
  const pmData = computeParimutuel(state);
  const bettorIds = Array.from(new Set((g.tickets || []).map(t => t.bettorId)));
  return [{
    id: `bet-parimutuel-${roundId}`, tournamentId, roundId, betName: `Pari-Mutuel \u00b7 ${state.roundName}`, betType: BET_TYPES.PARIMUTUEL,
    participants: bettorIds, fakeMoneyStake: pmData.pot, scoringMethod: 'pool', settlementMethod: 'manual',
    currentStatus: g.resolved ? 'settled' : 'pending',
    winningPlayer: g.resolved ? g.winnerId : null,
    calculatedPayout: pmData.payoutNet, notes: `$5/ticket \u00b7 ${pmData.totalTickets} ticket${pmData.totalTickets !== 1 ? 's' : ''} sold`,
  }];
}

/* ---- Bet Builder: custom bets, round-scoped or tournament-wide ---- */
const CUSTOM_BET_CONFIG = {
  headtohead: { label: BET_TYPES.HEAD_TO_HEAD, auto: true, minParticipants: 2, maxParticipants: 2, needsHole: false, needsScoring: true },
  grouplow: { label: BET_TYPES.GROUP_LOW_SCORE, auto: true, minParticipants: 3, maxParticipants: null, needsHole: false, needsScoring: true },
  birdiepot: { label: BET_TYPES.BIRDIE_POT, auto: true, minParticipants: 2, maxParticipants: null, needsHole: false, needsScoring: false },
  closesttopin: { label: BET_TYPES.CLOSEST_TO_PIN, auto: false, minParticipants: 2, maxParticipants: null, needsHole: true, needsScoring: false },
  longestdrive: { label: BET_TYPES.LONGEST_DRIVE, auto: false, minParticipants: 2, maxParticipants: null, needsHole: true, needsScoring: false },
  custom: { label: BET_TYPES.CUSTOM, auto: false, minParticipants: 1, maxParticipants: null, needsHole: false, needsScoring: false },
};
const DEFAULT_BET_TEMPLATES = [
  { id: 'tpl-birdiepot', name: 'Birdie Pot', betType: 'birdiepot', entryAmount: 5, scoringMethod: 'gross', settlementMethod: 'automatic', notes: 'Most birdies-or-better wins the pot' },
  { id: 'tpl-ctp', name: 'Closest to Pin', betType: 'closesttopin', entryAmount: 5, scoringMethod: 'gross', settlementMethod: 'manual', notes: '' },
  { id: 'tpl-custom', name: 'Custom Prop Bet', betType: 'custom', entryAmount: 5, scoringMethod: 'gross', settlementMethod: 'manual', notes: '' },
];
function potPayout(participantIds, entryAmount, winnerIds) {
  const payout = {}; participantIds.forEach(id => { payout[id] = -entryAmount; });
  if (!winnerIds || winnerIds.length === 0) { participantIds.forEach(id => { payout[id] = 0; }); return payout; }
  const pot = entryAmount * participantIds.length, share = pot / winnerIds.length;
  winnerIds.forEach(id => { payout[id] = share - entryAmount; });
  return payout;
}
function countBirdiesOrBetter(state, playerId) {
  let n = 0;
  for (let i = 0; i < state.numHoles; i++) { const s = state.scores[playerId]?.[i]; if (s != null && s - (state.pars[i] ?? 4) <= -1) n++; }
  return n;
}
function computeCustomBet(bet, state) {
  const ids = bet.participants;
  if (bet.settlementMethod === 'manual') {
    if (!bet.resolved) return { resolved: false, winnerIds: null, payout: potPayout(ids, bet.entryAmount, null) };
    return { resolved: true, winnerIds: bet.winnerIds, payout: potPayout(ids, bet.entryAmount, bet.winnerIds) };
  }
  const stats = computeStats(state);
  const relevant = ids.map(id => stats.find(s => s.id === id)).filter(Boolean);
  const allFinished = relevant.length === ids.length && relevant.every(s => s.thru === state.numHoles);
  if (!allFinished) return { resolved: false, winnerIds: null, payout: potPayout(ids, bet.entryAmount, null) };
  if (bet.betType === 'headtohead' || bet.betType === 'grouplow') {
    const valueFor = (s) => bet.scoringMethod === 'net' ? s.netToPar : s.toPar;
    const min = Math.min(...relevant.map(valueFor));
    const winners = relevant.filter(s => valueFor(s) === min).map(s => s.id);
    return { resolved: true, winnerIds: winners, payout: potPayout(ids, bet.entryAmount, winners) };
  }
  if (bet.betType === 'birdiepot') {
    const counts = ids.map(id => ({ id, n: countBirdiesOrBetter(state, id) }));
    const max = Math.max(...counts.map(c => c.n));
    if (max === 0) return { resolved: true, winnerIds: [], payout: ids.reduce((acc, id) => { acc[id] = 0; return acc; }, {}) };
    const winners = counts.filter(c => c.n === max).map(c => c.id);
    return { resolved: true, winnerIds: winners, payout: potPayout(ids, bet.entryAmount, winners) };
  }
  return { resolved: false, winnerIds: null, payout: potPayout(ids, bet.entryAmount, null) };
}
function buildCustomBets(state, tournamentId, roundId) {
  return (state.customBets || []).map(bet => {
    const result = computeCustomBet(bet, state);
    return {
      id: `bet-custom-${roundId}-${bet.id}`, tournamentId, roundId, betName: `${bet.betName} \u00b7 ${state.roundName}`,
      betType: CUSTOM_BET_CONFIG[bet.betType]?.label || BET_TYPES.CUSTOM,
      participants: bet.participants, fakeMoneyStake: bet.entryAmount * bet.participants.length,
      scoringMethod: bet.scoringMethod || 'manual', settlementMethod: bet.settlementMethod,
      currentStatus: result.resolved ? 'settled' : 'pending',
      winningPlayer: result.winnerIds, calculatedPayout: result.payout,
      notes: bet.notes || '', holeIndex: bet.holeIndex, sourceBet: bet,
    };
  });
}
function buildBetsFromState(state, tournamentId, roundId) {
  return [
    ...buildSkinsBets(state, tournamentId, roundId), ...buildNassauBets(state, tournamentId, roundId), ...buildStablefordBets(state, tournamentId, roundId),
    ...buildMatchplayBets(state, tournamentId, roundId), ...buildWolfBets(state, tournamentId, roundId), ...buildParimutuelBets(state, tournamentId, roundId),
    ...buildCustomBets(state, tournamentId, roundId),
  ];
}

/* ---- Tournament-wide aggregation: stats and custom bets that span every round ---- */
function aggregateStatsAcrossRounds(tournament, participantIds) {
  return participantIds.map(id => {
    const player = tournament.players.find(p => p.id === id) || {};
    let strokes = 0, parSum = 0, netStrokes = 0, birdies = 0, roundsStarted = 0, allFinished = true;
    tournament.rounds.forEach(round => {
      if (!round.started) return;
      roundsStarted++;
      const rv = getRoundView(tournament, round.id);
      const ch = getCourseHandicap(player, rv);
      let thru = 0;
      for (let i = 0; i < round.numHoles; i++) {
        const s = round.scores[id]?.[i];
        if (s == null) continue;
        thru++;
        const par = round.pars[i] ?? 4;
        strokes += s; parSum += par;
        netStrokes += s - strokesOnHole(ch, round.strokeIndex, i);
        if (s - par <= -1) birdies++;
      }
      if (thru < round.numHoles) allFinished = false;
    });
    return { id, toPar: strokes - parSum, netToPar: netStrokes - parSum, birdies, allFinished: roundsStarted > 0 && allFinished, roundsStarted };
  });
}
function computeTournamentCustomBet(bet, tournament) {
  const ids = bet.participants;
  if (bet.settlementMethod === 'manual') {
    if (!bet.resolved) return { resolved: false, winnerIds: null, payout: potPayout(ids, bet.entryAmount, null) };
    return { resolved: true, winnerIds: bet.winnerIds, payout: potPayout(ids, bet.entryAmount, bet.winnerIds) };
  }
  const agg = aggregateStatsAcrossRounds(tournament, ids);
  const allFinished = agg.length === ids.length && agg.every(a => a.allFinished) && agg.every(a => a.roundsStarted > 0);
  if (!allFinished) return { resolved: false, winnerIds: null, payout: potPayout(ids, bet.entryAmount, null) };
  if (bet.betType === 'headtohead' || bet.betType === 'grouplow') {
    const valueFor = (a) => bet.scoringMethod === 'net' ? a.netToPar : a.toPar;
    const min = Math.min(...agg.map(valueFor));
    const winners = agg.filter(a => valueFor(a) === min).map(a => a.id);
    return { resolved: true, winnerIds: winners, payout: potPayout(ids, bet.entryAmount, winners) };
  }
  if (bet.betType === 'birdiepot') {
    const max = Math.max(...agg.map(a => a.birdies));
    if (max === 0) return { resolved: true, winnerIds: [], payout: ids.reduce((acc, id) => { acc[id] = 0; return acc; }, {}) };
    const winners = agg.filter(a => a.birdies === max).map(a => a.id);
    return { resolved: true, winnerIds: winners, payout: potPayout(ids, bet.entryAmount, winners) };
  }
  return { resolved: false, winnerIds: null, payout: potPayout(ids, bet.entryAmount, null) };
}
function buildTournamentCustomBets(tournament, tournamentId) {
  return (tournament.tournamentCustomBets || []).map(bet => {
    const result = computeTournamentCustomBet(bet, tournament);
    return {
      id: `bet-tcustom-${bet.id}`, tournamentId, roundId: null, betName: `${bet.betName} \u00b7 whole trip`,
      betType: CUSTOM_BET_CONFIG[bet.betType]?.label || BET_TYPES.CUSTOM,
      participants: bet.participants, fakeMoneyStake: bet.entryAmount * bet.participants.length,
      scoringMethod: bet.scoringMethod || 'manual', settlementMethod: bet.settlementMethod,
      currentStatus: result.resolved ? 'settled' : 'pending',
      winningPlayer: result.winnerIds, calculatedPayout: result.payout,
      notes: bet.notes || '', sourceBet: bet,
    };
  });
}
function buildTournamentBets(tournament, tournamentId) {
  const perRound = tournament.rounds.flatMap(round => buildBetsFromState(getRoundView(tournament, round.id), tournamentId, round.id));
  return [...perRound, ...buildTournamentCustomBets(tournament, tournamentId)];
}

/* ============================== SETTLEMENT ENGINE ==============================
   Folds every Bet's payout (from every round, plus tournament-wide bets) into one ledger
   per player \u2014 netPosition is a running total exactly like each game already kept, just
   centralized across the whole trip instead of one round at a time. */
function buildPlayerLedger(players, bets) {
  const ledger = {};
  players.forEach(p => { ledger[p.id] = { playerId: p.id, name: p.name, totalWon: 0, totalLost: 0, netPosition: 0, pendingBets: 0, settledBets: 0 }; });
  bets.forEach(bet => {
    bet.participants.forEach(pid => {
      if (!ledger[pid]) return;
      const amt = bet.calculatedPayout[pid] || 0;
      ledger[pid].netPosition += amt;
      if (amt > 0) ledger[pid].totalWon += amt; else if (amt < 0) ledger[pid].totalLost += Math.abs(amt);
      if (bet.currentStatus === 'pending') ledger[pid].pendingBets += 1; else ledger[pid].settledBets += 1;
    });
  });
  return ledger;
}
function settleUp(players, net) {
  const creditors = players.map(p => ({ name: p.name, amt: net[p.id] || 0 })).filter(x => x.amt > 0.01).sort((a, b) => b.amt - a.amt);
  const debtors = players.map(p => ({ name: p.name, amt: -(net[p.id] || 0) })).filter(x => x.amt > 0.01).sort((a, b) => b.amt - a.amt);
  const txns = []; let i = 0, j = 0;
  while (i < debtors.length && j < creditors.length) {
    const pay = Math.min(debtors[i].amt, creditors[j].amt);
    txns.push({ from: debtors[i].name, to: creditors[j].name, amt: pay });
    debtors[i].amt -= pay; creditors[j].amt -= pay;
    if (debtors[i].amt < 0.01) i++; if (creditors[j].amt < 0.01) j++;
  }
  return txns;
}

/* ============================== ROUND LIFECYCLE (workflow layer) ============================== */
function getRoundPhase(state, stats, bets) {
  if (state.players.length === 0 || !state.started) return 'setup';
  const anyStarted = stats.some(s => s.thru > 0);
  const allFinished = stats.length > 0 && stats.every(s => s.thru === state.numHoles);
  if (!allFinished) return anyStarted ? 'in-progress' : 'pre-round';
  return bets.some(b => b.currentStatus === 'pending') ? 'wrapping-up' : 'complete';
}
function getNextStep(phase, state, whoami, isAdmin) {
  const pm = state.games.parimutuel;
  if (phase === 'pre-round' || phase === 'in-progress') {
    if (!isAdmin && !whoami) return { text: 'Pick your name on the Card tab so DuffBook knows whose score is whose.', action: 'card' };
    if (pm.enabled && !pm.resolved) {
      const stats = computeStats(state);
      const bettingOpen = !stats.some(s => s.thru > pm.lockAfterHole);
      const myTickets = whoami ? (pm.tickets || []).some(t => t.bettorId === whoami.id) : false;
      if (bettingOpen && whoami && !myTickets) return { text: `Betting closes after hole ${pm.lockAfterHole} \u2014 get your tickets in.`, action: 'bets' };
    }
    return null;
  }
  if (phase === 'wrapping-up') {
    return isAdmin
      ? { text: "Round's done \u2014 a few bets still need a winner declared.", action: 'bets' }
      : { text: "Round's done \u2014 waiting on the admin to settle a couple of bets.", action: 'bets' };
  }
  if (phase === 'complete') return { text: "Round's complete \u2014 see the final wrap-up.", action: 'wrapup' };
  return null;
}

/* ============================== SMALL UI ATOMS ============================== */
function Chip({ color, children }) {
  return <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, borderRadius: 999, background: color || C.gold, color: C.pineDark, fontFamily: 'Oswald, sans-serif', fontWeight: 600, fontSize: 12, flexShrink: 0 }}>{children}</span>;
}
function IconBadge({ icon: Icon, color, size }) {
  const s = size || 30;
  return (
    <span style={{ width: s, height: s, borderRadius: 9, background: color || C.gold, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 2px 0 rgba(0,0,0,0.35)' }}>
      <Icon size={Math.round(s * 0.5)} color={C.pineDark} strokeWidth={2.4} />
    </span>
  );
}
function GoldButton({ children, onClick, disabled, style }) {
  return <button onClick={onClick} disabled={disabled} style={{ background: disabled ? C.turfBorder : C.gold, color: C.pineDark, fontFamily: 'Oswald, sans-serif', fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase', border: 'none', borderRadius: 12, padding: '11px 16px', fontSize: 14, cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.6 : 1, boxShadow: disabled ? 'none' : '0 3px 0 rgba(0,0,0,0.35)', ...style }}>{children}</button>;
}
function GhostButton({ children, onClick, style }) {
  return <button onClick={onClick} style={{ background: 'transparent', color: C.ivory, border: `1px solid ${C.turfBorder}`, borderRadius: 10, padding: '9px 14px', fontSize: 13, fontFamily: 'Inter, sans-serif', cursor: 'pointer', ...style }}>{children}</button>;
}
const rowCard = { background: C.turf, border: `1px solid ${C.turfBorder}`, borderRadius: 12, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 };
const inputStyle = { background: C.pineDark, border: `1px solid ${C.turfBorder}`, borderRadius: 8, color: C.ivory, padding: '9px 12px', fontSize: 16, fontFamily: 'Inter, sans-serif', width: '100%', boxSizing: 'border-box' };
const stepBtnStyle = { width: 32, height: 32, borderRadius: 8, background: C.pineDark, border: `1px solid ${C.turfBorder}`, color: C.ivory, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 };
function Field({ label, children }) { return <div style={{ marginBottom: 18 }}><div style={{ fontSize: 11, color: C.ivoryDim, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>{label}</div>{children}</div>; }
function SectionHeader({ title, sub, icon, iconColor }) {
  return (
    <div style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 10 }}>
      {icon && <IconBadge icon={icon} color={iconColor} />}
      <div style={{ minWidth: 0 }}>
        <div style={{ fontFamily: 'Oswald, sans-serif', fontSize: 18, textTransform: 'uppercase', letterSpacing: 0.4, color: C.goldBright }}>{title}</div>
        {sub && <div style={{ fontSize: 12, color: C.ivoryDim }}>{sub}</div>}
      </div>
    </div>
  );
}
function ToggleRow({ label, sub, enabled, onToggle, right }) {
  return (
    <div style={{ ...rowCard, justifyContent: 'space-between', marginBottom: 8, flexWrap: 'wrap' }}>
      <button onClick={onToggle} style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'transparent', border: 'none', cursor: 'pointer', color: C.ivory, textAlign: 'left', flex: 1, minWidth: 0 }}>
        <span style={{ width: 18, height: 18, borderRadius: 5, border: `1.5px solid ${enabled ? C.gold : C.turfBorder}`, background: enabled ? C.gold : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{enabled && <Check size={13} color={C.pineDark} />}</span>
        <span style={{ minWidth: 0 }}><div style={{ fontSize: 14, fontWeight: 600 }}>{label}</div>{sub && <div style={{ fontSize: 11, color: C.ivoryDim }}>{sub}</div>}</span>
      </button>
      {right}
    </div>
  );
}
function Accordion({ title, badge, defaultOpen, children }) {
  const [open, setOpen] = useState(!!defaultOpen);
  return (
    <div style={{ marginBottom: 14, border: `1px solid ${C.turfBorder}`, borderRadius: 12, overflow: 'hidden' }}>
      <button onClick={() => setOpen(o => !o)} style={{ width: '100%', background: C.turf, border: 'none', padding: '12px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', color: C.ivory }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontFamily: 'Oswald, sans-serif', fontSize: 14, textTransform: 'uppercase', letterSpacing: 0.4 }}>{title}</span>
          {badge !== undefined && <span style={{ fontSize: 11, color: C.goldBright, background: C.pineDark, borderRadius: 999, padding: '2px 8px' }}>{badge}</span>}
        </span>
        {open ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
      </button>
      {open && <div style={{ padding: 14, background: C.pine }}>{children}</div>}
    </div>
  );
}
function DollarInput({ value, onChange }) {
  return <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ color: C.ivoryDim, fontSize: 13 }}>$</span><input type="number" value={value} min={0} onChange={e => onChange(parseFloat(e.target.value || '0'))} style={{ ...inputStyle, width: 56, padding: '6px 8px' }} /></div>;
}
function NetToggle({ value, onChange }) {
  return <div style={{ display: 'flex', gap: 6, marginBottom: 8, marginLeft: 28 }}>{['Gross', 'Net'].map(label => { const isNet = label === 'Net'; return <button key={label} onClick={() => onChange(isNet)} style={{ fontSize: 11, padding: '4px 9px', borderRadius: 7, border: `1px solid ${value === isNet ? C.gold : C.turfBorder}`, background: value === isNet ? C.gold : 'transparent', color: value === isNet ? C.pineDark : C.ivoryDim, cursor: 'pointer' }}>{label}</button>; })}</div>;
}
function IdentityPicker({ state, onPick, onAddSelf }) {
  const [name, setName] = useState('');
  return (
    <div style={{ ...rowCard, flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
      <span style={{ fontSize: 13, width: '100%' }}>Which player are you?</span>
      {state.players.map(p => <button key={p.id} onClick={() => onPick(p.id)} style={{ background: 'transparent', border: `1px solid ${C.turfBorder}`, borderRadius: 999, padding: 2, cursor: 'pointer' }}><Chip color={p.color}>{initials(p.name)}</Chip></button>)}
      <div style={{ display: 'flex', gap: 6, width: '100%', marginTop: 6 }}>
        <input value={name} onChange={e => setName(e.target.value)} placeholder="Not listed? Add your name" style={{ ...inputStyle, flex: 1, fontSize: 12, padding: '7px 10px' }} />
        <GhostButton onClick={() => { if (name.trim()) { onAddSelf(name.trim()); setName(''); } }} style={{ padding: '7px 12px', fontSize: 12 }}>Add me</GhostButton>
      </div>
    </div>
  );
}

/* ============================== NAV ============================== */
function NavBtn({ icon: Icon, label, active, onClick }) {
  return (
    <button onClick={onClick} style={{ background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, color: active ? C.goldBright : C.ivoryDim, padding: '4px 2px', flex: 1, minWidth: 0 }}>
      <Icon size={18} strokeWidth={active ? 2.4 : 2} />
      <span style={{ fontSize: 9, fontFamily: 'Oswald, sans-serif', letterSpacing: 0.2, textTransform: 'uppercase' }}>{label}</span>
    </button>
  );
}

/* ============================== LANDING ============================== */
function Landing({ onCreate, onJoin, onLoadDemo, myTournaments, onQuickJoin, deviceName, onOpenProfile }) {
  const [code, setCode] = useState('');
  const [loadingDemo, setLoadingDemo] = useState(false);
  return (
    <div style={{ minHeight: '100vh', background: `radial-gradient(ellipse at top, ${C.turf} 0%, ${C.pine} 55%, ${C.pineDark} 100%)`, color: C.ivory, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, fontFamily: 'Inter, sans-serif', textAlign: 'center', overflowX: 'hidden' }}>
      <FontLoader />
      <button onClick={onOpenProfile} style={{ position: 'absolute', top: 16, right: 16, background: C.turf, border: `1px solid ${C.turfBorder}`, borderRadius: 999, padding: '6px 12px', display: 'flex', alignItems: 'center', gap: 6, color: C.ivoryDim, fontSize: 12, cursor: 'pointer' }}><User size={13} /> {deviceName || 'Set your name'}</button>
      <Flag size={42} color={C.gold} style={{ marginBottom: 10 }} />
      <div style={{ fontFamily: 'Anton, sans-serif', fontSize: 38, letterSpacing: 1, textTransform: 'uppercase' }}>DuffBook</div>
      <div style={{ color: C.ivoryDim, marginBottom: 28, fontSize: 14, maxWidth: 280 }}>Live scoring, side games, and trash talk for the trip.</div>
      <GoldButton style={{ width: 240, padding: '14px 0', fontSize: 15, marginBottom: 6 }} onClick={onCreate}>Start a new tournament</GoldButton>
      <div style={{ fontSize: 11, color: C.ivoryDim, marginBottom: 16, maxWidth: 240 }}>Starting one makes you its admin.</div>
      <div style={{ fontSize: 12, color: C.ivoryDim, marginBottom: 8 }}>or join one already in progress</div>
      <div style={{ display: 'flex', gap: 8, width: 260, maxWidth: '100%', marginBottom: 22 }}>
        <input value={code} onChange={e => setCode(e.target.value.toUpperCase())} placeholder="ROUND CODE" style={{ ...inputStyle, textAlign: 'center', letterSpacing: 2 }} />
        <GhostButton onClick={() => code.trim() && onJoin(code.trim())}>Join</GhostButton>
      </div>
      {myTournaments && myTournaments.length > 0 && (
        <div style={{ width: '100%', maxWidth: 320, marginBottom: 22 }}>
          <div style={{ fontSize: 11, color: C.ivoryDim, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>My rounds</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {myTournaments.map(t => (
              <button key={t.code} onClick={() => onQuickJoin(t.code)} style={{ ...rowCard, justifyContent: 'space-between', width: '100%', textAlign: 'left', cursor: 'pointer' }}>
                <span style={{ fontSize: 13 }}>{t.name}</span>
                <span style={{ fontSize: 11, color: C.ivoryDim, letterSpacing: 1 }}>{t.code}</span>
              </button>
            ))}
          </div>
        </div>
      )}
      <button onClick={async () => { setLoadingDemo(true); await onLoadDemo(); }} disabled={loadingDemo} style={{ background: 'transparent', border: 'none', color: C.ivoryDim, fontSize: 12, textDecoration: 'underline', cursor: loadingDemo ? 'default' : 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
        {loadingDemo ? <><Loader2 size={13} className="spin" /> Loading demo round…</> : 'Just want to look around? Try a demo round'}
      </button>
    </div>
  );
}

/* ============================== SCORECARD TAB ============================== */
function MiniCard({ players, state }) {
  const showToggle = state.numHoles === 18;
  const [seg, setSeg] = useState('front');
  const start = seg === 'front' ? 0 : 9;
  const end = showToggle ? start + 9 : state.numHoles;
  const idxs = Array.from({ length: end - start }, (_, i) => start + i);
  const cols = `28px repeat(${idxs.length}, 1fr) 34px`;
  const thCell = { padding: '6px 2px', color: C.ivoryDim, fontSize: 11, textAlign: 'center' };
  const thCellDim = { padding: '2px 2px', color: '#7f9488', fontSize: 9, textAlign: 'center' };
  const tdCell = { padding: '6px 2px', textAlign: 'center', fontSize: 12 };
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
        <div style={{ fontSize: 11, color: C.ivoryDim, textTransform: 'uppercase', letterSpacing: 0.5 }}>{players.length > 1 ? 'Full card' : 'Your card'}</div>
        {showToggle && <div style={{ display: 'flex', gap: 4 }}>{['front', 'back'].map(s => <button key={s} onClick={() => setSeg(s)} style={{ fontSize: 10, padding: '3px 8px', borderRadius: 6, border: `1px solid ${seg === s ? C.gold : C.turfBorder}`, background: seg === s ? C.gold : 'transparent', color: seg === s ? C.pineDark : C.ivoryDim, cursor: 'pointer' }}>{s === 'front' ? 'Front 9' : 'Back 9'}</button>)}</div>}
      </div>
      <div style={{ border: `1px solid ${C.turfBorder}`, borderRadius: 12, overflow: 'hidden', fontFamily: 'IBM Plex Mono, monospace' }}>
        <div style={{ display: 'grid', gridTemplateColumns: cols, background: C.pineDark }}>
          <div style={thCell} />{idxs.map(i => <div key={i} style={thCell}>{i + 1}</div>)}<div style={{ ...thCell, color: C.goldBright }}>Tot</div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: cols, background: C.pineDark }}>
          <div style={thCellDim}>Par</div>{idxs.map(i => <div key={i} style={thCellDim}>{state.pars[i]}</div>)}<div style={thCellDim}>{idxs.reduce((a, i) => a + state.pars[i], 0)}</div>
        </div>
        {players.map(p => {
          const ps = state.scores[p.id] || [], segTotal = idxs.reduce((a, i) => a + (ps[i] || 0), 0);
          return (
            <div key={p.id} style={{ display: 'grid', gridTemplateColumns: cols, borderTop: `1px solid ${C.turfBorder}` }}>
              <div style={{ ...tdCell, textAlign: 'left', color: p.color, fontWeight: 600 }}>{initials(p.name)}</div>
              {idxs.map(i => { const s = ps[i]; const diff = s != null ? s - state.pars[i] : null; return <div key={i} style={{ ...tdCell, color: diff != null && diff < 0 ? C.flagRed : C.ivory }}>{s != null ? s : '\u00b7'}</div>; })}
              <div style={{ ...tdCell, color: C.goldBright, fontWeight: 700 }}>{segTotal || '\u00b7'}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ScorecardTab({ state, h, par, tapPlus, tapMinus, tapCenter, clearScore, goHole, setHole, onOpenScan, isAdmin, whoami, onPick, onAddSelf }) {
  const visiblePlayers = isAdmin ? state.players : (whoami ? [whoami] : []);
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: C.turf, border: `1px solid ${C.turfBorder}`, borderRadius: 14, padding: '10px 8px', marginBottom: 12 }}>
        <button onClick={() => goHole(-1)} style={{ background: 'transparent', border: 'none', color: C.ivory, cursor: 'pointer', padding: 6 }}><ChevronLeft size={22} /></button>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontFamily: 'Anton, sans-serif', fontSize: 32, lineHeight: 1, color: C.ivory }}>HOLE {h + 1}</div>
          <div style={{ fontSize: 12, color: C.goldBright, fontFamily: 'IBM Plex Mono, monospace' }}>PAR {par}</div>
        </div>
        <button onClick={() => goHole(1)} style={{ background: 'transparent', border: 'none', color: C.ivory, cursor: 'pointer', padding: 6 }}><ChevronRight size={22} /></button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(9, 1fr)', gap: 6, marginBottom: 14 }}>
        {state.pars.map((_, i) => <button key={i} onClick={() => setHole(i)} style={{ height: 32, borderRadius: 8, background: i === h ? C.gold : 'transparent', color: i === h ? C.pineDark : C.ivoryDim, border: `1px solid ${i === h ? C.gold : C.turfBorder}`, fontFamily: 'IBM Plex Mono, monospace', fontSize: 13, cursor: 'pointer' }}>{i + 1}</button>)}
      </div>

      {!isAdmin && !whoami && <IdentityPicker state={state} onPick={onPick} onAddSelf={onAddSelf} />}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
        {visiblePlayers.map(p => {
          const val = state.scores[p.id]?.[h], diff = val != null ? val - par : null;
          return (
            <div key={p.id} style={{ background: C.turf, border: `1px solid ${C.turfBorder}`, borderRadius: 12, padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 10 }}>
              <Chip color={p.color}>{initials(p.name)}</Chip>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</div>
                {val != null && <div style={{ fontSize: 11, color: diff < 0 ? C.flagRed : C.ivoryDim }}>{termForDiff(diff)}</div>}
              </div>
              <button onClick={() => tapMinus(p.id, h)} style={stepBtnStyle}><Minus size={16} /></button>
              <button onClick={() => tapCenter(p.id, h)} style={{ width: 46, height: 40, borderRadius: 10, background: C.pineDark, border: `1px solid ${C.turfBorder}`, color: val != null ? (diff < 0 ? C.flagRed : C.ivory) : C.ivoryDim, fontFamily: 'IBM Plex Mono, monospace', fontSize: 18, fontWeight: 600, cursor: 'pointer' }}>{val != null ? val : '\u2013'}</button>
              <button onClick={() => tapPlus(p.id, h)} style={stepBtnStyle}><Plus size={16} /></button>
              {val != null && <button onClick={() => clearScore(p.id, h)} aria-label="Clear" style={{ background: 'transparent', border: 'none', color: C.ivoryDim, cursor: 'pointer', padding: 2 }}><X size={14} /></button>}
            </div>
          );
        })}
        {visiblePlayers.length === 0 && <div style={{ color: C.ivoryDim, fontSize: 13, textAlign: 'center', marginTop: 10 }}>Pick your name above to start entering your score.</div>}
      </div>

      <button onClick={onOpenScan} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', background: 'transparent', border: `1px dashed ${C.turfBorder}`, color: C.ivoryDim, borderRadius: 12, padding: '10px 0', marginBottom: 16, cursor: 'pointer', fontSize: 13 }}><Camera size={16} /> Scan a paper scorecard instead</button>

      {visiblePlayers.length > 0 && <MiniCard players={visiblePlayers} state={state} />}
    </div>
  );
}

/* ============================== LEADERBOARD TAB ============================== */
function LeaderRow({ p, i, useNet, flightColor, showBoth }) {
  const primary = useNet ? p.netToPar : p.toPar;
  const secondary = useNet ? p.toPar : p.netToPar;
  return (
    <div style={{ background: i === 0 && p.thru > 0 ? C.turfLight : C.turf, border: `1px solid ${i === 0 && p.thru > 0 ? C.gold : C.turfBorder}`, borderRadius: 12, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 12 }}>
      <div style={{ fontFamily: 'Oswald, sans-serif', fontSize: 16, color: C.ivoryDim, width: 20 }}>{i + 1}</div>
      <Chip color={p.color}>{initials(p.name)}</Chip>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ fontWeight: 600, fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</span>{flightColor && <span style={{ width: 8, height: 8, borderRadius: 999, background: flightColor }} />}</div>
        <div style={{ fontSize: 11, color: C.ivoryDim }}>{p.thru === 0 ? 'not started' : (p.thru === p.numHoles ? 'F' : `thru ${p.thru}`)}{p.courseHandicap ? ` \u00b7 CH ${p.courseHandicap}` : ''}</div>
      </div>
      <div style={{ textAlign: 'right' }}>
        <div style={{ fontFamily: 'Anton, sans-serif', fontSize: 24, lineHeight: 1.1, color: p.thru === 0 ? C.ivoryDim : primary < 0 ? C.flagRed : C.ivory }}>{p.thru === 0 ? '\u2013' : fmtToPar(primary)}</div>
        {showBoth && p.thru > 0 && <div style={{ fontSize: 10, color: C.ivoryDim, whiteSpace: 'nowrap' }}>{fmtToPar(secondary)} {useNet ? 'gross' : 'net'}</div>}
      </div>
    </div>
  );
}
function LeaderboardTab({ state, stats }) {
  const [useNet, setUseNet] = useState(state.handicapsEnabled);
  const withN = stats.map(s => ({ ...s, numHoles: state.numHoles }));
  const sortFn = (a, b) => (useNet ? a.netToPar - b.netToPar : a.toPar - b.toPar) || (a.strokes - b.strokes);
  const flights = state.flights;
  const groups = flights.length ? flights.map(f => ({ flight: f, list: withN.filter(p => p.flightId === f.id).sort(sortFn) })) : [{ flight: null, list: [...withN].sort(sortFn) }];
  const unassigned = flights.length ? withN.filter(p => !p.flightId).sort(sortFn) : [];
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ fontSize: 11, color: C.ivoryDim, textTransform: 'uppercase', letterSpacing: 0.5 }}>Live leaderboard</div>
        {state.handicapsEnabled && <div style={{ display: 'flex', gap: 6 }}>{['Net', 'Gross'].map(label => { const isNet = label === 'Net'; return <button key={label} onClick={() => setUseNet(isNet)} style={{ fontSize: 11, padding: '5px 10px', borderRadius: 8, border: `1px solid ${useNet === isNet ? C.gold : C.turfBorder}`, background: useNet === isNet ? C.gold : 'transparent', color: useNet === isNet ? C.pineDark : C.ivoryDim, cursor: 'pointer' }}>{label}</button>; })}</div>}
      </div>
      {groups.map(({ flight, list }) => (
        <div key={flight ? flight.id : 'all'} style={{ marginBottom: 16 }}>
          {flight && <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}><span style={{ width: 8, height: 8, borderRadius: 999, background: flight.color }} /><span style={{ fontFamily: 'Oswald, sans-serif', fontSize: 13, textTransform: 'uppercase', color: C.ivoryDim }}>{flight.name}</span></div>}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>{list.map((p, i) => <LeaderRow key={p.id} p={p} i={i} useNet={useNet} flightColor={flight ? flight.color : null} showBoth={state.handicapsEnabled} />)}</div>
        </div>
      ))}
      {unassigned.length > 0 && <div><div style={{ fontFamily: 'Oswald, sans-serif', fontSize: 13, textTransform: 'uppercase', color: C.ivoryDim, marginBottom: 6 }}>Unassigned</div><div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>{unassigned.map((p, i) => <LeaderRow key={p.id} p={p} i={i} useNet={useNet} showBoth={state.handicapsEnabled} />)}</div></div>}
    </div>
  );
}

/* ============================== GAMES TAB ============================== */
function GamesTab({ state }) {
  const g = state.games;
  const skinsFn = holeScoreFn(state, g.skins.net), nassauFn = holeScoreFn(state, g.nassau.net), stablefordFn = holeScoreFn(state, g.stableford.net), wolfFn = holeScoreFn(state, g.wolf.net);
  const skins = g.skins.enabled ? computeSkins(state, skinsFn) : null;
  const nassau = g.nassau.enabled ? computeNassau(state, nassauFn) : null;
  const stableford = g.stableford.enabled ? computeStableford(state, stablefordFn) : null;
  const matchplay = g.matchplay.enabled ? computeMatchplay(state) : null;
  const wolf = g.wolf.enabled ? computeWolf(state, wolfFn) : null;
  const teamRace = matchplay ? computeTeamRace(state, matchplay.results) : null;
  const anyOn = g.skins.enabled || g.nassau.enabled || g.stableford.enabled || g.matchplay.enabled || g.wolf.enabled;
  const playerName = (id) => state.players.find(p => p.id === id)?.name || '—';
  const playerColor = (id) => state.players.find(p => p.id === id)?.color || C.gold;
  if (!anyOn) return <div style={{ color: C.ivoryDim, fontSize: 14, textAlign: 'center', marginTop: 40 }}>No games are turned on for this round.</div>;
  return (
    <div>
      {teamRace && (
        <div style={{ ...rowCard, justifyContent: 'space-between', marginBottom: 18, background: C.turfLight }}>
          <div><div style={{ fontFamily: 'Oswald, sans-serif', fontSize: 13, color: teamRace.f1.color }}>{teamRace.f1.name} {teamRace.points[teamRace.f1.id] || 0}</div><div style={{ fontSize: 10, color: C.ivoryDim }}>first to {teamRace.target}</div></div>
          <Swords size={18} color={C.ivoryDim} />
          <div style={{ textAlign: 'right' }}><div style={{ fontFamily: 'Oswald, sans-serif', fontSize: 13, color: teamRace.f2.color }}>{teamRace.points[teamRace.f2.id] || 0} {teamRace.f2.name}</div><div style={{ fontSize: 10, color: C.ivoryDim }}>{teamRace.total} matches</div></div>
        </div>
      )}
      {g.skins.enabled && skins && (
        <div style={{ marginBottom: 22 }}>
          <SectionHeader title="Skins" sub={`$${g.skins.value} per hole · ${g.skins.net ? 'net' : 'gross'}`} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10 }}>{state.players.map(p => <div key={p.id} style={{ ...rowCard, justifyContent: 'space-between' }}><div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><Chip color={p.color}>{initials(p.name)}</Chip><span style={{ fontSize: 14 }}>{p.name}</span></div><span style={{ fontFamily: 'IBM Plex Mono, monospace', color: (skins.net[p.id] || 0) >= 0 ? C.goldBright : C.flagRed, fontWeight: 600 }}>{fmtMoney(skins.net[p.id] || 0)}</span></div>)}</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {skins.results.map(r => (
              <div key={r.hole} style={{ minWidth: 50, textAlign: 'center', borderRadius: 10, background: r.status === 'won' ? C.turfLight : C.turf, border: `1px solid ${r.status === 'won' ? playerColor(r.winnerId) : C.turfBorder}`, padding: '6px 4px' }}>
                <div style={{ fontSize: 10, color: C.ivoryDim }}>H{r.hole + 1}</div>
                {r.status === 'won' && <><div style={{ fontSize: 11, fontWeight: 700, color: playerColor(r.winnerId) }}>{initials(playerName(r.winnerId))}</div><div style={{ fontSize: 10, color: C.goldBright }}>${r.pot}</div></>}
                {r.status === 'push' && <div style={{ fontSize: 10, color: C.ivoryDim }}>push</div>}
                {r.status === 'pending' && <div style={{ fontSize: 10, color: C.ivoryDim }}>·</div>}
              </div>
            ))}
          </div>
        </div>
      )}
      {g.nassau.enabled && nassau && (
        <div style={{ marginBottom: 22 }}>
          <SectionHeader title="Nassau" sub={`$${g.nassau.value} per segment · ${g.nassau.net ? 'net' : 'gross'}`} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>{nassau.segmentResults.map(seg => <div key={seg.label} style={rowCard}><div style={{ flex: 1 }}><div style={{ fontWeight: 600, fontSize: 14 }}>{seg.label}</div><div style={{ fontSize: 12, color: C.ivoryDim }}>{seg.status === 'pending' ? 'in progress' : seg.status === 'push' ? 'tied — push' : `${playerName(seg.winnerId)} wins`}</div></div>{seg.status === 'won' && <span style={{ color: C.goldBright, fontFamily: 'IBM Plex Mono, monospace', fontWeight: 600 }}>+${g.nassau.value * (state.players.length - 1)}</span>}</div>)}</div>
        </div>
      )}
      {g.stableford.enabled && stableford && (
        <div style={{ marginBottom: 22 }}>
          <SectionHeader title="Stableford" sub={`$${g.stableford.value} per point · ${g.stableford.net ? 'net' : 'gross'}`} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>{[...state.players].sort((a, b) => stableford.totals[b.id].points - stableford.totals[a.id].points).map(p => <div key={p.id} style={{ ...rowCard, justifyContent: 'space-between' }}><div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><Chip color={p.color}>{initials(p.name)}</Chip><span style={{ fontSize: 14 }}>{p.name}</span></div><div style={{ display: 'flex', alignItems: 'center', gap: 14 }}><span style={{ fontSize: 13, color: C.ivoryDim }}>{stableford.totals[p.id].points} pts</span><span style={{ fontFamily: 'IBM Plex Mono, monospace', color: (stableford.net[p.id] || 0) >= 0 ? C.goldBright : C.flagRed, fontWeight: 600 }}>{fmtMoney(stableford.net[p.id] || 0)}</span></div></div>)}</div>
        </div>
      )}
      {g.matchplay.enabled && matchplay && (
        <div style={{ marginBottom: 22 }}>
          <SectionHeader title="Match play" sub={`$${g.matchplay.value} per match · net, low handicap in match plays scratch`} />
          {matchplay.results.length === 0 && <div style={{ color: C.ivoryDim, fontSize: 13 }}>No matches set up yet.</div>}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>{matchplay.results.map(m => <div key={m.id} style={rowCard}><div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 13, fontWeight: 600 }}>{sideNames(m.sideA, state)} <span style={{ color: C.ivoryDim }}>vs</span> {sideNames(m.sideB, state)}</div><div style={{ fontSize: 12, color: C.ivoryDim }}>{m.holesPlayed === 0 ? 'not started' : m.finished ? describeMatch(m, state, m) : (m.upA === 0 ? `All square thru ${m.holesPlayed}` : `${Math.abs(m.upA)} UP thru ${m.holesPlayed}`)}</div></div>{m.finished && m.outcome !== 'halved' && <span style={{ color: C.goldBright, fontFamily: 'IBM Plex Mono, monospace', fontWeight: 600 }}>${g.matchplay.value}</span>}</div>)}</div>
        </div>
      )}
      {g.wolf.enabled && wolf && (
        <div>
          <SectionHeader title="Wolf" sub={`$${g.wolf.value} per point · rotates each hole`} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>{state.players.map(p => <div key={p.id} style={{ ...rowCard, justifyContent: 'space-between' }}><div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><Chip color={p.color}>{initials(p.name)}</Chip><span style={{ fontSize: 14 }}>{p.name}</span></div><span style={{ fontFamily: 'IBM Plex Mono, monospace', color: (wolf.net[p.id] || 0) >= 0 ? C.goldBright : C.flagRed, fontWeight: 600 }}>{fmtMoney(wolf.net[p.id] || 0)}</span></div>)}</div>
        </div>
      )}
    </div>
  );
}

/* ============================== BETS TAB (pari-mutuel + custom bets) ============================== */
function BettorCheckList({ state, whoami, onPick, onAddSelf }) {
  const [name, setName] = useState('');
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 11, color: C.ivoryDim, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>Betting as</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 8 }}>
        {state.players.map(p => {
          const checked = whoami?.id === p.id;
          return (
            <button key={p.id} onClick={() => onPick(p.id)} style={{ ...rowCard, justifyContent: 'flex-start', cursor: 'pointer', width: '100%', textAlign: 'left', border: `1px solid ${checked ? C.gold : C.turfBorder}`, background: checked ? C.turfLight : C.turf }}>
              <span style={{ width: 18, height: 18, borderRadius: 5, border: `1.5px solid ${checked ? C.gold : C.turfBorder}`, background: checked ? C.gold : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{checked && <Check size={13} color={C.pineDark} />}</span>
              <Chip color={p.color}>{initials(p.name)}</Chip>
              <span style={{ fontSize: 14 }}>{p.name}</span>
            </button>
          );
        })}
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        <input value={name} onChange={e => setName(e.target.value)} placeholder="Not listed? Add your name" style={{ ...inputStyle, flex: 1, fontSize: 12, padding: '7px 10px' }} />
        <GhostButton onClick={() => { if (name.trim()) { onAddSelf(name.trim()); setName(''); } }} style={{ padding: '7px 12px', fontSize: 12 }}>Add me</GhostButton>
      </div>
    </div>
  );
}
function CustomBetCard({ bet, result, players, isAdmin, onResolve, onReopen, onRemove }) {
  const cfg = CUSTOM_BET_CONFIG[bet.betType];
  const [pendingWinners, setPendingWinners] = useState(bet.winnerIds || []);
  const toggle = (id) => setPendingWinners(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  const participantsObjs = bet.participants.map(id => players.find(p => p.id === id)).filter(Boolean);
  return (
    <div style={{ ...rowCard, flexDirection: 'column', alignItems: 'stretch' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 600 }}>{bet.betName}</div>
          <div style={{ fontSize: 11, color: C.ivoryDim }}>{cfg?.label} · ${bet.entryAmount}/person{bet.holeIndex != null ? ` · hole ${bet.holeIndex + 1}` : ''}</div>
        </div>
        {isAdmin && <button onClick={() => onRemove(bet.id)} style={{ background: 'transparent', border: 'none', color: C.flagRed, cursor: 'pointer' }}><Trash2 size={14} /></button>}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, margin: '6px 0' }}>
        {participantsObjs.map(p => <Chip key={p.id} color={result.winnerIds && result.winnerIds.includes(p.id) ? C.goldBright : p.color}>{initials(p.name)}</Chip>)}
      </div>
      {!result.resolved ? (
        bet.settlementMethod === 'manual' ? (
          isAdmin ? (
            <div>
              <div style={{ fontSize: 11, color: C.ivoryDim, marginBottom: 6 }}>Tap winner(s), then lock in.</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
                {participantsObjs.map(p => <button key={p.id} onClick={() => toggle(p.id)} style={{ fontSize: 12, padding: '6px 10px', borderRadius: 8, border: `1px solid ${pendingWinners.includes(p.id) ? C.gold : C.turfBorder}`, background: pendingWinners.includes(p.id) ? C.gold : 'transparent', color: pendingWinners.includes(p.id) ? C.pineDark : C.ivory, cursor: 'pointer' }}>{p.name}</button>)}
              </div>
              <GoldButton onClick={() => onResolve(bet.id, pendingWinners)} disabled={pendingWinners.length === 0} style={{ padding: '7px 14px', fontSize: 12 }}>Lock in winner{pendingWinners.length > 1 ? 's' : ''}</GoldButton>
            </div>
          ) : <div style={{ fontSize: 12, color: C.ivoryDim }}>Waiting on the admin to declare a winner.</div>
        ) : <div style={{ fontSize: 12, color: C.ivoryDim }}>In progress — settles automatically once everyone finishes.</div>
      ) : (
        <div>
          <div style={{ fontSize: 12, color: C.goldBright, marginBottom: 6 }}>
            {result.winnerIds && result.winnerIds.length ? `Winner: ${result.winnerIds.map(id => players.find(p => p.id === id)?.name).join(', ')}` : 'No winner — refunded'}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {participantsObjs.map(p => <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}><span>{p.name}</span><span style={{ fontFamily: 'IBM Plex Mono, monospace', color: (result.payout[p.id] || 0) >= 0 ? C.goldBright : C.flagRed }}>{fmtMoney(result.payout[p.id] || 0)}</span></div>)}
          </div>
          {isAdmin && bet.settlementMethod === 'manual' && <GhostButton onClick={() => onReopen(bet.id)} style={{ marginTop: 8, fontSize: 11, padding: '5px 10px' }}>Reopen</GhostButton>}
        </div>
      )}
    </div>
  );
}
function CustomBetsSection({ title, sub, list, computeFn, players, isAdmin, onOpenBuilder, onResolve, onReopen, onRemove, emptyAdmin, emptyPlayer }) {
  return (
    <div style={{ marginTop: 22 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, flexWrap: 'wrap', gap: 8 }}>
        <SectionHeader title={title} sub={sub} />
        {isAdmin && onOpenBuilder && <GoldButton onClick={onOpenBuilder} style={{ padding: '7px 12px', fontSize: 12, flexShrink: 0 }}>+ New bet</GoldButton>}
      </div>
      {list.length === 0 ? (
        <div style={{ color: C.ivoryDim, fontSize: 13 }}>{isAdmin ? emptyAdmin : emptyPlayer}</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {list.map(cb => <CustomBetCard key={cb.id} bet={cb} result={computeFn(cb)} players={players} isAdmin={isAdmin} onResolve={onResolve} onReopen={onReopen} onRemove={onRemove} />)}
        </div>
      )}
    </div>
  );
}
function BetsTab({ state, isAdmin, whoami, onPick, onAddSelf, adjustTicket, resolveMarket, reopenMarket, onOpenBetBuilder, onResolveCustomBet, onReopenCustomBet, onRemoveCustomBet, tournamentCustomBets, onResolveTournamentBet, onReopenTournamentBet, onRemoveTournamentBet, onOpenTournamentBetBuilder, tournament }) {
  const pm = state.games.parimutuel;
  const matches = state.games.matchplay.matches || [];
  const customBets = state.customBets || [];
  const tBets = tournamentCustomBets || [];
  if (!pm.enabled && matches.length === 0 && customBets.length === 0 && tBets.length === 0 && !isAdmin) return <div style={{ color: C.ivoryDim, fontSize: 14, textAlign: 'center', marginTop: 40 }}>Nothing to bet on yet — ask the admin to turn on pari-mutuel betting or set up a bet in Round setup.</div>;
  const pmData = pm.enabled ? computeParimutuel(state) : null;
  const stats = computeStats(state);
  const bettingOpen = pm.enabled && !pm.resolved && !stats.some(s => s.thru > pm.lockAfterHole);
  return (
    <div>
      {matches.length > 0 && (
        <div style={{ marginBottom: 22 }}>
          <SectionHeader title="Pairings" sub="who's playing whom this round" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>{matches.map(m => <div key={m.id} style={rowCard}><span style={{ fontSize: 13 }}>{sideNames(m.sideA, state)} <span style={{ color: C.ivoryDim }}>vs</span> {sideNames(m.sideB, state)}</span></div>)}</div>
        </div>
      )}
      {pm.enabled && pmData && (
        <div>
          <SectionHeader title="Pari-mutuel" sub={pm.resolved ? 'Resolved' : bettingOpen ? `Open · $5/ticket · closes after hole ${pm.lockAfterHole}` : 'Betting closed'} />
          {!whoami && <div style={{ ...rowCard, background: C.turfLight, marginBottom: 14, fontSize: 13 }}>Select your name below (checkbox) for betting to be enabled.</div>}
          <BettorCheckList state={state} whoami={whoami} onPick={onPick} onAddSelf={onAddSelf} />
          <div style={{ ...rowCard, justifyContent: 'space-between', marginBottom: 12 }}><span style={{ fontSize: 13 }}>Pot</span><span style={{ fontFamily: 'Oswald, sans-serif', fontSize: 18, color: C.goldBright }}>${pmData.pot} · {pmData.totalTickets} ticket{pmData.totalTickets !== 1 ? 's' : ''}</span></div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
            {pmData.entrants.map(e => {
              const tickets = pmData.ticketCount[e.id] || 0, odds = pmData.totalTickets ? Math.round((tickets / pmData.totalTickets) * 100) : 0;
              const myTickets = whoami ? ((pm.tickets || []).find(t => t.bettorId === whoami.id && t.entrantId === e.id)?.count || 0) : 0;
              return (
                <div key={e.id} style={{ ...rowCard, flexWrap: 'wrap', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                    <Chip color={e.color}>{initials(e.name)}</Chip>
                    <div style={{ minWidth: 0 }}><div style={{ fontSize: 14, fontWeight: 600 }}>{e.name}{pm.resolved && pm.winnerId === e.id && ' 🏆'}</div><div style={{ fontSize: 11, color: C.ivoryDim }}>{tickets} ticket{tickets !== 1 ? 's' : ''} pool-wide · {odds}%</div></div>
                  </div>
                  {bettingOpen && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <button onClick={() => adjustTicket(e.id, -1)} disabled={!whoami || myTickets === 0} style={{ ...stepBtnStyle, opacity: (!whoami || myTickets === 0) ? 0.4 : 1, cursor: (!whoami || myTickets === 0) ? 'not-allowed' : 'pointer' }}><Minus size={14} /></button>
                      <div style={{ textAlign: 'center', minWidth: 46 }}>
                        <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 16, fontWeight: 700, color: myTickets > 0 ? C.goldBright : C.ivoryDim }}>{myTickets}</div>
                        <div style={{ fontSize: 9, color: C.ivoryDim }}>${myTickets * 5}</div>
                      </div>
                      <button onClick={() => adjustTicket(e.id, 1)} disabled={!whoami} style={{ ...stepBtnStyle, opacity: !whoami ? 0.4 : 1, cursor: !whoami ? 'not-allowed' : 'pointer' }}><Plus size={14} /></button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          {isAdmin && (
            <div style={{ marginBottom: 10 }}>
              <SectionHeader title="Admin: resolve market" sub={pmData.suggestedId ? `Suggested winner: ${pmData.entrants.find(e => e.id === pmData.suggestedId)?.name}` : 'No clear leader yet'} />
              {!pm.resolved ? <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>{pmData.entrants.map(e => <button key={e.id} onClick={() => resolveMarket(e.id)} style={{ fontSize: 12, padding: '7px 11px', borderRadius: 8, border: `1px solid ${C.turfBorder}`, background: 'transparent', color: C.ivory, cursor: 'pointer' }}>Lock in {e.name}</button>)}</div> : <GhostButton onClick={reopenMarket}>Reopen market</GhostButton>}
            </div>
          )}
          {pm.resolved && (
            <div>
              <SectionHeader title="Payouts" sub="wagered vs. won — a $0 net just means that bettor broke even" />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {state.players.filter(p => pmData.payoutNet[p.id] != null).map(p => {
                  const wagered = pmData.spendByBettor[p.id] || 0, won = ((pmData.payoutNet[p.id] || 0) + wagered);
                  return (
                    <div key={p.id} style={{ ...rowCard, justifyContent: 'space-between', flexWrap: 'wrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Chip color={p.color}>{initials(p.name)}</Chip><span style={{ fontSize: 13 }}>{p.name}</span></div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <span style={{ fontSize: 11, color: C.ivoryDim }}>wagered ${wagered} · won ${won.toFixed(won % 1 ? 2 : 0)}</span>
                        <span style={{ fontFamily: 'IBM Plex Mono, monospace', color: pmData.payoutNet[p.id] >= 0 ? C.goldBright : C.flagRed, fontWeight: 600 }}>{fmtMoney(pmData.payoutNet[p.id])}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
      <CustomBetsSection
        title="Custom bets" sub="just this round" list={customBets} players={state.players} isAdmin={isAdmin}
        computeFn={(cb) => computeCustomBet(cb, state)} onOpenBuilder={onOpenBetBuilder}
        onResolve={onResolveCustomBet} onReopen={onReopenCustomBet} onRemove={onRemoveCustomBet}
        emptyAdmin='No custom bets yet — tap "+ New bet" to build one.' emptyPlayer="No custom bets yet."
      />
      {tournament && (
        <CustomBetsSection
          title="Tournament bets" sub="span every round of the trip" list={tBets} players={tournament.players} isAdmin={isAdmin}
          computeFn={(cb) => computeTournamentCustomBet(cb, tournament)} onOpenBuilder={onOpenTournamentBetBuilder}
          onResolve={onResolveTournamentBet} onReopen={onReopenTournamentBet} onRemove={onRemoveTournamentBet}
          emptyAdmin='No trip-wide bets yet — tap "+ New bet" to build one.' emptyPlayer="No trip-wide bets yet."
        />
      )}
    </div>
  );
}

/* ============================== HOME DASHBOARD ============================== */
function getNextStepLocal(phase, state, whoami, isAdmin) { return getNextStep(phase, state, whoami, isAdmin); }
function HomeTab({ state, stats, isAdmin, whoami, setActiveTab, chat, ledger, onOpenMyPosition, phase, guidanceEnabled, onOpenChat, onOpenRoundComplete, tournament, onSwitchRound, onOpenRoundFlow }) {
  if (!state.started) return (
    <div style={{ textAlign: 'center', marginTop: 60, fontSize: 14, padding: '0 20px' }}>
      <div style={{ color: C.ivoryDim, marginBottom: 14 }}>{isAdmin ? 'Finish setup and start this round to see the dashboard.' : "The admin hasn't started this round yet."}</div>
      {tournament && tournament.rounds.length > 1 && <GhostButton onClick={onSwitchRound}>Switch round</GhostButton>}
    </div>
  );
  const me = whoami ? stats.find(s => s.id === whoami.id) : null;
  const useNet = state.handicapsEnabled;
  const leaderboard = [...stats].sort((a, b) => (useNet ? a.netToPar - b.netToPar : a.toPar - b.toPar));
  const top = leaderboard.slice(0, 6);
  const minThru = stats.length ? Math.min(...stats.map(s => s.thru)) : 0;
  const groupHole = Math.max(0, Math.min(minThru, state.numHoles - 1));
  const g = state.games;
  const matchplay = g.matchplay.enabled ? computeMatchplay(state) : null;
  const teamRace = matchplay ? computeTeamRace(state, matchplay.results) : null;
  const pm = g.parimutuel.enabled ? computeParimutuel(state) : null;
  const skinsResults = g.skins.enabled ? computeSkins(state, holeScoreFn(state, g.skins.net)).results : [];
  const lastSkin = [...skinsResults].reverse().find(r => r.status === 'won');
  const lastChat = chat[chat.length - 1];
  const homeCard = { background: C.turf, border: `1.5px solid ${C.turfBorder}`, borderRadius: 14, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, boxShadow: '0 4px 0 rgba(0,0,0,0.4)', cursor: 'pointer', textAlign: 'left', width: '100%', boxSizing: 'border-box' };
  const cardBtn = { ...homeCard, flexDirection: 'column', alignItems: 'stretch' };
  const nextStep = guidanceEnabled ? getNextStepLocal(phase, state, whoami, isAdmin) : null;
  const emphasizeSettle = phase === 'wrapping-up' || phase === 'complete';
  const multiRound = tournament && tournament.rounds.length > 1;
  const ryderCup = tournament ? computeRyderCupStandings(tournament) : null;
  const tournamentStandings = multiRound ? aggregateStatsAcrossRounds(tournament, tournament.players.map(p => p.id))
    .map(a => ({ ...tournament.players.find(p => p.id === a.id), ...a }))
    .sort((a, b) => (useNet ? a.netToPar - b.netToPar : a.toPar - b.toPar)) : [];
  const positionCard = whoami && ledger[whoami.id] ? (
    <button onClick={onOpenMyPosition} style={{ ...homeCard, justifyContent: 'space-between' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><IconBadge icon={Receipt} color={C.gold} size={28} /><span style={{ fontSize: 13 }}>Your position {multiRound ? '(whole trip)' : ''}</span></div>
      <span style={{ fontFamily: 'Anton, sans-serif', color: ledger[whoami.id].netPosition > 0 ? C.goldBright : ledger[whoami.id].netPosition < 0 ? C.flagRed : C.ivoryDim }}>{fmtMoney(ledger[whoami.id].netPosition)}</span>
    </button>
  ) : null;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {nextStep && (
        <button onClick={() => { if (nextStep.action === 'wrapup') onOpenRoundComplete(); else setActiveTab(nextStep.action); }} style={{ ...homeCard, justifyContent: 'space-between', background: C.turfLight, border: `1.5px solid ${C.gold}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><IconBadge icon={Bell} color={C.goldBright} size={28} /><span style={{ fontSize: 13, color: C.ivory }}>{nextStep.text}</span></div>
          <ChevronRight size={16} color={C.goldBright} style={{ flexShrink: 0 }} />
        </button>
      )}

      <div style={{ ...homeCard, justifyContent: 'space-between', cursor: 'default' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <IconBadge icon={Flag} color={C.gold} />
          <div><div style={{ fontSize: 11, color: C.ivoryDim, textTransform: 'uppercase' }}>{state.roundName}</div><div style={{ fontFamily: 'Anton, sans-serif', fontSize: 24 }}>Hole {groupHole + 1}</div></div>
        </div>
        {me && <div style={{ textAlign: 'right' }}><div style={{ fontSize: 11, color: C.ivoryDim, textTransform: 'uppercase' }}>You</div><div style={{ fontFamily: 'Anton, sans-serif', fontSize: 24, color: (useNet ? me.netToPar : me.toPar) < 0 ? C.flagRed : C.ivory }}>{me.thru === 0 ? '–' : fmtToPar(useNet ? me.netToPar : me.toPar)}</div></div>}
      </div>

      {multiRound && (
        <button onClick={onSwitchRound} style={{ ...homeCard, justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><IconBadge icon={Calendar} color={C.blueBright} size={28} /><span style={{ fontSize: 12, color: C.ivoryDim }}>Round {tournament.rounds.findIndex(r => r.id === tournament.activeRoundId) + 1} of {tournament.rounds.length}</span></div>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: C.goldBright, fontSize: 12 }}>Switch round <ChevronsUpDown size={13} /></span>
        </button>
      )}

      <button onClick={onOpenRoundFlow} style={{ ...homeCard, justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><IconBadge icon={Flag} color={C.blueBright} size={28} /><span style={{ fontSize: 13 }}>Round Flow</span></div>
        <span style={{ fontSize: 11, color: C.ivoryDim }}>where every group stands</span>
      </button>

      {ryderCup && (
        <button onClick={() => setActiveTab('games')} style={cardBtn}>
          <SectionHeader title="Ryder Cup" sub={ryderCup.target ? `first to ${ryderCup.target} wins the cup` : 'add match pairings to get started'} icon={Swords} iconColor={C.flagRed} />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14, padding: '4px 0 12px' }}>
            <div style={{ textAlign: 'center', flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 11, color: ryderCup.totalA > ryderCup.totalB ? C.goldBright : C.ivoryDim, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ryderCup.teamA.name}</div>
              <div style={{ fontFamily: 'Anton, sans-serif', fontSize: 30, color: ryderCup.totalA > ryderCup.totalB ? C.goldBright : C.ivory }}>{ryderCup.totalA}</div>
            </div>
            <div style={{ fontSize: 16, color: C.ivoryDim }}>–</div>
            <div style={{ textAlign: 'center', flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 11, color: ryderCup.totalB > ryderCup.totalA ? C.goldBright : C.ivoryDim, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ryderCup.teamB.name}</div>
              <div style={{ fontFamily: 'Anton, sans-serif', fontSize: 30, color: ryderCup.totalB > ryderCup.totalA ? C.goldBright : C.ivory }}>{ryderCup.totalB}</div>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {ryderCup.rows.map(r => (
              <div key={r.roundId} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12, padding: '6px 0', borderTop: `1px solid ${C.turfBorder}` }}>
                <span style={{ color: C.ivoryDim, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name}</span>
                <span style={{ fontFamily: 'Oswald, sans-serif' }}>{r.matchCount > 0 ? `${r.aPts} – ${r.bPts}` : 'not set up'}</span>
              </div>
            ))}
          </div>
        </button>
      )}

      {emphasizeSettle && positionCard}

      <button onClick={() => setActiveTab('leaderboard')} style={cardBtn}>
        <SectionHeader title="Leaderboard" sub="tap to see everyone — this round" icon={Trophy} iconColor={C.gold} />
        {top.map((p, i) => <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0' }}><span style={{ width: 16, color: C.ivoryDim, fontSize: 12 }}>{i + 1}</span><Chip color={p.color}>{initials(p.name)}</Chip><span style={{ flex: 1, fontSize: 13, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span><span style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}><span style={{ fontFamily: 'Oswald, sans-serif', color: (useNet ? p.netToPar : p.toPar) < 0 ? C.flagRed : C.ivory }}>{p.thru === 0 ? '–' : fmtToPar(useNet ? p.netToPar : p.toPar)}</span>{useNet && p.thru > 0 && <span style={{ fontSize: 9, color: C.ivoryDim }}>{fmtToPar(p.toPar)} gross</span>}</span></div>)}
      </button>

      {multiRound && tournamentStandings.length > 0 && (
        <div style={{ ...cardBtn, cursor: 'default' }}>
          <SectionHeader title="Tournament standings" sub="cumulative across every started round" icon={Calendar} iconColor={C.blueBright} />
          {tournamentStandings.slice(0, 6).map((p, i) => <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0' }}><span style={{ width: 16, color: C.ivoryDim, fontSize: 12 }}>{i + 1}</span><Chip color={p.color}>{initials(p.name)}</Chip><span style={{ flex: 1, fontSize: 13, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span><span style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}><span style={{ fontFamily: 'Oswald, sans-serif', color: (useNet ? p.netToPar : p.toPar) < 0 ? C.flagRed : C.ivory }}>{p.roundsStarted === 0 ? '–' : fmtToPar(useNet ? p.netToPar : p.toPar)}</span>{useNet && p.roundsStarted > 0 && <span style={{ fontSize: 9, color: C.ivoryDim }}>{fmtToPar(p.toPar)} gross</span>}</span></div>)}
        </div>
      )}

      {teamRace && (
        <button onClick={() => setActiveTab('games')} style={{ ...homeCard, justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
            <IconBadge icon={Swords} color={C.flagRed} size={28} />
            <div style={{ fontFamily: 'Oswald, sans-serif', fontSize: 13, color: teamRace.f1.color }}>{teamRace.f1.name} {teamRace.points[teamRace.f1.id] || 0}</div>
          </div>
          <div style={{ textAlign: 'right' }}><div style={{ fontFamily: 'Oswald, sans-serif', fontSize: 13, color: teamRace.f2.color }}>{teamRace.points[teamRace.f2.id] || 0} {teamRace.f2.name}</div></div>
        </button>
      )}

      {!emphasizeSettle && positionCard}

      {lastSkin && (
        <div style={{ ...homeCard, cursor: 'default' }}>
          <IconBadge icon={Coins} color={C.gold} size={28} />
          <span style={{ fontSize: 13 }}>Latest: <strong>{state.players.find(p => p.id === lastSkin.winnerId)?.name}</strong> took the skin on hole {lastSkin.hole + 1} (${lastSkin.pot})</span>
        </div>
      )}

      {pm && (
        <button onClick={() => setActiveTab('bets')} style={{ ...homeCard, justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><IconBadge icon={Ticket} color={C.gold} size={28} /><span style={{ fontSize: 13 }}>Pari-mutuel pot</span></div>
          <span style={{ fontFamily: 'Oswald, sans-serif', color: C.goldBright }}>${pm.pot}</span>
        </button>
      )}

      <button onClick={onOpenChat} style={{ ...homeCard, justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, flex: 1 }}>
          <IconBadge icon={MessageCircle} color={C.blueBright} size={28} />
          <div style={{ minWidth: 0, flex: 1 }}><div style={{ fontSize: 11, color: C.ivoryDim }}>Group chat</div><div style={{ fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{lastChat ? `${lastChat.authorName}: ${lastChat.text}` : 'No messages yet'}</div></div>
        </div>
      </button>
    </div>
  );
}

/* ============================== CHAT ============================== */
function ChatTab({ state, chat, whoami, onPick, onAddSelf, sendChat, embedded }) {
  const [text, setText] = useState('');
  const endRef = useRef(null);
  useEffect(() => { endRef.current?.scrollIntoView({ block: 'end' }); }, [chat.length]);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: embedded ? '100%' : 'calc(100vh - 230px)' }}>
      {!whoami && <IdentityPicker state={state} onPick={onPick} onAddSelf={onAddSelf} />}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 10 }}>
        {chat.length === 0 && <div style={{ color: C.ivoryDim, fontSize: 13, textAlign: 'center', marginTop: 30 }}>No messages yet — say something to the group.</div>}
        {chat.map(m => { const mine = whoami && m.authorId === whoami.id; return (
          <div key={m.id} style={{ alignSelf: mine ? 'flex-end' : 'flex-start', maxWidth: '78%' }}>
            {!mine && <div style={{ fontSize: 10, color: C.ivoryDim, marginBottom: 2, marginLeft: 4 }}>{m.authorName}</div>}
            <div style={{ background: mine ? C.gold : C.turf, color: mine ? C.pineDark : C.ivory, border: mine ? 'none' : `1px solid ${C.turfBorder}`, borderRadius: 14, padding: '8px 12px', fontSize: 14, wordBreak: 'break-word' }}>{m.text}</div>
          </div>
        ); })}
        <div ref={endRef} />
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <input value={text} onChange={e => setText(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && text.trim()) { sendChat(text.trim()); setText(''); } }} placeholder="Message the group…" style={{ ...inputStyle, flex: 1 }} />
        <button onClick={() => { if (text.trim()) { sendChat(text.trim()); setText(''); } }} style={{ background: C.gold, border: 'none', borderRadius: 10, width: 44, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.pineDark, cursor: 'pointer' }}><Send size={18} /></button>
      </div>
    </div>
  );
}
function ChatModal({ state, chat, whoami, onPick, onAddSelf, sendChat, onClose }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(5,9,17,0.78)', zIndex: 45, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: C.pine, borderTop: `1px solid ${C.turfBorder}`, borderRadius: '20px 20px 0 0', width: '100%', maxWidth: 720, height: '78vh', display: 'flex', flexDirection: 'column', padding: '16px 16px 12px', boxSizing: 'border-box' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, flexShrink: 0 }}>
          <div style={{ fontFamily: 'Oswald, sans-serif', fontSize: 18, textTransform: 'uppercase', letterSpacing: 0.4 }}>Group chat</div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: C.ivory, cursor: 'pointer' }}><X size={20} /></button>
        </div>
        <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
          <ChatTab state={state} chat={chat} whoami={whoami} onPick={onPick} onAddSelf={onAddSelf} sendChat={sendChat} embedded />
        </div>
      </div>
    </div>
  );
}

/* ============================== SETTLE TAB ============================== */
const PAYMENT_APPS = [
  { name: 'Venmo', color: '#3D95CE', href: 'venmo://' },
  { name: 'PayPal', color: '#0070BA', href: 'https://www.paypal.com' },
  { name: 'Zelle', color: '#6D1ED4', href: 'https://www.zellepay.com' },
];
function SettleTab({ tournament, ledger, onOpenMyPosition }) {
  const combined = {};
  tournament.players.forEach(p => { combined[p.id] = ledger[p.id]?.netPosition || 0; });
  const txns = settleUp(tournament.players, combined);
  const sorted = [...tournament.players].sort((a, b) => (combined[b.id] || 0) - (combined[a.id] || 0));
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
        <SectionHeader title="Net standings" sub={tournament.rounds.length > 1 ? 'Every round, every bet, combined' : 'All enabled games combined'} />
        <button onClick={onOpenMyPosition} style={{ fontSize: 11, padding: '6px 10px', borderRadius: 8, border: `1px solid ${C.turfBorder}`, background: 'transparent', color: C.ivoryDim, cursor: 'pointer', flexShrink: 0, whiteSpace: 'nowrap' }}>My Position</button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 22 }}>{sorted.map(p => { const net = combined[p.id] || 0; return <div key={p.id} style={{ ...rowCard, justifyContent: 'space-between' }}><div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><Chip color={p.color}>{initials(p.name)}</Chip><span style={{ fontSize: 14 }}>{p.name}</span></div><span style={{ fontFamily: 'Oswald, sans-serif', fontSize: 18, color: net > 0 ? C.goldBright : net < 0 ? C.flagRed : C.ivoryDim }}>{fmtMoney(net)}</span></div>; })}</div>
      <SectionHeader title="Settle the bill" sub="Fewest payments to even it out" />
      {txns.length === 0 ? <div style={{ color: C.ivoryDim, fontSize: 14, textAlign: 'center', marginTop: 12, marginBottom: 20 }}>Nothing to settle yet.</div> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>{txns.map((t, i) => <div key={i} style={{ ...rowCard, justifyContent: 'space-between' }}><span style={{ fontSize: 14 }}><strong>{t.from}</strong> pays <strong>{t.to}</strong></span><span style={{ fontFamily: 'IBM Plex Mono, monospace', color: C.goldBright, fontWeight: 700 }}>{fmtMoney(t.amt)}</span></div>)}</div>
      )}
      <div style={{ marginBottom: 18 }}>
        <SectionHeader title="Pay up" sub="opens the app on your phone, if it's installed" />
        <div style={{ display: 'flex', gap: 10 }}>
          {PAYMENT_APPS.map(app => (
            <a key={app.name} href={app.href} target="_blank" rel="noopener noreferrer" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, textDecoration: 'none', background: C.turf, border: `1px solid ${C.turfBorder}`, borderRadius: 12, padding: '12px 8px', color: C.ivory }}>
              <span style={{ width: 34, height: 34, borderRadius: 999, background: app.color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontFamily: 'Oswald, sans-serif', fontWeight: 700, fontSize: 14, flexShrink: 0 }}>{app.name[0]}</span>
              <span style={{ fontSize: 11 }}>{app.name}</span>
            </a>
          ))}
        </div>
      </div>
      <div style={{ fontSize: 12, color: C.ivoryDim, fontStyle: 'italic', textAlign: 'center' }}>Just for fun between friends — settle up however works for you.</div>
    </div>
  );
}

/* ============================== SETUP — SCROLL-MODE SECTIONS ============================== */
/* ============================== COURSE PICKER ==============================
   Talks only to courseProviderService \u2014 swapping the mock provider for a real one later
   means this component doesn't change at all. */
function CoursePickerModal({ onSelect, onCustom, onClose }) {
  const [mode, setMode] = useState('name');
  const [nameQuery, setNameQuery] = useState('');
  const [cityQuery, setCityQuery] = useState('');
  const [stateQuery, setStateQuery] = useState('');
  const [radiusMiles, setRadiusMiles] = useState(100);
  const [results, setResults] = useState([]);
  const [status, setStatus] = useState('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [selectedCourse, setSelectedCourse] = useState(null);
  const debounceRef = useRef(null);

  const runSearch = (fn) => {
    setStatus('loading'); setErrorMsg('');
    fn().then(r => { setResults(r); setStatus('done'); }).catch(() => { setStatus('error'); setErrorMsg('Search failed \u2014 try again.'); });
  };
  useEffect(() => {
    if (mode === 'location') return;
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (mode === 'name') runSearch(() => courseProviderService.searchByName(nameQuery));
      else runSearch(() => courseProviderService.searchByCityState(cityQuery, stateQuery));
    }, 250);
    return () => clearTimeout(debounceRef.current);
  }, [mode, nameQuery, cityQuery, stateQuery]);

  const useMyLocation = () => {
    setStatus('loading'); setErrorMsg('');
    if (!navigator.geolocation) { setStatus('error'); setErrorMsg("This browser doesn't support location search \u2014 try Name or City/State instead."); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => runSearch(() => courseProviderService.searchByLocation(pos.coords.latitude, pos.coords.longitude, radiusMiles)),
      (err) => { setStatus('error'); setErrorMsg(err.code === 1 ? 'Location access was denied \u2014 try Name or City/State instead.' : "Couldn't get your location \u2014 try Name or City/State instead."); },
      { timeout: 8000 }
    );
  };

  if (selectedCourse) {
    return (
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(13,31,26,0.78)', zIndex: 46, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }} onClick={onClose}>
        <div onClick={e => e.stopPropagation()} style={{ background: C.pine, borderTop: `1px solid ${C.turfBorder}`, borderRadius: '20px 20px 0 0', width: '100%', maxWidth: 720, maxHeight: '85vh', overflowY: 'auto', padding: '18px 18px 28px' }}>
          <button onClick={() => setSelectedCourse(null)} style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'transparent', border: 'none', color: C.ivoryDim, cursor: 'pointer', fontSize: 12, marginBottom: 10 }}><ChevronLeft size={14} /> Back to results</button>
          <div style={{ fontFamily: 'Oswald, sans-serif', fontSize: 20, textTransform: 'uppercase', letterSpacing: 0.4 }}>{selectedCourse.courseName}</div>
          <div style={{ fontSize: 12, color: C.ivoryDim, marginBottom: 16 }}>{selectedCourse.address}, {selectedCourse.city}, {selectedCourse.state} · {selectedCourse.numberOfHoles} holes</div>
          <div style={{ fontSize: 11, color: C.ivoryDim, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>Pick your tees</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {selectedCourse.teeBoxes.map(tee => (
              <button key={tee.teeName} onClick={() => onSelect(selectedCourse, tee.teeName)} style={{ ...rowCard, justifyContent: 'space-between', width: '100%', textAlign: 'left', cursor: 'pointer' }}>
                <span style={{ fontSize: 14, fontWeight: 600 }}>{tee.teeName}</span>
                <span style={{ fontSize: 12, color: C.ivoryDim }}>{tee.totalYards} yds · {tee.rating}/{tee.slope}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(13,31,26,0.78)', zIndex: 46, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: C.pine, borderTop: `1px solid ${C.turfBorder}`, borderRadius: '20px 20px 0 0', width: '100%', maxWidth: 720, maxHeight: '85vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ flexShrink: 0, padding: '18px 18px 10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div style={{ fontFamily: 'Oswald, sans-serif', fontSize: 20, textTransform: 'uppercase', letterSpacing: 0.4 }}>Select a course</div>
            <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: C.ivory, cursor: 'pointer' }}><X size={22} /></button>
          </div>
          <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
            {[['name', 'Name'], ['citystate', 'City, State'], ['location', 'Near me']].map(([key, label]) => (
              <button key={key} onClick={() => { setMode(key); setStatus('idle'); setErrorMsg(''); }} style={{ flex: 1, fontSize: 12, padding: '8px 0', borderRadius: 8, border: `1px solid ${mode === key ? C.gold : C.turfBorder}`, background: mode === key ? C.gold : 'transparent', color: mode === key ? C.pineDark : C.ivory, cursor: 'pointer' }}>{label}</button>
            ))}
          </div>
          {mode === 'name' && <input value={nameQuery} onChange={e => setNameQuery(e.target.value)} placeholder="Course name" style={inputStyle} autoFocus />}
          {mode === 'citystate' && (
            <div style={{ display: 'flex', gap: 8 }}>
              <input value={cityQuery} onChange={e => setCityQuery(e.target.value)} placeholder="City" style={{ ...inputStyle, flex: 2 }} autoFocus />
              <input value={stateQuery} onChange={e => setStateQuery(e.target.value.toUpperCase().slice(0, 2))} placeholder="State" style={{ ...inputStyle, flex: 1 }} />
            </div>
          )}
          {mode === 'location' && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <span style={{ fontSize: 12, color: C.ivoryDim }}>Search within</span>
                <select value={radiusMiles} onChange={e => setRadiusMiles(parseInt(e.target.value, 10))} style={{ ...inputStyle, width: 100, padding: '7px 8px' }}>
                  {[25, 50, 100, 250, 1000].map(r => <option key={r} value={r}>{r} mi</option>)}
                </select>
              </div>
              <GoldButton onClick={useMyLocation} style={{ width: '100%', padding: '11px 0' }}>Use my current location</GoldButton>
            </div>
          )}
        </div>
        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '4px 18px 12px' }}>
          {status === 'loading' && <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, color: C.ivoryDim, fontSize: 13, padding: '24px 0' }}><Loader2 size={16} className="spin" /> Searching…</div>}
          {status === 'error' && <div style={{ color: C.flagRed, fontSize: 13, textAlign: 'center', padding: '16px 0' }}>{errorMsg}</div>}
          {status === 'done' && results.length === 0 && <div style={{ color: C.ivoryDim, fontSize: 13, textAlign: 'center', padding: '24px 0' }}>No courses found. Try a different search, or add yours manually below.</div>}
          {results.length > 0 && status !== 'loading' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {results.map(c => (
                <button key={c.courseId} onClick={() => setSelectedCourse(c)} style={{ ...rowCard, justifyContent: 'space-between', width: '100%', textAlign: 'left', cursor: 'pointer' }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.courseName}</div>
                    <div style={{ fontSize: 11, color: C.ivoryDim }}>{c.city}, {c.state} · {c.numberOfHoles} holes · {c.teeBoxes.length} tees{c.distanceMiles != null ? ` \u00b7 ${c.distanceMiles} mi` : ''}</div>
                  </div>
                  <ChevronRight size={16} color={C.ivoryDim} style={{ flexShrink: 0 }} />
                </button>
              ))}
            </div>
          )}
        </div>
        <button onClick={() => { onCustom(); onClose(); }} style={{ flexShrink: 0, background: 'transparent', border: 'none', borderTop: `1px solid ${C.turfBorder}`, color: C.goldBright, fontSize: 13, textDecoration: 'underline', cursor: 'pointer', padding: '12px 0' }}>Can't find it? Create a custom course</button>
      </div>
    </div>
  );
}
function CourseSection({ state, selectProviderCourse, selectCustomCourse, setNumHoles, setPar, setSI, setYardage, setCourseField }) {
  const [pickerOpen, setPickerOpen] = useState(false);
  return (
    <Accordion title="Course" badge={state.courseName || 'custom'} defaultOpen>
      <div style={{ fontSize: 12, color: C.ivoryDim, marginBottom: 12, lineHeight: 1.5 }}>Search runs against a mock course database for now — a real provider can be swapped in later without changing this screen. Pick your tees once you've found the course, or enter one by hand below.</div>
      {state.providerId && (
        <div style={{ ...rowCard, marginBottom: 10, justifyContent: 'space-between' }}>
          <div><div style={{ fontWeight: 600, fontSize: 14 }}>{state.courseName}</div><div style={{ fontSize: 11, color: C.ivoryDim }}>{state.teeName} tees · {state.courseRating}/{state.courseSlope}</div></div>
          <Check size={16} color={C.gold} />
        </div>
      )}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <GoldButton onClick={() => setPickerOpen(true)} style={{ flex: 1 }}>Search for a course</GoldButton>
        <GhostButton onClick={selectCustomCourse} style={{ flex: 1, textAlign: 'center', borderColor: !state.providerId ? C.gold : C.turfBorder }}>Custom course</GhostButton>
      </div>
      {pickerOpen && <CoursePickerModal onSelect={(course, teeName) => { selectProviderCourse(course, teeName); setPickerOpen(false); }} onCustom={() => { selectCustomCourse(); setPickerOpen(false); }} onClose={() => setPickerOpen(false)} />}

      <Field label="Course name"><input value={state.courseName} onChange={e => setCourseField('courseName', e.target.value)} style={inputStyle} placeholder="e.g. your home course" /></Field>
      <div style={{ display: 'flex', gap: 8 }}>
        <Field label="Rating"><input type="number" step="0.1" value={state.courseRating} onChange={e => setCourseField('courseRating', parseFloat(e.target.value || '0'))} style={inputStyle} /></Field>
        <Field label="Slope"><input type="number" value={state.courseSlope} onChange={e => setCourseField('courseSlope', parseInt(e.target.value || '113', 10))} style={inputStyle} /></Field>
      </div>
      <Field label="Holes"><div style={{ display: 'flex', gap: 8 }}>{[9, 18].map(n => <button key={n} onClick={() => setNumHoles(n)} style={{ flex: 1, padding: '10px 0', borderRadius: 10, fontFamily: 'Oswald, sans-serif', background: state.numHoles === n ? C.gold : 'transparent', color: state.numHoles === n ? C.pineDark : C.ivory, border: `1px solid ${state.numHoles === n ? C.gold : C.turfBorder}`, cursor: 'pointer' }}>{n} holes</button>)}</div></Field>
      <Field label="Par, handicap & yardage per hole">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(9, 1fr)', gap: 4 }}>
          {state.pars.map((par, i) => (
            <div key={i} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 9, color: C.ivoryDim }}>{i + 1}</div>
              <input type="number" value={par} min={3} max={6} onChange={e => setPar(i, parseInt(e.target.value || '4', 10))} style={{ ...inputStyle, padding: '6px 0', textAlign: 'center', fontSize: 13, marginBottom: 2 }} />
              <input type="number" value={state.strokeIndex[i] ?? i + 1} min={1} max={18} onChange={e => setSI(i, parseInt(e.target.value || '1', 10))} style={{ ...inputStyle, padding: '4px 0', textAlign: 'center', fontSize: 10, color: C.ivoryDim, marginBottom: 2 }} />
              <input type="number" value={state.yardage?.[i] ?? ''} placeholder="yds" onChange={e => setYardage(i, e.target.value ? parseInt(e.target.value, 10) : null)} style={{ ...inputStyle, padding: '4px 0', textAlign: 'center', fontSize: 10, color: C.ivoryDim }} />
            </div>
          ))}
        </div>
        <div style={{ fontSize: 10, color: C.ivoryDim, marginTop: 4 }}>Top: par. Middle: handicap (1 = hardest hole). Bottom: yardage (optional).</div>
      </Field>
    </Accordion>
  );
}
/* ============================== ROSTER IMPORT ============================== */
/* Template columns: name (required), handicapIndex (optional), team (optional, must match a flight name).
   Both CSV and XLSX template downloads are generated entirely in-browser via Papa/SheetJS. */
function downloadRosterTemplate(format, flights) {
  const header = ['name', 'handicapIndex', 'team'];
  const examples = [
    ['Mike Johnson', '8.2', flights[0]?.name || 'Red'],
    ['Steve Smith', '14.5', flights[1]?.name || 'Blue'],
    ['Casey Williams', '5.0', flights[0]?.name || 'Red'],
    ['Jordan Taylor', '18.4', flights[1]?.name || 'Blue'],
  ];
  if (format === 'csv') {
    const Papa = window.Papa;
    const csv = Papa ? Papa.unparse([header, ...examples]) : [header, ...examples].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'duffbook-roster.csv'; a.click();
  } else {
    const XLSX = window.XLSX;
    if (!XLSX) { alert('XLSX library not available. Try CSV instead.'); return; }
    const ws = XLSX.utils.aoa_to_sheet([header, ...examples]);
    ws['!cols'] = [{ wch: 24 }, { wch: 16 }, { wch: 18 }];
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'Roster');
    XLSX.writeFile(wb, 'duffbook-roster.xlsx');
  }
}
function parseRosterFile(file, flights) {
  return new Promise((resolve, reject) => {
    const ext = file.name.split('.').pop().toLowerCase();
    const normalize = (rows) => {
      const flightsByName = {}; flights.forEach(f => { flightsByName[f.name.trim().toLowerCase()] = f.id; });
      const results = [], errors = [];
      rows.forEach((row, i) => {
        const name = (row.name || row.Name || row.NAME || '').toString().trim();
        if (!name) { if (Object.values(row).some(v => v)) errors.push(`Row ${i + 2}: missing name`); return; }
        const hcpRaw = (row.handicapIndex || row['Handicap Index'] || row.handicap || row.hcp || row.HCP || '').toString().trim();
        const hcp = hcpRaw && !isNaN(parseFloat(hcpRaw)) ? String(parseFloat(hcpRaw)) : '';
        const teamRaw = (row.team || row.Team || row.TEAM || row.flight || row.Flight || '').toString().trim();
        const flightId = teamRaw ? (flightsByName[teamRaw.toLowerCase()] || null) : null;
        if (teamRaw && !flightId) errors.push(`Row ${i + 2}: team "${teamRaw}" doesn't match any flight — it'll be left unassigned`);
        results.push({ name, handicapIndex: hcp, flightId, _teamRaw: teamRaw });
      });
      return { results, errors };
    };
    if (ext === 'csv' || ext === 'txt') {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const Papa = window.Papa;
          if (!Papa) { reject(new Error('CSV parser not available')); return; }
          const parsed = Papa.parse(e.target.result, { header: true, skipEmptyLines: true });
          resolve(normalize(parsed.data));
        } catch (err) { reject(err); }
      };
      reader.onerror = () => reject(new Error('File read failed'));
      reader.readAsText(file);
    } else if (['xlsx', 'xls'].includes(ext)) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const XLSX = window.XLSX;
          if (!XLSX) { reject(new Error('XLSX library not available. Try uploading a CSV instead.')); return; }
          const wb = XLSX.read(new Uint8Array(e.target.result), { type: 'array' });
          const ws = wb.Sheets[wb.SheetNames[0]];
          const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });
          resolve(normalize(rows));
        } catch (err) { reject(new Error('Could not read the spreadsheet. Make sure it is a valid .xlsx or .xls file.')); }
      };
      reader.onerror = () => reject(new Error('File read failed'));
      reader.readAsArrayBuffer(file);
    } else {
      reject(new Error('Unsupported file type. Please upload a .csv, .xlsx, or .xls file.'));
    }
  });
}
function RosterImportModal({ flights, existingPlayerCount, hasScores, onApply, onClose }) {
  const [stage, setStage] = useState('upload'); // upload | preview | confirm-replace
  const [parsed, setParsed] = useState(null);
  const [parseErrors, setParseErrors] = useState([]);
  const [parseError, setParseError] = useState('');
  const [loading, setLoading] = useState(false);
  const fileRef = useRef(null);

  const handleFile = async (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    setLoading(true); setParseError('');
    try {
      const { results, errors } = await parseRosterFile(file, flights);
      if (results.length === 0) { setParseError('No valid player rows found. Check that your file has a "name" column and at least one player row.'); setLoading(false); return; }
      setParsed(results); setParseErrors(errors);
      setStage(existingPlayerCount > 0 ? 'confirm-replace' : 'preview');
    } catch (err) { setParseError(err.message || 'Something went wrong reading the file.'); }
    setLoading(false);
  };

  const proceed = () => { if (stage === 'confirm-replace') setStage('preview'); };
  const apply = () => { onApply(parsed); onClose(); };

  const flightName = (id) => flights.find(f => f.id === id)?.name || '';
  const flightColor = (id) => flights.find(f => f.id === id)?.color || C.ivoryDim;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(13,31,26,0.78)', zIndex: 55, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: C.pine, borderTop: `1px solid ${C.turfBorder}`, borderRadius: '20px 20px 0 0', width: '100%', maxWidth: 720, maxHeight: '88vh', overflowY: 'auto', padding: '18px 18px 28px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ fontFamily: 'Oswald, sans-serif', fontSize: 20, textTransform: 'uppercase', letterSpacing: 0.4 }}>Import roster</div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: C.ivory, cursor: 'pointer' }}><X size={22} /></button>
        </div>

        {stage === 'upload' && (
          <>
            <div style={{ fontSize: 12, color: C.ivoryDim, marginBottom: 16, lineHeight: 1.6 }}>
              Fill in the template, then upload it here. Three columns: <strong>name</strong> (required), <strong>handicapIndex</strong>, and <strong>team</strong> (must match a flight name exactly{flights.length ? `: ${flights.map(f => f.name).join(', ')}` : ' — no flights set up yet'}).
            </div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              <button onClick={() => downloadRosterTemplate('csv', flights)} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, background: C.turf, border: `1px solid ${C.turfBorder}`, borderRadius: 10, color: C.ivory, padding: '10px 0', cursor: 'pointer', fontSize: 13 }}>
                <span style={{ fontSize: 16 }}>⬇</span> Download CSV template
              </button>
              <button onClick={() => downloadRosterTemplate('xlsx', flights)} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, background: C.turf, border: `1px solid ${C.turfBorder}`, borderRadius: 10, color: C.ivory, padding: '10px 0', cursor: 'pointer', fontSize: 13 }}>
                <span style={{ fontSize: 16 }}>⬇</span> Download XLSX template
              </button>
            </div>
            <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls,.txt" onChange={handleFile} style={{ display: 'none' }} />
            <button onClick={() => fileRef.current?.click()} style={{ width: '100%', borderRadius: 12, border: `1px dashed ${C.turfBorder}`, background: 'transparent', color: C.ivoryDim, padding: '28px 0', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, fontSize: 13 }}>
              <UserPlus size={26} color={C.ivoryDim} />
              {loading ? 'Reading file…' : 'Tap to upload your completed CSV or XLSX'}
            </button>
            {parseError && <div style={{ color: C.flagRed, fontSize: 13, marginTop: 12, lineHeight: 1.5 }}>{parseError}</div>}
          </>
        )}

        {stage === 'confirm-replace' && (
          <>
            <div style={{ ...rowCard, background: C.turfLight, border: `1px solid ${C.flagRed}`, marginBottom: 16 }}>
              <div style={{ fontSize: 13, lineHeight: 1.6 }}>
                <strong>{existingPlayerCount} player{existingPlayerCount !== 1 ? 's' : ''}</strong> already in the roster will be <strong style={{ color: C.flagRed }}>permanently replaced</strong> by the {parsed?.length} player{parsed?.length !== 1 ? 's' : ''} in your file.
                {hasScores && <span style={{ color: C.flagRed }}> All scores entered so far will be lost.</span>}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <GhostButton onClick={onClose} style={{ flex: 1, textAlign: 'center' }}>Cancel</GhostButton>
              <GoldButton onClick={proceed} style={{ flex: 1 }}>Replace and continue</GoldButton>
            </div>
          </>
        )}

        {stage === 'preview' && parsed && (
          <>
            <div style={{ fontSize: 12, color: C.ivoryDim, marginBottom: 12 }}>
              {parsed.length} player{parsed.length !== 1 ? 's' : ''} ready to import. Check this looks right before applying.
            </div>
            {parseErrors.length > 0 && (
              <div style={{ ...rowCard, background: C.turfLight, border: `1px solid ${C.gold}`, flexDirection: 'column', alignItems: 'flex-start', marginBottom: 12, gap: 4 }}>
                <div style={{ fontSize: 11, color: C.goldBright, fontWeight: 600 }}>Warnings (non-blocking)</div>
                {parseErrors.map((e, i) => <div key={i} style={{ fontSize: 11, color: C.ivoryDim }}>{e}</div>)}
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 18 }}>
              {parsed.map((p, i) => (
                <div key={i} style={{ ...rowCard, justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Chip color={CHIP_COLORS[i % CHIP_COLORS.length]}>{initials(p.name)}</Chip>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600 }}>{p.name}</div>
                      <div style={{ fontSize: 11, color: C.ivoryDim }}>{p.handicapIndex ? `HCP ${p.handicapIndex}` : 'No handicap'}{p.flightId ? ` · ${flightName(p.flightId)}` : p._teamRaw ? ` · "${p._teamRaw}" unrecognized` : ''}</div>
                    </div>
                  </div>
                  {p.flightId && <span style={{ width: 10, height: 10, borderRadius: 999, background: flightColor(p.flightId), flexShrink: 0 }} />}
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <GhostButton onClick={() => { setStage('upload'); setParseError(''); }} style={{ flex: 1, textAlign: 'center' }}>Upload a different file</GhostButton>
              <GoldButton onClick={apply} style={{ flex: 1 }}>Apply to tournament</GoldButton>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function PlayersSection({ state, newPlayerName, setNewPlayerName, addPlayer, removePlayer, flights, onOpenImport }) {
  return (
    <Accordion title="Players" badge={state.players.length} defaultOpen>
      <div style={{ fontSize: 11, color: C.ivoryDim, marginBottom: 10 }}>The roster is shared across every round of the trip.</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 8 }}>
        {state.players.map(p => {
          const flight = (flights || []).find(f => f.id === p.flightId);
          return (
            <div key={p.id} style={{ ...rowCard, justifyContent: 'space-between', padding: '8px 10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Chip color={p.color}>{initials(p.name)}</Chip>
                <div>
                  <span style={{ fontSize: 14 }}>{p.name}</span>
                  {flight && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginLeft: 6, fontSize: 11, color: C.ivoryDim }}><span style={{ width: 7, height: 7, borderRadius: 999, background: flight.color }} />{flight.name}</span>}
                </div>
              </div>
              <button onClick={() => removePlayer(p.id)} style={{ background: 'transparent', border: 'none', color: C.flagRed, cursor: 'pointer' }}><Trash2 size={16} /></button>
            </div>
          );
        })}
      </div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
        <input value={newPlayerName} onChange={e => setNewPlayerName(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') addPlayer(); }} placeholder="Add a player" style={{ ...inputStyle, flex: 1 }} />
        <button onClick={addPlayer} style={{ background: C.gold, border: 'none', borderRadius: 10, width: 44, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.pineDark, cursor: 'pointer' }}><UserPlus size={18} /></button>
      </div>
      <button onClick={onOpenImport} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, width: '100%', background: 'transparent', border: `1px dashed ${C.turfBorder}`, color: C.goldBright, borderRadius: 10, padding: '10px 0', cursor: 'pointer', fontSize: 12, textDecoration: 'none' }}>
        <UserPlus size={14} /> Import roster from CSV or XLSX
      </button>
      <div style={{ fontSize: 11, color: C.ivoryDim, marginTop: 8 }}>Players can also add themselves once they join with the round code.</div>
    </Accordion>
  );
}
function HandicapsFlightsSection({ state, updateTournament, setPlayerField, autoFlights, addFlight, renameFlight, removeFlight, assignFlight }) {
  const canConfigure = state.players.length >= 1;
  return (
    <Accordion title="Handicaps & flights" badge={state.handicapsEnabled || state.flights.length ? 'on' : 'off'}>
      {!canConfigure ? <div style={{ color: C.ivoryDim, fontSize: 13 }}>Add players first.</div> : (
        <>
          <ToggleRow label="Use handicaps" sub="Net scoring, GHIN-style Course Handicap from each player's index" enabled={state.handicapsEnabled} onToggle={() => updateTournament(p => ({ ...p, handicapsEnabled: !p.handicapsEnabled }))} />
          {state.handicapsEnabled && <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }}>{state.players.map(p => { const ch = getCourseHandicap(p, state); return <div key={p.id} style={{ ...rowCard, justifyContent: 'space-between' }}><div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Chip color={p.color}>{initials(p.name)}</Chip><span style={{ fontSize: 13 }}>{p.name}</span></div><div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><input type="number" step="0.1" value={p.handicapIndex} onChange={e => setPlayerField(p.id, 'handicapIndex', e.target.value)} placeholder="Index" style={{ ...inputStyle, width: 64, padding: '6px 8px' }} /><span style={{ fontSize: 11, color: C.ivoryDim, minWidth: 50 }}>CH {ch}</span></div></div>; })}</div>}
          <ToggleRow label="Use flights / teams" sub="Separate leaderboards, or Red vs Blue for team match play" enabled={state.flights.length > 0} onToggle={() => updateTournament(p => ({ ...p, flights: p.flights.length ? [] : [{ id: 'f1', name: 'Red', color: FLIGHT_COLORS[0] }, { id: 'f2', name: 'Blue', color: FLIGHT_COLORS[1] }] }))} />
          {state.flights.length > 0 && (
            <div>
              <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
                {state.flights.map(f => <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: 4, background: C.turf, border: `1px solid ${C.turfBorder}`, borderRadius: 999, padding: '4px 8px' }}><span style={{ width: 8, height: 8, borderRadius: 999, background: f.color }} /><input value={f.name} onChange={e => renameFlight(f.id, e.target.value)} style={{ background: 'transparent', border: 'none', color: C.ivory, fontSize: 12, width: 70 }} /><button onClick={() => removeFlight(f.id)} style={{ background: 'transparent', border: 'none', color: C.ivoryDim, cursor: 'pointer' }}><X size={12} /></button></div>)}
                <button onClick={addFlight} style={{ background: 'transparent', border: `1px dashed ${C.turfBorder}`, borderRadius: 999, padding: '4px 10px', color: C.ivoryDim, fontSize: 12, cursor: 'pointer' }}>+ flight</button>
              </div>
              <button onClick={autoFlights} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'transparent', border: `1px solid ${C.turfBorder}`, color: C.ivory, borderRadius: 10, padding: '8px 12px', fontSize: 12, cursor: 'pointer', marginBottom: 10 }}><Shuffle size={14} /> Auto-balance by handicap</button>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>{state.players.map(p => <div key={p.id} style={{ ...rowCard, justifyContent: 'space-between', flexWrap: 'wrap' }}><div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Chip color={p.color}>{initials(p.name)}</Chip><span style={{ fontSize: 13 }}>{p.name}</span></div><div style={{ display: 'flex', gap: 4 }}>{state.flights.map(f => <button key={f.id} onClick={() => assignFlight(p.id, f.id)} style={{ fontSize: 11, padding: '5px 8px', borderRadius: 7, border: `1px solid ${p.flightId === f.id ? f.color : C.turfBorder}`, background: p.flightId === f.id ? f.color : 'transparent', color: p.flightId === f.id ? C.pineDark : C.ivoryDim, cursor: 'pointer' }}>{f.name}</button>)}</div></div>)}</div>
            </div>
          )}
        </>
      )}
    </Accordion>
  );
}
function MatchBuilder({ state, updateRound }) {
  const [pending, setPending] = useState({});
  const togglePending = (id) => setPending(prev => { const cur = prev[id]; const next = { ...prev }; if (!cur) next[id] = 'A'; else if (cur === 'A') next[id] = 'B'; else delete next[id]; return next; });
  const sideA = Object.keys(pending).filter(id => pending[id] === 'A'), sideB = Object.keys(pending).filter(id => pending[id] === 'B');
  const createMatch = () => { if (!sideA.length || !sideB.length) return; updateRound(p => ({ ...p, games: { ...p.games, matchplay: { ...p.games.matchplay, matches: [...p.games.matchplay.matches, { id: 'm_' + Date.now(), sideA, sideB }] } } })); setPending({}); };
  const removeMatch = (id) => updateRound(p => ({ ...p, games: { ...p.games, matchplay: { ...p.games.matchplay, matches: p.games.matchplay.matches.filter(m => m.id !== id) } } }));
  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ fontSize: 11, color: C.ivoryDim, marginBottom: 6 }}>Tap a player for Side A, again for Side B, again to clear. 1v1 singles or 2v2 best ball both work.</div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
        {state.players.map(p => {
          const flight = state.flights.find(f => f.id === p.flightId);
          const selected = pending[p.id];
          return (
            <button key={p.id} onClick={() => togglePending(p.id)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, padding: '6px 10px', borderRadius: 8, border: `1px solid ${selected === 'A' ? C.gold : selected === 'B' ? C.flagRed : C.turfBorder}`, background: selected === 'A' ? C.gold : selected === 'B' ? C.flagRed : 'transparent', color: selected ? C.pineDark : C.ivory, cursor: 'pointer' }}>
              {flight && <span style={{ width: 8, height: 8, borderRadius: 999, background: flight.color, flexShrink: 0, border: `1px solid ${selected ? C.pineDark : 'rgba(255,255,255,0.35)'}` }} />}
              {p.name}{selected ? ` (${selected})` : ''}
            </button>
          );
        })}
      </div>
      <GoldButton onClick={createMatch} disabled={!sideA.length || !sideB.length} style={{ marginBottom: 12 }}>Create match</GoldButton>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>{state.games.matchplay.matches.map(m => <div key={m.id} style={{ ...rowCard, justifyContent: 'space-between' }}><span style={{ fontSize: 13 }}>{sideNames(m.sideA, state)} vs {sideNames(m.sideB, state)}</span><button onClick={() => removeMatch(m.id)} style={{ background: 'transparent', border: 'none', color: C.flagRed, cursor: 'pointer' }}><Trash2 size={14} /></button></div>)}</div>
    </div>
  );
}
function WolfBuilder({ state, updateRound }) {
  const players = state.players;
  if (players.length < 3) return <div style={{ fontSize: 12, color: C.ivoryDim }}>Wolf needs at least 3 players.</div>;
  const stats = computeStats(state);
  const minThru = Math.min(...stats.map(s => s.thru));
  const h = Math.max(0, Math.min(minThru, state.numHoles - 1));
  const wolfPlayer = players[h % players.length], choice = state.games.wolf.choices[h], others = players.filter(p => p.id !== wolfPlayer.id);
  const setChoice = (next) => updateRound(p => ({ ...p, games: { ...p.games, wolf: { ...p.games.wolf, choices: { ...p.games.wolf.choices, [h]: next } } } }));
  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ fontSize: 13, marginBottom: 8 }}>Hole {h + 1} wolf: <strong>{wolfPlayer.name}</strong></div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
        {others.map(p => <button key={p.id} onClick={() => setChoice({ partnerId: p.id, lone: false })} style={{ fontSize: 12, padding: '6px 10px', borderRadius: 8, border: `1px solid ${choice?.partnerId === p.id && !choice?.lone ? C.gold : C.turfBorder}`, background: choice?.partnerId === p.id && !choice?.lone ? C.gold : 'transparent', color: choice?.partnerId === p.id && !choice?.lone ? C.pineDark : C.ivory, cursor: 'pointer' }}>Partner: {p.name}</button>)}
        <button onClick={() => setChoice({ partnerId: null, lone: true })} style={{ fontSize: 12, padding: '6px 10px', borderRadius: 8, border: `1px solid ${choice?.lone ? C.flagRed : C.turfBorder}`, background: choice?.lone ? C.flagRed : 'transparent', color: C.ivory, cursor: 'pointer' }}>Lone wolf (2x)</button>
      </div>
      <div style={{ fontSize: 11, color: C.ivoryDim }}>The rotation follows the group's actual progress through the round.</div>
    </div>
  );
}
function GamesSection({ state, updateRound, tournament, updateTournament }) {
  const g = state.games;
  const setGame = (key, field, val) => updateRound(p => ({ ...p, games: { ...p.games, [key]: { ...p.games[key], [field]: val } } }));
  const rc = tournament.ryderCup || { enabled: false, teamAName: 'USA', teamBName: 'Europe', totalPlayers: null };
  const setRyderCup = makeSetRyderCup(updateTournament);
  const toggleRyderCup = () => {
    const next = !rc.enabled;
    setRyderCup('enabled', next);
    if (next) updateRound(p => ({ ...p, games: { ...p.games, matchplay: { ...p.games.matchplay, enabled: true } } }));
  };
  return (
    <Accordion title="Games" badge={Object.values(g).filter(x => x.enabled).length + (rc.enabled ? 1 : 0)}>
      <ToggleRow label="Ryder Cup" sub="Two teams, match play points, standings tracked across every round" enabled={rc.enabled} onToggle={toggleRyderCup} />
      {rc.enabled && (
        <div style={{ marginLeft: 28, marginBottom: 14 }}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
            <input value={rc.teamAName} onChange={e => setRyderCup('teamAName', e.target.value)} style={{ ...inputStyle, padding: '7px 10px', fontSize: 13 }} placeholder="Team A" />
            <input value={rc.teamBName} onChange={e => setRyderCup('teamBName', e.target.value)} style={{ ...inputStyle, padding: '7px 10px', fontSize: 13 }} placeholder="Team B" />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <span style={{ fontSize: 11, color: C.ivoryDim }}>Total players expected</span>
            <input type="number" min={2} value={rc.totalPlayers ?? ''} onChange={e => setRyderCup('totalPlayers', e.target.value ? parseInt(e.target.value, 10) : null)} style={{ ...inputStyle, width: 56, padding: '5px 8px' }} placeholder="e.g. 8" />
          </div>
          <div style={{ fontSize: 11, color: C.ivoryDim, lineHeight: 1.5 }}>
            {tournament.players.length} of {rc.totalPlayers || '?'} players added so far{rc.totalPlayers ? ` — aim for ${Math.round(rc.totalPlayers / 2)} per team` : ''} · {tournament.rounds.length} round{tournament.rounds.length !== 1 ? 's' : ''} planned. Build each round's pairings below in Match play — best-ball 2v2 for team sessions, 1v1 for singles.
          </div>
        </div>
      )}
      <ToggleRow label="Skins" sub="Lowest score on a hole wins the pot, ties carry over" enabled={g.skins.enabled} onToggle={() => setGame('skins', 'enabled', !g.skins.enabled)} right={g.skins.enabled && <DollarInput value={g.skins.value} onChange={v => setGame('skins', 'value', v)} />} />
      {g.skins.enabled && state.handicapsEnabled && <NetToggle value={g.skins.net} onChange={v => setGame('skins', 'net', v)} />}
      <ToggleRow label="Nassau" sub="Front 9 / back 9 / total — three separate bets" enabled={g.nassau.enabled} onToggle={() => setGame('nassau', 'enabled', !g.nassau.enabled)} right={g.nassau.enabled && <DollarInput value={g.nassau.value} onChange={v => setGame('nassau', 'value', v)} />} />
      {g.nassau.enabled && state.handicapsEnabled && <NetToggle value={g.nassau.net} onChange={v => setGame('nassau', 'net', v)} />}
      <ToggleRow label="Stableford" sub="Points per hole vs par, $ per point above the field average" enabled={g.stableford.enabled} onToggle={() => setGame('stableford', 'enabled', !g.stableford.enabled)} right={g.stableford.enabled && <DollarInput value={g.stableford.value} onChange={v => setGame('stableford', 'value', v)} />} />
      {g.stableford.enabled && state.handicapsEnabled && <NetToggle value={g.stableford.net} onChange={v => setGame('stableford', 'net', v)} />}
      <ToggleRow label="Match play" sub="Head-to-head or best-ball pairs, net off the low handicap" enabled={g.matchplay.enabled} onToggle={() => setGame('matchplay', 'enabled', !g.matchplay.enabled)} right={g.matchplay.enabled && <DollarInput value={g.matchplay.value} onChange={v => setGame('matchplay', 'value', v)} />} />
      {g.matchplay.enabled && <MatchBuilder state={state} updateRound={updateRound} />}
      <ToggleRow label="Wolf" sub="Rotating wolf each hole, partner up or go it alone for 2x" enabled={g.wolf.enabled} onToggle={() => setGame('wolf', 'enabled', !g.wolf.enabled)} right={g.wolf.enabled && <DollarInput value={g.wolf.value} onChange={v => setGame('wolf', 'value', v)} />} />
      {g.wolf.enabled && <WolfBuilder state={state} updateRound={updateRound} />}
      <ToggleRow label="Pari-mutuel" sub="$5 tickets on a player or team, winner takes the pool" enabled={g.parimutuel.enabled} onToggle={() => setGame('parimutuel', 'enabled', !g.parimutuel.enabled)} />
      {g.parimutuel.enabled && (
        <div style={{ marginLeft: 28, marginBottom: 10 }}>
          <div style={{ display: 'flex', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
            <button onClick={() => setGame('parimutuel', 'marketType', 'players')} style={{ fontSize: 11, padding: '5px 10px', borderRadius: 7, border: `1px solid ${g.parimutuel.marketType === 'players' ? C.gold : C.turfBorder}`, background: g.parimutuel.marketType === 'players' ? C.gold : 'transparent', color: g.parimutuel.marketType === 'players' ? C.pineDark : C.ivoryDim, cursor: 'pointer' }}>Individual players</button>
            {state.flights.length >= 2 && <button onClick={() => setGame('parimutuel', 'marketType', 'flights')} style={{ fontSize: 11, padding: '5px 10px', borderRadius: 7, border: `1px solid ${g.parimutuel.marketType === 'flights' ? C.gold : C.turfBorder}`, background: g.parimutuel.marketType === 'flights' ? C.gold : 'transparent', color: g.parimutuel.marketType === 'flights' ? C.pineDark : C.ivoryDim, cursor: 'pointer' }}>Flights / teams</button>}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}><span style={{ fontSize: 11, color: C.ivoryDim }}>Locks betting after hole</span><input type="number" min={0} max={state.numHoles} value={g.parimutuel.lockAfterHole} onChange={e => setGame('parimutuel', 'lockAfterHole', Math.max(0, parseInt(e.target.value || '0', 10)))} style={{ ...inputStyle, width: 50, padding: '5px 8px' }} /></div>
          {state.handicapsEnabled && g.parimutuel.marketType === 'players' && <NetToggle value={g.parimutuel.net} onChange={v => setGame('parimutuel', 'net', v)} />}
        </div>
      )}
    </Accordion>
  );
}

/* ============================== SETUP MODAL (scroll mode, for adjustments) ============================== */
function SetupModal({ tournament, state, updateTournament, updateRound, onClose, roundCode, newPlayerName, setNewPlayerName, addPlayer, removePlayer, selectProviderCourse, selectCustomCourse, setNumHoles, setPar, setSI, setYardage, setCourseField, setPlayerField, autoFlights, addFlight, renameFlight, removeFlight, assignFlight, startRound, resetScores, onPreview, onAddRound, onSwitchRound }) {
  const [copied, setCopied] = useState(null);
  const [importOpen, setImportOpen] = useState(false);
  const copy = (val, key) => { try { navigator.clipboard.writeText(val); setCopied(key); setTimeout(() => setCopied(null), 1500); } catch (e) {} };
  const hasScores = tournament.rounds.some(r => Object.values(r.scores || {}).some(arr => arr.some(s => s != null)));
  const applyRoster = (players) => {
    updateTournament(prev => {
      const newPlayers = players.map((p, i) => ({
        id: `p_${Date.now()}_${i}_${Math.random().toString(36).slice(2, 6)}`,
        name: p.name, color: CHIP_COLORS[i % CHIP_COLORS.length],
        handicapIndex: p.handicapIndex || '', flightId: p.flightId || null,
      }));
      const emptyScores = (numHoles) => Object.fromEntries(newPlayers.map(p => [p.id, Array(numHoles).fill(null)]));
      return { ...prev, players: newPlayers, rounds: prev.rounds.map(r => ({ ...r, scores: emptyScores(r.numHoles) })) };
    });
  };
  const roundIdx = tournament.rounds.findIndex(r => r.id === tournament.activeRoundId);
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(13,31,26,0.78)', zIndex: 40, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: C.pine, borderTop: `1px solid ${C.turfBorder}`, borderRadius: '20px 20px 0 0', width: '100%', maxWidth: 720, maxHeight: '90vh', overflowY: 'auto', overflowX: 'hidden', padding: '18px 18px 28px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <div style={{ fontFamily: 'Oswald, sans-serif', fontSize: 20, textTransform: 'uppercase', letterSpacing: 0.4 }}>Tournament setup</div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: C.ivory, cursor: 'pointer' }}><X size={22} /></button>
        </div>
        <div style={{ display: 'flex', gap: 14, marginBottom: 10, flexWrap: 'wrap' }}>
          <button onClick={() => copy(roundCode, 'code')} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'transparent', border: 'none', color: C.ivoryDim, cursor: 'pointer', fontSize: 12 }}>Round code <strong style={{ color: C.goldBright, letterSpacing: 1 }}>{roundCode}</strong> <Copy size={13} /> {copied === 'code' && 'copied!'}</button>
          {tournament.adminPin && <button onClick={() => copy(tournament.adminPin, 'pin')} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'transparent', border: 'none', color: C.ivoryDim, cursor: 'pointer', fontSize: 12 }}>Admin PIN <strong style={{ color: C.goldBright, letterSpacing: 1 }}>{tournament.adminPin}</strong> <Copy size={13} /> {copied === 'pin' && 'copied!'}</button>}
        </div>
        <button onClick={onPreview} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'transparent', border: 'none', color: C.goldBright, cursor: 'pointer', fontSize: 12, textDecoration: 'underline', marginBottom: 16 }}>View the app from a player's perspective</button>

        <Field label="Tournament name"><input value={tournament.name} onChange={e => updateTournament(p => ({ ...p, name: e.target.value }))} style={inputStyle} placeholder="DuffBook Trip" /></Field>

        <Accordion title="Rounds" badge={tournament.rounds.length} defaultOpen>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10 }}>
            {tournament.rounds.map((r, i) => (
              <button key={r.id} onClick={() => onSwitchRound(r.id)} style={{ ...rowCard, justifyContent: 'space-between', width: '100%', textAlign: 'left', cursor: 'pointer', border: `1px solid ${r.id === tournament.activeRoundId ? C.gold : C.turfBorder}` }}>
                <span style={{ fontSize: 13 }}>{i + 1}. {r.name}{r.courseName ? ` — ${r.courseName}` : ''}</span>
                <span style={{ fontSize: 11, color: r.started ? C.goldBright : C.ivoryDim }}>{r.started ? 'started' : 'not started'}</span>
              </button>
            ))}
          </div>
          <GhostButton onClick={onAddRound} style={{ width: '100%', textAlign: 'center' }}>+ Add another round</GhostButton>
        </Accordion>

        <Field label={`Round ${roundIdx + 1} name`}><input value={state.roundName} onChange={e => updateRound(p => ({ ...p, name: e.target.value }))} style={inputStyle} placeholder={`Round ${roundIdx + 1}`} /></Field>
        <CourseSection state={state} selectProviderCourse={selectProviderCourse} selectCustomCourse={selectCustomCourse} setNumHoles={setNumHoles} setPar={setPar} setSI={setSI} setYardage={setYardage} setCourseField={setCourseField} />
        <PlayersSection state={state} newPlayerName={newPlayerName} setNewPlayerName={setNewPlayerName} addPlayer={addPlayer} removePlayer={removePlayer} flights={tournament.flights} onOpenImport={() => setImportOpen(true)} />
        <HandicapsFlightsSection state={state} updateTournament={updateTournament} setPlayerField={setPlayerField} autoFlights={autoFlights} addFlight={addFlight} renameFlight={renameFlight} removeFlight={removeFlight} assignFlight={assignFlight} />
        <GamesSection state={state} updateRound={updateRound} tournament={tournament} updateTournament={updateTournament} />

        <div style={{ display: 'flex', gap: 10, marginTop: 10 }}><GoldButton style={{ flex: 1, padding: '13px 0', fontSize: 15 }} disabled={state.players.length < 1} onClick={() => { startRound(); onClose(); }}>{state.started ? 'Save & close' : 'Start this round'}</GoldButton></div>
        {state.started && <GhostButton style={{ marginTop: 10, width: '100%', textAlign: 'center', color: C.flagRed, borderColor: C.flagRed }} onClick={resetScores}>Reset scores for this round</GhostButton>}
      </div>
      {importOpen && <RosterImportModal flights={tournament.flights} existingPlayerCount={tournament.players.length} hasScores={hasScores} onApply={applyRoster} onClose={() => setImportOpen(false)} />}
    </div>
  );
}

/* ============================== SETUP WIZARD (guided, card-by-card) ==============================
   Used the first time a round is configured, and re-enterable any time via "Add another round"
   or "Redo this round's wizard". Single-tap steps (course, holes) auto-advance; anything with
   free text or multiple toggles needs an explicit Next so it doesn't feel like it's racing ahead. */
function WizardShell({ step, total, onJump, onClose, children, title }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(5,9,17,0.78)', zIndex: 55, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: C.pine, border: `1px solid ${C.turfBorder}`, borderRadius: 20, width: '100%', maxWidth: 440, maxHeight: '85vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ flexShrink: 0, padding: '16px 18px 8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: 5 }}>
            {Array.from({ length: total }, (_, i) => (
              <button key={i} onClick={() => onJump(i)} style={{ width: i === step ? 20 : 7, height: 7, borderRadius: 999, background: i <= step ? C.gold : C.turfBorder, border: 'none', cursor: 'pointer', transition: 'width 0.15s ease' }} />
            ))}
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: C.ivoryDim, cursor: 'pointer' }}><X size={18} /></button>
        </div>
        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '4px 20px 18px' }}>
          <div style={{ fontFamily: 'Anton, sans-serif', fontSize: 21, textTransform: 'uppercase', marginBottom: 14, marginTop: 2 }}>{title}</div>
          {children}
        </div>
        <button onClick={onClose} style={{ flexShrink: 0, background: 'transparent', border: 'none', borderTop: `1px solid ${C.turfBorder}`, color: C.ivoryDim, fontSize: 12, textDecoration: 'underline', cursor: 'pointer', padding: '10px 0' }}>Skip to full settings</button>
      </div>
    </div>
  );
}
function WizardNextButton({ onClick, disabled, label }) {
  return <GoldButton onClick={onClick} disabled={disabled} style={{ width: '100%', padding: '14px 0', fontSize: 15, marginTop: 18 }}>{label || 'Next'}</GoldButton>;
}

function SetupWizard({ tournament, state, updateTournament, updateRound, onClose, roundCode, selectProviderCourse, selectCustomCourse, setNumHoles, setPlayerField, autoFlights, setCourseField, startRound, isNewRound, onFinish }) {
  const baseSteps = isNewRound ? ['course', 'holes', 'games', 'review'] : ['basics', 'course', 'holes', 'players', 'games', 'review'];
  const [step, setStep] = useState(0);
  const [newPlayerName, setNewPlayerName] = useState('');
  const [coursePickerOpen, setCoursePickerOpen] = useState(false);
  const [wizardImportOpen, setWizardImportOpen] = useState(false);
  const stepKey = baseSteps[step];
  const goNext = () => setStep(s => Math.min(baseSteps.length - 1, s + 1));
  const goPrev = () => setStep(s => Math.max(0, s - 1));

  const addPlayerLocal = () => {
    const name = newPlayerName.trim(); if (!name) return;
    updateTournament(prev => {
      const color = CHIP_COLORS[prev.players.length % CHIP_COLORS.length];
      const id = `p_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      return { ...prev, players: [...prev.players, { id, name, color, handicapIndex: '', flightId: null }], rounds: prev.rounds.map(r => ({ ...r, scores: { ...r.scores, [id]: Array(r.numHoles).fill(null) } })) };
    });
    setNewPlayerName('');
  };
  const removePlayerLocal = (id) => updateTournament(prev => ({
    ...prev, players: prev.players.filter(p => p.id !== id),
    rounds: prev.rounds.map(r => ({ ...r, scores: Object.fromEntries(Object.entries(r.scores).filter(([k]) => k !== id)) })),
  }));
  const setGameEnabled = (key, val) => updateRound(p => ({ ...p, games: { ...p.games, [key]: { ...p.games[key], enabled: val } } }));
  const setRoundCount = (n) => updateTournament(prev => {
    const have = prev.rounds.length;
    if (n <= have) return prev;
    const extra = Array.from({ length: n - have }, (_, i) => defaultRound(have + i));
    return { ...prev, rounds: [...prev.rounds, ...extra] };
  });

  const finish = () => { startRound(); onFinish(); };

  return (
    <WizardShell step={step} total={baseSteps.length} onJump={setStep} onClose={onClose} title={
      { basics: 'The basics', course: 'Pick a course', holes: '9 or 18?', players: 'Who\u2019s playing?', games: 'What are we betting on?', review: 'Ready to go' }[stepKey]
    }>
      {stepKey === 'basics' && (
        <div>
          <Field label="Tournament name"><input value={tournament.name} onChange={e => updateTournament(p => ({ ...p, name: e.target.value }))} style={inputStyle} placeholder="DuffBook Trip" autoFocus /></Field>
          <Field label="How many rounds is this trip?">
            <div style={{ display: 'flex', gap: 8 }}>
              {[1, 2, 3, 4].map(n => (
                <button key={n} onClick={() => setRoundCount(n)} style={{ flex: 1, padding: '14px 0', borderRadius: 12, fontFamily: 'Anton, sans-serif', fontSize: 18, background: tournament.rounds.length === n || (n === 4 && tournament.rounds.length >= 4) ? C.gold : 'transparent', color: tournament.rounds.length === n || (n === 4 && tournament.rounds.length >= 4) ? C.pineDark : C.ivory, border: `1px solid ${C.turfBorder}`, cursor: 'pointer' }}>{n === 4 ? '4+' : n}</button>
              ))}
            </div>
            <div style={{ fontSize: 11, color: C.ivoryDim, marginTop: 6 }}>You can add more later — this just gets the slots ready.</div>
          </Field>
          <WizardNextButton onClick={goNext} disabled={!tournament.name.trim()} />
        </div>
      )}

      {stepKey === 'course' && (
        <div>
          {state.providerId && (
            <div style={{ ...rowCard, marginBottom: 14, justifyContent: 'space-between' }}>
              <div><div style={{ fontWeight: 600, fontSize: 14 }}>{state.courseName}</div><div style={{ fontSize: 11, color: C.ivoryDim }}>{state.teeName} tees · {state.courseRating}/{state.courseSlope}</div></div>
              <Check size={16} color={C.gold} />
            </div>
          )}
          <GoldButton onClick={() => setCoursePickerOpen(true)} style={{ width: '100%', padding: '13px 0', marginBottom: 10 }}>Search for a course</GoldButton>
          <GhostButton onClick={() => { selectCustomCourse(); goNext(); }} style={{ width: '100%', textAlign: 'center' }}>Enter manually instead</GhostButton>
          {coursePickerOpen && <CoursePickerModal onSelect={(course, teeName) => { selectProviderCourse(course, teeName); setCoursePickerOpen(false); goNext(); }} onCustom={() => { selectCustomCourse(); setCoursePickerOpen(false); goNext(); }} onClose={() => setCoursePickerOpen(false)} />}
        </div>
      )}

      {stepKey === 'holes' && (
        <div>
          <div style={{ display: 'flex', gap: 10 }}>
            {[9, 18].map(n => (
              <button key={n} onClick={() => { setNumHoles(n); goNext(); }} style={{ flex: 1, padding: '28px 0', borderRadius: 14, fontFamily: 'Anton, sans-serif', fontSize: 26, background: state.numHoles === n ? C.gold : C.turf, color: state.numHoles === n ? C.pineDark : C.ivory, border: `1px solid ${state.numHoles === n ? C.gold : C.turfBorder}`, cursor: 'pointer' }}>{n}</button>
            ))}
          </div>
        </div>
      )}

      {stepKey === 'players' && (
        <div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10 }}>
            {tournament.players.map(p => <div key={p.id} style={{ ...rowCard, justifyContent: 'space-between', padding: '8px 10px' }}><div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Chip color={p.color}>{initials(p.name)}</Chip><span style={{ fontSize: 14 }}>{p.name}</span></div><button onClick={() => removePlayerLocal(p.id)} style={{ background: 'transparent', border: 'none', color: C.flagRed, cursor: 'pointer' }}><Trash2 size={16} /></button></div>)}
          </div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
            <input value={newPlayerName} onChange={e => setNewPlayerName(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') addPlayerLocal(); }} placeholder="Add a player" style={{ ...inputStyle, flex: 1 }} autoFocus />
            <button onClick={addPlayerLocal} style={{ background: C.gold, border: 'none', borderRadius: 10, width: 44, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.pineDark, cursor: 'pointer' }}><UserPlus size={18} /></button>
          </div>
          <button onClick={() => setWizardImportOpen(true)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, width: '100%', background: 'transparent', border: `1px dashed ${C.turfBorder}`, color: C.goldBright, borderRadius: 10, padding: '10px 0', cursor: 'pointer', fontSize: 12, marginBottom: 16 }}>
            <UserPlus size={14} /> Import roster from CSV or XLSX
          </button>

          <ToggleRow label="Track handicaps" sub="Net scoring from each player's index" enabled={tournament.handicapsEnabled} onToggle={() => updateTournament(p => ({ ...p, handicapsEnabled: !p.handicapsEnabled }))} />
          {tournament.handicapsEnabled && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10, marginLeft: 4 }}>
              {tournament.players.map(p => (
                <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Chip color={p.color}>{initials(p.name)}</Chip><span style={{ fontSize: 13, flex: 1 }}>{p.name}</span>
                  <input type="number" step="0.1" value={p.handicapIndex} onChange={e => setPlayerField(p.id, 'handicapIndex', e.target.value)} placeholder="Index" style={{ ...inputStyle, width: 70, padding: '6px 8px' }} />
                </div>
              ))}
            </div>
          )}
          <ToggleRow label="Use flights / teams" sub="Red vs Blue, auto-balanced by handicap" enabled={tournament.flights.length > 0} onToggle={() => updateTournament(p => ({ ...p, flights: p.flights.length ? [] : [{ id: 'f1', name: 'Red', color: FLIGHT_COLORS[0] }, { id: 'f2', name: 'Blue', color: FLIGHT_COLORS[1] }] }))} />
          {tournament.flights.length > 0 && <GhostButton onClick={autoFlights} style={{ marginBottom: 10 }}>Auto-balance now</GhostButton>}

          <WizardNextButton onClick={goNext} disabled={tournament.players.length === 0} />
          {wizardImportOpen && <RosterImportModal flights={tournament.flights} existingPlayerCount={tournament.players.length} hasScores={false} onApply={(players) => {
            updateTournament(prev => {
              const newPlayers = players.map((p, i) => ({ id: `p_${Date.now()}_${i}_${Math.random().toString(36).slice(2, 6)}`, name: p.name, color: CHIP_COLORS[i % CHIP_COLORS.length], handicapIndex: p.handicapIndex || '', flightId: p.flightId || null }));
              return { ...prev, players: newPlayers, rounds: prev.rounds.map(r => ({ ...r, scores: Object.fromEntries(newPlayers.map(p => [p.id, Array(r.numHoles).fill(null)])) })) };
            });
          }} onClose={() => setWizardImportOpen(false)} />}
        </div>
      )}

      {stepKey === 'games' && (
        <div>
          <div style={{ fontSize: 12, color: C.ivoryDim, marginBottom: 12 }}>Tap to turn on — amounts and details default to sensible values, adjust later in full settings.</div>
          {!isNewRound && (() => {
            const rc = tournament.ryderCup || { enabled: false, teamAName: 'USA', teamBName: 'Europe', totalPlayers: null };
            const setRyderCup = makeSetRyderCup(updateTournament);
            const toggleRyderCup = () => {
              const next = !rc.enabled;
              setRyderCup('enabled', next);
              if (next) updateRound(p => ({ ...p, games: { ...p.games, matchplay: { ...p.games.matchplay, enabled: true } } }));
            };
            return (
              <>
                <ToggleRow label="Ryder Cup" sub="Two teams, match play points, standings tracked across every round" enabled={rc.enabled} onToggle={toggleRyderCup} />
                {rc.enabled && (
                  <div style={{ marginLeft: 28, marginBottom: 14 }}>
                    <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                      <input value={rc.teamAName} onChange={e => setRyderCup('teamAName', e.target.value)} style={{ ...inputStyle, padding: '7px 10px', fontSize: 13 }} placeholder="Team A" />
                      <input value={rc.teamBName} onChange={e => setRyderCup('teamBName', e.target.value)} style={{ ...inputStyle, padding: '7px 10px', fontSize: 13 }} placeholder="Team B" />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <span style={{ fontSize: 11, color: C.ivoryDim }}>Total players expected</span>
                      <input type="number" min={2} value={rc.totalPlayers ?? ''} onChange={e => setRyderCup('totalPlayers', e.target.value ? parseInt(e.target.value, 10) : null)} style={{ ...inputStyle, width: 56, padding: '5px 8px' }} placeholder="e.g. 8" />
                    </div>
                    <div style={{ fontSize: 11, color: C.ivoryDim, lineHeight: 1.5 }}>
                      {tournament.players.length} of {rc.totalPlayers || '?'} added so far{rc.totalPlayers ? ` — aim for ${Math.round(rc.totalPlayers / 2)} per team` : ''} · {tournament.rounds.length} round{tournament.rounds.length !== 1 ? 's' : ''} planned. You'll build each round's pairings in full settings under Match play.
                    </div>
                  </div>
                )}
              </>
            );
          })()}
          {[['skins', 'Skins'], ['nassau', 'Nassau'], ['stableford', 'Stableford'], ['matchplay', 'Match play'], ['wolf', 'Wolf'], ['parimutuel', 'Pari-mutuel']].map(([key, label]) => (
            <ToggleRow key={key} label={label} enabled={state.games[key].enabled} onToggle={() => setGameEnabled(key, !state.games[key].enabled)} />
          ))}
          <WizardNextButton onClick={goNext} />
        </div>
      )}

      {stepKey === 'review' && (
        <div>
          <div style={{ ...rowCard, flexDirection: 'column', alignItems: 'flex-start', marginBottom: 14 }}>
            <div style={{ fontSize: 11, color: C.ivoryDim, textTransform: 'uppercase' }}>{tournament.name}</div>
            <div style={{ fontFamily: 'Oswald, sans-serif', fontSize: 16 }}>{state.roundName}{state.courseName ? ` \u2014 ${state.courseName}` : ''}</div>
            <div style={{ fontSize: 12, color: C.ivoryDim, marginTop: 4 }}>{state.numHoles} holes · {tournament.players.length} player{tournament.players.length !== 1 ? 's' : ''} · {tournament.rounds.length} round{tournament.rounds.length !== 1 ? 's' : ''} total</div>
            <div style={{ fontSize: 12, color: C.ivoryDim, marginTop: 4 }}>Games: {Object.keys(state.games).filter(k => state.games[k].enabled).join(', ') || 'none yet'}</div>
          </div>
          <div style={{ display: 'flex', gap: 14, marginBottom: 18, flexWrap: 'wrap' }}>
            <div><div style={{ fontSize: 10, color: C.ivoryDim, textTransform: 'uppercase' }}>Round code</div><div style={{ fontFamily: 'Oswald, sans-serif', color: C.goldBright, letterSpacing: 1 }}>{roundCode}</div></div>
            {tournament.adminPin && <div><div style={{ fontSize: 10, color: C.ivoryDim, textTransform: 'uppercase' }}>Admin PIN</div><div style={{ fontFamily: 'Oswald, sans-serif', color: C.goldBright, letterSpacing: 1 }}>{tournament.adminPin}</div></div>}
          </div>
          <WizardNextButton onClick={finish} label={isNewRound ? 'Start this round' : 'Start the tournament'} />
        </div>
      )}

      {step > 0 && stepKey !== 'review' && <GhostButton onClick={goPrev} style={{ marginTop: 10, width: '100%', textAlign: 'center' }}>Back</GhostButton>}
    </WizardShell>
  );
}

/* ============================== ROUND SWITCHER ============================== */
function RoundSwitcherModal({ tournament, onSwitch, onClose, isAdmin, onAddRound }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(5,9,17,0.78)', zIndex: 45, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: C.pine, borderTop: `1px solid ${C.turfBorder}`, borderRadius: '20px 20px 0 0', width: '100%', maxWidth: 720, maxHeight: '80vh', overflowY: 'auto', padding: '18px 18px 28px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div style={{ fontFamily: 'Oswald, sans-serif', fontSize: 20, textTransform: 'uppercase', letterSpacing: 0.4 }}>{tournament.name}</div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: C.ivory, cursor: 'pointer' }}><X size={22} /></button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
          {tournament.rounds.map((r, i) => (
            <button key={r.id} onClick={() => { onSwitch(r.id); onClose(); }} style={{ ...rowCard, justifyContent: 'space-between', width: '100%', textAlign: 'left', cursor: 'pointer', border: `1px solid ${r.id === tournament.activeRoundId ? C.gold : C.turfBorder}`, background: r.id === tournament.activeRoundId ? C.turfLight : C.turf }}>
              <div><div style={{ fontSize: 14, fontWeight: 600 }}>{i + 1}. {r.name}</div><div style={{ fontSize: 11, color: C.ivoryDim }}>{r.courseName || 'no course yet'}</div></div>
              <span style={{ fontSize: 11, color: r.started ? C.goldBright : C.ivoryDim }}>{r.started ? 'started' : 'not started'}</span>
            </button>
          ))}
        </div>
        {isAdmin && <GoldButton onClick={() => { onAddRound(); onClose(); }} style={{ width: '100%', padding: '12px 0' }}>+ Add another round</GoldButton>}
      </div>
    </div>
  );
}

/* ============================== NOTIFICATIONS MODAL ============================== */
const NOTIF_TYPES = [
  { key: 'leadChange', label: 'Lead changes', sub: 'Someone takes over first place' },
  { key: 'skinsWon', label: 'Skins won', sub: 'A skin (or carry-over pot) gets claimed' },
  { key: 'matchDecided', label: 'Match play results', sub: 'A head-to-head match is decided' },
  { key: 'allSquare', label: 'Tight matches', sub: 'A match is all square with 5 holes to play' },
  { key: 'playerFinished', label: 'Players finishing', sub: 'Someone posts their final score' },
  { key: 'bettingClosingSoon', label: 'Betting closing', sub: 'Pari-mutuel betting is about to lock' },
  { key: 'roundComplete', label: 'Round complete', sub: 'Everyone\u2019s finished and everything\u2019s settled' },
  { key: 'chat', label: 'Group chat', sub: 'New messages from the group' },
];
function NotificationsModal({ prefs, setPrefs, onClose }) {
  const supported = typeof Notification !== 'undefined';
  const [perm, setPerm] = useState(supported ? Notification.permission : 'unsupported');
  const request = async () => { try { const r = await Notification.requestPermission(); setPerm(r); } catch (e) {} };
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(13,31,26,0.78)', zIndex: 40, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: C.pine, borderTop: `1px solid ${C.turfBorder}`, borderRadius: '20px 20px 0 0', width: '100%', maxWidth: 720, maxHeight: '85vh', overflowY: 'auto', overflowX: 'hidden', padding: '18px 18px 28px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}><div style={{ fontFamily: 'Oswald, sans-serif', fontSize: 20, textTransform: 'uppercase', letterSpacing: 0.4 }}>Notifications</div><button onClick={onClose} style={{ background: 'transparent', border: 'none', color: C.ivory, cursor: 'pointer' }}><X size={22} /></button></div>
        <div style={{ fontSize: 12, color: C.ivoryDim, marginBottom: 14, lineHeight: 1.5 }}>These are browser alerts that fire while DuffBook is open on this device — not true background push.</div>
        {perm !== 'granted' && supported && <GoldButton onClick={request} style={{ marginBottom: 16 }}>{perm === 'denied' ? 'Blocked — check browser settings' : 'Enable browser alerts'}</GoldButton>}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>{NOTIF_TYPES.map(n => <ToggleRow key={n.key} label={n.label} sub={n.sub} enabled={!!prefs[n.key]} onToggle={() => setPrefs({ ...prefs, [n.key]: !prefs[n.key] })} />)}</div>
      </div>
    </div>
  );
}

/* ============================== BECOME ADMIN / DEVICE PROFILE ============================== */
function BecomeAdminModal({ onSubmit, onClose }) {
  const [pin, setPin] = useState(''); const [err, setErr] = useState(false);
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(13,31,26,0.78)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: C.pine, border: `1px solid ${C.turfBorder}`, borderRadius: 16, padding: 20, width: '100%', maxWidth: 280 }}>
        <div style={{ fontFamily: 'Oswald, sans-serif', fontSize: 16, textTransform: 'uppercase', marginBottom: 10 }}>Admin PIN</div>
        <input value={pin} onChange={e => { setPin(e.target.value); setErr(false); }} placeholder="4-digit PIN" style={{ ...inputStyle, textAlign: 'center', letterSpacing: 3, marginBottom: 10 }} />
        {err && <div style={{ color: C.flagRed, fontSize: 12, marginBottom: 10 }}>That's not the right PIN.</div>}
        <GoldButton style={{ width: '100%' }} onClick={() => { if (onSubmit(pin)) onClose(); else setErr(true); }}>Unlock admin</GoldButton>
      </div>
    </div>
  );
}
function DeviceProfileModal({ name, onSave, onClose }) {
  const [val, setVal] = useState(name || '');
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(13,31,26,0.78)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: C.pine, border: `1px solid ${C.turfBorder}`, borderRadius: 16, padding: 20, width: '100%', maxWidth: 300 }}>
        <div style={{ fontFamily: 'Oswald, sans-serif', fontSize: 16, textTransform: 'uppercase', marginBottom: 6 }}>Your name</div>
        <div style={{ fontSize: 11, color: C.ivoryDim, marginBottom: 12, lineHeight: 1.5 }}>Saved on this device only — used to prefill "add me" and to remember which rounds you've played.</div>
        <input value={val} onChange={e => setVal(e.target.value)} placeholder="e.g. Mike" style={{ ...inputStyle, marginBottom: 12 }} autoFocus />
        <GoldButton style={{ width: '100%' }} onClick={() => { onSave(val.trim()); onClose(); }}>Save</GoldButton>
      </div>
    </div>
  );
}

/* ============================== SETTINGS SHEET ============================== */
function SettingsSheet({ onClose, onOpenSetup, onOpenNotifications, onOpenScan, onLeave, onBecomeAdmin, roundCode, adminPin, isAdmin, hasPlayers, previewMode, onExitPreview, guidanceEnabled, onToggleGuidance, onOpenProfile, onOpenRoundSwitcher, multiRound, onOpenRoundFlow }) {
  const [copied, setCopied] = useState(false);
  const copyCode = () => { try { navigator.clipboard.writeText(roundCode); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch (e) {} };
  const item = (Icon, label, onClick, danger) => <button onClick={onClick} style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', background: 'transparent', border: 'none', color: danger ? C.flagRed : C.ivory, padding: '13px 4px', cursor: 'pointer', fontSize: 15, borderBottom: `1px solid ${C.turfBorder}`, textAlign: 'left' }}><Icon size={18} /> {label}</button>;
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(13,31,26,0.78)', zIndex: 40, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: C.pine, borderTop: `1px solid ${C.turfBorder}`, borderRadius: '20px 20px 0 0', width: '100%', maxWidth: 720, padding: '18px 18px 28px' }}>
        <button onClick={copyCode} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'transparent', border: 'none', color: C.ivoryDim, cursor: 'pointer', marginBottom: 6, fontSize: 12 }}>Round code <strong style={{ color: C.goldBright, letterSpacing: 1 }}>{roundCode}</strong> <Copy size={13} /> {copied && 'copied!'}</button>
        {isAdmin && <div style={{ fontSize: 11, color: C.ivoryDim, marginBottom: 12 }}>You're an admin · PIN {adminPin}</div>}
        {previewMode && item(LogOut, 'Exit player preview', onExitPreview)}
        {multiRound && item(ChevronsUpDown, 'Switch round', onOpenRoundSwitcher)}
        {hasPlayers && item(Flag, 'Round Flow', onOpenRoundFlow)}
        {isAdmin && item(Settings, 'Round setup', onOpenSetup)}
        {item(Bell, 'Notifications', onOpenNotifications)}
        {hasPlayers && item(Camera, 'Scan a scorecard', onOpenScan)}
        {item(User, 'Your name on this device', onOpenProfile)}
        {!isAdmin && !previewMode && item(KeyRound, 'Become an admin', onBecomeAdmin)}
        <div style={{ padding: '10px 4px' }}><ToggleRow label="Show me what's next" sub="A small banner on Home suggesting your next step" enabled={guidanceEnabled} onToggle={onToggleGuidance} /></div>
        {item(LogOut, 'Leave this tournament', onLeave, true)}
      </div>
    </div>
  );
}

/* ============================== SCAN MODAL ============================== */
function ScanModal({ state, onClose, onApply }) {
  const [imgData, setImgData] = useState(null);
  const [status, setStatus] = useState('idle');
  const [parsed, setParsed] = useState([]);
  const [errorMsg, setErrorMsg] = useState('');
  const fileRef = useRef(null);
  const handleFile = (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = () => { const dataUrl = reader.result; const m = /^data:(image\/[a-zA-Z]+);base64,(.*)$/.exec(dataUrl || ''); if (m) setImgData({ mediaType: m[1], base64: m[2], preview: dataUrl }); };
    reader.readAsDataURL(file);
  };
  const runScan = async () => {
    if (!imgData) return;
    setStatus('scanning'); setErrorMsg('');
    try {
      const names = state.players.map(p => p.name).join(', ');
      const prompt = `This is a photo of a golf scorecard. The players in this round are: ${names}. The round has ${state.numHoles} holes. For each player row you can identify, read their stroke count for each hole in order. Respond with ONLY raw JSON, no markdown, no commentary, in exactly this shape: {"players":[{"name":"<closest matching name from the list above>","scores":[<number or null for each of the ${state.numHoles} holes, in order>]}]}. Skip rows you can't confidently match. Use null for unclear scores rather than guessing.`;
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'claude-sonnet-4-6', max_tokens: 1000, messages: [{ role: 'user', content: [{ type: 'image', source: { type: 'base64', media_type: imgData.mediaType, data: imgData.base64 } }, { type: 'text', text: prompt }] }] }),
      });
      const data = await response.json();
      const text = (data.content || []).map(b => b.text || '').join('\n');
      const obj = JSON.parse(text.replace(/```json|```/g, '').trim());
      const matched = (obj.players || []).map(row => {
        const lname = String(row.name || '').toLowerCase();
        const p = state.players.find(pp => pp.name.toLowerCase() === lname) || state.players.find(pp => pp.name.toLowerCase().includes(lname) || lname.includes(pp.name.toLowerCase()));
        const scores = Array.from({ length: state.numHoles }, (_, i) => { const v = row.scores?.[i]; return (typeof v === 'number' && v > 0) ? v : null; });
        return { playerId: p ? p.id : null, name: row.name, scores };
      }).filter(r => r.playerId);
      if (matched.length === 0) { setErrorMsg("Couldn't match any rows to your players. Try a clearer photo, or enter scores by hand."); setStatus('error'); return; }
      setParsed(matched); setStatus('review');
    } catch (e) { setErrorMsg('Something went wrong reading that photo. Try again or enter scores by hand.'); setStatus('error'); }
  };
  const editScore = (playerId, i, val) => setParsed(prev => prev.map(r => r.playerId === playerId ? { ...r, scores: r.scores.map((s, idx) => idx === i ? (val === '' ? null : parseInt(val, 10)) : s) } : r));
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(13,31,26,0.78)', zIndex: 50, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: C.pine, borderTop: `1px solid ${C.turfBorder}`, borderRadius: '20px 20px 0 0', width: '100%', maxWidth: 720, maxHeight: '88vh', overflowY: 'auto', overflowX: 'hidden', padding: '18px 18px 28px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}><div style={{ fontFamily: 'Oswald, sans-serif', fontSize: 20, textTransform: 'uppercase', letterSpacing: 0.4 }}>Scan scorecard</div><button onClick={onClose} style={{ background: 'transparent', border: 'none', color: C.ivory, cursor: 'pointer' }}><X size={22} /></button></div>
        {status !== 'review' && (
          <>
            <div style={{ fontSize: 12, color: C.ivoryDim, marginBottom: 14, lineHeight: 1.5 }}>Take or upload a photo of the paper card. We'll read it and let you double-check before it touches the live scorecard.</div>
            <input ref={fileRef} type="file" accept="image/*" capture="environment" onChange={handleFile} style={{ display: 'none' }} />
            <button onClick={() => fileRef.current?.click()} style={{ width: '100%', borderRadius: 12, border: `1px dashed ${C.turfBorder}`, background: 'transparent', color: C.ivoryDim, padding: '24px 0', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, marginBottom: 14 }}><Camera size={28} /> {imgData ? 'Choose a different photo' : 'Take or choose a photo'}</button>
            {imgData && <img src={imgData.preview} alt="scorecard preview" style={{ width: '100%', borderRadius: 12, marginBottom: 14, maxHeight: 240, objectFit: 'contain', background: C.pineDark }} />}
            {status === 'error' && <div style={{ color: C.flagRed, fontSize: 13, marginBottom: 10 }}>{errorMsg}</div>}
            <GoldButton onClick={runScan} disabled={!imgData || status === 'scanning'} style={{ width: '100%', padding: '13px 0' }}>{status === 'scanning' ? <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}><Loader2 size={16} className="spin" /> Reading card…</span> : 'Read this card'}</GoldButton>
          </>
        )}
        {status === 'review' && (
          <>
            <div style={{ fontSize: 12, color: C.ivoryDim, marginBottom: 12 }}>Check these before applying — fix anything that looks off.</div>
            {parsed.map(row => { const p = state.players.find(pp => pp.id === row.playerId); return (
              <div key={row.playerId} style={{ marginBottom: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}><Chip color={p?.color}>{initials(p?.name)}</Chip><span style={{ fontSize: 14, fontWeight: 600 }}>{p?.name}</span></div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(9, 1fr)', gap: 4 }}>{row.scores.map((s, i) => <div key={i} style={{ textAlign: 'center' }}><div style={{ fontSize: 9, color: C.ivoryDim }}>{i + 1}</div><input value={s ?? ''} onChange={e => editScore(row.playerId, i, e.target.value)} style={{ ...inputStyle, padding: '5px 0', textAlign: 'center', fontSize: 12 }} /></div>)}</div>
              </div>
            ); })}
            <GoldButton onClick={() => { onApply(parsed); onClose(); }} style={{ width: '100%', padding: '13px 0' }}>Apply to scorecard</GoldButton>
          </>
        )}
      </div>
    </div>
  );
}

/* ============================== MY POSITION ============================== */
/* ============================== ROUND FLOW (live pace-of-play screen) ============================== */
const PACE_COLORS = { 'Ahead': C.blueBright, 'On Pace': C.goldBright, 'Slightly Behind': '#D98E2E', 'Slow': C.flagRed, 'Finished': C.ivoryDim, 'Not Started': C.ivoryDim };
const PACE_RANK = { 'Slow': 0, 'Slightly Behind': 1, 'On Pace': 2, 'Ahead': 3, 'Not Started': 4, 'Finished': 5 };

function HoleTimeline({ holeProgress, currentHole }) {
  return (
    <div style={{ display: 'flex', gap: 4, overflowX: 'auto', padding: '2px 2px 6px', WebkitOverflowScrolling: 'touch' }}>
      {holeProgress.map(h => {
        const isCurrent = h.holeNumber === currentHole;
        const bg = isCurrent ? C.turfLight : h.hasBirdieOrBetter ? C.gold : h.completed ? C.turf : C.pineDark;
        const opacity = (!h.completed && !isCurrent) ? 0.4 : 1;
        return (
          <div key={h.holeNumber} style={{ position: 'relative', flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
            <div style={{ width: 27, height: 27, borderRadius: 8, background: bg, border: `1.5px solid ${isCurrent ? C.gold : C.turfBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity }}>
              {isCurrent ? <Flag size={13} color={C.goldBright} /> : h.completed ? <Check size={13} color={h.hasBirdieOrBetter ? C.pineDark : C.goldBright} /> : null}
            </div>
            {h.hasBetWin && <span style={{ position: 'absolute', top: -5, right: -5, width: 14, height: 14, borderRadius: 999, background: C.flagRed, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${C.pineDark}` }}><Coins size={7} color={C.ivory} /></span>}
            <span style={{ fontSize: 8, color: C.ivoryDim }}>{h.holeNumber}</span>
          </div>
        );
      })}
    </div>
  );
}

function GroupFlowCard({ group, playersById, isMyGroup, isAdmin, isMock, now, onAction }) {
  const paceColor = PACE_COLORS[group.paceStatus] || C.ivoryDim;
  const names = group.playerIds.map(pid => playersById[pid]?.name || '?');
  return (
    <div style={{ background: C.turf, border: `1.5px solid ${group.finished ? C.turfBorder : paceColor}`, borderRadius: 14, padding: 14, boxShadow: '0 4px 0 rgba(0,0,0,0.4)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10, gap: 8 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontFamily: 'Oswald, sans-serif', fontSize: 15, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 6 }}>Group {group.groupNumber}{isMyGroup && <span style={{ color: C.goldBright, fontSize: 11 }}>· You</span>}</div>
          <div style={{ fontSize: 11, color: C.ivoryDim }}>{group.teeTime ? fmtClockTime(new Date(group.teeTime).getTime()) : 'Tee time TBD'} · starts hole {group.startingHole || 1}</div>
        </div>
        <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.4, color: group.finished || group.notStarted ? C.ivory : C.pineDark, background: group.finished || group.notStarted ? C.turfBorder : paceColor, borderRadius: 999, padding: '4px 10px', flexShrink: 0, whiteSpace: 'nowrap' }}>{(group.finished ? 'FINISHED' : group.paceStatus).toUpperCase()}</span>
      </div>

      <div style={{ fontSize: 12, color: C.ivoryDim, marginBottom: 10, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{names.join(', ') || 'No players assigned'}{group.playerIds.length > 0 && group.playerIds.length < 4 && ` \u00b7 ${group.playerIds.length}-some`}</div>

      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: C.ivoryDim, marginBottom: 4 }}>
        <span>{group.notStarted ? 'Not started yet' : group.finished ? `Finished \u00b7 ${group.numHoles} holes` : `Hole ${group.currentHole} of ${group.numHoles}`}</span>
        <span>{group.completedHolesCount} completed</span>
      </div>
      <HoleTimeline holeProgress={group.holeProgress} currentHole={group.currentHole} />
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: C.ivoryDim, marginTop: 6, gap: 8 }}>
        <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{group.lastUpdated ? `Updated ${fmtTimeAgo(group.lastUpdated, now)}` : 'No scores yet'}</span>
        {group.projectedFinishTime && <span style={{ flexShrink: 0 }}>Proj. finish {fmtClockTime(group.projectedFinishTime)}</span>}
      </div>
      {group.adminNotes && <div style={{ fontSize: 11, color: C.goldBright, marginTop: 8, fontStyle: 'italic' }}>“{group.adminNotes}”</div>}

      {isAdmin && !isMock && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10, paddingTop: 10, borderTop: `1px solid ${C.turfBorder}` }}>
          {[['message', 'Message'], ['delay', 'Mark delayed'], ['teeTime', 'Tee time'], ['overrideHole', 'Override hole'], ['note', 'Pace note']].map(([type, label]) => (
            <button key={type} onClick={() => onAction(type, group)} style={{ fontSize: 11, padding: '6px 10px', borderRadius: 8, border: `1px solid ${C.turfBorder}`, background: 'transparent', color: C.ivory, cursor: 'pointer' }}>{label}</button>
          ))}
        </div>
      )}
    </div>
  );
}

function GroupActionModal({ type, group, onSubmit, onClose }) {
  const initial = type === 'delay' ? String(group.delayedMinutes || 0)
    : type === 'teeTime' ? (group.teeTime ? new Date(group.teeTime).toISOString().slice(0, 16) : '')
    : type === 'overrideHole' ? (group.overrideCurrentHole != null ? String(group.overrideCurrentHole) : '')
    : type === 'note' ? (group.adminNotes || '') : '';
  const [value, setValue] = useState(initial);
  const title = { message: 'Message the group', delay: 'Mark group delayed', teeTime: 'Adjust tee time', overrideHole: 'Override current hole', note: 'Add a pace note' }[type];
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(13,31,26,0.78)', zIndex: 52, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: C.pine, border: `1px solid ${C.turfBorder}`, borderRadius: 16, padding: 20, width: '100%', maxWidth: 320 }}>
        <div style={{ fontFamily: 'Oswald, sans-serif', fontSize: 16, textTransform: 'uppercase', marginBottom: 4 }}>{title}</div>
        <div style={{ fontSize: 11, color: C.ivoryDim, marginBottom: 12 }}>Group {group.groupNumber}</div>
        {type === 'delay' && <Field label="Minutes delayed"><input type="number" min={0} value={value} onChange={e => setValue(e.target.value)} style={inputStyle} autoFocus /></Field>}
        {type === 'teeTime' && <Field label="Tee time"><input type="datetime-local" value={value} onChange={e => setValue(e.target.value)} style={inputStyle} autoFocus /></Field>}
        {type === 'overrideHole' && <Field label={`Hole (1\u2013${group.numHoles || 18}), blank to clear`}><input type="number" min={1} max={group.numHoles || 18} value={value} onChange={e => setValue(e.target.value)} style={inputStyle} autoFocus /></Field>}
        {type === 'note' && <Field label="Note shown on the card"><input value={value} onChange={e => setValue(e.target.value)} style={inputStyle} placeholder="e.g. Waiting on the group ahead" autoFocus /></Field>}
        {type === 'message' && <Field label="Message"><input value={value} onChange={e => setValue(e.target.value)} style={inputStyle} placeholder="e.g. Please pick up the pace" autoFocus /></Field>}
        <GoldButton onClick={() => { onSubmit(value); onClose(); }} style={{ width: '100%' }}>Save</GoldButton>
      </div>
    </div>
  );
}

function GroupSetupModal({ tournament, state, updateRound, onClose }) {
  const groups = state.flowGroups || [];
  const updateGroups = (fn) => updateRound(prev => ({ ...prev, flowGroups: fn(prev.flowGroups || []) }));
  const addGroup = () => updateGroups(gs => [...gs, { id: 'flow_' + Date.now(), groupNumber: gs.length + 1, teeTime: null, startingHole: 1, playerIds: [], adminNotes: '', delayedMinutes: 0, overrideCurrentHole: null }]);
  const removeGroup = (id) => updateGroups(gs => gs.filter(g => g.id !== id).map((g, i) => ({ ...g, groupNumber: i + 1 })));
  const setGroupField = (id, field, val) => updateGroups(gs => gs.map(g => g.id === id ? { ...g, [field]: val } : g));
  const togglePlayer = (id, pid) => updateGroups(gs => gs.map(g => g.id === id ? { ...g, playerIds: g.playerIds.includes(pid) ? g.playerIds.filter(x => x !== pid) : [...g.playerIds, pid] } : g));
  const autoCreate = () => {
    const ids = tournament.players.map(p => p.id);
    const chunks = []; for (let i = 0; i < ids.length; i += 4) chunks.push(ids.slice(i, i + 4));
    const base = Date.now() + 10 * 60000;
    updateGroups(() => chunks.map((chunk, i) => ({ id: 'flow_' + Date.now() + '_' + i, groupNumber: i + 1, teeTime: new Date(base + i * 10 * 60000).toISOString(), startingHole: 1, playerIds: chunk, adminNotes: '', delayedMinutes: 0, overrideCurrentHole: null })));
  };
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(13,31,26,0.78)', zIndex: 50, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: C.pine, borderTop: `1px solid ${C.turfBorder}`, borderRadius: '20px 20px 0 0', width: '100%', maxWidth: 720, maxHeight: '88vh', overflowY: 'auto', padding: '18px 18px 28px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <div style={{ fontFamily: 'Oswald, sans-serif', fontSize: 20, textTransform: 'uppercase', letterSpacing: 0.4 }}>Set up groups</div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: C.ivory, cursor: 'pointer' }}><X size={22} /></button>
        </div>
        <div style={{ fontSize: 12, color: C.ivoryDim, marginBottom: 14, lineHeight: 1.5 }}>Pace and current hole are read straight from each player's scorecard \u2014 nothing to update by hand once a group's set up.</div>
        {tournament.players.length === 0 ? <div style={{ color: C.ivoryDim, fontSize: 13, marginBottom: 14 }}>Add players to the round first.</div> : (
          <GhostButton onClick={autoCreate} style={{ width: '100%', textAlign: 'center', marginBottom: 16 }}>Auto-create groups of 4 from the roster</GhostButton>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 14 }}>
          {groups.map(g => (
            <div key={g.id} style={{ ...rowCard, flexDirection: 'column', alignItems: 'stretch' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontFamily: 'Oswald, sans-serif', fontSize: 14 }}>Group {g.groupNumber}</span>
                <button onClick={() => removeGroup(g.id)} style={{ background: 'transparent', border: 'none', color: C.flagRed, cursor: 'pointer' }}><Trash2 size={15} /></button>
              </div>
              <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                <Field label="Tee time"><input type="datetime-local" value={g.teeTime ? new Date(g.teeTime).toISOString().slice(0, 16) : ''} onChange={e => setGroupField(g.id, 'teeTime', e.target.value ? new Date(e.target.value).toISOString() : null)} style={inputStyle} /></Field>
                <Field label="Starting hole"><input type="number" min={1} max={state.numHoles} value={g.startingHole} onChange={e => setGroupField(g.id, 'startingHole', parseInt(e.target.value || '1', 10))} style={inputStyle} /></Field>
              </div>
              <div style={{ fontSize: 11, color: C.ivoryDim, marginBottom: 6 }}>Players</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {tournament.players.map(p => <button key={p.id} onClick={() => togglePlayer(g.id, p.id)} style={{ fontSize: 12, padding: '6px 10px', borderRadius: 8, border: `1px solid ${g.playerIds.includes(p.id) ? C.gold : C.turfBorder}`, background: g.playerIds.includes(p.id) ? C.gold : 'transparent', color: g.playerIds.includes(p.id) ? C.pineDark : C.ivory, cursor: 'pointer' }}>{p.name}</button>)}
              </div>
            </div>
          ))}
        </div>
        <GoldButton onClick={addGroup} style={{ width: '100%' }}>+ Add group</GoldButton>
      </div>
    </div>
  );
}

function RoundFlowScreen({ tournament, state, isAdmin, whoami, sendChat, updateRound, onClose }) {
  const [filter, setFilter] = useState('all');
  const [sortBy, setSortBy] = useState('teeTime');
  const [now, setNow] = useState(Date.now());
  const [lastRefreshed, setLastRefreshed] = useState(Date.now());
  const [setupOpen, setSetupOpen] = useState(false);
  const [action, setAction] = useState(null);

  const usingMock = !state.flowGroups || state.flowGroups.length === 0;
  const mock = useMemo(() => (usingMock ? generateMockFlowGroups() : null), [usingMock]);
  const groups = usingMock ? mock.groups : state.flowGroups;
  const source = usingMock ? mock.source : { scores: state.scores, pars: state.pars, numHoles: state.numHoles, scoreUpdatedAt: state.scoreUpdatedAt };
  const betWinnersByHole = usingMock ? mock.betWinnersByHole : computeBetWinnersByHole(state);
  const playersById = usingMock ? mock.playersById : Object.fromEntries(state.players.map(p => [p.id, p]));

  useEffect(() => {
    if (!usingMock) return;
    const iv = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(iv);
  }, [usingMock]);

  const groupsFlow = useMemo(() => groups.map(g => computeGroupFlow(g, source, betWinnersByHole, now)), [groups, source, betWinnersByHole, now]);
  const summary = useMemo(() => computeRoundFlowSummary(groupsFlow), [groupsFlow]);
  const myGroup = whoami ? groupsFlow.find(g => g.playerIds.includes(whoami.id)) : null;

  const refresh = () => { setNow(Date.now()); setLastRefreshed(Date.now()); };
  const FILTERS = [['all', 'All groups'], ['mine', 'My group'], ['ahead', 'Ahead'], ['behind', 'Behind'], ['slow', 'Slow'], ['finished', 'Finished']];
  const filtered = groupsFlow.filter(g => {
    if (filter === 'mine') return myGroup && g.id === myGroup.id;
    if (filter === 'ahead') return g.paceStatus === 'Ahead';
    if (filter === 'behind') return g.paceStatus === 'Slightly Behind';
    if (filter === 'slow') return g.paceStatus === 'Slow';
    if (filter === 'finished') return g.finished;
    return true;
  });
  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === 'teeTime') return new Date(a.teeTime || 0) - new Date(b.teeTime || 0);
    if (sortBy === 'currentHole') return (b.currentHole || 0) - (a.currentHole || 0);
    if (sortBy === 'pace') return PACE_RANK[a.paceStatus] - PACE_RANK[b.paceStatus];
    if (sortBy === 'updated') return (b.lastUpdated || 0) - (a.lastUpdated || 0);
    return 0;
  });
  const summaryStat = (label, value) => <div style={{ flex: '1 1 110px', minWidth: 100 }}><div style={{ fontSize: 9, color: C.ivoryDim, textTransform: 'uppercase', letterSpacing: 0.4 }}>{label}</div><div style={{ fontFamily: 'Anton, sans-serif', fontSize: 18 }}>{value}</div></div>;
  const groupLabel = (id) => { const g = groupsFlow.find(x => x.id === id); return g ? `Group ${g.groupNumber}` : '\u2013'; };

  const runAction = (value) => {
    if (!action) return;
    const { type, group } = action;
    if (type === 'message') { sendChat(`To Group ${group.groupNumber}: ${value}`); return; }
    const patch = type === 'delay' ? { delayedMinutes: parseInt(value || '0', 10) }
      : type === 'teeTime' ? { teeTime: value ? new Date(value).toISOString() : null }
      : type === 'overrideHole' ? { overrideCurrentHole: value ? parseInt(value, 10) : null }
      : type === 'note' ? { adminNotes: value } : {};
    updateRound(prev => ({ ...prev, flowGroups: (prev.flowGroups || []).map(g => g.id === group.id ? { ...g, ...patch } : g) }));
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: C.pine, zIndex: 48, display: 'flex', flexDirection: 'column' }}>
      <div style={{ flexShrink: 0, background: C.pineDark, borderBottom: `1px solid ${C.turfBorder}`, padding: '14px 16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div>
            <div style={{ fontFamily: 'Anton, sans-serif', fontSize: 22, textTransform: 'uppercase', letterSpacing: 0.5 }}>Round Flow</div>
            <div style={{ fontSize: 11, color: C.ivoryDim }}>{state.roundName}{usingMock ? ' \u00b7 showing example data' : ''}</div>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: C.ivory, cursor: 'pointer' }}><X size={22} /></button>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, background: C.turf, border: `1px solid ${C.turfBorder}`, borderRadius: 12, padding: '10px 12px' }}>
          {summaryStat('First grp hole', summary.firstGroupCurrentHole ?? '\u2013')}
          {summaryStat('Last grp hole', summary.lastGroupCurrentHole ?? '\u2013')}
          {summaryStat('Hole spread', summary.holeSpread ?? '\u2013')}
          {summaryStat('Groups', summary.totalGroups)}
          {summaryStat('Finished', summary.groupsFinished)}
          {summaryStat('Proj. finish', summary.projectedTournamentFinish ? fmtClockTime(summary.projectedTournamentFinish) : '\u2013')}
          {summaryStat('Slowest', groupLabel(summary.slowestGroupId))}
          {summaryStat('Fastest', groupLabel(summary.fastestGroupId))}
        </div>
      </div>

      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: 16 }}>
        {usingMock && (
          <div style={{ ...rowCard, background: C.turfLight, marginBottom: 14, justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
            <span style={{ fontSize: 12 }}>No real groups yet — these 4 are example data.</span>
            {isAdmin && <GoldButton onClick={() => setSetupOpen(true)} style={{ padding: '7px 12px', fontSize: 12, flexShrink: 0 }}>Set up real groups</GoldButton>}
          </div>
        )}
        {!usingMock && isAdmin && <GhostButton onClick={() => setSetupOpen(true)} style={{ marginBottom: 14 }}>Edit groups</GhostButton>}

        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', marginBottom: 10, paddingBottom: 4 }}>
          {FILTERS.map(([key, label]) => <button key={key} onClick={() => setFilter(key)} style={{ flexShrink: 0, fontSize: 12, padding: '7px 12px', borderRadius: 999, border: `1px solid ${filter === key ? C.gold : C.turfBorder}`, background: filter === key ? C.gold : 'transparent', color: filter === key ? C.pineDark : C.ivory, cursor: 'pointer' }}>{label}</button>)}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 11, color: C.ivoryDim }}>Sort</span>
            <select value={sortBy} onChange={e => setSortBy(e.target.value)} style={{ ...inputStyle, width: 150, padding: '7px 8px' }}>
              <option value="teeTime">Tee time</option>
              <option value="currentHole">Current hole</option>
              <option value="pace">Pace status</option>
              <option value="updated">Last updated</option>
            </select>
          </div>
          <button onClick={refresh} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, padding: '7px 12px', borderRadius: 8, border: `1px solid ${C.turfBorder}`, background: 'transparent', color: C.goldBright, cursor: 'pointer' }}><RefreshCw size={13} /> Refresh Round Flow</button>
        </div>
        <div style={{ fontSize: 10, color: C.ivoryDim, marginBottom: 12 }}>Last refreshed {fmtTimeAgo(lastRefreshed, now)}</div>

        {sorted.length === 0 ? (
          <div style={{ textAlign: 'center', color: C.ivoryDim, fontSize: 13, marginTop: 40 }}>{groupsFlow.length === 0 ? 'No pairings created yet.' : 'No groups match this filter.'}</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 12 }}>
            {sorted.map(g => <GroupFlowCard key={g.id} group={g} playersById={playersById} isMyGroup={!!myGroup && g.id === myGroup.id} isAdmin={isAdmin} isMock={usingMock} now={now} onAction={(type, group) => setAction({ type, group })} />)}
          </div>
        )}
      </div>

      {setupOpen && <GroupSetupModal tournament={tournament} state={state} updateRound={updateRound} onClose={() => setSetupOpen(false)} />}
      {action && <GroupActionModal type={action.type} group={action.group} onSubmit={runAction} onClose={() => setAction(null)} />}
    </div>
  );
}

function MyPositionModal({ state, bets, ledger, whoami, onPick, onAddSelf, onClose }) {


  if (!whoami) {
    return (
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(5,9,17,0.78)', zIndex: 50, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }} onClick={onClose}>
        <div onClick={e => e.stopPropagation()} style={{ background: C.pine, borderTop: `1px solid ${C.turfBorder}`, borderRadius: '20px 20px 0 0', width: '100%', maxWidth: 720, padding: '18px 18px 28px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div style={{ fontFamily: 'Oswald, sans-serif', fontSize: 20, textTransform: 'uppercase', letterSpacing: 0.4 }}>My Position</div>
            <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: C.ivory, cursor: 'pointer' }}><X size={22} /></button>
          </div>
          <div style={{ fontSize: 13, color: C.ivoryDim, marginBottom: 12 }}>Pick your name to see your tournament position.</div>
          <IdentityPicker state={state} onPick={onPick} onAddSelf={onAddSelf} />
        </div>
      </div>
    );
  }
  const myLedger = ledger[whoami.id] || { netPosition: 0, totalWon: 0, totalLost: 0, pendingBets: 0, settledBets: 0 };
  const myBets = bets.filter(b => b.participants.includes(whoami.id));
  const myPending = myBets.filter(b => b.currentStatus === 'pending');
  const mySettled = myBets.filter(b => b.currentStatus !== 'pending');
  const exposure = myPending.reduce((sum, b) => sum + Math.abs(b.fakeMoneyStake || 0), 0);
  const biggestSwing = myPending.length ? Math.max(...myPending.map(b => Math.abs(b.fakeMoneyStake || 0))) : 0;
  const net = myLedger.netPosition;
  const stat = (label, value, color) => (
    <div style={{ flex: 1, minWidth: 90 }}>
      <div style={{ fontSize: 10, color: C.ivoryDim, textTransform: 'uppercase', letterSpacing: 0.4 }}>{label}</div>
      <div style={{ fontFamily: 'Anton, sans-serif', fontSize: 19, color: color || C.ivory }}>{value}</div>
    </div>
  );
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(5,9,17,0.78)', zIndex: 50, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: C.pine, borderTop: `1px solid ${C.turfBorder}`, borderRadius: '20px 20px 0 0', width: '100%', maxWidth: 720, maxHeight: '88vh', overflowY: 'auto', overflowX: 'hidden', padding: '18px 18px 28px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <div style={{ fontFamily: 'Oswald, sans-serif', fontSize: 20, textTransform: 'uppercase', letterSpacing: 0.4 }}>My Position</div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: C.ivory, cursor: 'pointer' }}><X size={22} /></button>
        </div>
        <div style={{ fontSize: 11, color: C.ivoryDim, fontStyle: 'italic', marginBottom: 16 }}>Values are tournament calculations only — DuffBook doesn't move real money. Covers every round of the trip.</div>

        <div style={{ ...rowCard, justifyContent: 'space-between', marginBottom: 14 }}>
          <div><div style={{ fontSize: 11, color: C.ivoryDim, textTransform: 'uppercase' }}>Current net position</div></div>
          <div style={{ fontFamily: 'Anton, sans-serif', fontSize: 30, color: net > 0 ? C.goldBright : net < 0 ? C.flagRed : C.ivoryDim }}>{fmtMoney(net)}</div>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
          {stat('Pending bets', myLedger.pendingBets, C.blueBright)}
          {stat('Settled bets', myLedger.settledBets, C.ivory)}
          {stat('Total bets', myLedger.pendingBets + myLedger.settledBets, C.ivory)}
          {stat('Current exposure', `$${exposure}`, C.ivory)}
          {stat('Biggest potential swing', `$${biggestSwing}`, C.goldBright)}
        </div>

        {myPending.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <SectionHeader title="Pending" sub="not settled yet" />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {myPending.map(b => <div key={b.id} style={{ ...rowCard, justifyContent: 'space-between' }}><span style={{ fontSize: 13 }}>{b.betName}</span><span style={{ fontSize: 12, color: C.ivoryDim }}>up to ${Math.abs(b.fakeMoneyStake || 0)}</span></div>)}
            </div>
          </div>
        )}
        {mySettled.length > 0 && (
          <div>
            <SectionHeader title="Settled" />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {mySettled.map(b => { const amt = b.calculatedPayout[whoami.id] || 0; return <div key={b.id} style={{ ...rowCard, justifyContent: 'space-between' }}><span style={{ fontSize: 13 }}>{b.betName}</span><span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 13, color: amt > 0 ? C.goldBright : amt < 0 ? C.flagRed : C.ivoryDim, fontWeight: 600 }}>{fmtMoney(amt)}</span></div>; })}
            </div>
          </div>
        )}
        {myBets.length === 0 && <div style={{ color: C.ivoryDim, fontSize: 13, textAlign: 'center', marginTop: 20 }}>No bets involve you yet.</div>}
      </div>
    </div>
  );
}

/* ============================== ROUND COMPLETE WRAP-UP ============================== */
function RoundCompleteModal({ state, stats, ledger, isLastRound, onClose }) {
  const useNet = state.handicapsEnabled;
  const final = [...stats].sort((a, b) => (useNet ? a.netToPar - b.netToPar : a.toPar - b.toPar));
  const champion = final[0];
  const ranked = [...state.players].sort((a, b) => (ledger[b.id]?.netPosition || 0) - (ledger[a.id]?.netPosition || 0));
  const bigWinner = ranked[0], bigLoser = ranked[ranked.length - 1];
  const totalSettled = state.players.reduce((sum, p) => sum + Math.abs(ledger[p.id]?.netPosition || 0), 0) / 2;
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(5,9,17,0.85)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: C.pine, border: `1px solid ${C.turfBorder}`, borderRadius: 20, width: '100%', maxWidth: 480, maxHeight: '88vh', overflowY: 'auto', padding: 22, textAlign: 'center' }}>
        <Trophy size={36} color={C.goldBright} style={{ marginBottom: 8 }} />
        <div style={{ fontFamily: 'Anton, sans-serif', fontSize: 26, textTransform: 'uppercase', marginBottom: 4 }}>{isLastRound ? 'Tournament complete' : 'Round complete'}</div>
        <div style={{ fontSize: 12, color: C.ivoryDim, marginBottom: 18 }}>{state.roundName}</div>

        {champion && (
          <div style={{ ...rowCard, justifyContent: 'center', gap: 12, marginBottom: 14, background: C.turfLight, border: `1px solid ${C.gold}` }}>
            <Chip color={champion.color}>{initials(champion.name)}</Chip>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: 11, color: C.ivoryDim, textTransform: 'uppercase' }}>Champion</div>
              <div style={{ fontFamily: 'Oswald, sans-serif', fontSize: 16 }}>{champion.name} · {fmtToPar(useNet ? champion.netToPar : champion.toPar)}</div>
            </div>
          </div>
        )}

        <div style={{ textAlign: 'left', marginBottom: 14 }}>
          <SectionHeader title="Final standings" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {final.map((p, i) => <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, padding: '4px 0' }}><span style={{ width: 16, color: C.ivoryDim }}>{i + 1}</span><Chip color={p.color}>{initials(p.name)}</Chip><span style={{ flex: 1 }}>{p.name}</span><span style={{ fontFamily: 'Oswald, sans-serif', color: (useNet ? p.netToPar : p.toPar) < 0 ? C.flagRed : C.ivory }}>{fmtToPar(useNet ? p.netToPar : p.toPar)}</span></div>)}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, marginBottom: 18, flexWrap: 'wrap' }}>
          {bigWinner && <div style={{ ...rowCard, flex: 1, flexDirection: 'column', alignItems: 'flex-start', minWidth: 130 }}><div style={{ fontSize: 10, color: C.ivoryDim, textTransform: 'uppercase' }}>Big winner</div><div style={{ fontFamily: 'Anton, sans-serif', fontSize: 18, color: C.goldBright }}>{bigWinner.name}</div><div style={{ fontSize: 12, color: C.goldBright }}>{fmtMoney(ledger[bigWinner.id]?.netPosition || 0)}</div></div>}
          {bigLoser && <div style={{ ...rowCard, flex: 1, flexDirection: 'column', alignItems: 'flex-start', minWidth: 130 }}><div style={{ fontSize: 10, color: C.ivoryDim, textTransform: 'uppercase' }}>Took the L</div><div style={{ fontFamily: 'Anton, sans-serif', fontSize: 18, color: C.flagRed }}>{bigLoser.name}</div><div style={{ fontSize: 12, color: C.flagRed }}>{fmtMoney(ledger[bigLoser.id]?.netPosition || 0)}</div></div>}
        </div>
        <div style={{ fontSize: 12, color: C.ivoryDim, marginBottom: 18 }}>${totalSettled.toFixed(totalSettled % 1 ? 2 : 0)} settled across the group so far — check Settle for who pays whom.</div>

        <GoldButton onClick={onClose} style={{ width: '100%', padding: '13px 0' }}>Done</GoldButton>
      </div>
    </div>
  );
}

/* ============================== FONTS / GLOBAL CSS ============================== */
function FontLoader() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Anton&family=Oswald:wght@500;600;700&family=Inter:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap');
      * { box-sizing: border-box; }
      html, body { overflow-x: hidden; }
      input::-webkit-outer-spin-button, input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
      input[type=number] { -moz-appearance: textfield; }
      input, select, textarea { font-size: 16px !important; }
      button:focus-visible, input:focus-visible { outline: 2px solid ${C.goldBright}; outline-offset: 1px; }
      button { transition: transform 0.08s ease; }
      button:active { transform: scale(0.96); }
      @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.35; } }
      @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      .spin { animation: spin 1s linear infinite; }
      @media (prefers-reduced-motion: reduce) { * { animation: none !important; transition: none !important; } }
    `}</style>
  );
}
function LibraryLoader() {
  useEffect(() => {
    const load = (src, check) => { if (check()) return; const s = document.createElement('script'); s.src = src; document.head.appendChild(s); };
    load('https://cdnjs.cloudflare.com/ajax/libs/PapaParse/5.4.1/papaparse.min.js', () => !!window.Papa);
    load('https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js', () => !!window.XLSX);
  }, []);
  return null;
}

/* ============================== SWIPE NAV ============================== */
function useSwipeNav(activeTab, setActiveTab) {
  const startRef = useRef(null);
  const onTouchStart = (e) => { const t = e.touches[0]; startRef.current = { x: t.clientX, y: t.clientY }; };
  const onTouchEnd = (e) => {
    if (!startRef.current) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - startRef.current.x, dy = t.clientY - startRef.current.y;
    startRef.current = null;
    if (Math.abs(dx) < 70 || Math.abs(dx) < Math.abs(dy) * 1.4) return;
    const idx = TABS.indexOf(activeTab);
    if (dx < 0 && idx < TABS.length - 1) setActiveTab(TABS[idx + 1]);
    else if (dx > 0 && idx > 0) setActiveTab(TABS[idx - 1]);
  };
  return { onTouchStart, onTouchEnd };
}

/* ============================== BET BUILDER MODAL ============================== */
function BetBuilderModal({ state, templates, onCreate, onSaveTemplate, onDeleteTemplate, onClose, scopeLabel }) {
  const [name, setName] = useState('');
  const [betType, setBetType] = useState('custom');
  const [entryAmount, setEntryAmount] = useState(5);
  const [participants, setParticipants] = useState([]);
  const [holeIndex, setHoleIndex] = useState('');
  const [scoringMethod, setScoringMethod] = useState('gross');
  const [settlementMethod, setSettlementMethod] = useState('manual');
  const [notes, setNotes] = useState('');
  const [saveTpl, setSaveTpl] = useState(false);
  const [tplName, setTplName] = useState('');
  const cfg = CUSTOM_BET_CONFIG[betType];

  useEffect(() => { setSettlementMethod(cfg.auto ? 'automatic' : 'manual'); }, [betType]);

  const toggleParticipant = (id) => setParticipants(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  const applyTemplate = (t) => { setName(t.name); setBetType(t.betType); setEntryAmount(t.entryAmount); setScoringMethod(t.scoringMethod || 'gross'); setSettlementMethod(t.settlementMethod || 'manual'); setNotes(t.notes || ''); };

  const minOk = participants.length >= cfg.minParticipants && (!cfg.maxParticipants || participants.length <= cfg.maxParticipants);
  const canCreate = name.trim().length > 0 && entryAmount > 0 && minOk;

  const create = () => {
    if (!canCreate) return;
    const amt = parseFloat(entryAmount) || 0;
    const bet = {
      betName: name.trim(), betType, entryAmount: amt, participants,
      holeIndex: (cfg.needsHole && holeIndex !== '') ? Math.max(0, parseInt(holeIndex, 10) - 1) : null,
      scoringMethod: cfg.needsScoring ? scoringMethod : null,
      settlementMethod, notes: notes.trim(),
    };
    onCreate(bet);
    if (saveTpl) onSaveTemplate({ name: tplName.trim() || name.trim(), betType, entryAmount: amt, scoringMethod: bet.scoringMethod, settlementMethod, notes: bet.notes });
    onClose();
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(5,9,17,0.78)', zIndex: 50, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: C.pine, borderTop: `1px solid ${C.turfBorder}`, borderRadius: '20px 20px 0 0', width: '100%', maxWidth: 720, maxHeight: '90vh', overflowY: 'auto', overflowX: 'hidden', padding: '18px 18px 28px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div style={{ fontFamily: 'Oswald, sans-serif', fontSize: 20, textTransform: 'uppercase', letterSpacing: 0.4 }}>New bet{scopeLabel ? ` \u00b7 ${scopeLabel}` : ''}</div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: C.ivory, cursor: 'pointer' }}><X size={22} /></button>
        </div>

        {templates && templates.length > 0 && (
          <Field label="Start from a template">
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {templates.map(t => (
                <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 2, background: C.turf, border: `1px solid ${C.turfBorder}`, borderRadius: 999, paddingRight: 4 }}>
                  <button onClick={() => applyTemplate(t)} style={{ fontSize: 12, padding: '6px 10px', borderRadius: 999, border: 'none', background: 'transparent', color: C.ivory, cursor: 'pointer' }}>{t.name}</button>
                  <button onClick={() => onDeleteTemplate(t.id)} style={{ background: 'transparent', border: 'none', color: C.ivoryDim, cursor: 'pointer' }}><X size={12} /></button>
                </div>
              ))}
            </div>
          </Field>
        )}

        <Field label="Bet name"><input value={name} onChange={e => setName(e.target.value)} style={inputStyle} placeholder="e.g. Sunday Singles Side Bet" /></Field>

        <Field label="Bet type">
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 6 }}>
            {Object.entries(CUSTOM_BET_CONFIG).map(([key, info]) => (
              <button key={key} onClick={() => setBetType(key)} style={{ fontSize: 12, padding: '7px 11px', borderRadius: 8, border: `1px solid ${betType === key ? C.gold : C.turfBorder}`, background: betType === key ? C.gold : 'transparent', color: betType === key ? C.pineDark : C.ivory, cursor: 'pointer' }}>{info.label}</button>
            ))}
          </div>
          <div style={{ fontSize: 11, color: C.ivoryDim }}>
            {cfg.auto ? "Settles itself once everyone's scorecard is in." : 'Needs an admin to declare the winner — no scorecard signal for this one.'}
            {' '}Needs {cfg.maxParticipants ? `exactly ${cfg.minParticipants}` : `at least ${cfg.minParticipants}`} participant{cfg.minParticipants > 1 ? 's' : ''}.
          </div>
        </Field>

        <Field label="Entry amount"><DollarInput value={entryAmount} onChange={setEntryAmount} /></Field>

        <Field label="Participants">
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {state.players.map(p => <button key={p.id} onClick={() => toggleParticipant(p.id)} style={{ fontSize: 12, padding: '6px 10px', borderRadius: 8, border: `1px solid ${participants.includes(p.id) ? C.gold : C.turfBorder}`, background: participants.includes(p.id) ? C.gold : 'transparent', color: participants.includes(p.id) ? C.pineDark : C.ivory, cursor: 'pointer' }}>{p.name}</button>)}
          </div>
          {!minOk && participants.length > 0 && <div style={{ fontSize: 11, color: C.flagRed, marginTop: 6 }}>{cfg.maxParticipants ? `Pick exactly ${cfg.minParticipants}` : `Pick at least ${cfg.minParticipants}`} for {cfg.label}.</div>}
        </Field>

        {cfg.needsHole && <Field label="Hole (optional)"><input type="number" min={1} max={state.numHoles} value={holeIndex} onChange={e => setHoleIndex(e.target.value)} style={{ ...inputStyle, width: 90 }} placeholder="e.g. 7" /></Field>}

        {cfg.needsScoring && (
          <Field label="Scoring">
            <div style={{ display: 'flex', gap: 8 }}>
              {['gross', ...(state.handicapsEnabled ? ['net'] : [])].map(m => (
                <button key={m} onClick={() => setScoringMethod(m)} style={{ flex: 1, padding: '8px 0', borderRadius: 8, fontFamily: 'Oswald, sans-serif', fontSize: 12, textTransform: 'uppercase', background: scoringMethod === m ? C.gold : 'transparent', color: scoringMethod === m ? C.pineDark : C.ivory, border: `1px solid ${scoringMethod === m ? C.gold : C.turfBorder}`, cursor: 'pointer' }}>{m}</button>
              ))}
            </div>
          </Field>
        )}

        <Field label="Settlement">
          {cfg.auto ? (
            <div style={{ display: 'flex', gap: 8 }}>
              {['automatic', 'manual'].map(m => (
                <button key={m} onClick={() => setSettlementMethod(m)} style={{ flex: 1, padding: '8px 0', borderRadius: 8, fontFamily: 'Oswald, sans-serif', fontSize: 12, textTransform: 'uppercase', background: settlementMethod === m ? C.gold : 'transparent', color: settlementMethod === m ? C.pineDark : C.ivory, border: `1px solid ${settlementMethod === m ? C.gold : C.turfBorder}`, cursor: 'pointer' }}>{m}</button>
              ))}
            </div>
          ) : <div style={{ fontSize: 12, color: C.ivoryDim }}>Manual — you'll declare the winner once it's decided.</div>}
        </Field>

        <Field label="Notes (optional)"><input value={notes} onChange={e => setNotes(e.target.value)} style={inputStyle} placeholder="Any extra detail" /></Field>

        <div style={{ ...rowCard, marginBottom: 10 }}>
          <button onClick={() => setSaveTpl(s => !s)} style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'transparent', border: 'none', cursor: 'pointer', color: C.ivory, flex: 1, textAlign: 'left' }}>
            <span style={{ width: 18, height: 18, borderRadius: 5, border: `1.5px solid ${saveTpl ? C.gold : C.turfBorder}`, background: saveTpl ? C.gold : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{saveTpl && <Check size={13} color={C.pineDark} />}</span>
            <span style={{ fontSize: 13 }}>Save as a reusable template</span>
          </button>
        </div>
        {saveTpl && <Field label="Template name"><input value={tplName} onChange={e => setTplName(e.target.value)} style={inputStyle} placeholder={name || 'Template name'} /></Field>}

        <GoldButton onClick={create} disabled={!canCreate} style={{ width: '100%', padding: '13px 0' }}>Create bet</GoldButton>
      </div>
    </div>
  );
}

/* ============================== MAIN APP ============================== */
export default function DuffBook() {
  const [roundCode, setRoundCode] = useState(null);
  const [initChecked, setInitChecked] = useState(false);
  const [tournament, setTournament] = useState(defaultTournament());
  const [chat, setChat] = useState([]);
  const [whoamiId, setWhoamiId] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [activeTab, setActiveTab] = useState('home');
  const [viewHole, setViewHole] = useState(0);
  const [setupOpen, setSetupOpen] = useState(false);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardIsNewRound, setWizardIsNewRound] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [scanOpen, setScanOpen] = useState(false);
  const [becomeAdminOpen, setBecomeAdminOpen] = useState(false);
  const [betBuilderOpen, setBetBuilderOpen] = useState(false);
  const [tournamentBetBuilderOpen, setTournamentBetBuilderOpen] = useState(false);
  const [betTemplates, setBetTemplates] = useState(null);
  const [previewMode, setPreviewMode] = useState(false);
  const [roundCompleteOpen, setRoundCompleteOpen] = useState(false);
  const [myPositionOpen, setMyPositionOpen] = useState(false);
  const [roundSwitcherOpen, setRoundSwitcherOpen] = useState(false);
  const [roundFlowOpen, setRoundFlowOpen] = useState(false);
  const [guidanceEnabled, setGuidanceEnabled] = useState(true);
  const [notifPrefs, setNotifPrefs] = useState({ leadChange: true, skinsWon: true, matchDecided: true, allSquare: true, playerFinished: true, bettingClosingSoon: true, roundComplete: true, chat: true });
  const [newPlayerName, setNewPlayerName] = useState('');
  const [loading, setLoading] = useState(true);
  const [pendingAdminPin, setPendingAdminPin] = useState(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatSeenLen, setChatSeenLen] = useState(0);
  const [bubblePos, setBubblePos] = useState(null);
  const [deviceName, setDeviceName] = useState('');
  const [profileOpen, setProfileOpen] = useState(false);
  const [myTournaments, setMyTournaments] = useState([]);
  const loadedRef = useRef(false);
  const justCreatedRef = useRef(null);
  const preloadedRef = useRef(null);
  const autoJumpRef = useRef(false);
  const bubbleDragRef = useRef(null);
  const bubbleJustDraggedRef = useRef(false);
  const watchRef = useRef({ leaderId: null, skinsWonHoles: new Set(), matchDecided: new Set(), allSquareNotified: new Set(), finished: new Set(), chatLen: 0, bettingClosingNotified: false, roundCompleteNotified: false });

  useEffect(() => {
    (async () => {
      try { const r = await storage.get('last-code', false); if (r) setRoundCode(JSON.parse(r.value)); } catch (e) {}
      try { const r2 = await storage.get('notif-prefs', false); if (r2) setNotifPrefs(JSON.parse(r2.value)); } catch (e) {}
      try { const r3 = await storage.get('chat-bubble-pos', false); if (r3) setBubblePos(JSON.parse(r3.value)); } catch (e) {}
      try { const r4 = await storage.get('bet-templates', false); setBetTemplates(r4 ? JSON.parse(r4.value) : DEFAULT_BET_TEMPLATES); } catch (e) { setBetTemplates(DEFAULT_BET_TEMPLATES); }
      try { const r5 = await storage.get('guidance-enabled', false); if (r5) setGuidanceEnabled(JSON.parse(r5.value)); } catch (e) {}
      try { const r6 = await storage.get('device-profile', false); if (r6) setDeviceName(JSON.parse(r6.value).name || ''); } catch (e) {}
      try { const r7 = await storage.get('my-tournaments', false); if (r7) setMyTournaments(JSON.parse(r7.value)); } catch (e) {}
      setInitChecked(true);
    })();
  }, []);

  const rememberTournament = (code, name) => {
    setMyTournaments(prev => {
      const next = [{ code, name, lastOpened: Date.now() }, ...prev.filter(t => t.code !== code)].slice(0, 20);
      (async () => { try { await storage.set('my-tournaments', JSON.stringify(next), false); } catch (e) {} })();
      return next;
    });
  };

  useEffect(() => {
    if (!roundCode) { setLoading(false); return; }
    let mounted = true; setLoading(true); loadedRef.current = false; autoJumpRef.current = false;
    if (preloadedRef.current && preloadedRef.current.code === roundCode) {
      const pre = preloadedRef.current; preloadedRef.current = null;
      setTournament(pre.tournament); setChat(pre.chat); setWhoamiId(pre.whoamiId);
      if (justCreatedRef.current === roundCode) justCreatedRef.current = null;
      loadedRef.current = true; setLoading(false);
      return () => { mounted = false; };
    }
    (async () => {
      try { const res = await storage.get(tournamentKey(roundCode), true); if (mounted) { try { const raw = res ? JSON.parse(res.value) : defaultTournament(); const safe = { ...defaultTournament(), ...raw, players: Array.isArray(raw.players) ? raw.players : [], flights: Array.isArray(raw.flights) ? raw.flights : [], rounds: Array.isArray(raw.rounds) ? raw.rounds.map(r => ({ ...defaultRound(0), ...r, pars: Array.isArray(r.pars) ? r.pars : DEFAULT_PARS_18.slice(), strokeIndex: Array.isArray(r.strokeIndex) ? r.strokeIndex : DEFAULT_SI_18.slice(), yardage: Array.isArray(r.yardage) ? r.yardage : [], customBets: Array.isArray(r.customBets) ? r.customBets : [], flowGroups: Array.isArray(r.flowGroups) ? r.flowGroups : [], tournamentCustomBets: Array.isArray(r.tournamentCustomBets) ? r.tournamentCustomBets : [], scores: r.scores && typeof r.scores === 'object' ? r.scores : {} })) : [defaultRound(0)], tournamentCustomBets: Array.isArray(raw.tournamentCustomBets) ? raw.tournamentCustomBets : [] }; setTournament(safe); } catch(e) { setTournament(defaultTournament()); } } } catch (e) { if (mounted) setTournament(defaultTournament()); }
      try { const cres = await storage.get(chatKey(roundCode), true); if (mounted) setChat(cres ? JSON.parse(cres.value) : []); } catch (e) { if (mounted) setChat([]); }
      try { const wres = await storage.get(whoamiKey(roundCode), false); if (mounted) setWhoamiId(wres ? JSON.parse(wres.value) : null); } catch (e) { if (mounted) setWhoamiId(null); }
      if (mounted) { loadedRef.current = true; setLoading(false); }
    })();
    if (justCreatedRef.current === roundCode) { justCreatedRef.current = null; }
    else { (async () => { try { const r = await storage.get(isAdminKey(roundCode), false); setIsAdmin(r ? JSON.parse(r.value) : false); } catch (e) { setIsAdmin(false); } })(); }
    return () => { mounted = false; };
  }, [roundCode]);

  useEffect(() => {
    if (!roundCode || !loadedRef.current) return;
    const t = setTimeout(async () => { try { await storage.set(tournamentKey(roundCode), JSON.stringify(tournament), true); } catch (e) {} }, 500);
    return () => clearTimeout(t);
  }, [tournament, roundCode]);

  useEffect(() => {
    if (!loadedRef.current || !roundCode) return;
    rememberTournament(roundCode, tournament.name);
  }, [roundCode, loadedRef.current, tournament.name]);

  useEffect(() => {
    if (!roundCode) return;
    const iv = setInterval(async () => {
      if (setupOpen || wizardOpen) return;
      try { const res = await storage.get(tournamentKey(roundCode), true); if (res) setTournament(prev => JSON.stringify(prev) === res.value ? prev : JSON.parse(res.value)); } catch (e) {}
      try { const cres = await storage.get(chatKey(roundCode), true); if (cres) setChat(prev => JSON.stringify(prev) === cres.value ? prev : JSON.parse(cres.value)); } catch (e) {}
    }, 10000);
    return () => clearInterval(iv);
  }, [roundCode, setupOpen, wizardOpen]);

  useEffect(() => {
    if (pendingAdminPin && !loading && !tournament.adminPin) { setTournament(prev => ({ ...prev, adminPin: pendingAdminPin })); setPendingAdminPin(null); }
  }, [pendingAdminPin, loading, tournament.adminPin]);

  const activeRoundForClamp = tournament.rounds.find(r => r.id === tournament.activeRoundId) || tournament.rounds[0];
  useEffect(() => { setViewHole(v => Math.max(0, Math.min(v, (activeRoundForClamp?.numHoles || 18) - 1))); }, [activeRoundForClamp?.numHoles, tournament.activeRoundId]);

  useEffect(() => {
    if (loading || autoJumpRef.current) return;
    const rv = getRoundView(tournament, tournament.activeRoundId);
    const stats = computeStats(rv);
    let target = 0;
    if (whoamiId) { const me = stats.find(s => s.id === whoamiId); if (me) target = Math.min(me.thru, rv.numHoles - 1); }
    else if (stats.length) { target = Math.min(Math.min(...stats.map(s => s.thru)), rv.numHoles - 1); }
    setViewHole(target); autoJumpRef.current = true;
  }, [loading, whoamiId, tournament.activeRoundId]);

  useEffect(() => {
    if (loading || whoamiId || !deviceName || !roundCode) return;
    const existing = tournament.players.find(p => p.name.trim().toLowerCase() === deviceName.trim().toLowerCase());
    if (existing) { setIdentity(existing.id); return; }
    addSelf(deviceName);
  }, [loading, whoamiId, deviceName, roundCode, tournament.players]);

  useEffect(() => {
    if (!loadedRef.current || typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
    const state = getRoundView(tournament, tournament.activeRoundId);
  if (!state || !state.players) return null;
    const fire = (title, body) => { try { new Notification(title, { body }); } catch (e) {} };
    const stats = computeStats(state);
    const inProgress = stats.filter(s => s.thru > 0);
    if (inProgress.length) {
      const leader = [...inProgress].sort((a, b) => a.toPar - b.toPar)[0];
      if (notifPrefs.leadChange && watchRef.current.leaderId && leader.id !== watchRef.current.leaderId) fire('New leader', `${leader.name} has taken the lead.`);
      watchRef.current.leaderId = leader.id;
    }
    if (state.games.skins.enabled) {
      computeSkins(state, holeScoreFn(state, state.games.skins.net)).results.forEach(r => {
        if (r.status === 'won' && !watchRef.current.skinsWonHoles.has(r.hole)) { watchRef.current.skinsWonHoles.add(r.hole); if (notifPrefs.skinsWon) { const w = state.players.find(p => p.id === r.winnerId); fire('Skin won', `${w?.name || 'Someone'} won the skin on hole ${r.hole + 1} ($${r.pot}).`); } }
      });
    }
    if (state.games.matchplay.enabled) {
      (state.games.matchplay.matches || []).forEach(m => {
        const r = computeMatch(m, state);
        if (r.finished && !watchRef.current.matchDecided.has(m.id)) { watchRef.current.matchDecided.add(m.id); if (notifPrefs.matchDecided) fire('Match decided', describeMatch(m, state, r)); }
        if (state.numHoles === 18 && r.holesPlayed === 13 && r.upA === 0 && !watchRef.current.allSquareNotified.has(m.id)) { watchRef.current.allSquareNotified.add(m.id); if (notifPrefs.allSquare) fire('All square', `${sideNames(m.sideA, state)} vs ${sideNames(m.sideB, state)} is all square with 5 to play.`); }
      });
    }
    stats.forEach(s => { if (s.thru === state.numHoles && s.thru > 0 && !watchRef.current.finished.has(s.id)) { watchRef.current.finished.add(s.id); if (notifPrefs.playerFinished) fire('Round finished', `${s.name} finished at ${fmtToPar(s.toPar)}.`); } });
    if (state.games.parimutuel.enabled && !state.games.parimutuel.resolved && !watchRef.current.bettingClosingNotified) {
      const maxThru = stats.length ? Math.max(...stats.map(s => s.thru)) : 0;
      if (maxThru === state.games.parimutuel.lockAfterHole) { watchRef.current.bettingClosingNotified = true; if (notifPrefs.bettingClosingSoon) fire('Betting closing soon', 'Pari-mutuel betting closes after this hole.'); }
    }
    const allFinished = stats.length > 0 && stats.every(s => s.thru === state.numHoles);
    if (allFinished && !buildBetsFromState(state, roundCode, tournament.activeRoundId).some(b => b.currentStatus === 'pending') && !watchRef.current.roundCompleteNotified) {
      watchRef.current.roundCompleteNotified = true;
      if (notifPrefs.roundComplete) fire('Round complete', "Everyone's finished and everything's settled.");
    }
  }, [tournament, notifPrefs, roundCode]);

  useEffect(() => {
    if (!loadedRef.current) return;
    if (chat.length > watchRef.current.chatLen) {
      const last = chat[chat.length - 1];
      if (last && last.authorId !== whoamiId && notifPrefs.chat && typeof Notification !== 'undefined' && Notification.permission === 'granted') { try { new Notification(last.authorName || 'Group chat', { body: last.text }); } catch (e) {} }
    }
    watchRef.current.chatLen = chat.length;
  }, [chat]);

  const updateTournament = (fn) => setTournament(prev => fn(prev));
  const updateRound = (fn) => setTournament(prev => ({ ...prev, rounds: prev.rounds.map(r => r.id === prev.activeRoundId ? fn(r) : r) }));
  const bets = useMemo(() => buildTournamentBets(tournament, roundCode), [tournament, roundCode]);
  const ledger = useMemo(() => buildPlayerLedger(tournament.players, bets), [tournament.players, bets]);
  const swipe = useSwipeNav(activeTab, setActiveTab);

  const handleCreate = () => {
    const code = genCode(), pin = genPin();
    justCreatedRef.current = code;
    (async () => { try { await storage.set('last-code', JSON.stringify(code), false); await storage.set(isAdminKey(code), JSON.stringify(true), false); } catch (e) {} })();
    setIsAdmin(true); setRoundCode(code); setPendingAdminPin(pin);
    setTimeout(() => { setWizardIsNewRound(false); setWizardOpen(true); }, 120);
  };
  const handleJoin = (code) => { const c = code.toUpperCase(); (async () => { try { await storage.set('last-code', JSON.stringify(c), false); } catch (e) {} })(); setRoundCode(c); };
  const handleLoadDemo = async () => {
    const code = genCode();
    const demo = generateDemoTournament();
    justCreatedRef.current = code;
    preloadedRef.current = { code, tournament: demo.tournament, chat: demo.chat, whoamiId: demo.whoamiId };
    (async () => {
      try {
        await storage.set('last-code', JSON.stringify(code), false);
        await storage.set(isAdminKey(code), JSON.stringify(true), false);
        await storage.set(whoamiKey(code), JSON.stringify(demo.whoamiId), false);
        await storage.set(tournamentKey(code), JSON.stringify(demo.tournament), true);
        await storage.set(chatKey(code), JSON.stringify(demo.chat), true);
      } catch (e) {}
    })();
    setIsAdmin(true);
    setRoundCode(code);
  };
  const handleQuickJoin = (code) => { setRoundCode(code); (async () => { try { await storage.set('last-code', JSON.stringify(code), false); } catch (e) {} })(); };
  const handleLeave = () => { (async () => { try { await storage.delete('last-code', false); } catch (e) {} })(); setRoundCode(null); setTournament(defaultTournament()); setChat([]); setIsAdmin(false); setWhoamiId(null); setSettingsOpen(false); };
  const becomeAdmin = (pin) => { if (pin === tournament.adminPin) { setIsAdmin(true); (async () => { try { await storage.set(isAdminKey(roundCode), JSON.stringify(true), false); } catch (e) {} })(); return true; } return false; };
  const saveDeviceProfile = (name) => { setDeviceName(name); (async () => { try { await storage.set('device-profile', JSON.stringify({ name }), false); } catch (e) {} })(); };

  const setIdentity = (playerId) => { setWhoamiId(playerId); (async () => { try { await storage.set(whoamiKey(roundCode), JSON.stringify(playerId), false); } catch (e) {} })(); };
  const addSelf = (name) => {
    if (!deviceName) saveDeviceProfile(name);
    const color = CHIP_COLORS[tournament.players.length % CHIP_COLORS.length];
    const id = `p_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    updateTournament(prev => ({
      ...prev,
      players: [...prev.players, { id, name, color, handicapIndex: '', flightId: null }],
      rounds: prev.rounds.map(r => ({ ...r, scores: { ...r.scores, [id]: Array(r.numHoles).fill(null) } })),
    }));
    setIdentity(id);
  };
  const updateNotifPrefs = (next) => { setNotifPrefs(next); (async () => { try { await storage.set('notif-prefs', JSON.stringify(next), false); } catch (e) {} })(); };
  const sendChat = (text) => {
    const author = tournament.players.find(p => p.id === whoamiId);
    const msg = { id: Date.now() + '-' + Math.random().toString(36).slice(2, 6), authorId: whoamiId, authorName: author ? author.name : (deviceName || 'Guest'), text, ts: Date.now() };
    setChat(prev => { const next = [...prev, msg].slice(-150); (async () => { try { await storage.set(chatKey(roundCode), JSON.stringify(next), true); } catch (e) {} })(); return next; });
  };

  const addPlayer = () => {
    const name = newPlayerName.trim(); if (!name) return;
    const color = CHIP_COLORS[tournament.players.length % CHIP_COLORS.length];
    const id = `p_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    updateTournament(prev => ({
      ...prev, players: [...prev.players, { id, name, color, handicapIndex: '', flightId: null }],
      rounds: prev.rounds.map(r => ({ ...r, scores: { ...r.scores, [id]: Array(r.numHoles).fill(null) } })),
    }));
    setNewPlayerName('');
  };
  const removePlayer = (id) => {
    updateTournament(prev => ({
      ...prev,
      players: prev.players.filter(p => p.id !== id),
      tournamentCustomBets: prev.tournamentCustomBets.filter(b => !b.participants.includes(id)),
      rounds: prev.rounds.map(r => ({
        ...r,
        scores: Object.fromEntries(Object.entries(r.scores).filter(([k]) => k !== id)),
        customBets: r.customBets.filter(b => !b.participants.includes(id)),
        games: {
          ...r.games,
          matchplay: { ...r.games.matchplay, matches: r.games.matchplay.matches.filter(m => !m.sideA.includes(id) && !m.sideB.includes(id)) },
          parimutuel: { ...r.games.parimutuel, tickets: (r.games.parimutuel.tickets || []).filter(t => t.bettorId !== id && t.entrantId !== id) },
        },
      })),
    }));
    if (whoamiId === id) setIdentity(null);
  };
  const setPlayerField = (id, field, val) => updateTournament(prev => ({ ...prev, players: prev.players.map(p => p.id === id ? { ...p, [field]: val } : p) }));
  const addFlight = () => updateTournament(prev => ({ ...prev, flights: [...prev.flights, { id: 'f_' + Date.now(), name: `Flight ${prev.flights.length + 1}`, color: FLIGHT_COLORS[prev.flights.length % FLIGHT_COLORS.length] }] }));
  const renameFlight = (id, name) => updateTournament(prev => ({ ...prev, flights: prev.flights.map(f => f.id === id ? { ...f, name } : f) }));
  const removeFlight = (id) => updateTournament(prev => ({ ...prev, flights: prev.flights.filter(f => f.id !== id), players: prev.players.map(p => p.flightId === id ? { ...p, flightId: null } : p) }));
  const assignFlight = (playerId, flightId) => updateTournament(prev => ({ ...prev, players: prev.players.map(p => p.id === playerId ? { ...p, flightId: p.flightId === flightId ? null : flightId } : p) }));
  const autoFlights = () => updateTournament(prev => {
    if (prev.flights.length < 2) return prev;
    const sorted = [...prev.players].sort((a, b) => (parseFloat(b.handicapIndex) || 0) - (parseFloat(a.handicapIndex) || 0));
    const byFlight = {}; prev.flights.forEach(f => { byFlight[f.id] = 0; });
    const assigned = {};
    sorted.forEach(p => { const fid = prev.flights.reduce((min, f) => byFlight[f.id] < byFlight[min] ? f.id : min, prev.flights[0].id); assigned[p.id] = fid; byFlight[fid]++; });
    return { ...prev, players: prev.players.map(p => ({ ...p, flightId: assigned[p.id] })) };
  });

  const setNumHoles = (n) => updateRound(prev => {
    if (prev.numHoles === n) return prev;
    const havePars = prev.pars && prev.pars.length >= n, haveSI = prev.strokeIndex && prev.strokeIndex.length >= n;
    const pars = (havePars ? prev.pars : (n === 18 ? DEFAULT_PARS_18 : DEFAULT_PARS_9)).slice(0, n);
    const si = (haveSI ? prev.strokeIndex : (n === 18 ? DEFAULT_SI_18 : DEFAULT_SI_9)).slice(0, n);
    const yardage = prev.yardage && prev.yardage.length >= n ? prev.yardage.slice(0, n) : Array.from({ length: n }, (_, i) => prev.yardage?.[i] ?? null);
    const scores = {}; Object.keys(prev.scores).forEach(pid => { const old = prev.scores[pid] || []; scores[pid] = Array.from({ length: n }, (_, i) => old[i] ?? null); });
    return { ...prev, numHoles: n, pars, strokeIndex: si, yardage, scores };
  });
  const setPar = (i, val) => updateRound(prev => { const pars = prev.pars.slice(); pars[i] = val; return { ...prev, pars }; });
  const setSI = (i, val) => updateRound(prev => { const si = prev.strokeIndex.slice(); si[i] = val; return { ...prev, strokeIndex: si }; });
  const setYardage = (i, val) => updateRound(prev => { const yardage = (prev.yardage || Array(prev.numHoles).fill(null)).slice(); yardage[i] = val; return { ...prev, yardage }; });
  const setCourseField = (field, val) => updateRound(prev => ({ ...prev, [field]: val }));
  const selectProviderCourse = (course, teeName) => updateRound(prev => {
    const fields = roundFieldsFromCourse(course, teeName);
    const scores = Object.fromEntries(Object.keys(prev.scores).map(pid => [pid, Array(fields.numHoles).fill(null)]));
    return { ...prev, ...fields, scores };
  });
  const selectCustomCourse = () => updateRound(prev => ({ ...prev, courseId: null, providerId: null, teeName: null, courseName: prev.courseName || '', yardage: prev.yardage || Array(prev.numHoles).fill(null) }));

  const startRound = () => updateRound(prev => ({ ...prev, started: true }));
  const resetScores = () => updateRound(prev => ({ ...prev, scores: Object.fromEntries(Object.keys(prev.scores).map(pid => [pid, Array(prev.numHoles).fill(null)])) }));
  const applyScan = (rows) => updateRound(prev => { const scores = { ...prev.scores }; rows.forEach(r => { scores[r.playerId] = r.scores.map((s, i) => s != null ? s : (scores[r.playerId]?.[i] ?? null)); }); return { ...prev, scores }; });
  const setScoreVal = (playerId, holeIndex, val) => updateRound(prev => {
    const arr = (prev.scores[playerId] || []).slice(); arr[holeIndex] = val;
    const scoreUpdatedAt = { ...(prev.scoreUpdatedAt || {}) };
    if (val != null) scoreUpdatedAt[`${playerId}-${holeIndex}`] = Date.now(); else delete scoreUpdatedAt[`${playerId}-${holeIndex}`];
    return { ...prev, scores: { ...prev.scores, [playerId]: arr }, scoreUpdatedAt };
  });
  const stateNow = getRoundView(tournament, tournament.activeRoundId);
  const tapPlus = (playerId, holeIndex) => { const cur = stateNow.scores[playerId]?.[holeIndex]; const par = stateNow.pars[holeIndex] ?? 4; setScoreVal(playerId, holeIndex, cur == null ? par : cur + 1); };
  const tapMinus = (playerId, holeIndex) => { const cur = stateNow.scores[playerId]?.[holeIndex]; const par = stateNow.pars[holeIndex] ?? 4; setScoreVal(playerId, holeIndex, cur == null ? par : Math.max(1, cur - 1)); };
  const tapCenter = (playerId, holeIndex) => { const cur = stateNow.scores[playerId]?.[holeIndex]; const par = stateNow.pars[holeIndex] ?? 4; if (cur == null) setScoreVal(playerId, holeIndex, par); };
  const clearScore = (playerId, holeIndex) => setScoreVal(playerId, holeIndex, null);
  const goHole = (delta) => setViewHole(v => Math.max(0, Math.min(stateNow.numHoles - 1, v + delta)));

  const adjustTicket = (entrantId, delta) => {
    if (!whoamiId) return;
    updateRound(prev => {
      const tickets = prev.games.parimutuel.tickets || [];
      const existing = tickets.find(t => t.bettorId === whoamiId && t.entrantId === entrantId);
      let next;
      if (delta > 0) { next = existing ? tickets.map(t => t === existing ? { ...t, count: t.count + 1 } : t) : [...tickets, { id: 't_' + Date.now(), bettorId: whoamiId, bettorName: tournament.players.find(p => p.id === whoamiId)?.name || '', entrantId, count: 1, ts: Date.now() }]; }
      else { if (!existing) return prev; next = existing.count <= 1 ? tickets.filter(t => t !== existing) : tickets.map(t => t === existing ? { ...t, count: t.count - 1 } : t); }
      return { ...prev, games: { ...prev.games, parimutuel: { ...prev.games.parimutuel, tickets: next } } };
    });
  };
  const resolveMarket = (winnerId) => updateRound(prev => ({ ...prev, games: { ...prev.games, parimutuel: { ...prev.games.parimutuel, resolved: true, winnerId } } }));
  const reopenMarket = () => updateRound(prev => ({ ...prev, games: { ...prev.games, parimutuel: { ...prev.games.parimutuel, resolved: false, winnerId: null } } }));

  const addCustomBet = (bet) => updateRound(prev => ({ ...prev, customBets: [...prev.customBets, { id: 'cb_' + Date.now(), resolved: false, winnerIds: null, ...bet }] }));
  const removeCustomBet = (id) => updateRound(prev => ({ ...prev, customBets: prev.customBets.filter(b => b.id !== id) }));
  const resolveCustomBet = (id, winnerIds) => updateRound(prev => ({ ...prev, customBets: prev.customBets.map(b => b.id === id ? { ...b, resolved: true, winnerIds } : b) }));
  const reopenCustomBet = (id) => updateRound(prev => ({ ...prev, customBets: prev.customBets.map(b => b.id === id ? { ...b, resolved: false, winnerIds: null } : b) }));

  const addTournamentCustomBet = (bet) => updateTournament(prev => ({ ...prev, tournamentCustomBets: [...prev.tournamentCustomBets, { id: 'tcb_' + Date.now(), resolved: false, winnerIds: null, ...bet }] }));
  const removeTournamentCustomBet = (id) => updateTournament(prev => ({ ...prev, tournamentCustomBets: prev.tournamentCustomBets.filter(b => b.id !== id) }));
  const resolveTournamentCustomBet = (id, winnerIds) => updateTournament(prev => ({ ...prev, tournamentCustomBets: prev.tournamentCustomBets.map(b => b.id === id ? { ...b, resolved: true, winnerIds } : b) }));
  const reopenTournamentCustomBet = (id) => updateTournament(prev => ({ ...prev, tournamentCustomBets: prev.tournamentCustomBets.map(b => b.id === id ? { ...b, resolved: false, winnerIds: null } : b) }));

  const saveBetTemplate = (tpl) => setBetTemplates(prev => { const next = [...prev, { id: 'tpl_' + Date.now(), ...tpl }]; (async () => { try { await storage.set('bet-templates', JSON.stringify(next), false); } catch (e) {} })(); return next; });
  const deleteBetTemplate = (id) => setBetTemplates(prev => { const next = prev.filter(t => t.id !== id); (async () => { try { await storage.set('bet-templates', JSON.stringify(next), false); } catch (e) {} })(); return next; });

  const addRound = () => {
    setTournament(prev => {
      const newRound = defaultRound(prev.rounds.length);
      const last = prev.rounds[prev.rounds.length - 1];
      if (last) {
        newRound.courseId = last.courseId; newRound.courseName = last.courseName; newRound.courseRating = last.courseRating; newRound.courseSlope = last.courseSlope;
        newRound.numHoles = last.numHoles; newRound.pars = last.pars.slice(); newRound.strokeIndex = last.strokeIndex.slice();
        newRound.games = JSON.parse(JSON.stringify(last.games));
        newRound.games.matchplay.matches = []; newRound.games.wolf.choices = {};
        newRound.games.parimutuel.resolved = false; newRound.games.parimutuel.winnerId = null; newRound.games.parimutuel.tickets = [];
      }
      prev.players.forEach(p => { newRound.scores[p.id] = Array(newRound.numHoles).fill(null); });
      return { ...prev, rounds: [...prev.rounds, newRound], activeRoundId: newRound.id };
    });
    autoJumpRef.current = false;
    setWizardIsNewRound(true);
    setWizardOpen(true);
  };
  const switchRound = (roundId) => { updateTournament(prev => ({ ...prev, activeRoundId: roundId })); autoJumpRef.current = false; };

  const onBubblePointerDown = (e) => { bubbleDragRef.current = { startX: e.clientX, startY: e.clientY, origin: bubblePos || { x: window.innerWidth - 70, y: window.innerHeight - 142 } }; bubbleJustDraggedRef.current = false; e.target.setPointerCapture?.(e.pointerId); };
  const onBubblePointerMove = (e) => {
    if (!bubbleDragRef.current) return;
    const dx = e.clientX - bubbleDragRef.current.startX, dy = e.clientY - bubbleDragRef.current.startY;
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) bubbleJustDraggedRef.current = true;
    const nx = Math.max(6, Math.min(window.innerWidth - 60, bubbleDragRef.current.origin.x + dx));
    const ny = Math.max(80, Math.min(window.innerHeight - 60, bubbleDragRef.current.origin.y + dy));
    setBubblePos({ x: nx, y: ny });
  };
  const onBubblePointerUp = () => { bubbleDragRef.current = null; if (bubblePos) (async () => { try { await storage.set('chat-bubble-pos', JSON.stringify(bubblePos), false); } catch (e) {} })(); };
  const onBubbleClick = () => { if (bubbleJustDraggedRef.current) { bubbleJustDraggedRef.current = false; return; } setChatOpen(true); setChatSeenLen(chat.length); };

  if (!initChecked) return <div style={{ minHeight: '100vh', background: C.pine }} />;
  if (!roundCode) return (
    <>
      <Landing onCreate={handleCreate} onJoin={handleJoin} onLoadDemo={handleLoadDemo} myTournaments={myTournaments} onQuickJoin={handleQuickJoin} deviceName={deviceName} onOpenProfile={() => setProfileOpen(true)} />
      {profileOpen && <DeviceProfileModal name={deviceName} onSave={saveDeviceProfile} onClose={() => setProfileOpen(false)} />}
    </>
  );
  if (loading) return <div style={{ minHeight: '100vh', background: C.pine, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.ivoryDim, fontFamily: 'Inter, sans-serif' }}>Loading round…</div>;

  const state = getRoundView(tournament, tournament.activeRoundId);
  const stats = computeStats(state);
  const hasPlayers = tournament.players.length > 0;
  const h = Math.max(0, Math.min(viewHole, state.numHoles - 1));
  const par = state.pars[h] ?? 4;
  const whoami = tournament.players.find(p => p.id === whoamiId) || null;
  const roundBets = bets.filter(b => b.roundId === tournament.activeRoundId);
  const phase = getRoundPhase(state, stats, roundBets);
  const viewAsAdmin = isAdmin && !previewMode;
  const multiRound = tournament.rounds.length > 1;
  const isLastRound = tournament.rounds[tournament.rounds.length - 1]?.id === tournament.activeRoundId;

  return (
    <div style={{ height: '100vh', overflow: 'hidden', background: `radial-gradient(ellipse at top, ${C.turf} 0%, ${C.pine} 55%, ${C.pineDark} 100%)`, color: C.ivory, fontFamily: 'Inter, sans-serif', display: 'flex', flexDirection: 'column' }}>
      <FontLoader />
      <LibraryLoader />
      <div style={{ flexShrink: 0, background: C.pineDark, borderBottom: `1px solid ${C.turfBorder}`, padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontFamily: 'Oswald, sans-serif', fontWeight: 600, fontSize: 18, letterSpacing: 0.5, textTransform: 'uppercase', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{tournament.name}</div>
          <div style={{ fontSize: 12, color: C.ivoryDim, display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            <span style={{ width: 6, height: 6, borderRadius: 999, background: C.blueBright, display: 'inline-block', flexShrink: 0, animation: 'pulse 2.2s ease-in-out infinite' }} />
            {viewAsAdmin ? 'admin · ' : ''}{multiRound ? (
              <button onClick={() => setRoundSwitcherOpen(true)} style={{ background: 'transparent', border: 'none', color: C.goldBright, padding: 0, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 12 }}>Round {tournament.rounds.findIndex(r => r.id === tournament.activeRoundId) + 1} of {tournament.rounds.length} <ChevronsUpDown size={11} /></button>
            ) : `${state.numHoles} holes`} · code {roundCode}
          </div>
        </div>
        <button onClick={() => setSettingsOpen(true)} aria-label="Settings" style={{ background: C.turf, border: `1px solid ${C.turfBorder}`, borderRadius: 10, width: 38, height: 38, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.ivory, cursor: 'pointer', flexShrink: 0 }}><Settings size={18} /></button>
      </div>
      <div style={{ height: 3, background: `linear-gradient(90deg, ${C.flagRed} 0%, ${C.flagRed} 33%, ${C.ivory} 33%, ${C.ivory} 66%, ${C.blue} 66%, ${C.blue} 100%)`, flexShrink: 0 }} />
      {previewMode && (
        <div style={{ flexShrink: 0, background: C.gold, color: C.pineDark, padding: '8px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
          <span style={{ fontSize: 12, fontWeight: 600 }}>Previewing as a player</span>
          <button onClick={() => setPreviewMode(false)} style={{ background: C.pineDark, color: C.ivory, border: 'none', borderRadius: 7, padding: '5px 10px', fontSize: 11, fontFamily: 'Oswald, sans-serif', fontWeight: 600, textTransform: 'uppercase', cursor: 'pointer', flexShrink: 0 }}>Exit preview</button>
        </div>
      )}

      <div onTouchStart={swipe.onTouchStart} onTouchEnd={swipe.onTouchEnd} style={{ flex: 1, minHeight: 0, overflowY: 'auto', overflowX: 'hidden', WebkitOverflowScrolling: 'touch', padding: 16, paddingBottom: 28, maxWidth: 720, margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>
        {!hasPlayers && (
          <div style={{ textAlign: 'center', marginTop: 60, padding: '0 12px' }}>
            <Flag size={40} color={C.gold} style={{ marginBottom: 14 }} />
            <div style={{ fontFamily: 'Oswald, sans-serif', fontSize: 22, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>No players yet</div>
            {viewAsAdmin ? (
              <>
                <div style={{ color: C.ivoryDim, marginBottom: 20, fontSize: 14, lineHeight: 1.5 }}>Set the course, add your group, and pick your games — share the round code so everyone's phone shows the same live round.</div>
                <GoldButton onClick={() => setWizardOpen(true)}>Set up the round</GoldButton>
              </>
            ) : <div style={{ color: C.ivoryDim, fontSize: 14, lineHeight: 1.5 }}>Waiting on the admin to finish setting up the round.</div>}
          </div>
        )}
        {hasPlayers && activeTab === 'home' && <HomeTab state={state} stats={stats} isAdmin={viewAsAdmin} whoami={whoami} setActiveTab={setActiveTab} chat={chat} ledger={ledger} onOpenMyPosition={() => setMyPositionOpen(true)} phase={phase} guidanceEnabled={guidanceEnabled} onOpenChat={() => { setChatOpen(true); setChatSeenLen(chat.length); }} onOpenRoundComplete={() => setRoundCompleteOpen(true)} tournament={tournament} onSwitchRound={() => setRoundSwitcherOpen(true)} onOpenRoundFlow={() => setRoundFlowOpen(true)} />}
        {hasPlayers && activeTab === 'card' && <ScorecardTab state={state} h={h} par={par} tapPlus={tapPlus} tapMinus={tapMinus} tapCenter={tapCenter} clearScore={clearScore} goHole={goHole} setHole={setViewHole} onOpenScan={() => setScanOpen(true)} isAdmin={viewAsAdmin} whoami={whoami} onPick={setIdentity} onAddSelf={addSelf} />}
        {hasPlayers && activeTab === 'leaderboard' && <LeaderboardTab state={state} stats={stats} />}
        {hasPlayers && activeTab === 'games' && <GamesTab state={state} />}
        {hasPlayers && activeTab === 'bets' && <BetsTab state={state} isAdmin={viewAsAdmin} whoami={whoami} onPick={setIdentity} onAddSelf={addSelf} adjustTicket={adjustTicket} resolveMarket={resolveMarket} reopenMarket={reopenMarket} onOpenBetBuilder={() => setBetBuilderOpen(true)} onResolveCustomBet={resolveCustomBet} onReopenCustomBet={reopenCustomBet} onRemoveCustomBet={removeCustomBet} tournamentCustomBets={tournament.tournamentCustomBets} onResolveTournamentBet={resolveTournamentCustomBet} onReopenTournamentBet={reopenTournamentCustomBet} onRemoveTournamentBet={removeTournamentCustomBet} onOpenTournamentBetBuilder={() => setTournamentBetBuilderOpen(true)} tournament={tournament} />}
        {hasPlayers && activeTab === 'settle' && <SettleTab tournament={tournament} ledger={ledger} onOpenMyPosition={() => setMyPositionOpen(true)} />}
      </div>

      {hasPlayers && (
        <div style={{ flexShrink: 0, background: C.pineDark, borderTop: `1px solid ${C.turfBorder}`, display: 'flex', justifyContent: 'space-between', padding: '8px 4px 10px' }}>
          <NavBtn icon={Home} label="Home" active={activeTab === 'home'} onClick={() => setActiveTab('home')} />
          <NavBtn icon={Flag} label="Card" active={activeTab === 'card'} onClick={() => setActiveTab('card')} />
          <NavBtn icon={Trophy} label="Leaders" active={activeTab === 'leaderboard'} onClick={() => setActiveTab('leaderboard')} />
          <NavBtn icon={Coins} label="Games" active={activeTab === 'games'} onClick={() => setActiveTab('games')} />
          <NavBtn icon={Ticket} label="Bets" active={activeTab === 'bets'} onClick={() => setActiveTab('bets')} />
          <NavBtn icon={Receipt} label="Settle" active={activeTab === 'settle'} onClick={() => setActiveTab('settle')} />
        </div>
      )}

      {hasPlayers && (
        <button
          onPointerDown={onBubblePointerDown} onPointerMove={onBubblePointerMove} onPointerUp={onBubblePointerUp}
          onClick={onBubbleClick} aria-label="Group chat" style={{
            position: 'fixed', ...(bubblePos ? { left: bubblePos.x, top: bubblePos.y } : { right: 16, bottom: 82 }),
            width: 54, height: 54, borderRadius: 999,
            background: C.gold, border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 0 rgba(0,0,0,0.35)', cursor: 'grab', zIndex: 25, touchAction: 'none', userSelect: 'none',
          }}>
          <span style={{ fontSize: 26, lineHeight: 1 }}>💩</span>
          {chat.length > chatSeenLen && (
            <span style={{ position: 'absolute', top: -4, right: -4, background: C.flagRed, color: C.ivory, borderRadius: 999, fontSize: 10, minWidth: 18, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px', fontFamily: 'Oswald, sans-serif', fontWeight: 700 }}>
              {Math.min(chat.length - chatSeenLen, 9)}{chat.length - chatSeenLen > 9 ? '+' : ''}
            </span>
          )}
        </button>
      )}

      {setupOpen && isAdmin && (
        <SetupModal tournament={tournament} state={state} updateTournament={updateTournament} updateRound={updateRound} onClose={() => setSetupOpen(false)} roundCode={roundCode} newPlayerName={newPlayerName} setNewPlayerName={setNewPlayerName} addPlayer={addPlayer} removePlayer={removePlayer} selectProviderCourse={selectProviderCourse} selectCustomCourse={selectCustomCourse} setNumHoles={setNumHoles} setPar={setPar} setSI={setSI} setYardage={setYardage} setCourseField={setCourseField} setPlayerField={setPlayerField} autoFlights={autoFlights} addFlight={addFlight} renameFlight={renameFlight} removeFlight={removeFlight} assignFlight={assignFlight} startRound={startRound} resetScores={resetScores} onPreview={() => { setSetupOpen(false); setPreviewMode(true); setActiveTab('card'); }} onAddRound={addRound} onSwitchRound={switchRound} />
      )}
      {wizardOpen && isAdmin && (
        <SetupWizard tournament={tournament} state={state} updateTournament={updateTournament} updateRound={updateRound} onClose={() => { setWizardOpen(false); setWizardIsNewRound(false); }} roundCode={roundCode} selectProviderCourse={selectProviderCourse} selectCustomCourse={selectCustomCourse} setNumHoles={setNumHoles} setPlayerField={setPlayerField} autoFlights={autoFlights} setCourseField={setCourseField} startRound={startRound} isNewRound={wizardIsNewRound} onFinish={() => { setWizardOpen(false); setWizardIsNewRound(false); setActiveTab('home'); }} />
      )}
      {settingsOpen && (
        <SettingsSheet onClose={() => setSettingsOpen(false)} onOpenSetup={() => { setSettingsOpen(false); setSetupOpen(true); }} onOpenNotifications={() => { setSettingsOpen(false); setNotifOpen(true); }} onOpenScan={() => { setSettingsOpen(false); setScanOpen(true); }} onLeave={handleLeave} onBecomeAdmin={() => { setSettingsOpen(false); setBecomeAdminOpen(true); }} roundCode={roundCode} adminPin={tournament.adminPin} isAdmin={viewAsAdmin} hasPlayers={hasPlayers} previewMode={previewMode} onExitPreview={() => { setSettingsOpen(false); setPreviewMode(false); }} guidanceEnabled={guidanceEnabled} onToggleGuidance={() => { const next = !guidanceEnabled; setGuidanceEnabled(next); (async () => { try { await storage.set('guidance-enabled', JSON.stringify(next), false); } catch (e) {} })(); }} onOpenProfile={() => { setSettingsOpen(false); setProfileOpen(true); }} onOpenRoundSwitcher={() => { setSettingsOpen(false); setRoundSwitcherOpen(true); }} multiRound={multiRound} onOpenRoundFlow={() => { setSettingsOpen(false); setRoundFlowOpen(true); }} />
      )}
      {notifOpen && <NotificationsModal prefs={notifPrefs} setPrefs={updateNotifPrefs} onClose={() => setNotifOpen(false)} />}
      {scanOpen && <ScanModal state={state} onClose={() => setScanOpen(false)} onApply={applyScan} />}
      {becomeAdminOpen && <BecomeAdminModal onSubmit={becomeAdmin} onClose={() => setBecomeAdminOpen(false)} />}
      {betBuilderOpen && isAdmin && <BetBuilderModal state={state} templates={betTemplates} onCreate={addCustomBet} onSaveTemplate={saveBetTemplate} onDeleteTemplate={deleteBetTemplate} onClose={() => setBetBuilderOpen(false)} />}
      {tournamentBetBuilderOpen && isAdmin && <BetBuilderModal state={{ players: tournament.players, numHoles: 18, handicapsEnabled: tournament.handicapsEnabled }} templates={betTemplates} onCreate={addTournamentCustomBet} onSaveTemplate={saveBetTemplate} onDeleteTemplate={deleteBetTemplate} onClose={() => setTournamentBetBuilderOpen(false)} scopeLabel="whole trip" />}
      {myPositionOpen && <MyPositionModal state={state} bets={bets} ledger={ledger} whoami={whoami} onPick={setIdentity} onAddSelf={addSelf} onClose={() => setMyPositionOpen(false)} />}
      {chatOpen && <ChatModal state={state} chat={chat} whoami={whoami} onPick={setIdentity} onAddSelf={addSelf} sendChat={sendChat} onClose={() => setChatOpen(false)} />}
      {roundCompleteOpen && <RoundCompleteModal state={state} stats={stats} ledger={ledger} isLastRound={isLastRound} onClose={() => setRoundCompleteOpen(false)} />}
      {roundSwitcherOpen && <RoundSwitcherModal tournament={tournament} onSwitch={switchRound} onClose={() => setRoundSwitcherOpen(false)} isAdmin={viewAsAdmin} onAddRound={addRound} />}
      {roundFlowOpen && <RoundFlowScreen tournament={tournament} state={state} isAdmin={viewAsAdmin} whoami={whoami} sendChat={sendChat} updateRound={updateRound} onClose={() => setRoundFlowOpen(false)} />}
      {profileOpen && <DeviceProfileModal name={deviceName} onSave={saveDeviceProfile} onClose={() => setProfileOpen(false)} />}
    </div>
  );
}

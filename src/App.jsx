import { storage } from './firebase';
import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Flag, Trophy, Coins, Receipt, Plus, Minus, Settings, ChevronLeft, ChevronRight,
  ChevronDown, ChevronUp, X, UserPlus, Trash2, Check, Camera, Send, Bell,
  MessageCircle, Swords, Shuffle, Copy, LogOut, Loader2, Home, Ticket, KeyRound,
  Calendar, User, ChevronsUpDown, RefreshCw, Share2,
} from 'lucide-react';

/* ============================== DESIGN TOKENS ============================== */
const C = {
  pine: '#F2F4EF', pineDark: '#E5EAE0', turf: '#FFFFFF', turfLight: '#F8FAF5',
  turfBorder: '#D0D8C8', ivory: '#0F1117', ivoryDim: '#4B5563',
  gold: '#C4900A', goldBright: '#D4A000', goldLight: '#FEF3C7',
  flagRed: '#C41E3A', bunker: '#6B7280',
  blue: '#1D4ED8', blueBright: '#2563EB', emerald: '#005C38', emeraldLight: '#D1FAE5',
  shadow: '0 2px 16px rgba(0,0,0,0.07), 0 0 0 1px rgba(0,0,0,0.04)',
  shadowHero: '0 8px 32px rgba(0,0,0,0.11), 0 0 0 1px rgba(0,0,0,0.06)',
};
const CHIP_COLORS = ['#B8860B', '#C41E3A', '#1D4ED8', '#4B5563', '#7C3AED', '#00754A', '#B45309', '#0369A1'];
const FLIGHT_COLORS = ['#C41E3A', '#1D4ED8', '#B8860B', '#00754A'];
const TABS = ['home', 'card', 'games', 'settle'];

/* ============================== COURSE DATA MODEL ==============================
   Shape every course-data provider (mock today, a real one later) must return:
   { courseId, providerId, courseName, address, city, state, latitude, longitude,
     numberOfHoles, teeBoxes: [{teeName, totalYards, rating, slope}],
     holes: [{holeNumber, par, handicap, yardagesByTee: {teeName: yards}}] } */

/* Procedurally fills in per-tee yardages for each hole from a course's par sequence and each
   tee's overall declared length \u2014 keeps the mock dataset internally consistent without
   hand-typing hundreds of yardage numbers. Swap this whole module out once a real provider
   (GolfAPI.io, GolfCourseAPI, iGolf, etc.) is wired up; the UI never needs to know the source. */
function buildMockHoles(pars, handicaps, teeBoxes, verifiedYardages) {
  const baseByPar = { 3: 165, 4: 400, 5: 540 };
  const baseTotal = pars.reduce((sum, par) => sum + (baseByPar[par] || 400), 0);
  return pars.map((par, i) => {
    const yardagesByTee = {};
    teeBoxes.forEach(tee => {
      if (verifiedYardages && verifiedYardages[tee.teeName]) {
        yardagesByTee[tee.teeName] = verifiedYardages[tee.teeName][i];
      } else {
        const scale = tee.totalYards / baseTotal;
        yardagesByTee[tee.teeName] = Math.round((baseByPar[par] || 400) * scale / 5) * 5;
      }
    });
    return { holeNumber: i + 1, par, handicap: handicaps[i], yardagesByTee };
  });
}
function buildMockCourse({ courseId, courseName, address, city, state, latitude, longitude, pars, handicaps, teeBoxes, _holeYardagesByTee }) {
  return {
    courseId, providerId: 'mock', courseName, address, city, state, latitude, longitude,
    numberOfHoles: pars.length, teeBoxes,
    holes: buildMockHoles(pars, handicaps, teeBoxes, _holeYardagesByTee),
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
    address: '442 Tobacco Rd', city: 'Sanford', state: 'NC', latitude: 35.396, longitude: -79.213,
    pars:      [5,4,3,5,4,3,4,3,4, 4,5,4,5,3,4,4,3,4],
    handicaps: [3,11,17,9,15,13,7,5,1, 6,10,14,2,8,12,16,18,4],
    teeBoxes: [
      { teeName: 'The Ripper', totalYards: 6557, rating: 72.5, slope: 145 },
      { teeName: 'The Disc',   totalYards: 6317, rating: 71.3, slope: 143 },
      { teeName: 'The Plow',   totalYards: 5886, rating: 69.4, slope: 132 },
      { teeName: 'The Points', totalYards: 5302, rating: 66.9, slope: 125 },
    ],
    _holeYardagesByTee: {
      'The Ripper': [558,392,152,535,333,148,411,178,427, 441,531,419,573,194,365,326,142,432],
    },
  }),
  buildMockCourse({
    courseId: 'mock-mid-south', courseName: 'Mid South Club',
    address: '610 Palmer Dr', city: 'Southern Pines', state: 'NC', latitude: 35.189, longitude: -79.423,
    pars:      [4,4,3,5,4,3,4,4,5, 4,3,4,4,4,5,4,3,4],
    handicaps: [11,3,17,9,1,15,13,7,5, 12,18,2,10,4,14,8,16,6],
    teeBoxes: [
      { teeName: 'Gold',  totalYards: 7003, rating: 73.8, slope: 146 },
      { teeName: 'Blue',  totalYards: 6577, rating: 72.1, slope: 139 },
      { teeName: 'White', totalYards: 6170, rating: 70.0, slope: 132 },
      { teeName: 'Green', totalYards: 5655, rating: 67.8, slope: 122 },
    ],
    _holeYardagesByTee: {
      Gold: [398,401,180,533,390,178,416,430,542, 410,175,470,442,452,548,398,205,435],
    },
  }),
  buildMockCourse({
    courseId: 'mock-talamore', courseName: 'Talamore Golf Resort',
    address: '48 Talamore Dr', city: 'Southern Pines', state: 'NC', latitude: 35.208, longitude: -79.409,
    pars:      [5,3,4,5,3,4,4,4,4, 4,5,4,3,4,3,4,4,4],
    handicaps: [4,16,6,14,18,12,2,8,10, 7,15,5,17,9,13,1,11,3],
    teeBoxes: [
      { teeName: 'Gold',  totalYards: 6840, rating: 71.4, slope: 140 },
      { teeName: 'Blue',  totalYards: 6533, rating: 68.7, slope: 136 },
      { teeName: 'White', totalYards: 6007, rating: 66.0, slope: 132 },
      { teeName: 'Green', totalYards: 5470, rating: 63.1, slope: 125 },
    ],
    _holeYardagesByTee: {
      Gold: [623,201,412,509,184,354,442,415,368, 370,527,422,182,383,238,444,340,426],
    },
  }),
  buildMockCourse({
    courseId: 'mock-river-ridge', courseName: 'River Ridge Golf Club',
    address: '2311 Auburn Church Rd', city: 'Raleigh', state: 'NC', latitude: 35.868, longitude: -78.638,
    pars:      [4,3,4,5,4,5,4,4,3, 4,4,4,5,4,3,4,3,5],
    handicaps: [9,15,1,13,7,5,3,17,11, 8,16,10,6,12,14,2,4,18],
    teeBoxes: [
      { teeName: 'Black', totalYards: 6769, rating: 72.4, slope: 138 },
      { teeName: 'Blue',  totalYards: 6206, rating: 70.1, slope: 130 },
      { teeName: 'White', totalYards: 5756, rating: 68.5, slope: 120 },
      { teeName: 'Gold',  totalYards: 5354, rating: 66.8, slope: 115 },
    ],
    _holeYardagesByTee: {
      Black: [398,163,432,549,375,523,395,362,189, 414,315,375,541,410,173,485,197,473],
      Blue:  [362,150,410,480,335,485,369,345,173, 392,290,340,508,375,154,419,157,462],
      White: [331,120,379,438,300,470,350,325,155, 355,270,319,464,350,142,389,144,455],
      Gold:  [319,111,314,410,288,449,300,291,142, 321,260,285,456,338,129,364,140,437],
    },
  }),
  buildMockCourse({
    courseId: 'mock-ironwood', courseName: 'Ironwood Golf & Country Club',
    address: "1455 Bell's Fork Rd", city: 'Greenville', state: 'NC', latitude: 35.633, longitude: -77.366,
    pars:      [4,4,3,5,4,4,5,3,4, 4,3,4,5,4,4,5,3,4],
    handicaps: [13,5,9,7,17,3,15,1,11, 2,12,4,8,16,18,10,14,6],
    teeBoxes: [
      { teeName: 'Purple', totalYards: 7067, rating: 74.2, slope: 138 },
      { teeName: 'Black',  totalYards: 6657, rating: 72.3, slope: 134 },
      { teeName: 'White',  totalYards: 6238, rating: 70.1, slope: 131 },
      { teeName: 'Gold',   totalYards: 5812, rating: 68.3, slope: 123 },
    ],
    _holeYardagesByTee: {
      Purple: [377,405,197,567,423,413,557,207,407, 444,191,390,558,376,437,551,197,370],
      Black:  [359,397,175,539,394,389,535,195,382, 386,169,378,552,359,392,522,188,346],
      White:  [359,377,147,525,377,381,499,171,358, 358,135,356,505,347,361,505,161,316],
      Gold:   [306,353,147,499,342,345,488,171,335, 352,128,356,473,308,324,473,136,276],
    },
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
function courseHandicap(index, slope) {
  if (index == null || !slope) return null;
  return Math.round(index * (slope / 113));
}
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
      skins:      { enabled: false, value: 5, net: false },
      nassau:     { enabled: false, value: 10, net: false },
      stableford: { enabled: false, value: 1, net: true },
      matchplay:  { enabled: false, value: 20, matches: [] },
      wolf:       { enabled: false, value: 5, net: false, choices: {} },
      parimutuel: { enabled: false, marketType: 'players', net: false, lockAfterHole: 0, resolved: false, winnerId: null, tickets: [] },
      bestBall:   { enabled: false, pairs: [] },
      scramble:   { enabled: false, pairs: [] },
      strokePlay: { enabled: false },
    },
    customBets: [],
    flowGroups: [], scoreUpdatedAt: {}, submittedPlayers: [], nineHoleTotals: {},
    started: false,
    handicapMode: 'none',
    matchFormat: 'stroke-play',
    roundPlayers: [],
  };
}
function defaultTournament() {
  const r0 = defaultRound(0);
  return {
    name: '', adminPin: null,
    players: [], flights: [], handicapsEnabled: false,
    rounds: [r0], activeRoundId: r0.id,
    tournamentCustomBets: [],
    ryderCup: { enabled: false, teamAName: 'USA', teamBName: 'Europe', totalPlayers: null, captainA: null, captainB: null },
    kingsOfSwing: { enabled: false, seededPlayers: [], rounds: [], champion: null },
  };
}
function getRoundView(tournament, roundId) {
  const round = tournament.rounds.find(r => r.id === roundId) || tournament.rounds[0] || defaultRound(0);
  const players = (() => {
    const roundPlayers = Array.isArray(round.roundPlayers) ? round.roundPlayers.filter(p => p && p.id) : [];
    if (roundPlayers.length > 0) return roundPlayers;
    return Array.isArray(tournament.players) ? tournament.players.filter(p => p && p.id) : [];
  })();
  const flights = Array.isArray(tournament.flights) ? tournament.flights.filter(f => f && f.id) : [];
  const pars = Array.isArray(round.pars) ? round.pars : DEFAULT_PARS_18.slice();
  const strokeIndex = Array.isArray(round.strokeIndex) ? round.strokeIndex : DEFAULT_SI_18.slice();
  const customBets = Array.isArray(round.customBets) ? round.customBets : [];
  const flowGroups = Array.isArray(round.flowGroups) ? round.flowGroups : [];
  const submittedPlayers = Array.isArray(round.submittedPlayers) ? round.submittedPlayers : [];
  const nineHoleTotals = round.nineHoleTotals && typeof round.nineHoleTotals === 'object' ? round.nineHoleTotals : {};
  const tournamentCustomBets = Array.isArray(tournament.tournamentCustomBets) ? tournament.tournamentCustomBets : [];
  const scores = round.scores && typeof round.scores === 'object' ? round.scores : {};
  const safeScores = {};
  players.forEach(p => { safeScores[p.id] = Array.isArray(scores[p.id]) ? scores[p.id] : Array(round.numHoles || 18).fill(null); });
  return {
    ...round,
    pars, strokeIndex, customBets, flowGroups, submittedPlayers, scores: safeScores, nineHoleTotals,
    players, flights, handicapsEnabled: tournament.handicapsEnabled,
    adminPin: tournament.adminPin, roundName: round.name, tournamentName: tournament.name,
    tournamentCustomBets,
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
/* ============================== KING OF SWING ============================== */
function bracketSize(n) {
  for (const s of [2,4,8,16,32,64]) { if (s >= n) return s; }
  return 64;
}
function generateBracket(seededPlayers) {
  const n = seededPlayers.length;
  if (n < 2) return [];
  const size = bracketSize(n);
  const padded = [...seededPlayers, ...Array(size - n).fill(null)];
  const numRounds = Math.log2(size);
  const rounds = [];
  for (let r = 0; r < numRounds; r++) {
    const numMatches = size / Math.pow(2, r + 1);
    const label = numMatches === 1 ? 'Final' : numMatches === 2 ? 'Semifinal' : `Round ${r + 1}`;
    const matches = [];
    for (let i = 0; i < numMatches; i++) {
      const p1 = r === 0 ? padded[i * 2] : null;
      const p2 = r === 0 ? padded[i * 2 + 1] : null;
      const isBye = r === 0 && (!p1 || !p2);
      matches.push({ id: `ks_r${r}_m${i}_${Date.now()}`, player1Id: p1?.id||null, player2Id: p2?.id||null, winnerId: isBye ? (p1?.id||p2?.id||null) : null, isBye, score1: null, score2: null });
    }
    rounds.push({ roundIndex: r, label, matches });
  }
  return rounds;
}
function advanceBracket(rounds, roundIndex, matchIndex, winnerId) {
  const r = rounds.map(rd => ({ ...rd, matches: rd.matches.map(m => ({ ...m })) }));
  const m = r[roundIndex]?.matches[matchIndex];
  if (!m) return r;
  m.winnerId = winnerId;
  const next = r[roundIndex + 1];
  if (!next) return r;
  const nm = next.matches[Math.floor(matchIndex / 2)];
  if (!nm) return r;
  if (matchIndex % 2 === 0) nm.player1Id = winnerId;
  else nm.player2Id = winnerId;
  if (nm.player1Id && nm.player2Id === null) { nm.isBye = false; }
  return r;
}

function computeBestBall(state) {
  const pairs = Array.isArray(state.games?.bestBall?.pairs) ? state.games.bestBall.pairs : [];
  if (pairs.length === 0) return [];
  return pairs.map(pair => {
    const playerIds = Array.isArray(pair.playerIds) ? pair.playerIds : [];
    const players = playerIds.map(id => state.players.find(p => p.id === id)).filter(Boolean);
    const holeScores = Array.from({ length: state.numHoles }, (_, h) => {
      const scores = playerIds.map(id => state.scores[id]?.[h]).filter(s => s != null);
      return scores.length > 0 ? Math.min(...scores) : null;
    });
    const thru = holeScores.filter(s => s != null).length;
    const totalPar = state.pars.slice(0, thru).reduce((a, b) => a + b, 0);
    const totalScore = holeScores.slice(0, thru).reduce((a, b) => a + (b || 0), 0);
    return {
      pairId: pair.id,
      playerIds,
      players,
      pairName: players.map(p => p.name).join(' & '),
      holeScores,
      thru,
      totalScore,
      toPar: thru > 0 ? totalScore - totalPar : 0,
    };
  }).sort((a, b) => a.toPar - b.toPar);
}

function computeScramble(state) {
  const pairs = Array.isArray(state.games?.scramble?.pairs) ? state.games.scramble.pairs : [];
  if (pairs.length === 0) return [];
  return pairs.map(pair => {
    const playerIds = Array.isArray(pair.playerIds) ? pair.playerIds : [];
    const players = playerIds.map(id => state.players.find(p => p.id === id)).filter(Boolean);
    // For scramble, any player's score counts as the team score (admin enters one score)
    const representativeId = playerIds[0];
    const holeScores = representativeId
      ? Array.from({ length: state.numHoles }, (_, h) => state.scores[representativeId]?.[h] ?? null)
      : Array(state.numHoles).fill(null);
    const thru = holeScores.filter(s => s != null).length;
    const totalPar = state.pars.slice(0, thru).reduce((a, b) => a + b, 0);
    const totalScore = holeScores.slice(0, thru).reduce((a, b) => a + (b || 0), 0);
    return {
      pairId: pair.id,
      playerIds,
      players,
      pairName: players.map(p => p.name).join(' & '),
      holeScores,
      thru,
      totalScore,
      toPar: thru > 0 ? totalScore - totalPar : 0,
    };
  }).sort((a, b) => a.toPar - b.toPar);
}

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
  const playerIds = Array.isArray(group.playerIds) ? group.playerIds : [];
  if (playerIds.length === 0) return 0;
  let completed = 0;
  for (let h = 0; h < numHoles; h++) {
    const allIn = playerIds.every(pid => scores[pid]?.[h] != null);
    if (allIn) completed++; else break;
  }
  return completed;
}
function computeGroupHoleProgress(group, scores, pars, numHoles, betWinnersByHole, scoreUpdatedAt) {
  const playerIds = Array.isArray(group.playerIds) ? group.playerIds : [];
  const holes = [];
  for (let h = 0; h < numHoles; h++) {
    const par = (Array.isArray(pars) ? pars[h] : null) ?? 4;
    const playerScores = playerIds.map(pid => scores[pid]?.[h]).filter(s => s != null);
    const completed = playerIds.length > 0 && playerScores.length === playerIds.length;
    const hasBirdieOrBetter = playerScores.some(s => s - par <= -1);
    const winnersHere = (betWinnersByHole && betWinnersByHole[h]) || [];
    const winnerPlayerId = playerIds.find(pid => winnersHere.includes(pid)) || null;
    const completedAt = completed ? (Math.max(0, ...playerIds.map(pid => (scoreUpdatedAt || {})[`${pid}-${h}`] || 0)) || null) : null;
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
  const safeGroup = { ...group, playerIds: Array.isArray(group.playerIds) ? group.playerIds : [] };
  const numHoles = source.numHoles || 18;
  const scoreUpdatedAt = source.scoreUpdatedAt || {};
  const completedCount = computeGroupCompletedCount(safeGroup, source.scores || {}, numHoles);
  const holeProgress = computeGroupHoleProgress(safeGroup, source.scores || {}, Array.isArray(source.pars) ? source.pars : [], numHoles, betWinnersByHole, scoreUpdatedAt);
  const { status, currentHole, notStarted, finished } = computeGroupStatus(safeGroup, completedCount, numHoles, now);
  const effectiveCurrentHole = safeGroup.overrideCurrentHole != null ? safeGroup.overrideCurrentHole : currentHole;
  const pace = computeGroupPace(safeGroup, holeProgress, notStarted, finished, now);
  const stamps = safeGroup.playerIds.flatMap(pid => Array.from({ length: numHoles }, (_, h) => scoreUpdatedAt[`${pid}-${h}`] || 0));
  const lastUpdated = stamps.length > 0 ? (Math.max(0, ...stamps) || null) : null;
  return {
    ...safeGroup, completedHolesCount: completedCount, currentHole: effectiveCurrentHole, holeProgress,
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
  const pm = state.games?.parimutuel || { enabled: false, resolved: false, tickets: [], lockAfterHole: 0 };
  if (pm.marketType === 'flights') return (Array.isArray(state.flights) ? state.flights : []).map(f => ({ id: f.id, name: f.name, color: f.color }));
  return state.players.map(p => ({ id: p.id, name: p.name, color: p.color }));
}
function computeParimutuel(state) {
  const pm = state.games?.parimutuel || {}, entrants = parimutuelEntrants(state), tickets = Array.isArray(pm.tickets) ? pm.tickets : [];
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
  const enrichedEntrants = entrants.map(e => ({ ...e, tickets: ticketCount[e.id] || 0, odds: ticketCount[e.id] > 0 && totalTickets > 0 ? Math.round((totalTickets / ticketCount[e.id]) - 1) : 0 }));
  return { entrants: enrichedEntrants, ticketCount, spendByBettor, totalTickets, pot, suggestedId, payoutNet, winnerId: pm.winnerId };
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
  return (Array.isArray(matchplay.results) ? matchplay.results : []).map(m => {
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
  const g = state.games?.wolf; if (!g?.enabled || state.players.length < 3) return [];
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
    participants: bettorIds, fakeMoneyStake: (pmData?.pot ?? 0), scoringMethod: 'pool', settlementMethod: 'manual',
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
  const pm = state.games?.parimutuel || { enabled: false, resolved: false, tickets: [], lockAfterHole: 0 };
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
  return <button onClick={onClick} disabled={disabled} style={{ background: disabled ? C.turfBorder : C.gold, color: C.pineDark, fontFamily: 'Oswald, sans-serif', fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase', border: 'none', borderRadius: 12, padding: '11px 16px', fontSize: 14, cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.6 : 1, boxShadow: disabled ? 'none' : `0 3px 0 rgba(0,0,0,0.4)`, ...style }}>{children}</button>;
}
function GhostButton({ children, onClick, style }) {
  return <button onClick={onClick} style={{ background: 'transparent', color: C.ivory, border: `1px solid ${C.turfBorder}`, borderRadius: 10, padding: '9px 14px', fontSize: 13, fontFamily: 'Inter, sans-serif', cursor: 'pointer', ...style }}>{children}</button>;
}
const rowCard = { background: C.turf, border: 'none', borderRadius: 14, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, color: C.ivory, boxShadow: C.shadow };
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
      {open && <div style={{ padding: 14, background: C.pine, color: C.ivory }}>{children}</div>}
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
function NavBtn({ icon: Icon, label, active, onClick, hero, badge }) {
  return (
    <button onClick={onClick} style={{ background: hero && active ? C.emerald : 'transparent', border: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, color: active ? (hero ? '#FFFFFF' : C.emerald) : C.bunker, padding: hero ? '8px 14px' : '6px 4px', flex: hero ? 1.25 : 1, minWidth: 0, borderRadius: hero ? 14 : 0, position: 'relative' }}>
      {active && !hero && <span style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: 20, height: 3, borderRadius: 999, background: C.emerald }} />}
      <Icon size={hero ? 22 : 18} strokeWidth={active ? 2.5 : 1.8} />
      <span style={{ fontSize: 9, fontFamily: 'Oswald, sans-serif', letterSpacing: 0.2, textTransform: 'uppercase', fontWeight: active ? 700 : 500 }}>{label}</span>
      {badge && <span style={{ position: 'absolute', top: 2, right: 6, background: badge.startsWith('-') ? C.emerald : badge === 'E' ? C.bunker : C.flagRed, color: '#FFF', borderRadius: 999, fontSize: 8, padding: '1px 4px', fontFamily: 'Oswald, sans-serif', fontWeight: 700, minWidth: 14, textAlign: 'center' }}>{badge}</span>}
    </button>
  );
}

/* ============================== LANDING ============================== */
function BeerMug({ x, y, scale = 1, tilt = 0 }) {
  return (
    <g transform={`translate(${x}, ${y}) rotate(${tilt}) scale(${scale})`}>
      <path d="M-20 0 L-24 65 L24 65 L20 0 Z" fill="none" stroke="#111827" strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M20 10 Q44 10 44 33 Q44 56 20 56" fill="none" stroke="#111827" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M-22 0 Q-18 -12 -12 -7 Q-8 -20 -2 -10 Q2 -22 8 -11 Q12 -21 18 -8 Q22 -3 20 0 Z" fill="none" stroke="#111827" strokeWidth="2" strokeLinejoin="round" />
      <path d="M-22 0 Q-26 6 -25 14" fill="none" stroke="#111827" strokeWidth="2" strokeLinecap="round" />
      <ellipse cx="-25" cy="17" rx="3" ry="3.5" fill="none" stroke="#111827" strokeWidth="2" />
    </g>
  );
}

function GolfClub({ x, y, tilt = 0, type = 'iron' }) {
  return (
    <g transform={`translate(${x}, ${y}) rotate(${tilt})`}>
      <rect x="-2" y="0" width="4" height={type === 'driver' ? 160 : 145} rx="2" fill="none" stroke="#111827" strokeWidth="2.5" />
      {type === 'driver'
        ? <ellipse cx="0" cy="170" rx="20" ry="11" fill="none" stroke="#111827" strokeWidth="2.5" />
        : <rect x="-12" y="145" width="26" height="13" rx="3" fill="none" stroke="#111827" strokeWidth="2.5" />}
    </g>
  );
}

function GolfBall({ x, y, r = 18 }) {
  return (
    <g transform={`translate(${x}, ${y})`}>
      <circle cx="0" cy="0" r={r} fill="none" stroke="#111827" strokeWidth="2" />
      {[-r*0.4, 0, r*0.4].map((cy, i) =>
        <path key={i} d={`M${-Math.sqrt(Math.max(0,r*r-cy*cy))*0.85} ${cy} Q0 ${cy-r*0.15} ${Math.sqrt(Math.max(0,r*r-cy*cy))*0.85} ${cy}`} fill="none" stroke="#111827" strokeWidth="1" />
      )}
    </g>
  );
}

function Bird({ x, y, scale = 1 }) {
  return (
    <g transform={`translate(${x}, ${y}) scale(${scale})`}>
      <path d="M0 0 Q8 -7 16 0" fill="none" stroke="#111827" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M16 0 Q24 -7 32 0" fill="none" stroke="#111827" strokeWidth="1.8" strokeLinecap="round" />
    </g>
  );
}

function Collage() {
  return (
    <svg viewBox="0 0 390 700" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', opacity: 0.13 }} aria-hidden="true">
      <Bird x={18} y={48} scale={0.9} /><Bird x={72} y={28} scale={0.75} />
      <Bird x={260} y={38} scale={0.85} /><Bird x={330} y={55} scale={0.7} />
      <Bird x={150} y={22} scale={0.65} /><Bird x={40} y={590} scale={0.7} />
      <Bird x={290} y={610} scale={0.8} /><Bird x={180} y={635} scale={0.65} />
      <Bird x={100} y={340} scale={0.6} /><Bird x={310} y={320} scale={0.7} />
      <GolfBall x={78} y={235} r={22} /><GolfBall x={314} y={118} r={16} />
      <GolfBall x={196} y={545} r={20} /><GolfBall x={136} y={585} r={10} />
      <GolfBall x={268} y={570} r={9} /><GolfBall x={338} y={500} r={7} />
      <GolfBall x={48} y={420} r={13} /><GolfBall x={352} y={400} r={11} />
      <GolfBall x={200} y={130} r={8} /><GolfBall x={30} y={550} r={8} />
    </svg>
  );
}



function Landing({ onCreate, onJoin, onLoadDemo, myTournaments, onQuickJoin, deviceName, onOpenProfile, onSaveName, joinError, joinChecking }) {
  const [code, setCode] = useState('');
  const [localName, setLocalName] = useState(deviceName || '');
  const [codeFocused, setCodeFocused] = useState(false);
  const codeInputRef = useRef(null);
  const hasName = !!(deviceName && deviceName.trim());
  const doJoin = () => { if (code.trim()) onJoin(code.trim()); };

  return (
    <div style={{ height: '100dvh', position: 'relative', display: 'flex', flexDirection: 'column', overflow: 'hidden', fontFamily: 'Inter, sans-serif' }}>
      <FontLoader />
      {/* Layered background */}
      <div style={{ position: 'absolute', inset: 0, backgroundImage: 'url(/bg.png)', backgroundSize: 'cover', backgroundPosition: 'center 30%', backgroundRepeat: 'no-repeat' }} />
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(5,8,3,0.60) 0%, rgba(5,8,3,0.25) 35%, rgba(5,8,3,0.95) 80%)' }} />
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: 'linear-gradient(90deg, transparent, #C4900A 30%, #D4A000 70%, transparent)', zIndex: 1 }} />

      {/* Hero — top portion */}
      <div style={{ position: 'relative', zIndex: 1, flex: '0 0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', paddingTop: 'max(40px, 10vh)', paddingBottom: 20 }}>
        <div style={{ fontFamily: 'Anton, sans-serif', fontSize: 'clamp(42px, 12vw, 62px)', letterSpacing: 5, textTransform: 'uppercase', color: '#FFFFFF', lineHeight: 1, textShadow: '0 4px 24px rgba(0,0,0,0.5)', marginBottom: 10 }}>DuffBook</div>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(196,144,10,0.15)', border: '1px solid rgba(196,144,10,0.4)', borderRadius: 999, padding: '5px 16px', backdropFilter: 'blur(8px)' }}>
          <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#C4900A' }} />
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.85)', letterSpacing: 2, fontFamily: 'Oswald, sans-serif', textTransform: 'uppercase', fontWeight: 600 }}>Live Golf Scoring & Side Bets</span>
        </div>
      </div>

      {/* Action panel — bottom portion, always visible */}
      <div style={{ position: 'relative', zIndex: 1, flex: '0 0 auto', width: '100%', maxWidth: 430, margin: '0 auto', padding: '0 20px max(24px, env(safe-area-inset-bottom, 24px)) 20px', boxSizing: 'border-box' }}>

        {/* Name or welcome */}
        {!hasName ? (
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: 1.5, fontFamily: 'Oswald, sans-serif', marginBottom: 6 }}>Your name</div>
            <input
              value={localName}
              onChange={e => { setLocalName(e.target.value); if (e.target.value.trim()) onSaveName(e.target.value.trim()); }}
              placeholder="Enter your name to get started"
              data-testid="name-input"
              style={{ width: '100%', background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(16px)', border: '1.5px solid rgba(255,255,255,0.18)', borderRadius: 12, padding: '13px 16px', color: '#FFFFFF', fontSize: 16, outline: 'none', boxSizing: 'border-box' }}
            />
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>Welcome back, <span style={{ color: '#FFF', fontWeight: 700 }}>{deviceName}</span></div>
            <button onClick={onOpenProfile} style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.4)', fontSize: 12, cursor: 'pointer', padding: 0 }}>Not you?</button>
          </div>
        )}

        {/* Start button */}
        <button onClick={onCreate} data-testid="start-tournament-btn" style={{ width: '100%', padding: '16px 0', fontSize: 16, background: 'linear-gradient(135deg, #1a6b3c 0%, #C4900A 100%)', color: '#FFF', fontFamily: 'Oswald, sans-serif', fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', border: 'none', borderRadius: 14, cursor: 'pointer', marginBottom: 12, boxShadow: '0 5px 0 rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
          <span>⛳</span> Start a Tournament
        </button>

        {/* Divider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.12)' }} />
          <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', letterSpacing: 2, fontFamily: 'Oswald, sans-serif', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>or join with a code</span>
          <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.12)' }} />
        </div>

        {/* Join code row */}
        <div style={{ display: 'flex', gap: 8, marginBottom: joinError ? 8 : 12 }}>
          <input
            ref={codeInputRef}
            value={code}
            onChange={e => setCode(e.target.value.toUpperCase())}
            onFocus={() => setCodeFocused(true)}
            onBlur={() => setCodeFocused(false)}
            onKeyDown={e => { if (e.key === 'Enter') doJoin(); }}
            data-testid="join-code-input"
            placeholder="ROUND CODE"
            autoCapitalize="characters"
            style={{ flex: 1, background: codeFocused ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.08)', backdropFilter: 'blur(16px)', border: `1.5px solid ${joinError ? 'rgba(220,38,38,0.7)' : codeFocused ? 'rgba(196,144,10,0.7)' : 'rgba(255,255,255,0.15)'}`, borderRadius: 12, padding: '14px 12px', color: '#FFF', fontSize: 20, textAlign: 'center', letterSpacing: 5, outline: 'none', fontFamily: 'IBM Plex Mono, monospace', fontWeight: 700, boxSizing: 'border-box' }}
          />
          <button onClick={doJoin} data-testid="join-btn" disabled={joinChecking || !code.trim()} style={{ padding: '0 20px', background: code.trim() ? 'linear-gradient(135deg, #C4900A, #D4A000)' : 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 12, color: '#FFF', fontFamily: 'Oswald, sans-serif', fontWeight: 700, fontSize: 15, letterSpacing: 0.5, textTransform: 'uppercase', cursor: code.trim() ? 'pointer' : 'default', boxShadow: code.trim() ? '0 4px 0 rgba(0,0,0,0.25)' : 'none', opacity: joinChecking ? 0.7 : 1, whiteSpace: 'nowrap' }}>
            {joinChecking ? '...' : 'Join'}
          </button>
        </div>

        {joinError && (
          <div style={{ background: 'rgba(220,38,38,0.15)', border: '1px solid rgba(220,38,38,0.35)', borderRadius: 10, padding: '9px 14px', marginBottom: 10, fontSize: 12, color: '#FCA5A5', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>⚠</span> {joinError}
          </div>
        )}

        {/* Recent rounds — compact */}
        {myTournaments && myTournaments.length > 0 && (
          <div>
            <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: 2, fontFamily: 'Oswald, sans-serif', textAlign: 'center', marginBottom: 6 }}>Recent rounds</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {myTournaments.slice(0, 3).map((t, i) => (
                <button key={t.code} onClick={() => onQuickJoin(t.code)} style={{ display: 'flex', alignItems: 'center', gap: 10, background: i === 0 ? 'linear-gradient(135deg, rgba(26,107,60,0.45), rgba(196,144,10,0.35))' : 'rgba(255,255,255,0.06)', border: i === 0 ? '1px solid rgba(196,144,10,0.3)' : '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '9px 12px', cursor: 'pointer', textAlign: 'left', width: '100%' }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: i === 0 ? '#C4900A' : 'rgba(255,255,255,0.2)', flexShrink: 0 }} />
                  <span style={{ flex: 1, fontSize: 13, color: '#FFF', fontWeight: i === 0 ? 600 : 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.name}</span>
                  <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', letterSpacing: 1.5, fontFamily: 'IBM Plex Mono, monospace', flexShrink: 0 }}>{t.code}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Spacer to push action panel down from center */}
      <div style={{ flex: 1 }} />
    </div>
  );
}
function WhoAreYouScreen({ players, onPick, onAddSelf, onBack, deviceName }) {
  const [selected, setSelected] = useState(null);
  const [addingNew, setAddingNew] = useState(false);
  const [newName, setNewName] = useState(deviceName || '');
  const inputRef = useRef(null);

  useEffect(() => {
    if (addingNew && inputRef.current) inputRef.current.focus();
  }, [addingNew]);

  // Smart suggestion — closest name match
  const suggestion = deviceName ? players.find(p =>
    p.name.toLowerCase() === deviceName.toLowerCase() ||
    p.name.toLowerCase().includes(deviceName.toLowerCase().split(' ')[0].toLowerCase())
  ) : null;

  // Sort: suggestion first, then alphabetical
  const sorted = [...players].sort((a, b) => {
    if (suggestion && a.id === suggestion.id) return -1;
    if (suggestion && b.id === suggestion.id) return 1;
    return a.name.localeCompare(b.name);
  });

  if (selected && !addingNew) {
    return (
      <div data-testid="who-are-you-screen" style={{ height: '100dvh', background: `linear-gradient(160deg, ${C.pineDark} 0%, ${C.pine} 100%)`, color: C.ivory, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 28, fontFamily: 'Inter, sans-serif', overflow: 'hidden' }}>
        <FontLoader />
        <div style={{ width: 72, height: 72, borderRadius: 20, background: selected.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Anton, sans-serif', fontSize: 28, color: '#FFF', marginBottom: 18, boxShadow: `0 8px 24px ${selected.color}60` }}>{initials(selected.name)}</div>
        <div style={{ fontFamily: 'Anton, sans-serif', fontSize: 28, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6, textAlign: 'center' }}>{selected.name}</div>
        <div style={{ fontSize: 13, color: C.bunker, marginBottom: 32, textAlign: 'center' }}>Is this you?</div>
        <button data-testid="confirm-player-btn" onClick={() => onPick(selected.id)} style={{ width: '100%', maxWidth: 300, padding: '17px 0', background: `linear-gradient(135deg, ${C.emerald}, #004d2e)`, border: 'none', borderRadius: 14, color: '#FFF', fontFamily: 'Oswald, sans-serif', fontWeight: 700, fontSize: 17, textTransform: 'uppercase', letterSpacing: 0.5, cursor: 'pointer', marginBottom: 12, boxShadow: '0 4px 0 rgba(0,0,0,0.2)' }}>
          Yes, that's me
        </button>
        <button onClick={() => setSelected(null)} style={{ background: 'transparent', border: 'none', color: C.bunker, fontSize: 13, cursor: 'pointer', padding: '8px 0' }}>Not me — go back</button>
      </div>
    );
  }

  if (addingNew) {
    return (
      <div data-testid="who-are-you-screen" style={{ height: '100dvh', background: `linear-gradient(160deg, ${C.pineDark} 0%, ${C.pine} 100%)`, color: C.ivory, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 28, fontFamily: 'Inter, sans-serif', overflow: 'hidden' }}>
        <FontLoader />
        <div style={{ fontFamily: 'Anton, sans-serif', fontSize: 24, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6, textAlign: 'center' }}>Add yourself</div>
        <div style={{ fontSize: 13, color: C.bunker, marginBottom: 28, textAlign: 'center' }}>Enter your name to join</div>
        <input ref={inputRef} value={newName} onChange={e => setNewName(e.target.value)} placeholder="Your name" style={{ ...inputStyle, width: '100%', maxWidth: 300, textAlign: 'center', fontSize: 18, marginBottom: 14 }} />
        <button onClick={() => { if (newName.trim()) onAddSelf(newName.trim()); }} disabled={!newName.trim()} style={{ width: '100%', maxWidth: 300, padding: '16px 0', background: newName.trim() ? `linear-gradient(135deg, ${C.emerald}, #004d2e)` : C.turfBorder, border: 'none', borderRadius: 14, color: '#FFF', fontFamily: 'Oswald, sans-serif', fontWeight: 700, fontSize: 16, textTransform: 'uppercase', cursor: newName.trim() ? 'pointer' : 'default', marginBottom: 12, boxShadow: newName.trim() ? '0 4px 0 rgba(0,0,0,0.2)' : 'none' }}>
          Join the round
        </button>
        <button onClick={() => setAddingNew(false)} style={{ background: 'transparent', border: 'none', color: C.bunker, fontSize: 13, cursor: 'pointer', padding: '8px 0' }}>Back to player list</button>
      </div>
    );
  }

  return (
    <div data-testid="who-are-you-screen" style={{ height: '100dvh', background: `linear-gradient(160deg, ${C.pineDark} 0%, ${C.pine} 100%)`, color: C.ivory, display: 'flex', flexDirection: 'column', padding: 20, fontFamily: 'Inter, sans-serif', overflow: 'hidden' }}>
      <FontLoader />
      <button onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'transparent', border: 'none', color: C.ivoryDim, cursor: 'pointer', fontSize: 13, marginBottom: 20, alignSelf: 'flex-start', flexShrink: 0, padding: 0 }}><ChevronLeft size={16} /> Different code</button>
      <div style={{ fontFamily: 'Anton, sans-serif', fontSize: 26, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4, textAlign: 'center', flexShrink: 0 }}>Who are you?</div>
      <div style={{ color: C.bunker, fontSize: 13, marginBottom: 16, textAlign: 'center', flexShrink: 0 }}>Tap your name to join</div>

      {/* Smart suggestion banner */}
      {suggestion && (
        <button onClick={() => setSelected(suggestion)} style={{ display: 'flex', alignItems: 'center', gap: 12, background: `linear-gradient(135deg, ${C.emerald}18, ${C.gold}12)`, border: `1.5px solid ${C.emerald}40`, borderRadius: 14, padding: '12px 16px', cursor: 'pointer', marginBottom: 12, flexShrink: 0, width: '100%', textAlign: 'left' }}>
          <Chip color={suggestion.color} style={{ width: 38, height: 38, fontSize: 14, flexShrink: 0 }}>{initials(suggestion.name)}</Chip>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, color: C.emerald, fontFamily: 'Oswald, sans-serif', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 }}>Are you…</div>
            <div style={{ fontSize: 17, fontWeight: 700, color: C.ivory }}>{suggestion.name}</div>
          </div>
          <ChevronRight size={18} color={C.emerald} />
        </button>
      )}

      {/* 2-column player grid */}
      <div style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10, alignContent: 'start' }}>
        {sorted.filter(p => !suggestion || p.id !== suggestion.id).map(p => (
          <button key={p.id} data-testid={`player-pick-btn-${p.id}`} onClick={() => setSelected(p)} style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#FFFFFF', border: `1.5px solid ${C.turfBorder}`, borderRadius: 12, padding: '11px 12px', cursor: 'pointer', textAlign: 'left', boxShadow: '0 1px 6px rgba(0,0,0,0.07)' }}>
            <Chip color={p.color} style={{ width: 32, height: 32, fontSize: 12, flexShrink: 0 }}>{initials(p.name)}</Chip>
            <span style={{ fontSize: 13, fontWeight: 600, color: C.ivory, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
          </button>
        ))}
      </div>
      <button onClick={() => setAddingNew(true)} data-testid="not-on-list-btn" style={{ background: 'transparent', border: `1px dashed ${C.turfBorder}`, borderRadius: 12, padding: '12px 16px', color: C.bunker, fontSize: 13, cursor: 'pointer', textAlign: 'center', flexShrink: 0 }}>I'm not on the list</button>
    </div>
  );
}


function ScorecardTab({ state, h, par, tapPlus, tapMinus, tapCenter, clearScore, setNineHoleTotal, goHole, setHole, onOpenScan, isAdmin, whoami, onPick, onAddSelf, onSubmit, onUnlock }) {
  const submitted = whoami && Array.isArray(state.submittedPlayers) && state.submittedPlayers.includes(whoami.id);
  const val = whoami ? state.scores[whoami.id]?.[h] : null;
  const diff = val != null ? val - par : null;
  const displayVal = val != null ? val : par;
  const isDefault = val == null;
  const diffColor = diff == null ? C.bunker : diff < 0 ? C.emerald : diff > 0 ? C.flagRed : C.bunker;

  // Running total
  const allScores = whoami ? Array.from({ length: state.numHoles }, (_, i) => state.scores[whoami.id]?.[i]) : [];
  const scoredCount = allScores.filter(s => s != null).length;
  const runningGross = allScores.reduce((a, b) => a + (b || 0), 0);
  const runningPar = state.pars.slice(0, scoredCount).reduce((a, b) => a + b, 0);
  const runningDiff = runningGross - runningPar;
  const runningStr = scoredCount === 0 ? '' : runningDiff === 0 ? 'E' : runningDiff > 0 ? `+${runningDiff}` : `${runningDiff}`;
  const runningColor = runningDiff < 0 ? C.emerald : runningDiff > 0 ? C.flagRed : C.bunker;

  // Submission check
  const missingHoles = allScores.map((s, i) => s == null ? i + 1 : null).filter(Boolean);
  const allComplete = missingHoles.length === 0 && scoredCount === state.numHoles;
  const totalScore = allScores.reduce((a, b) => a + (b || 0), 0);
  const totalPar = state.pars.reduce((a, b) => a + b, 0);
  const totalDiff = totalScore - totalPar;
  const totalDiffStr = totalDiff === 0 ? 'E' : totalDiff > 0 ? `+${totalDiff}` : `${totalDiff}`;
  const isLastHole = h === state.numHoles - 1;
  const anyScored = val != null;

  // Handicap display
  const myHcp = whoami?.handicap ?? null;
  const myCourseHcp = courseHandicap(myHcp, state.courseSlope);

  // Gross/net totals
  const netTotal = myCourseHcp != null ? runningGross - myCourseHcp : null;

  // Hole strip — plain JSX element (not a nested component) to avoid remount-on-render issues
  const holeStripEl = (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(state.numHoles, 9)}, 1fr)`, gap: 4, marginBottom: 14 }}>
      {state.pars.map((_, i) => {
        const s = whoami ? state.scores[whoami.id]?.[i] : null;
        const d = s != null ? s - state.pars[i] : null;
        const isActive = i === h;
        const bg = isActive ? C.ivory : d != null ? (d < 0 ? C.emerald : d > 0 ? C.flagRed : '#9CA3AF') : C.pine;
        return (
          <button key={i} onClick={() => setHole(i)} style={{ height: 30, borderRadius: 7, background: bg, color: isActive ? C.pine : d != null ? '#FFF' : C.bunker, border: 'none', fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s', boxShadow: isActive ? '0 2px 6px rgba(0,0,0,0.2)' : 'none', transform: isActive ? 'scale(1.08)' : 'scale(1)' }}>{i + 1}</button>
        );
      })}
    </div>
  );

  // Submitted view
  if (submitted && whoami) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: 'calc(100dvh - 200px)' }}>
        <div style={{ background: C.emerald, borderRadius: 14, padding: '16px 20px', marginBottom: 14, textAlign: 'center' }}>
          <div style={{ fontFamily: 'Anton, sans-serif', fontSize: 20, color: '#FFFFFF', marginBottom: 4 }}>Scorecard Submitted ✓</div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.9)', marginBottom: 6 }}>Your final score: <strong>{totalDiffStr}</strong> ({totalScore})</div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)' }}>Results appear when the admin wraps up — you're done! 🍺</div>
        </div>
        {holeStripEl}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#FFFFFF', borderRadius: 18, boxShadow: C.shadow, padding: 28, marginBottom: 14, opacity: 0.8 }}>
          <div style={{ fontFamily: 'Oswald, sans-serif', fontSize: 13, textTransform: 'uppercase', letterSpacing: 1.5, color: C.bunker, marginBottom: 6 }}>Hole {h + 1} · Par {par}</div>
          <div style={{ fontFamily: 'Anton, sans-serif', fontSize: 80, lineHeight: 1, color: isDefault ? C.turfBorder : diffColor, marginBottom: 6 }}>{displayVal}</div>
          {!isDefault && <div style={{ fontFamily: 'Oswald, sans-serif', fontSize: 18, color: diffColor }}>{termForDiff(diff)}</div>}
        </div>
        <div style={{ textAlign: 'center', fontSize: 11, color: C.bunker }}>Scores locked · contact admin to edit</div>
      </div>
    );
  }

  // Player active view
  if (whoami && !isAdmin) {
    const myTotals = state.nineHoleTotals?.[whoami.id] || {};
    return (
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: 'calc(100dvh - 200px)' }} className="tab-content">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: C.ivory }}>{whoami.name}</div>
            {scoredCount > 0 && <div style={{ fontSize: 11, color: C.bunker }}>Gross {runningGross} · Net {netTotal != null ? netTotal : '—'}</div>}
          </div>
          {myHcp != null && (
            <div style={{ background: '#FFFFFF', border: `1.5px solid ${C.turfBorder}`, borderRadius: 12, padding: '6px 12px', textAlign: 'center', boxShadow: C.shadow }}>
              <div style={{ fontSize: 9, color: C.bunker, textTransform: 'uppercase', letterSpacing: 0.8 }}>HCP</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: C.emerald, lineHeight: 1.1 }}>{myHcp}</div>
              {myCourseHcp != null && <div style={{ fontSize: 9, color: C.bunker }}>course <strong style={{ color: C.ivory }}>{myCourseHcp}</strong></div>}
            </div>
          )}
        </div>
        {setNineHoleTotal && (
          <div style={{ background: C.pine, border: `1px dashed ${C.turfBorder}`, borderRadius: 12, padding: '10px 12px', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 11, color: C.bunker, flexShrink: 0 }}>Quick total (optional)</span>
            <input type="number" placeholder="Front 9" value={myTotals.front ?? ''} onChange={e => setNineHoleTotal(whoami.id, 'front', e.target.value)} style={{ ...inputStyle, flex: 1, padding: '6px 8px', fontSize: 12, textAlign: 'center' }} />
            <input type="number" placeholder="Back 9" value={myTotals.back ?? ''} onChange={e => setNineHoleTotal(whoami.id, 'back', e.target.value)} style={{ ...inputStyle, flex: 1, padding: '6px 8px', fontSize: 12, textAlign: 'center' }} />
          </div>
        )}
        {holeStripEl}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#FFFFFF', borderRadius: 20, boxShadow: C.shadowHero, padding: 28, marginBottom: 14, transition: 'background 0.3s' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginBottom: 8 }}>
            <div style={{ fontFamily: 'Oswald, sans-serif', fontSize: 13, textTransform: 'uppercase', letterSpacing: 1.5, color: C.bunker }}>Hole {h + 1} · Par {par}</div>
            {scoredCount > 0 && <div style={{ fontFamily: 'Oswald, sans-serif', fontSize: 13, color: runningColor, fontWeight: 700 }}>{runningStr} thru {scoredCount}</div>}
          </div>
          <button onClick={() => tapCenter(whoami.id, h)} style={{ fontFamily: 'Anton, sans-serif', fontSize: 96, lineHeight: 1, color: isDefault ? '#D1D5DB' : diffColor, background: 'transparent', border: 'none', cursor: 'pointer', padding: 0, marginBottom: 8, transition: 'color 0.2s' }} className={!isDefault ? 'score-animate' : ''}>{displayVal}</button>
          <div style={{ fontFamily: 'Oswald, sans-serif', fontSize: 16, color: C.bunker, marginBottom: 6 }}>Par {par}</div>
          {!isDefault && <div style={{ fontFamily: 'Oswald, sans-serif', fontSize: 20, color: diffColor, fontWeight: 700 }}>{termForDiff(diff)}</div>}
          {isDefault && <div style={{ fontSize: 12, color: '#D1D5DB' }}>tap score · use +/− to adjust</div>}
        </div>
        <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
          <button onClick={() => tapMinus(whoami.id, h)} style={{ flex: 1, height: 80, borderRadius: 16, background: '#FFFFFF', border: `2px solid ${C.turfBorder}`, color: C.ivory, fontSize: 36, fontWeight: 700, cursor: 'pointer', boxShadow: C.shadow, transition: 'transform 0.1s' }}>−</button>
          <button onClick={() => tapPlus(whoami.id, h)} style={{ flex: 1, height: 80, borderRadius: 16, background: C.ivory, border: 'none', color: '#FFF', fontSize: 36, fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 0 rgba(0,0,0,0.2)', transition: 'transform 0.1s' }}>+</button>
        </div>
        {anyScored && !isLastHole && (
          <button onClick={() => goHole(1)} style={{ width: '100%', background: `linear-gradient(135deg, ${C.emerald}, #004d2e)`, border: 'none', borderRadius: 14, padding: '16px 0', fontFamily: 'Oswald, sans-serif', fontWeight: 700, fontSize: 17, textTransform: 'uppercase', letterSpacing: 0.5, color: '#FFF', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: '0 4px 0 rgba(0,0,0,0.2)', marginBottom: 8 }}>Next Hole <ChevronRight size={20} /></button>
        )}
        {isLastHole && anyScored && allComplete && (
          <button onClick={() => onSubmit && onSubmit(whoami.id)} style={{ width: '100%', background: `linear-gradient(135deg, ${C.emerald}, #004d2e)`, border: 'none', borderRadius: 14, padding: '18px 0', fontFamily: 'Oswald, sans-serif', fontWeight: 700, fontSize: 17, textTransform: 'uppercase', letterSpacing: 0.5, color: '#FFF', cursor: 'pointer', boxShadow: '0 4px 0 rgba(0,0,0,0.2)', marginBottom: 8 }}>Submit Final Scorecard ✓</button>
        )}
        {isLastHole && anyScored && !allComplete && (
          <div style={{ background: '#FEF3C7', border: '1px solid #F59E0B', borderRadius: 12, padding: '12px 16px', marginBottom: 8 }}>
            <div style={{ fontFamily: 'Oswald, sans-serif', fontSize: 13, color: '#92400E', fontWeight: 700, marginBottom: 4 }}>Missing scores</div>
            <div style={{ fontSize: 12, color: '#92400E' }}>Holes {missingHoles.join(', ')} need a score before submitting.</div>
          </div>
        )}
        {!isDefault && <button onClick={() => clearScore(whoami.id, h)} style={{ background: 'transparent', border: 'none', color: C.turfBorder, fontSize: 12, cursor: 'pointer', padding: '6px 0', textAlign: 'center', width: '100%' }}>Clear score</button>}
      </div>
    );
  }

  // Admin multi-player view
  const visiblePlayers = isAdmin ? state.players : [];
  return (
    <div className="tab-content">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: C.turf, border: `1px solid ${C.turfBorder}`, borderRadius: 14, padding: '10px 8px', marginBottom: 12, boxShadow: C.shadow }}>
        <button onClick={() => goHole(-1)} style={{ background: 'transparent', border: 'none', color: C.ivory, cursor: 'pointer', padding: 6 }}><ChevronLeft size={22} /></button>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontFamily: 'Anton, sans-serif', fontSize: 32, lineHeight: 1, color: C.ivory }}>HOLE {h + 1}</div>
          <div style={{ fontSize: 12, color: C.gold, fontFamily: 'IBM Plex Mono, monospace' }}>PAR {par}</div>
        </div>
        <button onClick={() => goHole(1)} style={{ background: 'transparent', border: 'none', color: C.ivory, cursor: 'pointer', padding: 6 }}><ChevronRight size={22} /></button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(state.numHoles, 9)}, 1fr)`, gap: 5, marginBottom: 14 }}>
        {state.pars.map((_, i) => <button key={i} onClick={() => setHole(i)} style={{ height: 32, borderRadius: 8, background: i === h ? C.gold : 'transparent', color: i === h ? C.pineDark : C.ivoryDim, border: `1px solid ${i === h ? C.gold : C.turfBorder}`, fontFamily: 'IBM Plex Mono, monospace', fontSize: 13, cursor: 'pointer', fontWeight: i === h ? 700 : 400 }}>{i + 1}</button>)}
      </div>
      {!isAdmin && !whoami && <IdentityPicker state={state} onPick={onPick} onAddSelf={onAddSelf} />}
      {isAdmin && setNineHoleTotal && (
        <div style={{ background: C.pine, border: `1px dashed ${C.turfBorder}`, borderRadius: 12, padding: '10px 12px', marginBottom: 12 }}>
          <div style={{ fontSize: 11, color: C.bunker, marginBottom: 8 }}>Quick totals entry (front 9 / back 9 — for players who don't want hole-by-hole)</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 160, overflowY: 'auto' }}>
            {visiblePlayers.map(p => {
              const t = state.nineHoleTotals?.[p.id] || {};
              return (
                <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Chip color={p.color} style={{ width: 24, height: 24, fontSize: 9, flexShrink: 0 }}>{initials(p.name)}</Chip>
                  <span style={{ fontSize: 12, color: C.ivory, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
                  <input type="number" placeholder="F9" value={t.front ?? ''} onChange={e => setNineHoleTotal(p.id, 'front', e.target.value)} style={{ ...inputStyle, width: 52, padding: '4px 6px', fontSize: 12, textAlign: 'center' }} />
                  <input type="number" placeholder="B9" value={t.back ?? ''} onChange={e => setNineHoleTotal(p.id, 'back', e.target.value)} style={{ ...inputStyle, width: 52, padding: '4px 6px', fontSize: 12, textAlign: 'center' }} />
                </div>
              );
            })}
          </div>
        </div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
        {visiblePlayers.map(p => {
          const isSubmit = Array.isArray(state.submittedPlayers) && state.submittedPlayers.includes(p.id);
          const sv = state.scores[p.id]?.[h];
          const sd = sv != null ? sv - par : null;
          const sdisplay = sv != null ? sv : par;
          const sIsDefault = sv == null;
          return (
            <div key={p.id} style={{ background: '#FFFFFF', border: `1px solid ${isSubmit ? C.emerald : C.turfBorder}`, borderRadius: 12, padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 10, boxShadow: C.shadow }}>
              <Chip color={p.color}>{initials(p.name)}</Chip>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: C.ivory, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
                <div style={{ fontSize: 11, color: isSubmit ? C.emerald : sIsDefault ? C.bunker : sd < 0 ? C.emerald : C.bunker }}>{isSubmit ? '✓ Submitted' : sIsDefault ? 'tap to set' : termForDiff(sd)}</div>
              </div>
              <button onClick={() => tapMinus(p.id, h)} disabled={isSubmit} style={{ ...stepBtnStyle, opacity: isSubmit ? 0.35 : 1 }}><Minus size={16} /></button>
              <button onClick={() => tapCenter(p.id, h)} disabled={isSubmit} style={{ width: 50, height: 44, borderRadius: 10, background: sIsDefault ? C.pine : '#FFF', border: `2px solid ${sIsDefault ? C.turfBorder : sd < 0 ? C.emerald : sd > 0 ? C.flagRed : C.turfBorder}`, color: sIsDefault ? C.bunker : sd < 0 ? C.emerald : sd > 0 ? C.flagRed : C.ivory, fontFamily: 'IBM Plex Mono, monospace', fontSize: 20, fontWeight: 800, cursor: isSubmit ? 'default' : 'pointer', opacity: isSubmit ? 0.5 : 1 }}>{sdisplay}</button>
              <button onClick={() => tapPlus(p.id, h)} disabled={isSubmit} style={{ ...stepBtnStyle, opacity: isSubmit ? 0.35 : 1 }}><Plus size={16} /></button>
              {isSubmit && isAdmin && <button onClick={() => onUnlock && onUnlock(p.id)} style={{ background: 'transparent', border: 'none', color: C.gold, cursor: 'pointer', fontSize: 11 }}>Unlock</button>}
              {sv != null && !isSubmit && <button onClick={() => clearScore(p.id, h)} style={{ background: 'transparent', border: 'none', color: C.bunker, cursor: 'pointer' }}><X size={14} /></button>}
            </div>
          );
        })}
      </div>
      {visiblePlayers.some(p => state.scores[p.id]?.[h] != null) && h < state.numHoles - 1 && (
        <button onClick={() => goHole(1)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', background: C.gold, border: 'none', borderRadius: 12, padding: '13px 0', marginBottom: 12, cursor: 'pointer', fontFamily: 'Oswald, sans-serif', fontWeight: 700, fontSize: 15, textTransform: 'uppercase', color: '#FFF', boxShadow: '0 3px 0 rgba(0,0,0,0.15)' }}>Next Hole <ChevronRight size={18} /></button>
      )}
      <button onClick={onOpenScan} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', background: 'transparent', border: `1px dashed ${C.turfBorder}`, color: C.bunker, borderRadius: 12, padding: '10px 0', marginBottom: 16, cursor: 'pointer', fontSize: 13 }}><Camera size={16} /> Scan a paper scorecard instead</button>
      {visiblePlayers.length > 0 && <MiniCard players={visiblePlayers} state={state} />}
    </div>
  );
}


/* ============================== MISSING COMPONENTS ============================== */

function MiniCard({ players, state }) {
  const numHoles = state.numHoles || 18;
  const cols = Math.min(numHoles, 18);
  return (
    <div style={{ background: C.turf, border: `1px solid ${C.turfBorder}`, borderRadius: 12, padding: 10, overflowX: 'auto', boxShadow: C.shadow }}>
      <div style={{ fontFamily: 'Oswald, sans-serif', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, color: C.bunker, marginBottom: 6 }}>Mini scorecard</div>
      <div style={{ display: 'grid', gridTemplateColumns: `80px repeat(${cols}, minmax(26px,1fr))`, gap: 2, minWidth: cols * 28 + 80 }}>
        <div style={{ fontSize: 9, color: C.bunker, padding: '2px 4px' }}>Player</div>
        {Array.from({ length: cols }, (_, i) => (
          <div key={i} style={{ fontSize: 9, color: C.bunker, textAlign: 'center', padding: '2px 2px' }}>{i + 1}</div>
        ))}
        {players.map(p => {
          const totalScored = Array.from({ length: cols }, (_, i) => state.scores[p.id]?.[i]).filter(s => s != null);
          const total = totalScored.reduce((a, b) => a + b, 0);
          const par = state.pars.slice(0, totalScored.length).reduce((a, b) => a + b, 0);
          const diff = total - par;
          return (
            <React.Fragment key={p.id}>
              <div style={{ fontSize: 11, color: C.ivory, padding: '2px 4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 600 }}>{p.name}</div>
              {Array.from({ length: cols }, (_, i) => {
                const s = state.scores[p.id]?.[i];
                const d = s != null ? s - state.pars[i] : null;
                const bg = d == null ? 'transparent' : d < 0 ? C.emerald : d > 0 ? C.flagRed : '#9CA3AF';
                return <div key={i} style={{ fontSize: 11, textAlign: 'center', background: bg, color: d == null ? C.bunker : '#FFF', borderRadius: 3, padding: '2px 0', fontFamily: 'IBM Plex Mono, monospace', fontWeight: 700 }}>{s ?? ''}</div>;
              })}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}

function CustomBetsSection({ title, sub, list, computeFn, players, isAdmin, onOpenBuilder, onResolve, onReopen, onRemove, emptyAdmin, emptyPlayer }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <SectionHeader title={title} sub={sub} icon={Receipt} iconColor={C.gold} />
        {onOpenBuilder && <GoldButton onClick={onOpenBuilder} style={{ padding: '7px 12px', fontSize: 12, flexShrink: 0 }}>+ New bet</GoldButton>}
      </div>
      {(!list || list.length === 0) ? (
        <div style={{ ...rowCard, color: C.bunker, fontSize: 13 }}>{isAdmin ? emptyAdmin : emptyPlayer}</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {list.map(bet => {
            const result = computeFn ? computeFn(bet) : null;
            const participants = (bet.participantIds || []).map(id => players.find(p => p.id === id)).filter(Boolean);
            return (
              <div key={bet.id} style={{ ...rowCard, flexDirection: 'column', alignItems: 'stretch', gap: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ fontWeight: 600, fontSize: 14, color: C.ivory }}>{bet.name || bet.betName}</div>
                  {bet.resolved ? <span style={{ fontSize: 11, color: C.emerald, fontFamily: 'Oswald, sans-serif', textTransform: 'uppercase' }}>Resolved</span> : <span style={{ fontSize: 11, color: C.gold }}>Open</span>}
                </div>
                {participants.length > 0 && (
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    {participants.map(p => <Chip key={p.id} color={p.color} style={{ width: 22, height: 22, fontSize: 8 }}>{initials(p.name)}</Chip>)}
                  </div>
                )}
                {bet.entryAmount > 0 && <div style={{ fontSize: 12, color: C.bunker }}>${bet.entryAmount} per person</div>}
                {bet.resolved && bet.winnerIds && (
                  <div style={{ fontSize: 12, color: C.emerald }}>Winner{bet.winnerIds.length > 1 ? 's' : ''}: {bet.winnerIds.map(id => players.find(p => p.id === id)?.name).filter(Boolean).join(', ')}</div>
                )}
                {isAdmin && (
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
                    {!bet.resolved && onResolve && (
                      <button onClick={() => { const wids = window.prompt('Enter winner name(s), comma separated'); if (!wids) return; const ids = wids.split(',').map(n => players.find(p => p.name.toLowerCase().trim() === n.toLowerCase().trim())?.id).filter(Boolean); if (ids.length) onResolve(bet.id, ids); }} style={{ fontSize: 11, padding: '4px 10px', borderRadius: 7, background: C.emerald, border: 'none', color: '#FFF', cursor: 'pointer' }}>Resolve</button>
                    )}
                    {bet.resolved && onReopen && <button onClick={() => onReopen(bet.id)} style={{ fontSize: 11, padding: '4px 10px', borderRadius: 7, background: 'transparent', border: `1px solid ${C.turfBorder}`, color: C.bunker, cursor: 'pointer' }}>Reopen</button>}
                    {onRemove && <button onClick={() => onRemove(bet.id)} style={{ background: 'transparent', border: 'none', color: C.flagRed, cursor: 'pointer' }}><Trash2 size={14} /></button>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function GamesTab({ state }) {
  const g = state.games;
  const stats = computeStats(state);
  const scoreFn = holeScoreFn(state, false);
  const skins = g?.skins?.enabled ? computeSkins(state, holeScoreFn(state, g?.skins?.net ?? false)) : null;
  const nassau = g?.nassau?.enabled ? computeNassau(state, holeScoreFn(state, g?.nassau?.net ?? false)) : null;
  const stableford = g?.stableford?.enabled ? computeStableford(state, holeScoreFn(state, g?.stableford?.net ?? true)) : null;
  const matchplay = g?.matchplay?.enabled ? computeMatchplay(state) : null;
  const bestBall = g?.bestBall?.enabled ? computeBestBall(state) : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {skins && (
        <div>
          <SectionHeader title="Skins" sub={`$${g.skins?.value ?? 5} per hole · ${g.skins?.net ? 'net' : 'gross'}`} icon={Coins} iconColor={C.gold} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
            {skins.results.map(r => (
              <div key={r.hole} style={{ ...rowCard, justifyContent: 'space-between' }}>
                <span style={{ fontFamily: 'Oswald, sans-serif', color: C.bunker, fontSize: 13 }}>Hole {r.hole + 1}</span>
                <span style={{ fontSize: 13, color: r.status === 'push' ? C.bunker : C.ivory }}>{r.status === 'push' ? 'Push — carried' : r.status === 'pending' ? 'In progress' : `${state.players.find(p => p.id === r.winnerId)?.name || '?'} wins`}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      {nassau && (
        <div>
          <SectionHeader title="Nassau" sub={`$${g.nassau?.value ?? 10} per segment · ${g.nassau?.net ? 'net' : 'gross'}`} icon={Receipt} iconColor={C.gold} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
            {(Array.isArray(nassau?.segmentResults) ? nassau.segmentResults : []).map(seg => (
              <div key={seg.label} style={{ ...rowCard, justifyContent: 'space-between' }}>
                <span style={{ fontFamily: 'Oswald, sans-serif', fontSize: 13 }}>{seg.label}</span>
                <span style={{ fontSize: 13, color: C.ivory }}>{seg.status === 'pending' ? 'In progress' : seg.status === 'push' ? 'Push' : `${seg.totals?.[0]?.id ? state.players.find(p => p.id === seg.totals.find(t => t.toPar === Math.min(...seg.totals.map(t2 => t2.toPar)))?.id)?.name || '?' : '?'} leads`}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      {stableford && (
        <div>
          <SectionHeader title="Stableford" sub="points vs par" icon={Trophy} iconColor={C.gold} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
            {state.players.map(p => (
              <div key={p.id} style={{ ...rowCard, justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Chip color={p.color}>{initials(p.name)}</Chip><span style={{ fontSize: 13 }}>{p.name}</span></div>
                <span style={{ fontFamily: 'Anton, sans-serif', fontSize: 20, color: C.gold }}>{stableford?.totals?.[p.id]?.points ?? 0}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      {bestBall && bestBall.length > 0 && (
        <div>
          <SectionHeader title="Best Ball" sub="team scores" icon={Flag} iconColor={C.blue} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
            {bestBall.map((pair, i) => (
              <div key={pair.pairId} style={{ ...rowCard, justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontFamily: 'Oswald, sans-serif', color: C.bunker, width: 18 }}>{i + 1}</span>
                  {pair.players.map(p => <Chip key={p.id} color={p.color} style={{ width: 24, height: 24, fontSize: 9 }}>{initials(p.name)}</Chip>)}
                  <span style={{ fontSize: 13, color: C.ivory }}>{pair.pairName}</span>
                </div>
                <span style={{ fontFamily: 'Anton, sans-serif', fontSize: 20, color: pair.toPar < 0 ? C.emerald : pair.toPar > 0 ? C.flagRed : C.bunker }}>{pair.thru === 0 ? '—' : fmtToPar(pair.toPar)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      {matchplay && Array.isArray(matchplay.results) && matchplay.results.length > 0 && (
        <div>
          <SectionHeader title="Match Play" sub="hole by hole" icon={Swords} iconColor={C.blue} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
            {matchplay.results.map((m, i) => {
              const aNames = (Array.isArray(m.sideA) ? m.sideA : []).map(id => state.players.find(p => p.id === id)?.name).filter(Boolean).join(' & ');
              const bNames = (Array.isArray(m.sideB) ? m.sideB : []).map(id => state.players.find(p => p.id === id)?.name).filter(Boolean).join(' & ');
              return (
                <div key={i} style={{ ...rowCard, flexDirection: 'column', gap: 4 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 13, fontWeight: m.outcome === 'A' ? 700 : 400, color: m.outcome === 'B' ? C.bunker : C.ivory }}>{aNames}</span>
                    <span style={{ fontSize: 11, color: C.bunker }}>vs</span>
                    <span style={{ fontSize: 13, fontWeight: m.outcome === 'B' ? 700 : 400, color: m.outcome === 'A' ? C.bunker : C.ivory }}>{bNames}</span>
                  </div>
                  {m.holesPlayed > 0 && <div style={{ fontSize: 11, color: C.bunker, textAlign: 'center' }}>{describeMatch(m, state, m)}</div>}
                </div>
              );
            })}
          </div>
        </div>
      )}
      {!skins && !nassau && !stableford && !matchplay && !bestBall && (
        <div style={{ color: C.bunker, fontSize: 13, textAlign: 'center', marginTop: 20 }}>No games enabled for this round. Set them up in Round Settings.</div>
      )}
    </div>
  );
}

function LeaderboardTab({ state, stats }) {
  const useNet = state.handicapsEnabled && state.handicapMode !== 'none';
  const leaderboard = stats.slice().sort((a, b) => (useNet ? a.netToPar - b.netToPar : a.toPar - b.toPar));
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <SectionHeader title="Full Leaderboard" sub={`${stats.length} players · ${useNet ? 'net' : 'gross'} scores`} icon={Trophy} iconColor={C.gold} />
      {leaderboard.map((p, i) => {
        const score = useNet ? p.netToPar : p.toPar;
        const scoreStr = p.thru === 0 ? '–' : fmtToPar(score);
        const scoreColor = score < 0 ? C.emerald : score > 0 ? C.flagRed : C.bunker;
        return (
          <div key={p.id} style={{ ...rowCard, gap: 10 }}>
            <span style={{ fontFamily: 'Oswald, sans-serif', fontSize: 14, color: i === 0 && p.thru > 0 ? C.gold : C.bunker, width: 24, flexShrink: 0 }}>{i + 1}</span>
            <Chip color={p.color}>{initials(p.name)}</Chip>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: C.ivory, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
              <div style={{ fontSize: 11, color: C.bunker }}>Thru {p.thru}</div>
            </div>
            <span style={{ fontFamily: 'Anton, sans-serif', fontSize: 22, color: p.thru === 0 ? C.bunker : scoreColor }}>{scoreStr}</span>
          </div>
        );
      })}
      {leaderboard.length === 0 && <div style={{ color: C.bunker, fontSize: 13, textAlign: 'center', marginTop: 20 }}>No scores yet.</div>}
    </div>
  );
}

function ScrollingLeaderboard({ leaderboard, stats, useNet, onTap, fmtToPar }) {
  const ITEM_HEIGHT = 44;
  const VISIBLE = 5;
  const SCROLL_MS = 2200;
  const [offset, setOffset] = React.useState(0);
  const [paused, setPaused] = React.useState(false);
  const timerRef = React.useRef(null);
  const pauseRef = React.useRef(null);
  const total = leaderboard.length;
  const shouldScroll = total > VISIBLE;

  React.useEffect(() => {
    if (!shouldScroll || paused) return;
    timerRef.current = setInterval(() => setOffset(v => (v + 1) % total), SCROLL_MS);
    return () => clearInterval(timerRef.current);
  }, [shouldScroll, paused, total]);

  const handleTap = () => {
    if (!shouldScroll) return;
    clearInterval(timerRef.current);
    clearTimeout(pauseRef.current);
    setPaused(p => { if (!p) { pauseRef.current = setTimeout(() => setPaused(false), 5000); return true; } return false; });
  };

  const rows = shouldScroll ? [...leaderboard, ...leaderboard].slice(offset, offset + VISIBLE + 1) : leaderboard;

  return (
    <div onClick={e => { handleTap(); onTap && onTap(e); }} style={{ background: C.turf, border: 'none', borderRadius: 16, overflow: 'hidden', boxShadow: C.shadow, cursor: 'pointer' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px 8px', borderBottom: `1px solid ${C.turfBorder}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <IconBadge icon={Trophy} color={C.gold} size={26} />
          <div>
            <div style={{ fontFamily: 'Oswald, sans-serif', fontSize: 14, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: C.ivory }}>Leaderboard</div>
            <div style={{ fontSize: 10, color: C.bunker }}>this round · {paused ? 'tap to resume' : 'tap to pause'}</div>
          </div>
        </div>
        {shouldScroll && <div style={{ display: 'flex', gap: 2 }}>{[0,1,2].map(i => <div key={i} style={{ width: 3, height: paused ? 6 : 10, borderRadius: 999, background: paused ? C.bunker : C.gold, animation: paused ? 'none' : `scrollDot 1s ease-in-out ${i*0.2}s infinite alternate` }} />)}</div>}
      </div>
      <div style={{ padding: '0 0 0 0' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '22px 1fr 44px 50px', padding: '4px 14px', background: C.pineDark }}>
          {['#','Player','Thru','Score'].map(h => <div key={h} style={{ fontSize: 9, color: C.bunker, fontFamily: 'Oswald, sans-serif', letterSpacing: 0.5, textTransform: 'uppercase', textAlign: h === 'Score' ? 'right' : 'left' }}>{h}</div>)}
        </div>
        <div style={{ height: ITEM_HEIGHT * VISIBLE, overflow: 'hidden' }}>
          {rows.map((p, idx) => {
            const rank = leaderboard.findIndex(r => r.id === p.id) + 1;
            const score = useNet ? p.netToPar : p.toPar;
            const scoreStr = p.thru === 0 ? '–' : fmtToPar(score);
            const scoreColor = score < 0 ? C.emerald : score > 0 ? C.flagRed : C.bunker;
            return (
              <div key={`${p.id}-${idx}`} style={{ display: 'grid', gridTemplateColumns: '22px 1fr 44px 50px', padding: '0 14px', height: ITEM_HEIGHT, alignItems: 'center', borderBottom: `1px solid ${C.turfBorder}`, background: rank === 1 && p.thru > 0 ? C.goldLight : 'transparent' }}>
                <span style={{ fontFamily: 'Oswald, sans-serif', fontSize: 13, color: rank === 1 ? C.gold : C.bunker, fontWeight: rank === 1 ? 700 : 400 }}>{rank}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                  <Chip color={p.color} style={{ width: 26, height: 26, fontSize: 10, flexShrink: 0 }}>{initials(p.name)}</Chip>
                  <span style={{ fontSize: 13, fontWeight: rank === 1 ? 700 : 500, color: C.ivory, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
                </div>
                <div style={{ textAlign: 'center', fontSize: 12, color: C.bunker }}>{p.thru > 0 ? p.thru : '–'}</div>
                <div style={{ textAlign: 'right', fontFamily: 'Anton, sans-serif', fontSize: 18, color: p.thru === 0 ? C.bunker : scoreColor }}>{scoreStr}</div>
              </div>
            );
          })}
        </div>
      </div>
      <div style={{ padding: '6px 14px', borderTop: `1px solid ${C.turfBorder}`, display: 'flex', justifyContent: 'flex-end' }}>
        <span style={{ fontSize: 10, color: C.gold, fontWeight: 600 }}>Full board →</span>
      </div>
    </div>
  );
}

function BetsTab({ state, stats, isAdmin, whoami, viewAsAdmin, deviceName, onPick, onAddSelf, adjustTicket, resolveMarket, reopenMarket, onOpenBetBuilder, onResolveCustomBet, onReopenCustomBet, onRemoveCustomBet, tournamentCustomBets, onResolveTournamentBet, onReopenTournamentBet, onRemoveTournamentBet, onOpenTournamentBetBuilder, tournament }) {
  const pm = state.games?.parimutuel || { enabled: false, resolved: false, tickets: [], lockAfterHole: 0 };
  const matches = Array.isArray(state.games?.matchplay?.matches) ? state.games.matchplay.matches : [];
  const customBets = Array.isArray(state.customBets) ? state.customBets : [];
  const tBets = tournamentCustomBets || [];
  if (!pm.enabled && matches.length === 0 && customBets.length === 0 && tBets.length === 0 && !isAdmin) return <div style={{ color: C.ivoryDim, fontSize: 14, textAlign: 'center', marginTop: 40 }}>Nothing to bet on yet — ask the admin to turn on pari-mutuel betting or set up a bet in Round setup.</div>;
  const pmData = pm.enabled ? computeParimutuel(state) : null;
  const stats = computeStats(state);
  const bettingOpen = pm.enabled && !pm.resolved && !(Array.isArray(stats) ? stats : []).some(s => s.thru > (pm.lockAfterHole ?? 18));
  return (
    <div>
      {pm.enabled && pmData && (
        <div style={{ marginBottom: 22 }}>
          <SectionHeader title="Pari-mutuel" sub={pm.resolved ? 'Resolved' : bettingOpen ? `Open · $5/ticket · closes after hole ${pm.lockAfterHole}` : 'Betting closed'} icon={Ticket} iconColor={C.gold} />
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
            {pmData?.entrants?.map(e => (
              <div key={e.id} style={{ ...rowCard, flexDirection: 'column', alignItems: 'flex-start', flex: '1 1 120px', minWidth: 120 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}><Chip color={e.color}>{initials(e.name)}</Chip><span style={{ fontSize: 13, fontWeight: 600 }}>{e.name}</span></div>
                <div style={{ fontSize: 11, color: C.ivoryDim }}>{e.tickets ?? 0} ticket{(e.tickets ?? 0) !== 1 ? 's' : ''} · ${(e.tickets ?? 0) * 5}</div>
                {e.odds > 0 && <div style={{ fontSize: 11, color: C.gold }}>{e.odds}:1 odds</div>}
              </div>
            ))}
          </div>
          <div style={{ ...rowCard, justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 13, color: C.ivoryDim }}>Total pot</span>
            <span style={{ fontFamily: 'Anton, sans-serif', fontSize: 20, color: C.gold }}>${(pmData?.pot ?? 0)}</span>
          </div>
          {bettingOpen && (
            <div style={{ ...rowCard, flexDirection: 'column', alignItems: 'stretch', gap: 8 }}>
              <div style={{ fontSize: 12, color: C.ivoryDim }}>Your tickets · tap + to buy ($5 each)</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {pmData?.entrants?.map(e => {
                  const activeBettorId = whoami?.id || (viewAsAdmin ? tournament?.players?.find(p => p.name === deviceName)?.id : null);
                  const myTickets = activeBettorId ? (Array.isArray(pm.tickets) ? pm.tickets : []).filter(t => t.bettorId === activeBettorId && t.entrantId === e.id).reduce((sum, t) => sum + (t.count || 1), 0) : 0;
                  if (!activeBettorId) return <div key={e.id} style={{ fontSize: 12, color: C.bunker }}>Pick your name to buy tickets</div>;
                  return (
                    <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Chip color={e.color}>{initials(e.name)}</Chip>
                      <button onClick={() => adjustTicket(e.id, -1)} style={stepBtnStyle}><Minus size={14} /></button>
                      <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 14, minWidth: 20, textAlign: 'center' }}>{myTickets}</span>
                      <button onClick={() => adjustTicket(e.id, 1)} style={stepBtnStyle}><Plus size={14} /></button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          {pm.resolved && pmData?.winnerId && (
            <div style={{ ...rowCard, background: C.turfLight, gap: 8 }}>
              <Trophy size={16} color={C.goldBright} />
              <span style={{ fontSize: 13 }}>Winner: <strong>{state.players.find(p => p.id === pmData.winnerId)?.name}</strong> · payouts calculated in Settle</span>
            </div>
          )}
          {isAdmin && pm.enabled && !pm.resolved && (
            <div style={{ marginTop: 8 }}>
              <SectionHeader title="Admin: resolve market" sub={pmData?.suggestedId ? `Suggested winner: ${pmData?.entrants.find(e => e.id === pmData?.suggestedId)?.name}` : 'No clear leader yet'} />
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
                {pmData?.entrants?.map(e => (
                  <button key={e.id} onClick={() => resolveMarket(e.id)} style={{ display: 'flex', alignItems: 'center', gap: 6, background: C.pineDark, border: `1px solid ${C.turfBorder}`, borderRadius: 10, padding: '6px 10px', cursor: 'pointer' }}>
                    <Chip color={e.color}>{initials(e.name)}</Chip>
                    <span style={{ fontSize: 12 }}>{e.name} wins</span>
                  </button>
                ))}
              </div>
            </div>
          )}
          {isAdmin && pm.resolved && (
            <button onClick={reopenMarket} style={{ marginTop: 8, background: 'transparent', border: `1px solid ${C.turfBorder}`, color: C.ivoryDim, borderRadius: 10, padding: '6px 12px', fontSize: 12, cursor: 'pointer' }}>Reopen market</button>
          )}
          {pm.enabled && (
            <div style={{ marginTop: 12 }}>
              <SectionHeader title="Payouts" sub="wagered vs. won — a $0 net just means that bettor broke even" />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
                {pmData?.payouts?.map(row => (
                  <div key={row.id} style={{ ...rowCard, justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Chip color={row.color}>{initials(row.name)}</Chip><span style={{ fontSize: 13 }}>{row.name}</span></div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontFamily: 'Oswald, sans-serif', color: row.net > 0 ? C.goldBright : row.net < 0 ? C.flagRed : C.ivoryDim }}>{row.net >= 0 ? '+' : ''}{fmtMoney(row.net)}</div>
                      <div style={{ fontSize: 10, color: C.ivoryDim }}>wagered ${row.wagered}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
      {matches.length > 0 && (
        <div style={{ marginBottom: 22 }}>
          <SectionHeader title="Pairings" sub="who's playing whom this round" icon={Swords} iconColor={C.blue} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
            {matches.map((m, i) => {
              const aPlayers = (Array.isArray(m.sideA) ? m.sideA : []).map(id => state.players.find(p => p.id === id)).filter(Boolean);
              const bPlayers = (Array.isArray(m.sideB) ? m.sideB : []).map(id => state.players.find(p => p.id === id)).filter(Boolean);
              return (
                <div key={i} style={{ ...rowCard, justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', gap: 4 }}>{aPlayers.map(p => <Chip key={p.id} color={p.color}>{initials(p.name)}</Chip>)}</div>
                  <span style={{ fontSize: 11, color: C.ivoryDim }}>vs</span>
                  <div style={{ display: 'flex', gap: 4 }}>{bPlayers.map(p => <Chip key={p.id} color={p.color}>{initials(p.name)}</Chip>)}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}
      <CustomBetsSection
        title="Round bets" sub="side bets for this round only"
        list={customBets} computeFn={(cb) => computeCustomBet(cb, state)} onOpenBuilder={onOpenBetBuilder}
        players={tournament?.players || state.players} isAdmin={isAdmin}
        onResolve={onResolveCustomBet} onReopen={onReopenCustomBet} onRemove={onRemoveCustomBet}
        emptyAdmin='No custom bets yet — tap "+ New bet" to build one.' emptyPlayer="No custom bets yet."
      />
      {tournament && (
        <CustomBetsSection
          title="Tournament bets" sub="span every round of the trip" list={tBets}
          computeFn={(cb) => computeTournamentCustomBet(cb, tournament)} onOpenBuilder={onOpenTournamentBetBuilder}
          players={tournament.players} isAdmin={isAdmin}
          onResolve={onResolveTournamentBet} onReopen={onReopenTournamentBet} onRemove={onRemoveTournamentBet}
          emptyAdmin='No trip-wide bets yet — tap "+ New bet" to build one.' emptyPlayer="No trip-wide bets yet."
        />
      )}
    </div>
  );
}
function getNextStepLocal(phase, state, whoami, isAdmin) { return getNextStep(phase, state, whoami, isAdmin); }
function KoSBracketCard({ tournament, onOpen }) {
  const ks = tournament?.kingsOfSwing;
  if (!ks?.enabled) return null;
  const players = tournament.players;
  const currentRound = Array.isArray(ks.rounds) ? ks.rounds.find(r => r.matches.some(m => !m.winnerId && !m.isBye)) || ks.rounds[ks.rounds.length - 1] : null;
  const champion = ks.champion ? players.find(p => p.id === ks.champion) : null;
  return (
    <button onClick={onOpen} style={{ background: '#FFFFFF', border: 'none', borderRadius: 16, padding: '14px 14px 10px', boxShadow: C.shadow, width: '100%', textAlign: 'left', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <IconBadge icon={Trophy} color="#7C3AED" size={28} />
          <div>
            <div style={{ fontFamily: 'Oswald, sans-serif', fontSize: 14, fontWeight: 700, textTransform: 'uppercase', color: C.ivory }}>King of Swing</div>
            <div style={{ fontSize: 11, color: C.bunker }}>{champion ? `Champion: ${champion.name}` : currentRound ? currentRound.label : 'Bracket not started'}</div>
          </div>
        </div>
        <ChevronRight size={18} color={C.bunker} />
      </div>
      {currentRound && !champion && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          {currentRound.matches.filter(m => !m.isBye).slice(0, 3).map((m) => {
            const p1 = players.find(p => p.id === m.player1Id);
            const p2 = players.find(p => p.id === m.player2Id);
            if (!p1 && !p2) return null;
            return (
              <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 6, background: C.pineDark, borderRadius: 8, padding: '6px 10px' }}>
                <Chip color={p1?.color} style={{ width: 22, height: 22, fontSize: 8 }}>{initials(p1?.name||'?')}</Chip>
                <span style={{ fontSize: 12, fontWeight: m.winnerId === p1?.id ? 700 : 400, color: m.winnerId === p2?.id ? C.bunker : C.ivory, flex: 1 }}>{p1?.name||'TBD'}</span>
                <span style={{ fontSize: 10, color: C.bunker }}>vs</span>
                <span style={{ fontSize: 12, fontWeight: m.winnerId === p2?.id ? 700 : 400, color: m.winnerId === p1?.id ? C.bunker : C.ivory, flex: 1, textAlign: 'right' }}>{p2?.name||'TBD'}</span>
                <Chip color={p2?.color} style={{ width: 22, height: 22, fontSize: 8 }}>{initials(p2?.name||'?')}</Chip>
              </div>
            );
          })}
        </div>
      )}
    </button>
  );
}

function KoSModal({ tournament, updateTournament, onClose }) {
  const ks = tournament?.kingsOfSwing || { enabled: false, seededPlayers: [], rounds: [], champion: null };
  const players = tournament.players;
  const setKs = (updates) => updateTournament(prev => ({ ...prev, kingsOfSwing: { ...(prev.kingsOfSwing||{}), ...updates } }));
  const startBracket = () => {
    const seeded = Array.isArray(ks.seededPlayers) && ks.seededPlayers.length > 0 ? ks.seededPlayers : players.map(p => p.id);
    const seededObjs = seeded.map(id => players.find(p => p.id === id)).filter(Boolean);
    setKs({ rounds: generateBracket(seededObjs), seededPlayers: seeded });
  };
  const recordWinner = (roundIndex, matchIndex, winnerId) => {
    const newRounds = advanceBracket(Array.isArray(ks.rounds) ? ks.rounds : [], roundIndex, matchIndex, winnerId);
    const finalMatch = newRounds[newRounds.length - 1]?.matches[0];
    setKs({ rounds: newRounds, ...(finalMatch?.winnerId ? { champion: finalMatch.winnerId } : {}) });
  };
  const resetBracket = () => { if (window.confirm('Reset the entire bracket? All results will be lost.')) setKs({ rounds: [], champion: null, seededPlayers: [] }); };
  const champion = ks.champion ? players.find(p => p.id === ks.champion) : null;
  const rounds = Array.isArray(ks.rounds) ? ks.rounds : [];
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 60, display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
      <div style={{ background: C.pine, color: C.ivory, minHeight: '100vh', padding: 16, fontFamily: 'Inter, sans-serif', maxWidth: 600, margin: '0 auto', width: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div>
            <div style={{ fontFamily: 'Anton, sans-serif', fontSize: 24, textTransform: 'uppercase', letterSpacing: 0.5 }}>King of Swing</div>
            <div style={{ fontSize: 12, color: C.bunker }}>{players.length} players → {bracketSize(players.length)}-player bracket · {bracketSize(players.length) - players.length} byes</div>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: C.ivory, cursor: 'pointer' }}><X size={22} /></button>
        </div>
        {champion && (
          <div style={{ background: 'linear-gradient(135deg, #7C3AED, #4F46E5)', borderRadius: 16, padding: '20px 16px', textAlign: 'center', marginBottom: 16 }}>
            <div style={{ fontSize: 32 }}>👑</div>
            <div style={{ fontFamily: 'Anton, sans-serif', fontSize: 28, color: '#FFF', marginBottom: 4 }}>{champion.name}</div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)' }}>King of Swing Champion</div>
          </div>
        )}
        {!rounds.length ? (
          <div>
            <div style={{ background: C.turf, border: `1px solid ${C.turfBorder}`, borderRadius: 12, padding: 14, marginBottom: 12 }}>
              <div style={{ fontFamily: 'Oswald, sans-serif', fontSize: 12, textTransform: 'uppercase', letterSpacing: 1, color: C.bunker, marginBottom: 10 }}>Player seeding</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {players.map((p, i) => (
                  <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10, background: C.pineDark, borderRadius: 8, padding: '8px 12px' }}>
                    <span style={{ fontFamily: 'Oswald, sans-serif', fontSize: 13, color: C.bunker, width: 24 }}>#{i+1}</span>
                    <Chip color={p.color}>{initials(p.name)}</Chip>
                    <span style={{ fontSize: 14, color: C.ivory }}>{p.name}</span>
                  </div>
                ))}
              </div>
            </div>
            <GoldButton onClick={startBracket}>Generate Bracket</GoldButton>
          </div>
        ) : (
          <div>
            {rounds.map((round) => (
              <div key={round.roundIndex} style={{ marginBottom: 20 }}>
                <div style={{ fontFamily: 'Oswald, sans-serif', fontSize: 13, textTransform: 'uppercase', letterSpacing: 1, color: C.bunker, marginBottom: 8 }}>{round.label}</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {round.matches.map((match, mi) => {
                    const p1 = players.find(p => p.id === match.player1Id);
                    const p2 = players.find(p => p.id === match.player2Id);
                    if (match.isBye) return (
                      <div key={match.id} style={{ background: C.pineDark, borderRadius: 10, padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 8, opacity: 0.6 }}>
                        <Chip color={(p1||p2)?.color} style={{ width: 24, height: 24, fontSize: 9 }}>{initials((p1||p2)?.name||'?')}</Chip>
                        <span style={{ fontSize: 13, color: C.ivory }}>{(p1||p2)?.name||'TBD'}</span>
                        <span style={{ fontSize: 11, color: C.bunker, marginLeft: 'auto' }}>bye — advances</span>
                      </div>
                    );
                    return (
                      <div key={match.id} style={{ background: C.turf, border: `1px solid ${C.turfBorder}`, borderRadius: 10, overflow: 'hidden' }}>
                        {[{ player: p1, pid: match.player1Id }, { player: p2, pid: match.player2Id }].map(({ player, pid }, si) => (
                          <button key={si} onClick={() => !match.winnerId && pid && recordWinner(round.roundIndex, mi, pid)} style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', background: match.winnerId === pid ? C.emeraldLight : 'transparent', border: 'none', borderBottom: si === 0 ? `1px solid ${C.turfBorder}` : 'none', padding: '10px 12px', cursor: !match.winnerId && pid ? 'pointer' : 'default', textAlign: 'left' }}>
                            <Chip color={player?.color} style={{ width: 28, height: 28, fontSize: 10, flexShrink: 0 }}>{initials(player?.name||'?')}</Chip>
                            <span style={{ flex: 1, fontSize: 14, fontWeight: match.winnerId === pid ? 700 : 400, color: match.winnerId && match.winnerId !== pid ? C.bunker : C.ivory }}>{player?.name||(pid ? '?' : 'TBD')}</span>
                            {match.winnerId === pid && <Check size={16} color={C.emerald} />}
                            {!match.winnerId && pid && player && <span style={{ fontSize: 11, color: C.bunker }}>tap to advance →</span>}
                          </button>
                        ))}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
            <button onClick={resetBracket} style={{ background: 'transparent', border: `1px solid ${C.flagRed}`, color: C.flagRed, borderRadius: 10, padding: '10px 0', fontSize: 13, cursor: 'pointer', width: '100%', marginTop: 8 }}>Reset Bracket</button>
          </div>
        )}
      </div>
    </div>
  );
}

function HomeTab({ state, stats, isAdmin, whoami, setActiveTab, chat, ledger, onOpenMyPosition, phase, guidanceEnabled, onOpenChat, onOpenRoundComplete, tournament, onSwitchRound, onOpenRoundFlow, onOpenKoS }) {
  if (!state.started && state.players.length === 0) return (
    <div style={{ textAlign: 'center', marginTop: 60, fontSize: 14, padding: '0 20px' }}>
      <div data-testid="no-players-state" style={{ color: C.ivoryDim, marginBottom: 14 }}>{isAdmin ? 'Finish setup and start this round to see the dashboard.' : "The admin hasn't started this round yet."}</div>
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
  const skinsResults = g.skins?.enabled ? computeSkins(state, holeScoreFn(state, g.skins?.net)).results : [];
  const lastSkin = [...skinsResults].reverse().find(r => r.status === 'won');
  const lastChat = chat[chat.length - 1];
  const homeCard = { background: C.turf, border: `1.5px solid ${C.turfBorder}`, borderRadius: 14, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, boxShadow: '0 2px 8px rgba(0,0,0,0.10), 0 1px 0 rgba(0,0,0,0.04)', cursor: 'pointer', textAlign: 'left', width: '100%', boxSizing: 'border-box' };
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
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><IconBadge icon={Receipt} color={C.gold} size={28} /><span style={{ fontSize: 13, color: C.ivory }}>Your position {multiRound ? '(whole trip)' : ''}</span></div>
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {whoami?.handicap != null && (
            <div style={{ textAlign: 'center', background: C.pine, borderRadius: 10, padding: '4px 10px' }}>
              <div style={{ fontSize: 8, color: C.bunker, textTransform: 'uppercase', letterSpacing: 0.6 }}>HCP</div>
              <div style={{ fontSize: 14, fontWeight: 800, color: C.emerald, lineHeight: 1.1 }}>{whoami.handicap}</div>
              {courseHandicap(whoami.handicap, state.courseSlope) != null && <div style={{ fontSize: 8, color: C.bunker }}>CH {courseHandicap(whoami.handicap, state.courseSlope)}</div>}
            </div>
          )}
          {me && <div style={{ textAlign: 'right' }}><div style={{ fontSize: 11, color: C.ivoryDim, textTransform: 'uppercase' }}>You</div><div style={{ fontFamily: 'Anton, sans-serif', fontSize: 24, color: (useNet ? me.netToPar : me.toPar) < 0 ? C.flagRed : C.ivory }}>{me.thru === 0 ? '–' : fmtToPar(useNet ? me.netToPar : me.toPar)}</div></div>}
        </div>
      </div>

      {multiRound && (
        <button onClick={onSwitchRound} style={{ ...homeCard, justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><IconBadge icon={Calendar} color={C.blueBright} size={28} /><span style={{ fontSize: 12, color: C.ivoryDim }}>Round {tournament.rounds.findIndex(r => r.id === tournament.activeRoundId) + 1} of {tournament.rounds.length}</span></div>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: C.goldBright, fontSize: 12 }}>Switch round <ChevronsUpDown size={13} /></span>
        </button>
      )}

      <button onClick={onOpenRoundFlow} style={{ ...homeCard, justifyContent: 'space-between', color: C.ivory }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><IconBadge icon={Flag} color={C.blueBright} size={28} /><span style={{ fontSize: 13, color: C.ivory }}>Round Flow</span></div>
        <span style={{ fontSize: 11, color: C.bunker }}>where every group stands</span>
      </button>

      {ryderCup && (
        <button onClick={() => setActiveTab('games')} style={{ ...cardBtn, flexDirection: 'column', alignItems: 'stretch', background: '#FFFFFF', border: `1.5px solid ${C.turfBorder}`, borderRadius: 14, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
          <SectionHeader title="Ryder Cup" sub={ryderCup.target ? `first to ${ryderCup.target} wins the cup` : 'add match pairings to get started'} icon={Swords} iconColor={C.flagRed} />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14, padding: '4px 0 12px' }}>
            <div style={{ textAlign: 'center', flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 11, color: ryderCup.totalA > ryderCup.totalB ? C.gold : C.bunker, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ryderCup.teamA.name}</div>
              <div style={{ fontFamily: 'Anton, sans-serif', fontSize: 30, color: ryderCup.totalA > ryderCup.totalB ? C.gold : C.ivory }}>{ryderCup.totalA}</div>
              {tournament.ryderCup?.captainA && <div style={{ fontSize: 10, color: C.bunker }}>Capt. {tournament.players.find(p => p.id === tournament.ryderCup.captainA)?.name || ''}</div>}
            </div>
            <div style={{ fontSize: 16, color: C.ivoryDim }}>–</div>
            <div style={{ textAlign: 'center', flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 11, color: ryderCup.totalB > ryderCup.totalA ? C.gold : C.bunker, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ryderCup.teamB.name}</div>
              <div style={{ fontFamily: 'Anton, sans-serif', fontSize: 30, color: ryderCup.totalB > ryderCup.totalA ? C.gold : C.ivory }}>{ryderCup.totalB}</div>
              {tournament.ryderCup?.captainB && <div style={{ fontSize: 10, color: C.bunker }}>Capt. {tournament.players.find(p => p.id === tournament.ryderCup.captainB)?.name || ''}</div>}
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {ryderCup.rows.map(r => (
              <div key={r.roundId} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12, padding: '6px 0', borderTop: `1px solid ${C.turfBorder}` }}>
                <span style={{ color: C.bunker, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name}</span>
                <span style={{ fontFamily: 'Oswald, sans-serif', color: C.ivory }}>{r.matchCount > 0 ? `${r.aPts} – ${r.bPts}` : 'not set up'}</span>
              </div>
            ))}
          </div>
        </button>
      )}

      {emphasizeSettle && positionCard}

      {state.games?.bestBall?.enabled && (() => {
        const bbResults = computeBestBall(state);
        if (bbResults.length === 0) return null;
        return (
          <button onClick={() => setActiveTab('games')} style={{ ...homeCard, flexDirection: 'column', alignItems: 'stretch' }}>
            <SectionHeader title="Best Ball" sub="pair scores · tap for details" icon={Trophy} iconColor={C.blue} />
            {bbResults.map((pair, i) => {
              const diffStr = pair.thru === 0 ? '–' : fmtToPar(pair.toPar);
              const diffColor = pair.toPar < 0 ? C.emerald : pair.toPar > 0 ? C.flagRed : C.bunker;
              return (
                <div key={pair.pairId} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0', borderTop: i > 0 ? `1px solid ${C.turfBorder}` : 'none' }}>
                  <span style={{ fontSize: 12, color: C.bunker, width: 18 }}>{i + 1}</span>
                  <div style={{ display: 'flex', gap: 4 }}>
                    {pair.players.map(p => <Chip key={p.id} color={p.color} style={{ width: 24, height: 24, fontSize: 9 }}>{initials(p.name)}</Chip>)}
                  </div>
                  <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: C.ivory, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{pair.pairName}</span>
                  <span style={{ fontSize: 11, color: C.bunker }}>Thru {pair.thru}</span>
                  <span style={{ fontFamily: 'Anton, sans-serif', fontSize: 20, color: diffColor, lineHeight: 1 }}>{diffStr}</span>
                </div>
              );
            })}
          </button>
        );
      })()}
      {isAdmin && (() => {
        const totalPlayers = state.players.length;
        const donePlayers = stats.filter(s => s.thru >= state.numHoles).length;
        const mostDone = totalPlayers > 0 && donePlayers >= Math.ceil(totalPlayers * 0.75);
        if (!mostDone) return null;
        return (
          <button onClick={onOpenRoundComplete} style={{ ...homeCard, background: C.emerald, border: `1.5px solid ${C.emerald}`, justifyContent: 'space-between', boxShadow: `0 4px 0 rgba(0,0,0,0.15), 0 0 16px ${C.emerald}40` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <IconBadge icon={Check} color="#FFFFFF" size={28} />
              <div>
                <div style={{ fontFamily: 'Oswald, sans-serif', fontSize: 15, textTransform: 'uppercase', letterSpacing: 0.4, color: '#FFFFFF' }}>Finish Round</div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.8)' }}>{donePlayers} of {totalPlayers} players finished</div>
              </div>
            </div>
            <ChevronRight size={18} color="#FFFFFF" />
          </button>
        );
      })()}

      <KoSBracketCard tournament={tournament} onOpen={onOpenKoS} />

      <ScrollingLeaderboard
        leaderboard={leaderboard}
        stats={stats}
        useNet={useNet}
        fmtToPar={fmtToPar}
        onTap={() => setActiveTab('leaderboard')}
      />

      {multiRound && tournamentStandings.length > 0 && (
        <div style={{ ...cardBtn, cursor: 'default' }}>
          <SectionHeader title="Tournament standings" sub="cumulative across every started round" icon={Calendar} iconColor={C.blueBright} />
          {tournamentStandings.slice(0, 6).map((p, i) => <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0' }}><span style={{ width: 16, color: C.ivoryDim, fontSize: 12 }}>{i + 1}</span><Chip color={p.color}>{initials(p.name)}</Chip><span style={{ flex: 1, fontSize: 13, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span><span style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}><span style={{ fontFamily: 'Oswald, sans-serif', color: (useNet ? p.netToPar : p.toPar) < 0 ? C.flagRed : C.ivory }}>{p.roundsStarted === 0 ? '–' : fmtToPar(useNet ? p.netToPar : p.toPar)}</span>{useNet && p.roundsStarted > 0 && <span style={{ fontSize: 9, color: C.ivoryDim }}>{fmtToPar(p.toPar)} gross</span>}</span></div>)}
        </div>
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><IconBadge icon={Ticket} color={C.gold} size={28} /><span style={{ fontSize: 13, color: C.ivory }}>Pari-mutuel pot</span></div>
          <span style={{ fontFamily: 'Oswald, sans-serif', color: C.goldBright }}>${pm.pot}</span>
        </button>
      )}

      <button onClick={onOpenChat} style={{ ...homeCard, justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, flex: 1 }}>
          <IconBadge icon={MessageCircle} color={C.blueBright} size={28} />
          <div style={{ minWidth: 0, flex: 1 }}><div style={{ fontSize: 11, color: C.ivoryDim }}>Group chat</div><div style={{ fontSize: 13, color: C.ivory, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{lastChat ? `${lastChat.authorName}: ${lastChat.text}` : 'No messages yet'}</div></div>
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
      <div onClick={e => e.stopPropagation()} style={{ background: C.pine, color: C.ivory, borderTop: `1px solid ${C.turfBorder}`, borderRadius: '20px 20px 0 0', width: '100%', maxWidth: 720, height: '78vh', display: 'flex', flexDirection: 'column', padding: '16px 16px 12px', boxSizing: 'border-box' }}>
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
        <div onClick={e => e.stopPropagation()} style={{ background: '#FFFFFF', color: C.ivory, borderTop: `1px solid ${C.turfBorder}`, borderRadius: '20px 20px 0 0', width: '100%', maxWidth: 720, maxHeight: '85vh', overflowY: 'auto', padding: '18px 18px 28px' }}>
          <button onClick={() => setSelectedCourse(null)} style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'transparent', border: 'none', color: C.ivoryDim, cursor: 'pointer', fontSize: 12, marginBottom: 10 }}><ChevronLeft size={14} /> Back to results</button>
          <div style={{ fontFamily: 'Oswald, sans-serif', fontSize: 20, textTransform: 'uppercase', letterSpacing: 0.4 }}>{selectedCourse.courseName}</div>
          <div style={{ fontSize: 12, color: C.ivoryDim, marginBottom: 16 }}>{selectedCourse.address}, {selectedCourse.city}, {selectedCourse.state} · {selectedCourse.numberOfHoles} holes</div>
          <div style={{ fontSize: 11, color: C.ivoryDim, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>Pick your tees</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {selectedCourse.teeBoxes.map(tee => (
              <button key={tee.teeName} onClick={() => onSelect(selectedCourse, tee.teeName)} style={{ ...rowCard, justifyContent: 'space-between', width: '100%', textAlign: 'left', cursor: 'pointer' }}>
                <span style={{ fontSize: 14, fontWeight: 600, color: C.ivory }}>{tee.teeName}</span>
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
      <div onClick={e => e.stopPropagation()} style={{ background: '#FFFFFF', color: C.ivory, borderTop: `1px solid ${C.turfBorder}`, borderRadius: '20px 20px 0 0', width: '100%', maxWidth: 720, maxHeight: '85vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
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
          {mode === 'name' && <input value={nameQuery} onChange={e => setNameQuery(e.target.value)} placeholder="Course name" style={inputStyle} ref={el => el && setTimeout(() => el.focus(), 100)} />}
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
                    <div style={{ fontWeight: 600, fontSize: 14, color: C.ivory, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.courseName}</div>
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
      <div onClick={e => e.stopPropagation()} style={{ background: C.pine, color: C.ivory, borderTop: `1px solid ${C.turfBorder}`, borderRadius: '20px 20px 0 0', width: '100%', maxWidth: 720, maxHeight: '88vh', overflowY: 'auto', padding: '18px 18px 28px' }}>
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

function PlayersSection({ state, newPlayerName, setNewPlayerName, addPlayer, removePlayer, flights, onOpenImport, updateTournament, assignFlight, autoFlights }) {
  const hasPlayers = state.players.length >= 2;
  const flightsOn = flights && flights.length > 0;
  return (
    <Accordion title="Players & Teams" badge={state.players.length} defaultOpen>
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
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {flightsOn && flights.map(f => (
                  <button key={f.id} onClick={() => assignFlight(p.id, f.id)} style={{ fontSize: 11, padding: '4px 8px', borderRadius: 7, border: `1px solid ${p.flightId === f.id ? f.color : C.turfBorder}`, background: p.flightId === f.id ? f.color : 'transparent', color: p.flightId === f.id ? C.pineDark : C.ivoryDim, cursor: 'pointer' }}>{f.name}</button>
                ))}
                <button onClick={() => removePlayer(p.id)} style={{ background: 'transparent', border: 'none', color: C.flagRed, cursor: 'pointer' }}><Trash2 size={16} /></button>
              </div>
            </div>
          );
        })}
      </div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
        <input value={newPlayerName} onChange={e => setNewPlayerName(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') addPlayer(); }} placeholder="Add a player" style={{ ...inputStyle, flex: 1 }} />
        <button onClick={addPlayer} style={{ background: C.gold, border: 'none', borderRadius: 10, width: 44, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.pineDark, cursor: 'pointer' }}><UserPlus size={18} /></button>
      </div>
      <button onClick={onOpenImport} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, width: '100%', background: 'transparent', border: `1px dashed ${C.turfBorder}`, color: C.goldBright, borderRadius: 10, padding: '10px 0', cursor: 'pointer', fontSize: 12, marginBottom: 14 }}>
        <UserPlus size={14} /> Import roster from CSV or XLSX
      </button>

      {hasPlayers && updateTournament && (
        <div style={{ borderTop: `1px solid ${C.turfBorder}`, paddingTop: 12 }}>
          <ToggleRow label="Use teams / flights" sub="Assign players to Red vs Blue, USA vs Europe, etc." enabled={flightsOn} onToggle={() => updateTournament(p => ({ ...p, flights: p.flights.length ? [] : [{ id: 'f1', name: 'Red', color: FLIGHT_COLORS[0] }, { id: 'f2', name: 'Blue', color: FLIGHT_COLORS[1] }] }))} />
          {flightsOn && (
            <div style={{ marginTop: 8 }}>
              <div style={{ display: 'flex', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
                {flights.map(f => (
                  <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: 4, background: C.turf, border: `1px solid ${C.turfBorder}`, borderRadius: 999, padding: '4px 10px' }}>
                    <span style={{ width: 8, height: 8, borderRadius: 999, background: f.color }} />
                    <span style={{ fontSize: 12, color: C.ivory }}>{f.name}</span>
                  </div>
                ))}
              </div>
              <button onClick={autoFlights} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'transparent', border: `1px solid ${C.turfBorder}`, color: C.ivory, borderRadius: 10, padding: '8px 12px', fontSize: 12, cursor: 'pointer' }}><Shuffle size={14} /> Auto-balance by handicap</button>
              <div style={{ fontSize: 11, color: C.ivoryDim, marginTop: 8 }}>Tap a team name on each player above to assign them.</div>
            </div>
          )}
        </div>
      )}
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
function BestBallPairBuilder({ gameKey, state, updateRound }) {
  const pairs = Array.isArray(state.games[gameKey]?.pairs) ? state.games[gameKey].pairs : [];
  const allPairedIds = pairs.flatMap(p => p.playerIds || []);
  const unpairedPlayers = state.players.filter(p => !allPairedIds.includes(p.id));

  const addPair = () => {
    const newPair = { id: 'pair_' + Date.now(), playerIds: [] };
    updateRound(prev => ({ ...prev, games: { ...prev.games, [gameKey]: { ...prev.games[gameKey], pairs: [...pairs, newPair] } } }));
  };

  const removePair = (pairId) => {
    updateRound(prev => ({ ...prev, games: { ...prev.games, [gameKey]: { ...prev.games[gameKey], pairs: pairs.filter(p => p.id !== pairId) } } }));
  };

  const togglePlayer = (pairId, playerId) => {
    const newPairs = pairs.map(pair => {
      if (pair.id !== pairId) return pair;
      const ids = Array.isArray(pair.playerIds) ? pair.playerIds : [];
      return { ...pair, playerIds: ids.includes(playerId) ? ids.filter(id => id !== playerId) : [...ids, playerId] };
    });
    updateRound(prev => ({ ...prev, games: { ...prev.games, [gameKey]: { ...prev.games[gameKey], pairs: newPairs } } }));
  };

  return (
    <div style={{ marginLeft: 12, marginBottom: 12 }}>
      {pairs.map((pair, i) => (
        <div key={pair.id} style={{ background: C.pineDark, border: `1px solid ${C.turfBorder}`, borderRadius: 10, padding: 10, marginBottom: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: C.ivory }}>Pair {i + 1}</span>
            <button onClick={() => removePair(pair.id)} style={{ background: 'transparent', border: 'none', color: C.flagRed, cursor: 'pointer', fontSize: 11 }}>Remove</button>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {state.players.map(p => {
              const inThisPair = (pair.playerIds || []).includes(p.id);
              const inOtherPair = !inThisPair && allPairedIds.includes(p.id);
              return (
                <button key={p.id} onClick={() => !inOtherPair && togglePlayer(pair.id, p.id)} disabled={inOtherPair} style={{ display: 'flex', alignItems: 'center', gap: 5, background: inThisPair ? C.emerald : inOtherPair ? C.turfBorder : 'transparent', border: `1.5px solid ${inThisPair ? C.emerald : inOtherPair ? C.turfBorder : C.turfBorder}`, borderRadius: 8, padding: '5px 10px', cursor: inOtherPair ? 'default' : 'pointer', opacity: inOtherPair ? 0.4 : 1 }}>
                  <Chip color={p.color} style={{ width: 18, height: 18, fontSize: 7 }}>{initials(p.name)}</Chip>
                  <span style={{ fontSize: 12, color: inThisPair ? '#FFF' : C.ivory }}>{p.name}</span>
                  {inThisPair && <Check size={11} color="#FFF" />}
                </button>
              );
            })}
          </div>
        </div>
      ))}
      {unpairedPlayers.length > 0 && (
        <div style={{ fontSize: 11, color: C.bunker, marginBottom: 6 }}>
          Unpaired: {unpairedPlayers.map(p => p.name).join(', ')}
        </div>
      )}
      <button onClick={addPair} style={{ fontSize: 12, color: C.gold, background: 'transparent', border: `1px dashed ${C.gold}`, borderRadius: 8, padding: '6px 12px', cursor: 'pointer' }}>+ Add pair</button>
    </div>
  );
}

function WizardGroupsStep({ tournament, state, updateRound, goNext }) {
  const players = tournament.players;

  const makeGroups = (count) => Array.from({ length: count }, (_, i) => ({
    id: 'flow_g' + (i + 1) + '_' + Date.now(),
    groupNumber: i + 1,
    teeTime: null, startingHole: 1,
    playerIds: i === 0 ? players.map(p => p.id) : [],
    adminNotes: '', delayedMinutes: 0, overrideCurrentHole: null,
  }));

  const [groups, setGroups] = React.useState(() => {
    const existing = Array.isArray(state.flowGroups) && state.flowGroups.length > 0 ? state.flowGroups : null;
    if (existing) return existing;
    const numGroups = Math.max(1, Math.ceil(players.length / 4));
    return makeGroups(numGroups);
  });

  const [pickerOpen, setPickerOpen] = React.useState(null);

  const autoSplit = () => {
    const numGroups = Math.max(1, Math.ceil(players.length / 4));
    const newGroups = Array.from({ length: numGroups }, (_, i) => ({
      id: groups[i]?.id || ('flow_g' + (i + 1) + '_' + Date.now()),
      groupNumber: i + 1, teeTime: groups[i]?.teeTime || null,
      startingHole: groups[i]?.startingHole || 1, playerIds: [],
      adminNotes: '', delayedMinutes: 0, overrideCurrentHole: null,
    }));
    players.forEach((p, idx) => { newGroups[idx % numGroups].playerIds.push(p.id); });
    setGroups(newGroups);
  };

  const movePlayer = (playerId, toGroupId) => {
    setGroups(prev => prev.map(g => ({
      ...g,
      playerIds: g.id === toGroupId
        ? g.playerIds.includes(playerId) ? g.playerIds : [...g.playerIds, playerId]
        : g.playerIds.filter(id => id !== playerId),
    })));
    setPickerOpen(null);
  };

  const addGroup = () => setGroups(prev => [...prev, {
    id: 'flow_g' + (prev.length + 1) + '_' + Date.now(), groupNumber: prev.length + 1,
    teeTime: null, startingHole: 1, playerIds: [], adminNotes: '', delayedMinutes: 0, overrideCurrentHole: null,
  }]);

  const saveGroups = () => { updateRound(prev => ({ ...prev, flowGroups: groups })); goNext(); };
  const getPlayerGroup = (playerId) => groups.find(g => g.playerIds.includes(playerId));

  return (
    <div>
      {pickerOpen && (() => {
        const p = players.find(pl => pl.id === pickerOpen);
        const currentGroup = getPlayerGroup(pickerOpen);
        return (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 200, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }} onClick={() => setPickerOpen(null)}>
            <div onClick={e => e.stopPropagation()} style={{ background: C.turf, color: C.ivory, borderRadius: '16px 16px 0 0', width: '100%', maxWidth: 480, padding: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                <Chip color={p?.color}>{initials(p?.name || '')}</Chip>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15, color: C.ivory }}>{p?.name}</div>
                  <div style={{ fontSize: 12, color: C.bunker }}>currently in {currentGroup ? 'Group ' + currentGroup.groupNumber : 'no group'}</div>
                </div>
              </div>
              <div style={{ fontFamily: 'Oswald, sans-serif', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, color: C.bunker, marginBottom: 10 }}>Move to</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {groups.map(g => (
                  <button key={g.id} onClick={() => movePlayer(pickerOpen, g.id)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: g.id === currentGroup?.id ? C.pineDark : 'transparent', border: '1.5px solid ' + (g.id === currentGroup?.id ? C.gold : C.turfBorder), borderRadius: 10, padding: '11px 14px', cursor: 'pointer' }}>
                    <span style={{ fontWeight: 700, fontSize: 14, color: C.ivory }}>Group {g.groupNumber}</span>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <span style={{ fontSize: 11, color: C.bunker }}>{g.playerIds.length} players</span>
                      {g.id === currentGroup?.id && <span style={{ fontSize: 11, color: C.gold }}>current</span>}
                    </div>
                  </button>
                ))}
              </div>
              <button onClick={() => setPickerOpen(null)} style={{ marginTop: 14, width: '100%', background: 'transparent', border: 'none', color: C.bunker, fontSize: 13, cursor: 'pointer', padding: '8px 0' }}>Cancel</button>
            </div>
          </div>
        );
      })()}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div style={{ fontSize: 12, color: C.ivoryDim, lineHeight: 1.5, flex: 1 }}>Tap any player to assign them to a group.</div>
        <button onClick={autoSplit} style={{ background: C.pineDark, border: '1px solid ' + C.turfBorder, borderRadius: 8, padding: '6px 12px', fontSize: 12, color: C.ivory, cursor: 'pointer', flexShrink: 0, marginLeft: 10 }}>Auto-split</button>
      </div>

      {groups.map((g, gi) => (
        <div key={g.id} style={{ background: C.turf, border: '1px solid ' + C.turfBorder, borderRadius: 12, padding: 12, marginBottom: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <div style={{ fontFamily: 'Oswald, sans-serif', fontSize: 14, fontWeight: 700, color: C.ivory }}>Group {gi + 1} · {g.playerIds.length} players</div>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <input type="time" value={g.teeTime ? new Date(g.teeTime).toTimeString().slice(0,5) : ''} onChange={e => { const [h, m] = e.target.value.split(':'); const d = new Date(); d.setHours(parseInt(h)||0, parseInt(m)||0, 0, 0); setGroups(prev => prev.map(gr => gr.id === g.id ? { ...gr, teeTime: d.toISOString() } : gr)); }} style={{ ...inputStyle, fontSize: 11, padding: '4px 8px', width: 90 }} />
              <span style={{ fontSize: 11, color: C.ivoryDim }}>H</span>
              <input type="number" min={1} max={state.numHoles} value={g.startingHole || 1} onChange={e => setGroups(prev => prev.map(gr => gr.id === g.id ? { ...gr, startingHole: parseInt(e.target.value || '1') } : gr))} style={{ ...inputStyle, fontSize: 11, padding: '4px 6px', width: 46 }} />
            </div>
          </div>
          {g.playerIds.length === 0
            ? <div style={{ fontSize: 12, color: C.turfBorder, padding: '4px 0' }}>Empty</div>
            : <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {g.playerIds.map(id => {
                  const p = players.find(pl => pl.id === id);
                  if (!p) return null;
                  return (
                    <button key={id} onClick={() => setPickerOpen(id)} style={{ display: 'flex', alignItems: 'center', gap: 6, background: C.pineDark, border: '1px solid ' + C.turfBorder, borderRadius: 8, padding: '6px 12px', cursor: 'pointer', fontSize: 13, color: C.ivory }}>
                      <Chip color={p.color} style={{ width: 20, height: 20, fontSize: 8 }}>{initials(p.name)}</Chip>
                      {p.name}
                    </button>
                  );
                })}
              </div>
          }
        </div>
      ))}

      <button onClick={addGroup} style={{ width: '100%', background: 'transparent', border: '1px dashed ' + C.turfBorder, borderRadius: 10, padding: '10px 0', color: C.bunker, fontSize: 13, cursor: 'pointer', marginBottom: 14 }}>+ Add another group</button>
      <GoldButton onClick={saveGroups}>Save groups & continue</GoldButton>
      <GhostButton onClick={goNext} style={{ marginTop: 8, width: '100%', textAlign: 'center' }}>Skip — set up later in Round Flow</GhostButton>
    </div>
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
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>{(Array.isArray(state.games.matchplay?.matches) ? state.games.matchplay.matches : []).map(m => <div key={m.id} style={{ ...rowCard, justifyContent: 'space-between' }}><span style={{ fontSize: 13 }}>{sideNames(m.sideA, state)} vs {sideNames(m.sideB, state)}</span><button onClick={() => removeMatch(m.id)} style={{ background: 'transparent', border: 'none', color: C.flagRed, cursor: 'pointer' }}><Trash2 size={14} /></button></div>)}</div>
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
      <ToggleRow label="👑 King of Swing" sub="Single elimination bracket tournament — full round per match" enabled={tournament.kingsOfSwing?.enabled} onToggle={() => updateTournament(p => ({ ...p, kingsOfSwing: { ...(p.kingsOfSwing||{}), enabled: !p.kingsOfSwing?.enabled } }))} />
      {rc.enabled && (
        <div style={{ marginLeft: 28, marginBottom: 14 }}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
            <input value={rc.teamAName} onChange={e => setRyderCup('teamAName', e.target.value)} style={{ ...inputStyle, padding: '7px 10px', fontSize: 13 }} placeholder="Team A" />
            <input value={rc.teamBName} onChange={e => setRyderCup('teamBName', e.target.value)} style={{ ...inputStyle, padding: '7px 10px', fontSize: 13 }} placeholder="Team B" />
          </div>
          {tournament.players.length > 0 && (
            <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 10, color: C.ivoryDim, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 4 }}>{rc.teamAName} Captain</div>
                <select value={rc.captainA || ''} onChange={e => setRyderCup('captainA', e.target.value || null)} style={{ ...inputStyle, padding: '7px 8px', fontSize: 12 }}>
                  <option value="">— pick captain —</option>
                  {tournament.players.filter(p => !p.flightId || p.flightId === tournament.flights[0]?.id).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 10, color: C.ivoryDim, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 4 }}>{rc.teamBName} Captain</div>
                <select value={rc.captainB || ''} onChange={e => setRyderCup('captainB', e.target.value || null)} style={{ ...inputStyle, padding: '7px 8px', fontSize: 12 }}>
                  <option value="">— pick captain —</option>
                  {tournament.players.filter(p => !p.flightId || p.flightId === tournament.flights[1]?.id).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <span style={{ fontSize: 11, color: C.ivoryDim }}>Total players expected</span>
            <input type="number" min={2} value={rc.totalPlayers ?? ''} onChange={e => setRyderCup('totalPlayers', e.target.value ? parseInt(e.target.value, 10) : null)} style={{ ...inputStyle, width: 56, padding: '5px 8px' }} placeholder="e.g. 8" />
          </div>
          <div style={{ fontSize: 11, color: C.ivoryDim, lineHeight: 1.5 }}>
            {tournament.players.length} of {rc.totalPlayers || '?'} players added so far{rc.totalPlayers ? ` — aim for ${Math.round(rc.totalPlayers / 2)} per team` : ''} · {tournament.rounds.length} round{tournament.rounds.length !== 1 ? 's' : ''} planned. Build each round's pairings below in Match play — best-ball 2v2 for team sessions, 1v1 for singles.
          </div>
        </div>
      )}
      <ToggleRow label="Skins" sub="Lowest score on a hole wins the pot, ties carry over" enabled={g.skins?.enabled ?? false} onToggle={() => setGame('skins', 'enabled', !g.skins.enabled)} right={g.skins.enabled && <DollarInput value={g.skins.value} onChange={v => setGame('skins', 'value', v)} />} />
      {g.skins?.enabled && state.handicapsEnabled && <NetToggle value={g.skins.net} onChange={v => setGame('skins', 'net', v)} />}
      <ToggleRow label="Best Ball" sub="Each pair's lowest score per hole counts — set up pairs below" enabled={g.bestBall?.enabled} onToggle={() => setGame('bestBall', 'enabled', !g.bestBall?.enabled)} />
      {g.bestBall?.enabled && (
        <BestBallPairBuilder label="Best Ball" gameKey="bestBall" state={state} updateRound={updateRound} />
      )}
      <ToggleRow label="Scramble" sub="Team plays from the best ball each shot — one score per pair" enabled={g.scramble?.enabled} onToggle={() => setGame('scramble', 'enabled', !g.scramble?.enabled)} />
      {g.scramble?.enabled && (
        <BestBallPairBuilder label="Scramble" gameKey="scramble" state={state} updateRound={updateRound} />
      )}
      <ToggleRow label="Nassau" sub="Front 9 / back 9 / total — three separate bets" enabled={g.nassau?.enabled ?? false} onToggle={() => setGame('nassau', 'enabled', !g.nassau.enabled)} right={g.nassau.enabled && <DollarInput value={g.nassau.value} onChange={v => setGame('nassau', 'value', v)} />} />
      {g.nassau?.enabled && state.handicapsEnabled && <NetToggle value={g.nassau.net} onChange={v => setGame('nassau', 'net', v)} />}
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
      <div onClick={e => e.stopPropagation()} style={{ background: C.pine, color: C.ivory, borderTop: `1px solid ${C.turfBorder}`, borderRadius: '20px 20px 0 0', width: '100%', maxWidth: 720, maxHeight: '90vh', overflowY: 'auto', overflowX: 'hidden', padding: '18px 18px 28px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <div style={{ fontFamily: 'Oswald, sans-serif', fontSize: 20, textTransform: 'uppercase', letterSpacing: 0.4 }}>Tournament setup</div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: C.ivory, cursor: 'pointer' }}><X size={22} /></button>
        </div>
        <div style={{ display: 'flex', gap: 14, marginBottom: 10, flexWrap: 'wrap' }}>
          <button onClick={() => copy(roundCode, 'code')} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'transparent', border: 'none', color: C.ivoryDim, cursor: 'pointer', fontSize: 12 }}>Round code <strong style={{ color: C.goldBright, letterSpacing: 1 }}>{roundCode}</strong> <Copy size={13} /> {copied === 'code' && 'copied!'}</button>
          {tournament.adminPin && <button onClick={() => copy(tournament.adminPin, 'pin')} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'transparent', border: 'none', color: C.ivoryDim, cursor: 'pointer', fontSize: 12 }}>Admin PIN <strong style={{ color: C.goldBright, letterSpacing: 1 }}>{tournament.adminPin}</strong> <Copy size={13} /> {copied === 'pin' && 'copied!'}</button>}
        </div>
        <button onClick={onPreview} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'transparent', border: 'none', color: C.goldBright, cursor: 'pointer', fontSize: 12, textDecoration: 'underline', marginBottom: 16 }}>View the app from a player's perspective</button>

        <Field label="Tournament name"><input value={tournament.name} onChange={e => updateTournament(p => ({ ...p, name: e.target.value }))} style={inputStyle} placeholder="Name your tournament" /></Field>

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
        <Field label="Handicap mode">
          <select value={state.handicapMode || 'none'} onChange={e => updateRound(p => ({ ...p, handicapMode: e.target.value }))} style={inputStyle}>
            <option value="none">None — gross scores only</option>
            <option value="full">Full course handicap</option>
            <option value="low-man">Off low man — strokes vs lowest handicap in group</option>
          </select>
        </Field>
        <Field label="Match format">
          <select value={state.matchFormat || 'stroke-play'} onChange={e => updateRound(p => ({ ...p, matchFormat: e.target.value }))} style={inputStyle}>
            <option value="stroke-play">Stroke Play</option>
            <option value="best-ball">Best Ball</option>
            <option value="captain-choice">Captain's Choice (Scramble)</option>
            <option value="singles">Singles Match Play</option>
          </select>
        </Field>
        <PlayersSection state={state} newPlayerName={newPlayerName} setNewPlayerName={setNewPlayerName} addPlayer={addPlayer} removePlayer={removePlayer} flights={tournament.flights} onOpenImport={() => setImportOpen(true)} updateTournament={updateTournament} assignFlight={assignFlight} autoFlights={autoFlights} />
        <HandicapsFlightsSection state={state} updateTournament={updateTournament} setPlayerField={setPlayerField} autoFlights={autoFlights} addFlight={addFlight} renameFlight={renameFlight} removeFlight={removeFlight} assignFlight={assignFlight} />
        <GamesSection state={state} updateRound={updateRound} tournament={tournament} updateTournament={updateTournament} />
        <Accordion title="Round Roster" badge={state.roundPlayers?.length > 0 ? state.roundPlayers.length + ' overrides' : null}>
          <div style={{ fontSize: 12, color: C.ivoryDim, marginBottom: 10, lineHeight: 1.5 }}>By default this round uses the full tournament roster. Remove players here to exclude them from this round only.</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10 }}>
            {tournament.players.map(p => {
              const excluded = state.roundPlayers?.length > 0 && !state.roundPlayers.find(rp => rp.id === p.id);
              return (
                <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10, opacity: excluded ? 0.4 : 1 }}>
                  <Chip color={p.color}>{initials(p.name)}</Chip>
                  <span style={{ flex: 1, fontSize: 13, color: C.ivory }}>{p.name}</span>
                  <button onClick={() => {
                    const currentList = state.roundPlayers?.length > 0 ? state.roundPlayers : tournament.players;
                    if (excluded) {
                      updateRound(prev => ({ ...prev, roundPlayers: [...(prev.roundPlayers||[]), p] }));
                    } else {
                      const next = currentList.filter(rp => rp.id !== p.id);
                      updateRound(prev => ({ ...prev, roundPlayers: next.length === tournament.players.length ? [] : next }));
                    }
                  }} style={{ background: 'transparent', border: 'none', color: excluded ? C.emerald : C.flagRed, cursor: 'pointer', fontSize: 12, padding: '2px 6px' }}>
                    {excluded ? '+ Include' : '− Exclude'}
                  </button>
                </div>
              );
            })}
          </div>
          {state.roundPlayers?.length > 0 && (
            <GhostButton onClick={() => updateRound(prev => ({ ...prev, roundPlayers: [] }))}>Reset to full tournament roster</GhostButton>
          )}
        </Accordion>

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
function WizardShell({ step, total, onJump, onClose, onOpenSetup, children, title }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(5,9,17,0.78)', zIndex: 55, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: C.pine, color: C.ivory, border: `1px solid ${C.turfBorder}`, borderRadius: 20, width: '100%', maxWidth: 440, maxHeight: '85vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
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
        <button onClick={onOpenSetup || onClose} style={{ flexShrink: 0, background: 'transparent', border: 'none', borderTop: `1px solid ${C.turfBorder}`, color: C.ivoryDim, fontSize: 12, textDecoration: 'underline', cursor: 'pointer', padding: '10px 0' }}>Skip to full settings</button>
      </div>
    </div>
  );
}
function WizardNextButton({ onClick, disabled, label }) {
  return <GoldButton onClick={onClick} disabled={disabled} style={{ width: '100%', padding: '14px 0', fontSize: 15, marginTop: 18 }}>{label || 'Next'}</GoldButton>;
}

function SetupWizard({ tournament, state, updateTournament, updateRound, onClose, onOpenSetup, roundCode, selectProviderCourse, selectCustomCourse, setNumHoles, setPlayerField, autoFlights, setCourseField, startRound, isNewRound, onFinish }) {
  const baseSteps = isNewRound ? ['course', 'holes', 'games', 'review'] : ['basics', 'course', 'holes', 'players', 'groups', 'games', 'review'];
  const [step, setStep] = useState(0);
  const [newPlayerName, setNewPlayerName] = useState('');
  const [coursePickerOpen, setCoursePickerOpen] = useState(false);
  const [wizardImportOpen, setWizardImportOpen] = useState(false);
  const stepKey = baseSteps[step];
  const nameInputRef = useRef(null);
  const playerInputRef = useRef(null);

  useEffect(() => {
    const t = setTimeout(() => {
      if (stepKey === 'basics') nameInputRef.current?.focus();
      else if (stepKey === 'players') playerInputRef.current?.focus();
    }, 120);
    return () => clearTimeout(t);
  }, [stepKey]);
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
    <WizardShell step={step} total={baseSteps.length} onJump={setStep} onClose={onClose} onOpenSetup={onOpenSetup} title={
      { basics: 'The basics', course: 'Pick a course', holes: '9 or 18?', players: 'Who\u2019s playing?', games: 'What are we betting on?', review: 'Ready to go' }[stepKey]
    }>
      {stepKey === 'basics' && (
        <div>
          <Field label="Tournament name"><input ref={nameInputRef} value={tournament.name} onChange={e => updateTournament(p => ({ ...p, name: e.target.value }))} style={inputStyle} placeholder="Name your tournament" /></Field>
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
            <input ref={playerInputRef} value={newPlayerName} onChange={e => setNewPlayerName(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') addPlayerLocal(); }} placeholder="Add a player" style={{ ...inputStyle, flex: 1 }} />
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

      {stepKey === 'groups' && (
        <WizardGroupsStep tournament={tournament} state={state} updateRound={updateRound} goNext={goNext} />
      )}

      {stepKey === 'games' && (
        <div>
          <div style={{ fontSize: 12, color: C.ivoryDim, marginBottom: 14 }}>Select all the games for this round. You can adjust details in full settings after starting.</div>

          {!isNewRound && (() => {
            const rc = tournament.ryderCup || { enabled: false, teamAName: 'USA', teamBName: 'Europe', totalPlayers: null };
            const setRyderCup = makeSetRyderCup(updateTournament);
            const toggleRyderCup = () => {
              const next = !rc.enabled;
              setRyderCup('enabled', next);
              if (next) updateRound(p => ({ ...p, games: { ...p.games, matchplay: { ...p.games.matchplay, enabled: true } } }));
            };
            return (
              <div style={{ background: C.turf, border: `1px solid ${C.turfBorder}`, borderRadius: 12, padding: 12, marginBottom: 10 }}>
                <ToggleRow label="🏆 Ryder Cup" sub="Two teams, match play points across rounds" enabled={rc.enabled} onToggle={toggleRyderCup} />
                {rc.enabled && (
                  <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
                    <input value={rc.teamAName} onChange={e => setRyderCup('teamAName', e.target.value)} style={{ ...inputStyle, padding: '7px 10px', fontSize: 13, flex: 1 }} placeholder="Team A name" />
                    <input value={rc.teamBName} onChange={e => setRyderCup('teamBName', e.target.value)} style={{ ...inputStyle, padding: '7px 10px', fontSize: 13, flex: 1 }} placeholder="Team B name" />
                  </div>
                )}
              </div>
            );
          })()}

          {[
            { section: 'Individual', games: [
              { key: 'strokePlay', label: 'Stroke Play', sub: 'Everyone counts every shot — gross score wins' },
              { key: 'stableford', label: 'Stableford', sub: 'Points per hole based on score vs par' },
              { key: 'matchplay', label: 'Match Play', sub: 'Head-to-head, hole by hole' },
            ]},
            { section: 'Team', games: [
              { key: 'bestBall', label: 'Best Ball', sub: 'Lowest score among partners counts per hole' },
              { key: 'scramble', label: 'Scramble', sub: "All hit, team picks the best ball and everyone plays from there" },
            ]},
            { section: 'Side Bets', games: [
              { key: 'skins', label: 'Skins', sub: 'Win the hole outright to take the skin' },
              { key: 'nassau', label: 'Nassau', sub: 'Three bets: front 9, back 9, overall' },
              { key: 'wolf', label: 'Wolf', sub: 'Rotating lone wolf picks a partner or goes it alone' },
              { key: 'parimutuel', label: 'Pari-mutuel', sub: 'Pool bet — pick who wins, shared payout' },
            ]},
          ].map(({ section, games }) => (
            <div key={section} style={{ marginBottom: 14 }}>
              <div style={{ fontFamily: 'Oswald, sans-serif', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, color: C.bunker, marginBottom: 6 }}>{section}</div>
              <div style={{ background: C.turf, border: `1px solid ${C.turfBorder}`, borderRadius: 12, overflow: 'hidden' }}>
                {games.map(({ key, label, sub }, i) => {
                  const enabled = state.games[key]?.enabled ?? false;
                  return (
                    <button key={key} onClick={() => setGameEnabled(key, !enabled)} style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', background: 'transparent', border: 'none', borderBottom: i < games.length - 1 ? `1px solid ${C.turfBorder}` : 'none', padding: '12px 14px', cursor: 'pointer', textAlign: 'left' }}>
                      <div style={{ width: 22, height: 22, borderRadius: 6, background: enabled ? C.emerald : 'transparent', border: `2px solid ${enabled ? C.emerald : C.turfBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        {enabled && <Check size={14} color="#FFF" strokeWidth={3} />}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 600, color: C.ivory }}>{label}</div>
                        <div style={{ fontSize: 11, color: C.bunker, lineHeight: 1.4 }}>{sub}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
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
      <div onClick={e => e.stopPropagation()} style={{ background: C.pine, color: C.ivory, borderTop: `1px solid ${C.turfBorder}`, borderRadius: '20px 20px 0 0', width: '100%', maxWidth: 720, maxHeight: '80vh', overflowY: 'auto', padding: '18px 18px 28px' }}>
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
      <div onClick={e => e.stopPropagation()} style={{ background: C.pine, color: C.ivory, borderTop: `1px solid ${C.turfBorder}`, borderRadius: '20px 20px 0 0', width: '100%', maxWidth: 720, maxHeight: '85vh', overflowY: 'auto', overflowX: 'hidden', padding: '18px 18px 28px' }}>
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
      <div onClick={e => e.stopPropagation()} style={{ background: C.pine, color: C.ivory, border: `1px solid ${C.turfBorder}`, borderRadius: 16, padding: 20, width: '100%', maxWidth: 280 }}>
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
      <div onClick={e => e.stopPropagation()} style={{ background: C.pine, color: C.ivory, border: `1px solid ${C.turfBorder}`, borderRadius: 16, padding: 20, width: '100%', maxWidth: 300 }}>
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
      <div onClick={e => e.stopPropagation()} style={{ background: C.pine, color: C.ivory, borderTop: `1px solid ${C.turfBorder}`, borderRadius: '20px 20px 0 0', width: '100%', maxWidth: 720, padding: '18px 18px 28px' }}>
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
      <div onClick={e => e.stopPropagation()} style={{ background: C.pine, color: C.ivory, borderTop: `1px solid ${C.turfBorder}`, borderRadius: '20px 20px 0 0', width: '100%', maxWidth: 720, maxHeight: '88vh', overflowY: 'auto', overflowX: 'hidden', padding: '18px 18px 28px' }}>
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
const PACE_COLORS = { 'Ahead': C.emerald, 'On Pace': C.emerald, 'Slightly Behind': '#D98E2E', 'Slow': C.flagRed, 'Finished': C.ivoryDim, 'Not Started': C.ivoryDim };
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
    <div style={{ background: C.turf, border: `1.5px solid ${group.finished ? C.turfBorder : paceColor}`, borderRadius: 14, padding: 14, boxShadow: '0 2px 8px rgba(0,0,0,0.10)' }}>
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
      <div onClick={e => e.stopPropagation()} style={{ background: C.pine, color: C.ivory, border: `1px solid ${C.turfBorder}`, borderRadius: 16, padding: 20, width: '100%', maxWidth: 320 }}>
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
  const togglePlayer = (id, pid) => updateGroups(gs => gs.map(g => { if (g.id !== id) return g; const ids = Array.isArray(g.playerIds) ? g.playerIds : []; return { ...g, playerIds: ids.includes(pid) ? ids.filter(x => x !== pid) : [...ids, pid] }; }));
  const autoCreate = () => {
    const ids = tournament.players.map(p => p.id);
    const chunks = []; for (let i = 0; i < ids.length; i += 4) chunks.push(ids.slice(i, i + 4));
    const base = Date.now() + 10 * 60000;
    updateGroups(() => chunks.map((chunk, i) => ({ id: 'flow_' + Date.now() + '_' + i, groupNumber: i + 1, teeTime: new Date(base + i * 10 * 60000).toISOString(), startingHole: 1, playerIds: chunk, adminNotes: '', delayedMinutes: 0, overrideCurrentHole: null })));
  };
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(13,31,26,0.78)', zIndex: 50, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: C.pine, color: C.ivory, borderTop: `1px solid ${C.turfBorder}`, borderRadius: '20px 20px 0 0', width: '100%', maxWidth: 720, maxHeight: '88vh', overflowY: 'auto', padding: '18px 18px 28px' }}>
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
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 8 }}>
                <Field label="Tee time"><input type="datetime-local" value={g.teeTime ? new Date(g.teeTime).toISOString().slice(0, 16) : ''} onChange={e => setGroupField(g.id, 'teeTime', e.target.value ? new Date(e.target.value).toISOString() : null)} style={inputStyle} /></Field>
                <Field label="Starting hole"><input type="number" min={1} max={state.numHoles} value={g.startingHole} onChange={e => setGroupField(g.id, 'startingHole', parseInt(e.target.value || '1', 10))} style={{ ...inputStyle, width: 80 }} /></Field>
              </div>
              <div style={{ fontSize: 11, color: C.ivoryDim, marginBottom: 6 }}>Players</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {tournament.players.map(p => <button key={p.id} onClick={() => togglePlayer(g.id, p.id)} style={{ fontSize: 12, padding: '6px 10px', borderRadius: 8, border: `1px solid ${Array.isArray(g.playerIds) && g.playerIds.includes(p.id) ? C.gold : C.turfBorder}`, background: Array.isArray(g.playerIds) && g.playerIds.includes(p.id) ? C.gold : 'transparent', color: Array.isArray(g.playerIds) && g.playerIds.includes(p.id) ? C.pineDark : C.ivory, cursor: 'pointer' }}>{p.name}</button>)}
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
  const myGroup = whoami ? groupsFlow.find(g => Array.isArray(g.playerIds) && g.playerIds.includes(whoami.id)) : null;

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
    <div style={{ position: 'fixed', inset: 0, background: C.pine, color: C.ivory, zIndex: 48, display: 'flex', flexDirection: 'column' }}>
      <div style={{ flexShrink: 0, background: C.pineDark, color: C.ivory, borderBottom: `1px solid ${C.turfBorder}`, padding: '14px 16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: C.ivory, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 2, fontSize: 13, padding: 0 }}><ChevronLeft size={20} /> Back</button>
            <div>
              <div style={{ fontFamily: 'Anton, sans-serif', fontSize: 22, textTransform: 'uppercase', letterSpacing: 0.5 }}>Round Flow</div>
              <div style={{ fontSize: 11, color: C.ivoryDim }}>{state.roundName}{usingMock ? ' · showing example data' : ''}</div>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: C.ivory, cursor: 'pointer' }}><X size={20} /></button>
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
        <div onClick={e => e.stopPropagation()} style={{ background: C.pine, color: C.ivory, borderTop: `1px solid ${C.turfBorder}`, borderRadius: '20px 20px 0 0', width: '100%', maxWidth: 720, padding: '18px 18px 28px' }}>
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
      <div onClick={e => e.stopPropagation()} style={{ background: C.pine, color: C.ivory, borderTop: `1px solid ${C.turfBorder}`, borderRadius: '20px 20px 0 0', width: '100%', maxWidth: 720, maxHeight: '88vh', overflowY: 'auto', overflowX: 'hidden', padding: '18px 18px 28px' }}>
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
      <div onClick={e => e.stopPropagation()} style={{ background: C.pine, color: C.ivory, border: `1px solid ${C.turfBorder}`, borderRadius: 20, width: '100%', maxWidth: 480, maxHeight: '88vh', overflowY: 'auto', padding: 22, textAlign: 'center' }}>
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
      * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
      html, body { overflow: hidden; position: fixed; width: 100%; height: 100%; }
      @supports not (height: 100dvh) { .app-root { height: -webkit-fill-available !important; } }
      button { transition: transform 0.1s ease, box-shadow 0.1s ease, opacity 0.1s ease; }
      button:active { transform: scale(0.96) !important; }
      @keyframes scoreSlideIn { from { opacity:0; transform:translateY(-8px) scale(0.92); } to { opacity:1; transform:translateY(0) scale(1); } }
      @keyframes scoreFlashGreen { 0%,100%{background:transparent} 30%{background:rgba(0,92,56,0.12)} }
      @keyframes scoreFlashRed { 0%,100%{background:transparent} 30%{background:rgba(196,30,58,0.10)} }
      @keyframes tabSlide { from{opacity:0;transform:translateX(18px)} to{opacity:1;transform:translateX(0)} }
      @keyframes cardFadeUp { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
      @keyframes btnPulse { 0%,100%{box-shadow:0 4px 0 rgba(0,0,0,0.2)} 50%{box-shadow:0 4px 16px rgba(196,144,10,0.5)} }
      @keyframes countdownBar { from{width:100%} to{width:0%} }
      @keyframes shimmerPremium { 0%{background-position:-400px 0} 100%{background-position:400px 0} }
      .tab-content { animation: tabSlide 0.22s ease both; }
      .card-appear { animation: cardFadeUp 0.28s ease both; }
      .score-animate { animation: scoreSlideIn 0.18s cubic-bezier(0.34,1.56,0.64,1) both; }
      input::-webkit-outer-spin-button, input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
      input[type=number] { -moz-appearance: textfield; }
      input, select, textarea { font-size: 16px !important; }
      button:focus-visible, input:focus-visible { outline: 2px solid ${C.goldBright}; outline-offset: 1px; }
      button { transition: transform 0.08s ease; }
      button:active { transform: scale(0.96); }
      @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.35; } }
      @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      .spin { animation: spin 1s linear infinite; }
      @keyframes birdFly {
        0%   { transform: translateX(-120px) translateY(0px); opacity: 0; }
        8%   { opacity: 1; }
        92%  { opacity: 1; }
        100% { transform: translateX(115vw) translateY(-20px); opacity: 0; }
      }
      @keyframes birdFlap { 0%,100% { transform: scaleY(1); } 50% { transform: scaleY(0.45); } }
      @keyframes birdieLabel {
        0%   { opacity: 0; transform: scale(0.6); }
        12%  { opacity: 1; transform: scale(1.08); }
        85%  { opacity: 1; transform: scale(1); }
        100% { opacity: 0; transform: scale(0.9); }
      }
      @keyframes scrollDot { from { opacity: 0.3; transform: scaleY(0.5); } to { opacity: 1; transform: scaleY(1); } }
      @keyframes birdieFlash { 0% { opacity: 1; } 100% { opacity: 0; } }
      .bird-fly { animation: birdFly 5s ease-in-out forwards; }
      .bird-flap { animation: birdFlap 0.32s ease-in-out infinite; }
      .birdie-label { animation: birdieLabel 4.8s ease-out forwards; }
      @media (prefers-reduced-motion: reduce) { * { animation: none !important; transition: none !important; } }
    `}</style>
  );
}

function QRShareModal({ roundCode, tournamentName, onClose }) {
  const url = `https://duffbook.vercel.app?code=${roundCode}`;
  const canvasRef = useRef(null);
  const [copied, setCopied] = useState(false);
  const [qrReady, setQrReady] = useState(false);

  useEffect(() => {
    // Load QRCode library from CDN then render
    if (window.QRCode) { renderQR(); return; }
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js';
    script.onload = renderQR;
    document.head.appendChild(script);
  }, []);

  const renderQR = () => {
    if (!canvasRef.current || !window.QRCode) return;
    canvasRef.current.innerHTML = '';
    new window.QRCode(canvasRef.current, {
      text: url,
      width: 240,
      height: 240,
      colorDark: '#111827',
      colorLight: '#FFFFFF',
      correctLevel: window.QRCode.CorrectLevel.H,
    });
    setQrReady(true);
  };

  const copyLink = () => {
    navigator.clipboard?.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const shareLink = () => {
    if (navigator.share) {
      navigator.share({ title: `Join ${tournamentName} on DuffBook`, text: `Scan or tap to join: ${url}`, url });
    } else {
      copyLink();
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 80, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#FFFFFF', borderRadius: 20, padding: 28, maxWidth: 320, width: '100%', textAlign: 'center', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
        <div style={{ fontFamily: 'Anton, sans-serif', fontSize: 20, textTransform: 'uppercase', letterSpacing: 0.5, color: C.ivory, marginBottom: 4 }}>Join {tournamentName}</div>
        <div style={{ fontSize: 12, color: C.bunker, marginBottom: 20 }}>Scan to join · or share the link below</div>

        {/* QR Code */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
          <div style={{ background: '#FFFFFF', padding: 12, borderRadius: 12, border: `1px solid ${C.turfBorder}`, display: 'inline-block' }}>
            <div ref={canvasRef} style={{ width: 240, height: 240 }} />
            {!qrReady && <div style={{ width: 240, height: 240, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.bunker, fontSize: 13 }}>Loading QR…</div>}
          </div>
        </div>

        {/* Round code badge */}
        <div style={{ background: C.pineDark, borderRadius: 10, padding: '10px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 10, color: C.bunker, textTransform: 'uppercase', letterSpacing: 0.8 }}>Round code</div>
            <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 24, fontWeight: 700, color: C.ivory, letterSpacing: 4 }}>{roundCode}</div>
          </div>
          <button onClick={copyLink} style={{ background: copied ? C.emerald : C.turf, border: `1px solid ${copied ? C.emerald : C.turfBorder}`, borderRadius: 8, padding: '6px 12px', fontSize: 12, color: copied ? '#FFF' : C.ivory, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, transition: 'all 0.2s' }}>
            {copied ? <><Check size={13} /> Copied</> : <><Copy size={13} /> Copy code</>}
          </button>
        </div>

        {/* Share buttons */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <button onClick={shareLink} style={{ flex: 1, background: `linear-gradient(135deg, #00874A, ${C.gold})`, border: 'none', borderRadius: 12, padding: '13px 0', color: '#FFF', fontFamily: 'Oswald, sans-serif', fontWeight: 700, fontSize: 15, letterSpacing: 0.5, textTransform: 'uppercase', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <Share2 size={16} /> Share link
          </button>
          <button onClick={copyLink} style={{ flex: 1, background: C.turf, border: `1.5px solid ${C.turfBorder}`, borderRadius: 12, padding: '13px 0', color: C.ivory, fontFamily: 'Oswald, sans-serif', fontWeight: 700, fontSize: 15, letterSpacing: 0.5, textTransform: 'uppercase', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <Copy size={16} /> {copied ? 'Copied!' : 'Copy link'}
          </button>
        </div>

        <div style={{ fontSize: 11, color: C.bunker, marginBottom: 16, lineHeight: 1.5 }}>
          Players scan the QR or tap the link to land directly in your round — no code typing needed.
        </div>

        <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: C.bunker, fontSize: 13, cursor: 'pointer', padding: '4px 0' }}>Close</button>
      </div>
    </div>
  );
}

function BirdieAnimation({ events, players }) {
  if (!events || events.length === 0) return null;
  return (
    <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 199, overflow: 'hidden' }}>
      {/* Screen flash */}
      <div style={{ position: 'absolute', inset: 0, background: events[0]?.diff <= -2 ? 'rgba(220,50,50,0.18)' : 'rgba(0,117,74,0.15)', animation: 'birdieFlash 0.6s ease-out forwards' }} />
      {events.map((ev, idx) => {
        const player = players.find(p => p.id === ev.playerId);
        const isEagle = ev.diff <= -2;
        const label = isEagle ? '🦅  Eagle!' : '🐦  Birdie!';
        const yPos = 28 + (idx % 3) * 18;
        const delay = idx * 0.4;
        return (
          <div key={ev.id} style={{ position: 'absolute', left: 0, top: `${yPos}%`, animationDelay: `${delay}s` }} className="bird-fly">
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '0 24px' }}>
              <span style={{ fontSize: isEagle ? 56 : 48, lineHeight: 1 }} className="bird-flap">{isEagle ? '🦅' : '🐦'}</span>
              <div className="birdie-label" style={{ background: isEagle ? C.flagRed : C.emerald, color: '#FFFFFF', borderRadius: 16, padding: '10px 20px', fontFamily: 'Anton, sans-serif', fontSize: 22, letterSpacing: 1, whiteSpace: 'nowrap', boxShadow: `0 4px 20px ${isEagle ? C.flagRed : C.emerald}80` }}>
                {player?.name && <div style={{ fontSize: 13, fontFamily: 'Oswald, sans-serif', opacity: 0.9, marginBottom: 2 }}>{player.name}</div>}
                {label}
              </div>
            </div>
          </div>
        );
      })}
    </div>
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
function useSwipeNav(activeTab, setActiveTab, goHoleRef) {
  const startRef = useRef(null);
  const onTouchStart = (e) => { const t = e.touches[0]; startRef.current = { x: t.clientX, y: t.clientY }; };
  const onTouchEnd = (e) => {
    if (!startRef.current) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - startRef.current.x, dy = t.clientY - startRef.current.y;
    startRef.current = null;
    if (Math.abs(dx) < 70 || Math.abs(dx) < Math.abs(dy) * 1.4) return;
    if (activeTab === 'card') {
      if (dx < 0) goHoleRef.current?.(1); else goHoleRef.current?.(-1);
      return;
    }
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
      <div onClick={e => e.stopPropagation()} style={{ background: C.pine, color: C.ivory, borderTop: `1px solid ${C.turfBorder}`, borderRadius: '20px 20px 0 0', width: '100%', maxWidth: 720, maxHeight: '90vh', overflowY: 'auto', overflowX: 'hidden', padding: '18px 18px 28px' }}>
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
          <div style={{ fontSize: 11, color: C.ivoryDim, marginTop: 4, lineHeight: 1.5 }}>
            {betType === 'headtohead' && 'Two players, head-to-head — lowest score wins the pot.'}
            {betType === 'grouplow' && 'Whole group plays — lowest round score takes the money.'}
            {betType === 'closest' && 'Par 3 only — closest tee shot to the pin wins.'}
            {betType === 'longest' && 'Designated hole — longest drive in the fairway wins.'}
            {betType === 'birdiepot' && 'Pot grows with every bogey, pays out for every birdie or better.'}
            {betType === 'custom' && 'Fully custom — you name the bet, you declare the winner.'}
            {' '}{cfg.auto ? 'Auto-settles from scorecards.' : 'Admin declares winner manually.'}
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
  const [roundCode, setRoundCode] = useState(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const urlCode = params.get('code');
      if (urlCode) {
        // Clean the URL without reloading
        window.history.replaceState({}, '', window.location.pathname);
        return urlCode.toUpperCase();
      }
    } catch (e) {}
    return null;
  });
  const [joinError, setJoinError] = useState(null);
  const [joinChecking, setJoinChecking] = useState(false);
  const [initChecked, setInitChecked] = useState(false);
  const [tournament, setTournament] = useState(defaultTournament());
  const [chat, setChat] = useState([]);
  const [whoamiId, setWhoamiId] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [activeTab, setActiveTabRaw] = useState('home');
  const setActiveTab = (tab) => {
    setActiveTabRaw(tab);
    if (tab === 'card' && !isAdmin) setShowTips(prev => prev === false ? 'show' : prev);
  };
  const [viewHole, setViewHole] = useState(0);
  const [setupOpen, setSetupOpen] = useState(false);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardIsNewRound, setWizardIsNewRound] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [scanOpen, setScanOpen] = useState(false);
  const [becomeAdminOpen, setBecomeAdminOpen] = useState(false);
  const [betBuilderOpen, setBetBuilderOpen] = useState(false);
  const [kosOpen, setKosOpen] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);
  const [autoAdvanceTimer, setAutoAdvanceTimer] = useState(null);
  const autoAdvanceRef = useRef(null);

  const triggerAutoAdvance = () => {
    clearTimeout(autoAdvanceRef.current);
    setAutoAdvanceTimer(100);
    let pct = 100;
    const step = () => {
      pct -= 2;
      setAutoAdvanceTimer(pct);
      if (pct <= 0) {
        goHoleRef.current && goHoleRef.current(1);
        setAutoAdvanceTimer(null);
      } else {
        autoAdvanceRef.current = setTimeout(step, 30);
      }
    };
    autoAdvanceRef.current = setTimeout(step, 30);
  };
  const cancelAutoAdvance = () => { clearTimeout(autoAdvanceRef.current); setAutoAdvanceTimer(null); };
  const [tournamentBetBuilderOpen, setTournamentBetBuilderOpen] = useState(false);
  const [betTemplates, setBetTemplates] = useState(null);
  const [previewMode, setPreviewMode] = useState(false); // false = admin view, true = player preview
  const [roundCompleteOpen, setRoundCompleteOpen] = useState(false);
  const [myPositionOpen, setMyPositionOpen] = useState(false);
  const [roundSwitcherOpen, setRoundSwitcherOpen] = useState(false);
  const [roundFlowOpen, setRoundFlowOpen] = useState(false);
  const [birdieEvents, setBirdieEvents] = useState([]);
  const [guidanceEnabled, setGuidanceEnabled] = useState(true);
  const [showTips, setShowTips] = useState(false);
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
      // last-code is history only — never used for auto-navigation on startup.
      // A new device always starts at the landing page with roundCode = null.
      // Only handleCreate(), handleJoin(), and handleQuickJoin() may set roundCode.
      try { const r2v = localStorage.getItem('db:notif-prefs'); if (r2v) setNotifPrefs(JSON.parse(r2v)); } catch (e) {}
      try { const r3v = localStorage.getItem('db:chat-bubble-pos'); if (r3v) setBubblePos(JSON.parse(r3v)); } catch (e) {}
      try { const r4v = localStorage.getItem('db:bet-templates'); setBetTemplates(r4v ? JSON.parse(r4v) : DEFAULT_BET_TEMPLATES); } catch (e) { setBetTemplates(DEFAULT_BET_TEMPLATES); }
      try { const r5v = localStorage.getItem('db:guidance-enabled'); if (r5v) setGuidanceEnabled(JSON.parse(r5v)); } catch (e) {}
      try { const r6v = localStorage.getItem('db:device-profile'); if (r6v) { try { setDeviceName(JSON.parse(r6v).name || ''); } catch(e){} } } catch (e) {}
      try { const r7v = localStorage.getItem('db:my-tournaments'); if (r7v) { try { setMyTournaments(JSON.parse(r7v)); } catch(e){} } } catch (e) {}
      setInitChecked(true);
    })();
  }, []);

  const rememberTournament = (code, name) => {
    setMyTournaments(prev => {
      const next = [{ code, name, lastOpened: Date.now() }, ...prev.filter(t => t.code !== code)].slice(0, 5);
      try { localStorage.setItem('db:my-tournaments', JSON.stringify(next)); } catch(e) {}
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
    const isJustCreated = justCreatedRef.current === roundCode;
    if (justCreatedRef.current === roundCode) { justCreatedRef.current = null; }
    else { (async () => { try { const rv = localStorage.getItem('db:isadmin-' + roundCode); setIsAdmin(rv ? JSON.parse(rv) : false); } catch (e) { setIsAdmin(false); } })(); }
    (async () => {
      try { const res = await storage.get(tournamentKey(roundCode), true); if (mounted) { try { const raw = res ? JSON.parse(res.value) : null; if (!raw || !raw.rounds) { if (isJustCreated) { if (mounted) { loadedRef.current = true; setLoading(false); } return; } localStorage.removeItem('db:last-code'); if (mounted) { setRoundCode(null); setLoading(false); } return; } const safe = { ...defaultTournament(), ...raw, players: Array.isArray(raw.players) ? raw.players.filter(p => p && p.id) : [], flights: Array.isArray(raw.flights) ? raw.flights.filter(f => f && f.id) : [], ryderCup: (raw.ryderCup && typeof raw.ryderCup === 'object') ? raw.ryderCup : defaultTournament().ryderCup, rounds: Array.isArray(raw.rounds) ? raw.rounds.map(r => { if (!r) return null; return { ...defaultRound(0), ...r, pars: Array.isArray(r.pars) ? r.pars : DEFAULT_PARS_18.slice(), strokeIndex: Array.isArray(r.strokeIndex) ? r.strokeIndex : DEFAULT_SI_18.slice(), yardage: Array.isArray(r.yardage) ? r.yardage : [], customBets: Array.isArray(r.customBets) ? r.customBets : [], flowGroups: Array.isArray(r.flowGroups) ? r.flowGroups : [], tournamentCustomBets: Array.isArray(r.tournamentCustomBets) ? r.tournamentCustomBets : [], scores: r.scores && typeof r.scores === 'object' ? r.scores : {}, games: r.games ? { ...defaultRound(0).games, ...r.games, matchplay: { ...defaultRound(0).games.matchplay, ...(r.games.matchplay || {}), matches: Array.isArray(r.games.matchplay?.matches) ? r.games.matchplay.matches : [] }, wolf: { ...defaultRound(0).games.wolf, ...(r.games.wolf || {}), choices: (r.games.wolf?.choices && typeof r.games.wolf.choices === 'object') ? r.games.wolf.choices : {} }, parimutuel: { ...defaultRound(0).games.parimutuel, ...(r.games.parimutuel || {}), tickets: Array.isArray(r.games.parimutuel?.tickets) ? r.games.parimutuel.tickets : [] } } : defaultRound(0).games }; }).filter(Boolean) : [defaultRound(0)], tournamentCustomBets: Array.isArray(raw.tournamentCustomBets) ? raw.tournamentCustomBets : [] }; setTournament(safe); } catch(e) { setTournament(defaultTournament()); } } } catch (e) { if (mounted) setTournament(defaultTournament()); }
      try { const cres = await storage.get(chatKey(roundCode), true); if (mounted) setChat(cres ? JSON.parse(cres.value) : []); } catch (e) { if (mounted) setChat([]); }
      try { const wresv = localStorage.getItem('db:whoami-' + roundCode); if (mounted) setWhoamiId(wresv ? JSON.parse(wresv) : null); } catch (e) { if (mounted) setWhoamiId(null); }
      if (mounted) { loadedRef.current = true; setLoading(false); }
    })();
    return () => { mounted = false; };
  }, [roundCode]);

  useEffect(() => {
    if (!roundCode || !loadedRef.current) return;
    const t = setTimeout(async () => { try { await storage.set(tournamentKey(roundCode), JSON.stringify(tournament), true); } catch (e) {} }, 500);
    return () => clearTimeout(t);
  }, [tournament, roundCode]);

  useEffect(() => {
    if (!loadedRef.current || !roundCode || !tournament.name) return;
    // Only remember this tournament on THIS device if it was explicitly created or joined
    // (not just because the subscription received data). The isAdmin flag or whoamiId
    // confirms the device actively participated.
    if (isAdmin || whoamiId) {
      rememberTournament(roundCode, tournament.name);
    }
  }, [roundCode, tournament.name]);

  // Real-time sync + offline mode: onValue() caches data locally in Firebase,
  // so the app loads from cache instantly when signal drops mid-round.
  // Writes (set()) queue automatically and sync when signal returns.
  useEffect(() => {
    if (!roundCode) return;
    let prevTournamentRef = null;

    const sanitize = (raw) => {
      if (!raw || !Array.isArray(raw.players)) return null;
      return { ...defaultTournament(), ...raw,
        players: Array.isArray(raw.players) ? raw.players.filter(p => p && p.id) : [],
        flights: Array.isArray(raw.flights) ? raw.flights.filter(f => f && f.id) : [],
        ryderCup: (raw.ryderCup && typeof raw.ryderCup === 'object') ? raw.ryderCup : defaultTournament().ryderCup,
        tournamentCustomBets: Array.isArray(raw.tournamentCustomBets) ? raw.tournamentCustomBets : [],
        rounds: Array.isArray(raw.rounds) ? raw.rounds.map(r => { if (!r) return null; return { ...defaultRound(0), ...r,
          pars: Array.isArray(r.pars) ? r.pars : DEFAULT_PARS_18.slice(),
          strokeIndex: Array.isArray(r.strokeIndex) ? r.strokeIndex : DEFAULT_SI_18.slice(),
          yardage: Array.isArray(r.yardage) ? r.yardage : [],
          customBets: Array.isArray(r.customBets) ? r.customBets : [],
          flowGroups: Array.isArray(r.flowGroups) ? r.flowGroups : [],
          scoreUpdatedAt: (r.scoreUpdatedAt && typeof r.scoreUpdatedAt === 'object' && !Array.isArray(r.scoreUpdatedAt)) ? r.scoreUpdatedAt : {}, submittedPlayers: Array.isArray(r.submittedPlayers) ? r.submittedPlayers : [],
          scores: r.scores && typeof r.scores === 'object' ? r.scores : {},
          games: r.games ? { ...defaultRound(0).games, ...r.games,
            matchplay: { ...defaultRound(0).games.matchplay, ...(r.games.matchplay || {}), matches: Array.isArray(r.games.matchplay?.matches) ? r.games.matchplay.matches : [] },
            wolf: { ...defaultRound(0).games.wolf, ...(r.games.wolf || {}), choices: (r.games.wolf?.choices && typeof r.games.wolf.choices === 'object') ? r.games.wolf.choices : {} },
            parimutuel: { ...defaultRound(0).games.parimutuel, ...(r.games.parimutuel || {}), tickets: Array.isArray(r.games.parimutuel?.tickets) ? r.games.parimutuel.tickets : [] },
          } : defaultRound(0).games,
        }; }).filter(Boolean) : [defaultRound(0)],
      };
    };

    const unsubTournament = storage.subscribe(tournamentKey(roundCode), true, (res) => {
      if (setupOpen || wizardOpen) return;
      if (!res) return;
      setTournament(prev => {
        try {
          const raw = JSON.parse(res.value);
          const safe = sanitize(raw);
          if (!safe) return prev;
          // detect birdies from other players
          const activeRound = safe.rounds?.find(r => r.id === safe.activeRoundId);
          const prevRound = prevTournamentRef?.rounds?.find(r => r.id === prevTournamentRef.activeRoundId);
          if (activeRound && prevRound && safe.players) {
            safe.players.forEach(p => {
              if (p.id === whoamiId) return;
              const newScores = activeRound.scores?.[p.id] || [];
              const oldScores = prevRound.scores?.[p.id] || [];
              newScores.forEach((s, h) => {
                if (s != null && oldScores[h] == null) {
                  const par = activeRound.pars?.[h] ?? 4;
                  if (s - par <= -1) {
                    const ev = { id: `birdie_sync_${Date.now()}_${h}`, playerId: p.id, holeIndex: h, diff: s - par, ts: Date.now() };
                    setBirdieEvents(prev2 => [...prev2, ev]);
                    setTimeout(() => setBirdieEvents(prev2 => prev2.filter(e => e.id !== ev.id)), 4000);
                  }
                }
              });
            });
          }
          prevTournamentRef = safe;
          if (JSON.stringify(prev) === JSON.stringify(safe)) return prev;
          return safe;
        } catch(e) { return prev; }
      });
    });

    const unsubChat = storage.subscribe(chatKey(roundCode), true, (res) => {
      if (!res) return;
      try { const parsed = JSON.parse(res.value); setChat(prev => JSON.stringify(prev) === JSON.stringify(parsed) ? prev : parsed); } catch(e) {}
    });

    return () => { unsubTournament(); unsubChat(); };
  }, [roundCode, setupOpen, wizardOpen, whoamiId]);

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
    if (!loadedRef.current || typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
    const state = getRoundView(tournament, tournament.activeRoundId);
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
    if (state.games?.parimutuel?.enabled && !state.games?.parimutuel?.resolved && !watchRef.current.bettingClosingNotified) {
      const maxThru = stats.length ? Math.max(...stats.map(s => s.thru)) : 0;
      if (maxThru === state.games?.parimutuel?.lockAfterHole) { watchRef.current.bettingClosingNotified = true; if (notifPrefs.bettingClosingSoon) fire('Betting closing soon', 'Pari-mutuel betting closes after this hole.'); }
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
  const goHoleRef = useRef(null);
  const swipe = useSwipeNav(activeTab, setActiveTab, goHoleRef);

  const handleCreate = () => {
    const code = genCode(), pin = genPin();
    justCreatedRef.current = code;
    (async () => { try { localStorage.setItem('db:last-code', JSON.stringify(code)); localStorage.setItem('db:isadmin-' + code, JSON.stringify(true)); } catch (e) {} })();
    setIsAdmin(true); setRoundCode(code); setPendingAdminPin(pin);
    setTimeout(() => { setWizardIsNewRound(false); setWizardOpen(true); }, 120);
  };
  const handleJoin = (code) => {
    const c = code.toUpperCase().trim();
    if (!c) return;
    setJoinError(null);
    setJoinChecking(true);
    (async () => {
      try {
        const res = await storage.get(tournamentKey(c), true);
        if (!res || !res.value) {
          setJoinError('That code doesn\'t exist — check with your admin.');
          setJoinChecking(false);
          return;
        }
        const data = JSON.parse(res.value);
        if (!data || !data.rounds) {
          setJoinError('That code doesn\'t exist — check with your admin.');
          setJoinChecking(false);
          return;
        }
        localStorage.setItem('db:last-code', JSON.stringify(c));
        setJoinChecking(false);
        setRoundCode(c);
      } catch (e) {
        setJoinError('Couldn\'t connect — check your signal and try again.');
        setJoinChecking(false);
      }
    })();
  };
  const handleLoadDemo = async () => {
    const code = genCode();
    const demo = generateDemoTournament();
    justCreatedRef.current = code;
    preloadedRef.current = { code, tournament: demo.tournament, chat: demo.chat, whoamiId: demo.whoamiId };
    (async () => {
      try {
        localStorage.setItem('db:last-code', JSON.stringify(code));
        localStorage.setItem('db:isadmin-' + code, JSON.stringify(true));
        localStorage.setItem('db:whoami-' + code, JSON.stringify(demo.whoamiId));
        await storage.set(tournamentKey(code), JSON.stringify(demo.tournament), true);
        await storage.set(chatKey(code), JSON.stringify(demo.chat), true);
      } catch (e) {}
    })();
    setIsAdmin(true);
    setRoundCode(code);
  };
  const handleQuickJoin = (code) => { setRoundCode(code); try { localStorage.setItem('db:last-code', JSON.stringify(code)); } catch(e) {} };
  // handleLeave: clears the active session completely. last-code is also deleted
  // so the next startup doesn't show a stale resume button for this round.
  const handleLeave = () => { try { localStorage.removeItem('db:last-code'); } catch(e) {} setRoundCode(null); setTournament(defaultTournament()); setChat([]); setIsAdmin(false); setWhoamiId(null); setPreviewMode(false); setSettingsOpen(false); loadedRef.current = false; };
  const becomeAdmin = (pin) => { if (pin === tournament.adminPin) { setIsAdmin(true); try { localStorage.setItem('db:isadmin-' + roundCode, JSON.stringify(true)); } catch(e) {} return true; } return false; };
  const saveDeviceProfile = (name) => { setDeviceName(name); try { localStorage.setItem('db:device-profile', JSON.stringify({ name })); } catch(e) {} };

  const setIdentity = (playerId) => { setWhoamiId(playerId); if (!isAdmin) setActiveTab('card'); try { localStorage.setItem('db:whoami-' + roundCode, JSON.stringify(playerId)); } catch(e) {} };
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
  const updateNotifPrefs = (next) => { setNotifPrefs(next); try { localStorage.setItem('db:notif-prefs', JSON.stringify(next)); } catch(e) {} };
  const chatFlashRef = useRef(0);
  const [chatFlash, setChatFlash] = useState(false);

  const sendChat = (text) => {
    const author = tournament.players.find(p => p.id === whoamiId);
    const msg = { id: Date.now() + '-' + Math.random().toString(36).slice(2, 6), authorId: whoamiId, authorName: author ? author.name : (deviceName || 'Guest'), text, ts: Date.now() };
    setChat(prev => { const next = [...prev, msg].slice(-150); (async () => { try { await storage.set(chatKey(roundCode), JSON.stringify(next), true); } catch (e) {} })(); return next; });
    const now = Date.now();
    if (now - chatFlashRef.current > 60000) {
      chatFlashRef.current = now;
      setChatFlash(true);
      setTimeout(() => setChatFlash(false), 600);
    }
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

  const startRound = () => updateRound(prev => {
    const players = tournament.players;
    // Auto-create one group if ≤4 players and no groups exist yet
    const autoGroups = (!prev.flowGroups || prev.flowGroups.length === 0) && players.length > 0 && players.length <= 4
      ? [{ id: 'flow_auto_' + Date.now(), groupNumber: 1, teeTime: null, startingHole: 1, playerIds: players.map(p => p.id), adminNotes: '', delayedMinutes: 0, overrideCurrentHole: null }]
      : (prev.flowGroups || []);
    return { ...prev, started: true, flowGroups: autoGroups };
  });
  const resetScores = () => updateRound(prev => ({ ...prev, scores: Object.fromEntries(Object.keys(prev.scores).map(pid => [pid, Array(prev.numHoles).fill(null)])) }));
  const applyScan = (rows) => updateRound(prev => { const scores = { ...prev.scores }; rows.forEach(r => { scores[r.playerId] = r.scores.map((s, i) => s != null ? s : (scores[r.playerId]?.[i] ?? null)); }); return { ...prev, scores }; });
  const fireBirdie = (playerId, holeIndex, score, pars) => {
    const par = pars[holeIndex] ?? 4;
    const diff = score - par;
    if (diff > -1) return;
    const ev = { id: `birdie_${Date.now()}_${Math.random().toString(36).slice(2,6)}`, playerId, holeIndex, diff, ts: Date.now() };
    setBirdieEvents(prev => [...prev, ev]);
    setTimeout(() => setBirdieEvents(prev => prev.filter(e => e.id !== ev.id)), 6000);
  };
  const setScoreVal = (playerId, holeIndex, val) => updateRound(prev => {
    const arr = (prev.scores[playerId] || []).slice(); arr[holeIndex] = val;
    const scoreUpdatedAt = { ...(prev.scoreUpdatedAt || {}) };
    if (val != null) { scoreUpdatedAt[`${playerId}-${holeIndex}`] = Date.now(); } else delete scoreUpdatedAt[`${playerId}-${holeIndex}`];
    return { ...prev, scores: { ...prev.scores, [playerId]: arr }, scoreUpdatedAt };
  });
  const stateNow = getRoundView(tournament, tournament.activeRoundId);
  const isPlayerSubmitted = (playerId) => Array.isArray(stateNow.submittedPlayers) && stateNow.submittedPlayers.includes(playerId);
  const tapPlus  = (playerId, holeIndex) => { if (!isAdmin && isPlayerSubmitted(playerId)) return; const cur = stateNow.scores[playerId]?.[holeIndex]; const par = stateNow.pars[holeIndex] ?? 4; setScoreVal(playerId, holeIndex, cur == null ? par + 1 : cur + 1); };
  const tapMinus = (playerId, holeIndex) => { if (!isAdmin && isPlayerSubmitted(playerId)) return; const cur = stateNow.scores[playerId]?.[holeIndex]; const par = stateNow.pars[holeIndex] ?? 4; setScoreVal(playerId, holeIndex, Math.max(1, cur == null ? par - 1 : cur - 1)); };
  const tapCenter = (playerId, holeIndex) => { if (!isAdmin && isPlayerSubmitted(playerId)) return; const par = stateNow.pars[holeIndex] ?? 4; setScoreVal(playerId, holeIndex, par); };
  const clearScore = (playerId, holeIndex) => setScoreVal(playerId, holeIndex, null);
  const setNineHoleTotal = (playerId, half, val) => updateRound(prev => ({
    ...prev,
    nineHoleTotals: { ...(prev.nineHoleTotals || {}), [playerId]: { ...(prev.nineHoleTotals?.[playerId] || {}), [half]: val === '' ? null : parseInt(val, 10) || null } },
  }));
  const submitScorecard = (playerId) => updateRound(prev => ({
    ...prev,
    submittedPlayers: [...(Array.isArray(prev.submittedPlayers) ? prev.submittedPlayers : []).filter(id => id !== playerId), playerId],
  }));
  const unlockScorecard = (playerId) => updateRound(prev => ({
    ...prev,
    submittedPlayers: (Array.isArray(prev.submittedPlayers) ? prev.submittedPlayers : []).filter(id => id !== playerId),
  }));

  const goHole = (delta) => {
    if (delta > 0) {
      // Fire birdies for the hole we're leaving
      const currentH = Math.max(0, Math.min(viewHole, stateNow.numHoles - 1));
      stateNow.players.forEach(p => {
        const score = stateNow.scores[p.id]?.[currentH];
        if (score != null) fireBirdie(p.id, currentH, score, stateNow.pars);
      });
    }
    setViewHole(v => Math.max(0, Math.min(stateNow.numHoles - 1, v + delta)));
  };
  goHoleRef.current = goHole;

  const adjustTicket = (entrantId, delta) => {
    const bettorId = whoamiId || (viewAsAdmin ? tournament.players.find(p => p.name === deviceName)?.id : null);
    if (!bettorId) return;
    const bettorName = tournament.players.find(p => p.id === bettorId)?.name || deviceName || 'Admin';
    updateRound(prev => {
      const tickets = Array.isArray(prev.games?.parimutuel?.tickets) ? prev.games.parimutuel.tickets : [];
      const existing = tickets.find(t => t.bettorId === bettorId && t.entrantId === entrantId);
      let next;
      if (delta > 0) { next = existing ? tickets.map(t => t === existing ? { ...t, count: (t.count||0) + 1 } : t) : [...tickets, { id: 't_' + Date.now(), bettorId, bettorName, entrantId, count: 1, ts: Date.now() }]; }
      else { if (!existing || !existing.count) return prev; next = existing.count <= 1 ? tickets.filter(t => t !== existing) : tickets.map(t => t === existing ? { ...t, count: t.count - 1 } : t); }
      return { ...prev, games: { ...prev.games, parimutuel: { ...prev.games.parimutuel, tickets: next } } };
    });
  };
  const resolveMarket = (winnerId) => updateRound(prev => ({ ...prev, games: { ...prev.games, parimutuel: { ...prev.games.parimutuel, resolved: true, winnerId } } }));
  const reopenMarket = () => updateRound(prev => ({ ...prev, games: { ...prev.games, parimutuel: { ...prev.games.parimutuel, resolved: false, winnerId: null } } }));

  const addCustomBet = (bet) => updateRound(prev => ({ ...prev, customBets: [...(Array.isArray(prev.customBets) ? prev.customBets : []), { id: 'cb_' + Date.now(), resolved: false, winnerIds: null, ...bet }] }));
  const removeCustomBet = (id) => updateRound(prev => ({ ...prev, customBets: (Array.isArray(prev.customBets) ? prev.customBets : []).filter(b => b.id !== id) }));
  const resolveCustomBet = (id, winnerIds) => updateRound(prev => ({ ...prev, customBets: (Array.isArray(prev.customBets) ? prev.customBets : []).map(b => b.id === id ? { ...b, resolved: true, winnerIds } : b) }));
  const reopenCustomBet = (id) => updateRound(prev => ({ ...prev, customBets: (Array.isArray(prev.customBets) ? prev.customBets : []).map(b => b.id === id ? { ...b, resolved: false, winnerIds: null } : b) }));

  const addTournamentCustomBet = (bet) => updateTournament(prev => ({ ...prev, tournamentCustomBets: [...prev.tournamentCustomBets, { id: 'tcb_' + Date.now(), resolved: false, winnerIds: null, ...bet }] }));
  const removeTournamentCustomBet = (id) => updateTournament(prev => ({ ...prev, tournamentCustomBets: prev.tournamentCustomBets.filter(b => b.id !== id) }));
  const resolveTournamentCustomBet = (id, winnerIds) => updateTournament(prev => ({ ...prev, tournamentCustomBets: prev.tournamentCustomBets.map(b => b.id === id ? { ...b, resolved: true, winnerIds } : b) }));
  const reopenTournamentCustomBet = (id) => updateTournament(prev => ({ ...prev, tournamentCustomBets: prev.tournamentCustomBets.map(b => b.id === id ? { ...b, resolved: false, winnerIds: null } : b) }));

  const saveBetTemplate = (tpl) => setBetTemplates(prev => { const next = [...prev, { id: 'tpl_' + Date.now(), ...tpl }]; try { localStorage.setItem('db:bet-templates', JSON.stringify(next)); } catch(e) {} return next; });
  const deleteBetTemplate = (id) => setBetTemplates(prev => { const next = prev.filter(t => t.id !== id); try { localStorage.setItem('db:bet-templates', JSON.stringify(next)); } catch(e) {} return next; });

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
  const onBubblePointerUp = () => { bubbleDragRef.current = null; if (bubblePos) try { localStorage.setItem('db:chat-bubble-pos', JSON.stringify(bubblePos)); } catch(e) {} };
  const onBubbleClick = () => { if (bubbleJustDraggedRef.current) { bubbleJustDraggedRef.current = false; return; } setChatOpen(true); setChatSeenLen(chat.length); };

  if (!initChecked) return <div style={{ minHeight: '100vh', background: C.pine }} />;
  if (!roundCode) return (
    <>
      <Landing onCreate={handleCreate} onJoin={handleJoin} onLoadDemo={handleLoadDemo} myTournaments={myTournaments} onQuickJoin={handleQuickJoin} deviceName={deviceName} onOpenProfile={() => setProfileOpen(true)} onSaveName={saveDeviceProfile} joinError={joinError} joinChecking={joinChecking} />
      {profileOpen && <DeviceProfileModal name={deviceName} onSave={saveDeviceProfile} onClose={() => setProfileOpen(false)} />}
    </>
  );
  if (loading) return <div style={{ minHeight: '100vh', background: C.pine, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.ivoryDim, fontFamily: 'Inter, sans-serif' }}>Loading round…</div>;

  const state = getRoundView(tournament, tournament.activeRoundId);
  const stats = computeStats(state);
  const hasPlayers = tournament.players.length > 0;
  const whoami = tournament.players.find(p => p.id === whoamiId) || null;

  // Show name picker if player hasn't identified themselves yet (non-admin only)
  if (!isAdmin && !whoamiId && hasPlayers) {
    return (
      <WhoAreYouScreen
        players={tournament.players}
        onPick={(id) => setIdentity(id)}
        onAddSelf={(name) => addSelf(name)}
        onBack={() => { setRoundCode(null); }}
      />
    );
  }
  const h = Math.max(0, Math.min(viewHole, state.numHoles - 1));
  const par = state.pars[h] ?? 4;
  const roundBets = bets.filter(b => b.roundId === tournament.activeRoundId);
  const phase = getRoundPhase(state, stats, roundBets);
  const viewAsAdmin = isAdmin && !previewMode;
  const multiRound = tournament.rounds.length > 1;
  const isLastRound = tournament.rounds[tournament.rounds.length - 1]?.id === tournament.activeRoundId;

  return (
    <div style={{ height: '100dvh', overflow: 'hidden', background: `linear-gradient(160deg, ${C.pineDark} 0%, ${C.pine} 100%)`, color: C.ivory, fontFamily: 'Inter, sans-serif', display: 'flex', flexDirection: 'column', position: 'fixed', inset: 0 }}>
      <FontLoader />
      <LibraryLoader />
      <BirdieAnimation events={birdieEvents} players={tournament.players} />
      {chatFlash && <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,117,74,0.25)', zIndex: 198, pointerEvents: 'none', animation: 'birdieFlash 0.6s ease-out forwards' }} />}
      {showTips === 'show' && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 99, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }} onClick={() => setShowTips('done')}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#FFFFFF', borderRadius: '20px 20px 0 0', width: '100%', maxWidth: 480, padding: '24px 24px 36px' }}>
            <div style={{ fontFamily: 'Anton, sans-serif', fontSize: 22, color: C.ivory, marginBottom: 20, textAlign: 'center' }}>Welcome to DuffBook</div>
            {[
              [Flag, 'Card tab is your scorecard', 'Tap + or − to enter your score on each hole'],
              [ChevronRight, 'Swipe to change holes', 'Swipe left or right anywhere on the card screen'],
              [Trophy, 'Check the Games tab for bets', 'See skins, Nassau, and all side games live'],
            ].map(([Icon, title, sub]) => (
              <div key={title} style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 18 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: C.emerald, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Icon size={20} color="#FFFFFF" />
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15, color: C.ivory }}>{title}</div>
                  <div style={{ fontSize: 13, color: C.bunker }}>{sub}</div>
                </div>
              </div>
            ))}
            <button onClick={() => setShowTips('done')} style={{ width: '100%', background: C.emerald, border: 'none', borderRadius: 14, padding: '16px 0', fontFamily: 'Oswald, sans-serif', fontWeight: 700, fontSize: 16, textTransform: 'uppercase', color: '#FFFFFF', cursor: 'pointer', marginTop: 4 }}>Got it, let's play</button>
          </div>
        </div>
      )}
      <div style={{ flexShrink: 0, background: '#FFFFFF', borderBottom: `1px solid ${C.turfBorder}`, padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }} data-testid="app-header">
        <div style={{ minWidth: 0 }}>
          <div style={{ fontFamily: 'Anton, sans-serif', fontWeight: 700, fontSize: 20, letterSpacing: 0.5, textTransform: 'uppercase', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: C.ivory }}>{tournament.name}</div>
          <div style={{ fontSize: 11, color: C.ivoryDim, display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            <span style={{ width: 6, height: 6, borderRadius: 999, background: C.blueBright, display: 'inline-block', flexShrink: 0, animation: 'pulse 2.2s ease-in-out infinite' }} />
            {viewAsAdmin ? 'admin · ' : ''}{multiRound ? (
              <button onClick={() => setRoundSwitcherOpen(true)} style={{ background: 'transparent', border: 'none', color: C.gold, padding: 0, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 11 }}>Round {tournament.rounds.findIndex(r => r.id === tournament.activeRoundId) + 1} of {tournament.rounds.length} <ChevronsUpDown size={11} /></button>
            ) : `${state.numHoles} holes`} · code <span data-testid="round-code">{roundCode}</span>
          </div>
          {(() => {
            const g = state.games || {};
            const active = [g.skins?.enabled && 'Skins', g.nassau?.enabled && 'Nassau', g.bestBall?.enabled && 'Best Ball', g.scramble?.enabled && 'Scramble', g.parimutuel?.enabled && 'Pari-mutuel', g.wolf?.enabled && 'Wolf'].filter(Boolean);
            if (!active.length) return null;
            return <div style={{ fontSize: 10, color: C.gold, marginTop: 1, letterSpacing: 0.2 }}>{active.join(' · ')}</div>;
          })()}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          {isAdmin && (
            <button onClick={() => setPreviewMode(p => !p)} style={{ background: previewMode ? C.gold : C.turf, border: `1px solid ${previewMode ? C.gold : C.turfBorder}`, borderRadius: 10, padding: '0 10px', height: 38, display: 'flex', alignItems: 'center', gap: 5, color: previewMode ? C.pineDark : C.ivoryDim, cursor: 'pointer', fontSize: 11, fontFamily: 'Oswald, sans-serif', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.3, whiteSpace: 'nowrap' }}>
              {previewMode ? <><User size={13} /> Player</> : <><Settings size={13} /> Admin</>}
            </button>
          )}
          <button onClick={() => setQrOpen(true)} style={{ background: C.turf, border: `1px solid ${C.turfBorder}`, borderRadius: 10, width: 38, height: 38, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.ivory, cursor: 'pointer', flexShrink: 0 }} title="Share round QR"><Share2 size={17} /></button>
          <button onClick={() => setSettingsOpen(true)} aria-label="Settings" style={{ background: C.turf, border: `1px solid ${C.turfBorder}`, borderRadius: 10, width: 38, height: 38, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.ivory, cursor: 'pointer', flexShrink: 0 }}><Settings size={18} /></button>
        </div>
      </div>
      <div style={{ height: 2, background: `linear-gradient(90deg, ${C.emerald} 0%, ${C.goldBright} 50%, ${C.blue} 100%)`, flexShrink: 0 }} />
      {previewMode && (
        <div style={{ flexShrink: 0, background: C.gold, color: C.pineDark, padding: '8px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
          <span style={{ fontSize: 12, fontWeight: 600 }}>Previewing as a player</span>
          <button onClick={() => setPreviewMode(false)} style={{ background: C.pineDark, color: C.ivory, border: 'none', borderRadius: 7, padding: '5px 10px', fontSize: 11, fontFamily: 'Oswald, sans-serif', fontWeight: 600, textTransform: 'uppercase', cursor: 'pointer', flexShrink: 0 }}>Exit preview</button>
        </div>
      )}

      <div onTouchStart={swipe.onTouchStart} onTouchEnd={swipe.onTouchEnd} style={{ flex: 1, minHeight: 0, overflowY: 'auto', overflowX: 'hidden', WebkitOverflowScrolling: 'touch', padding: 16, paddingBottom: 28, maxWidth: 720, margin: '0 auto', width: '100%', boxSizing: 'border-box', overscrollBehavior: 'contain' }}>
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
        {hasPlayers && activeTab === 'home' && <HomeTab state={state} stats={stats} isAdmin={viewAsAdmin} whoami={whoami} setActiveTab={setActiveTab} chat={chat} ledger={ledger} onOpenMyPosition={() => setMyPositionOpen(true)} phase={phase} guidanceEnabled={guidanceEnabled} onOpenChat={() => { setChatOpen(true); setChatSeenLen(chat.length); }} onOpenRoundComplete={() => setRoundCompleteOpen(true)} tournament={tournament} onSwitchRound={() => setRoundSwitcherOpen(true)} onOpenRoundFlow={() => setRoundFlowOpen(true)} onOpenKoS={() => setKosOpen(true)} />}
        {hasPlayers && activeTab === 'card' && <ScorecardTab state={state} h={h} par={par} tapPlus={tapPlus} tapMinus={tapMinus} tapCenter={tapCenter} clearScore={clearScore} setNineHoleTotal={setNineHoleTotal} goHole={goHole} setHole={setViewHole} onOpenScan={() => setScanOpen(true)} isAdmin={viewAsAdmin} whoami={whoami} onPick={setIdentity} onAddSelf={addSelf} onSubmit={submitScorecard} onUnlock={unlockScorecard} />}
        {hasPlayers && activeTab === 'leaderboard' && <LeaderboardTab state={state} stats={stats} />}
        {hasPlayers && activeTab === 'games' && <GamesTab state={state} />}
        {hasPlayers && activeTab === 'bets' && <BetsTab state={state} stats={stats} isAdmin={viewAsAdmin} whoami={whoami} viewAsAdmin={viewAsAdmin} deviceName={deviceName} onPick={setIdentity} onAddSelf={addSelf} adjustTicket={adjustTicket} resolveMarket={resolveMarket} reopenMarket={reopenMarket} onOpenBetBuilder={() => setBetBuilderOpen(true)} onResolveCustomBet={resolveCustomBet} onReopenCustomBet={reopenCustomBet} onRemoveCustomBet={removeCustomBet} tournamentCustomBets={tournament.tournamentCustomBets} onResolveTournamentBet={resolveTournamentCustomBet} onReopenTournamentBet={reopenTournamentCustomBet} onRemoveTournamentBet={removeTournamentCustomBet} onOpenTournamentBetBuilder={() => setTournamentBetBuilderOpen(true)} tournament={tournament} />}
        {hasPlayers && activeTab === 'settle' && <SettleTab tournament={tournament} ledger={ledger} onOpenMyPosition={() => setMyPositionOpen(true)} />}
      </div>

      {hasPlayers && (
        <div style={{ flexShrink: 0, background: '#FFFFFF', borderTop: `1px solid ${C.turfBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'space-around', padding: '8px 8px 14px', boxShadow: '0 -4px 20px rgba(0,0,0,0.08)' }}>
          <NavBtn icon={Home} label="Home" active={activeTab === 'home'} onClick={() => setActiveTab('home')} badge={whoami ? (() => { const me = stats.find(s => s.id === whoami.id); if (!me || me.thru === 0) return null; const d = me.toPar; return d === 0 ? 'E' : d > 0 ? `+${d}` : `${d}`; })() : null} />
          <NavBtn icon={Flag} label="Card" active={activeTab === 'card'} onClick={() => setActiveTab('card')} hero />
          <NavBtn icon={Trophy} label="Round" active={activeTab === 'games'} onClick={() => setActiveTab('games')} />
          <NavBtn icon={Coins} label="Bets" active={activeTab === 'bets'} onClick={() => setActiveTab('bets')} />
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
          <MessageCircle size={24} color="#FFFFFF" strokeWidth={2} />
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
        <SetupWizard tournament={tournament} state={state} updateTournament={updateTournament} updateRound={updateRound} onClose={() => { setWizardOpen(false); setWizardIsNewRound(false); }} onOpenSetup={() => { setWizardOpen(false); setWizardIsNewRound(false); setSetupOpen(true); }} roundCode={roundCode} selectProviderCourse={selectProviderCourse} selectCustomCourse={selectCustomCourse} setNumHoles={setNumHoles} setPlayerField={setPlayerField} autoFlights={autoFlights} setCourseField={setCourseField} startRound={startRound} isNewRound={wizardIsNewRound} onFinish={() => { setWizardOpen(false); setWizardIsNewRound(false); setActiveTab('home'); }} />
      )}
      {settingsOpen && (
        <SettingsSheet onClose={() => setSettingsOpen(false)} onOpenSetup={() => { setSettingsOpen(false); setSetupOpen(true); }} onOpenNotifications={() => { setSettingsOpen(false); setNotifOpen(true); }} onOpenScan={() => { setSettingsOpen(false); setScanOpen(true); }} onLeave={handleLeave} onBecomeAdmin={() => { setSettingsOpen(false); setBecomeAdminOpen(true); }} roundCode={roundCode} adminPin={tournament.adminPin} isAdmin={viewAsAdmin} hasPlayers={hasPlayers} previewMode={previewMode} onExitPreview={() => { setSettingsOpen(false); setPreviewMode(false); }} guidanceEnabled={guidanceEnabled} onToggleGuidance={() => { const next = !guidanceEnabled; setGuidanceEnabled(next); try { localStorage.setItem('db:guidance-enabled', JSON.stringify(next)); } catch(e) {} }} onOpenProfile={() => { setSettingsOpen(false); setProfileOpen(true); }} onOpenRoundSwitcher={() => { setSettingsOpen(false); setRoundSwitcherOpen(true); }} multiRound={multiRound} onOpenRoundFlow={() => { setSettingsOpen(false); setRoundFlowOpen(true); }} />
      )}
      {notifOpen && <NotificationsModal prefs={notifPrefs} setPrefs={updateNotifPrefs} onClose={() => setNotifOpen(false)} />}
      {scanOpen && <ScanModal state={state} onClose={() => setScanOpen(false)} onApply={applyScan} />}
      {becomeAdminOpen && <BecomeAdminModal onSubmit={becomeAdmin} onClose={() => setBecomeAdminOpen(false)} />}
      {betBuilderOpen && <BetBuilderModal state={{ ...state, players: tournament.players.length > state.players.length ? tournament.players : state.players }} templates={betTemplates} onCreate={(bet) => { addCustomBet(bet); setBetBuilderOpen(false); }} onSaveTemplate={saveBetTemplate} onDeleteTemplate={deleteBetTemplate} onClose={() => setBetBuilderOpen(false)} />}
      {tournamentBetBuilderOpen && isAdmin && <BetBuilderModal state={{ players: tournament.players, numHoles: 18, handicapsEnabled: tournament.handicapsEnabled }} templates={betTemplates} onCreate={(bet) => { addTournamentCustomBet(bet); setTournamentBetBuilderOpen(false); }} onSaveTemplate={saveBetTemplate} onDeleteTemplate={deleteBetTemplate} onClose={() => setTournamentBetBuilderOpen(false)} scopeLabel="whole trip" />}
      {myPositionOpen && <MyPositionModal state={state} bets={bets} ledger={ledger} whoami={whoami} onPick={setIdentity} onAddSelf={addSelf} onClose={() => setMyPositionOpen(false)} />}
      {chatOpen && <ChatModal state={state} chat={chat} whoami={whoami} onPick={setIdentity} onAddSelf={addSelf} sendChat={sendChat} onClose={() => setChatOpen(false)} />}
      {roundCompleteOpen && <RoundCompleteModal state={state} stats={stats} ledger={ledger} isLastRound={isLastRound} onClose={() => setRoundCompleteOpen(false)} />}
      {roundSwitcherOpen && <RoundSwitcherModal tournament={tournament} onSwitch={switchRound} onClose={() => setRoundSwitcherOpen(false)} isAdmin={viewAsAdmin} onAddRound={addRound} />}
      {roundFlowOpen && <RoundFlowScreen tournament={tournament} state={state} isAdmin={viewAsAdmin} whoami={whoami} sendChat={sendChat} updateRound={updateRound} onClose={() => setRoundFlowOpen(false)} />}
      {kosOpen && <KoSModal tournament={tournament} updateTournament={updateTournament} onClose={() => setKosOpen(false)} />}
      {qrOpen && <QRShareModal roundCode={roundCode} tournamentName={tournament.name} onClose={() => setQrOpen(false)} />}
      {profileOpen && <DeviceProfileModal name={deviceName} onSave={saveDeviceProfile} onClose={() => setProfileOpen(false)} />}
    </div>
  );
}

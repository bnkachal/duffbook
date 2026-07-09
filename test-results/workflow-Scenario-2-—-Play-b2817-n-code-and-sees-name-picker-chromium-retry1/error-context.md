# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: workflow.spec.cjs >> Scenario 2 — Player joins an existing tournament >> 2b — player enters join code and sees name picker
- Location: tests\e2e\workflow.spec.cjs:109:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByTestId('who-are-you-screen')
Expected: visible
Timeout: 15000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 15000ms
  - waiting for getByTestId('who-are-you-screen')

```

```yaml
- text: DuffBook Live scoring, side games, and trash talk for the trip.
- textbox "Enter your name": Brij Kachalia
- button "🏌️ Start a New Tournament"
- text: Starting one makes you its admin · or join one already in progress
- textbox "ROUND CODE"
- button "Join"
- button "Resume ›"
```

# Test source

```ts
  12  | async function assertLandingPage(page) {
  13  |   await expect(page.getByTestId('landing-page')).toBeVisible({ timeout: 15000 });
  14  | }
  15  | 
  16  | async function createTournament(page) {
  17  |   await page.getByTestId('start-tournament-btn').click();
  18  |   await expect(page.getByTestId('app-header')).toBeVisible({ timeout: 20000 });
  19  |   const codeEl = page.getByTestId('round-code');
  20  |   await expect(codeEl).toBeVisible({ timeout: 10000 });
  21  |   const code = (await codeEl.textContent() || '').trim();
  22  |   expect(code).toMatch(/^[A-Z0-9]{5}$/);
  23  |   return code;
  24  | }
  25  | 
  26  | async function joinAsPlayer(page, code, playerName) {
  27  |   await assertLandingPage(page);
  28  |   await page.getByTestId('join-code-input').fill(code);
  29  |   await page.getByTestId('join-btn').click();
  30  |   await expect(page.getByTestId('who-are-you-screen')).toBeVisible({ timeout: 15000 });
  31  |   const playerBtn = page.locator(`[data-testid^="player-pick-btn"]`).filter({ hasText: playerName }).first();
  32  |   if (await playerBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
  33  |     await playerBtn.click();
  34  |     await page.getByTestId('confirm-player-btn').click();
  35  |   } else {
  36  |     await page.getByTestId('not-on-list-btn').click();
  37  |     await page.locator('[placeholder="Your name"]').fill(playerName);
  38  |     await page.locator('button').filter({ hasText: /join the round/i }).click();
  39  |   }
  40  |   await expect(page.getByTestId('app-header')).toBeVisible({ timeout: 15000 });
  41  | }
  42  | 
  43  | // ─── SCENARIO 1: Admin creates tournament ────────────────────────────────────
  44  | 
  45  | test.describe('Scenario 1 — Admin creates a tournament', () => {
  46  |   let adminCtx, adminPage;
  47  | 
  48  |   test.beforeEach(async ({ browser }) => {
  49  |     ({ ctx: adminCtx, page: adminPage } = await freshPage(browser));
  50  |   });
  51  | 
  52  |   test.afterEach(async () => { await adminCtx.close(); });
  53  | 
  54  |   test('1a — fresh admin lands on landing page', async () => {
  55  |     await assertLandingPage(adminPage);
  56  |     await expect(adminPage.getByTestId('start-tournament-btn')).toBeVisible();
  57  |     await expect(adminPage.getByTestId('join-code-input')).toBeVisible();
  58  |     await expect(adminPage.getByTestId('app-header')).not.toBeVisible();
  59  |   });
  60  | 
  61  |   test('1b — admin creates tournament and enters dashboard', async () => {
  62  |     await adminPage.getByTestId('start-tournament-btn').click();
  63  |     await expect(adminPage.getByTestId('landing-page')).not.toBeVisible({ timeout: 15000 });
  64  |     await expect(adminPage.getByTestId('app-header')).toBeVisible({ timeout: 20000 });
  65  |   });
  66  | 
  67  |   test('1c — round code is visible and correctly formatted', async () => {
  68  |     await createTournament(adminPage);
  69  |     const code = (await adminPage.getByTestId('round-code').textContent() || '').trim();
  70  |     expect(code).toMatch(/^[A-Z0-9]{5}$/);
  71  |   });
  72  | 
  73  |   test('1d — admin controls are present', async () => {
  74  |     await createTournament(adminPage);
  75  |     const header = adminPage.getByTestId('app-header');
  76  |     await expect(header.locator('text=/admin/i').first()).toBeVisible({ timeout: 10000 });
  77  |   });
  78  | 
  79  |   test('1e — no-players empty state shown before setup', async () => {
  80  |     await createTournament(adminPage);
  81  |     await expect(adminPage.getByTestId('no-players-state')).toBeVisible({ timeout: 10000 });
  82  |     await expect(adminPage.getByTestId('setup-round-btn')).toBeVisible({ timeout: 10000 });
  83  |   });
  84  | });
  85  | 
  86  | // ─── SCENARIO 2: Player joins ─────────────────────────────────────────────────
  87  | 
  88  | test.describe('Scenario 2 — Player joins an existing tournament', () => {
  89  |   let adminCtx, adminPage, playerCtx, playerPage;
  90  |   let roundCode;
  91  | 
  92  |   test.beforeAll(async ({ browser }) => {
  93  |     ({ ctx: adminCtx, page: adminPage } = await freshPage(browser));
  94  |     roundCode = await createTournament(adminPage);
  95  |   });
  96  | 
  97  |   test.beforeEach(async ({ browser }) => {
  98  |     ({ ctx: playerCtx, page: playerPage } = await freshPage(browser));
  99  |   });
  100 | 
  101 |   test.afterEach(async () => { await playerCtx.close(); });
  102 |   test.afterAll(async () => { await adminCtx.close(); });
  103 | 
  104 |   test('2a — fresh player lands on landing page not in admin tournament', async () => {
  105 |     await assertLandingPage(playerPage);
  106 |     await expect(playerPage.getByTestId('app-header')).not.toBeVisible();
  107 |   });
  108 | 
  109 |   test('2b — player enters join code and sees name picker', async () => {
  110 |     await playerPage.getByTestId('join-code-input').fill(roundCode);
  111 |     await playerPage.getByTestId('join-btn').click();
> 112 |     await expect(playerPage.getByTestId('who-are-you-screen')).toBeVisible({ timeout: 15000 });
      |                                                                ^ Error: expect(locator).toBeVisible() failed
  113 |   });
  114 | 
  115 |   test('2c — player can add themselves if not on the list', async () => {
  116 |     await playerPage.getByTestId('join-code-input').fill(roundCode);
  117 |     await playerPage.getByTestId('join-btn').click();
  118 |     await expect(playerPage.getByTestId('who-are-you-screen')).toBeVisible({ timeout: 15000 });
  119 |     await playerPage.getByTestId('not-on-list-btn').click();
  120 |     await playerPage.locator('[placeholder="Your name"]').fill('Bob');
  121 |     await playerPage.locator('button').filter({ hasText: /join the round/i }).click();
  122 |     await expect(playerPage.getByTestId('app-header')).toBeVisible({ timeout: 15000 });
  123 |   });
  124 | 
  125 |   test('2d — player is inside the correct tournament', async () => {
  126 |     await joinAsPlayer(playerPage, roundCode, 'Charlie');
  127 |     const displayedCode = (await playerPage.getByTestId('round-code').textContent() || '').trim();
  128 |     expect(displayedCode).toBe(roundCode);
  129 |   });
  130 | });
  131 | 
  132 | // ─── SCENARIO 3: Invalid join code ───────────────────────────────────────────
  133 | 
  134 | test.describe('Scenario 3 — Invalid join code is rejected', () => {
  135 |   let ctx, page;
  136 | 
  137 |   test.beforeEach(async ({ browser }) => {
  138 |     ({ ctx, page } = await freshPage(browser));
  139 |   });
  140 | 
  141 |   test.afterEach(async () => { await ctx.close(); });
  142 | 
  143 |   test('3a — bad code does not route into a tournament', async () => {
  144 |     await assertLandingPage(page);
  145 |     await page.getByTestId('join-code-input').fill('ZZZZZ');
  146 |     await page.getByTestId('join-btn').click();
  147 |     await page.waitForTimeout(8000);
  148 |     const onLanding = await page.getByTestId('landing-page').isVisible();
  149 |     const hasExit = await page.locator('text=/leave|back|home/i').first().isVisible().catch(() => false);
  150 |     expect(onLanding || hasExit).toBe(true);
  151 |   });
  152 | 
  153 |   test('3b — user can recover and try a different code', async () => {
  154 |     await page.getByTestId('join-code-input').fill('QQQQQ');
  155 |     await page.getByTestId('join-btn').click();
  156 |     await page.waitForTimeout(6000);
  157 |     const onLanding = await page.getByTestId('landing-page').isVisible();
  158 |     if (!onLanding) {
  159 |       const leaveBtn = page.locator('text=/leave|home/i').first();
  160 |       if (await leaveBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
  161 |         await leaveBtn.click();
  162 |       }
  163 |     }
  164 |     await expect(page.getByTestId('landing-page')).toBeVisible({ timeout: 10000 });
  165 |     await expect(page.getByTestId('join-code-input')).toBeVisible();
  166 |   });
  167 | });
  168 | 
  169 | // ─── SCENARIO 4: Leave / reset ───────────────────────────────────────────────
  170 | 
  171 | test.describe('Scenario 4 — Leave/reset clears session', () => {
  172 |   let adminCtx, adminPage, playerCtx, playerPage;
  173 |   let roundCode;
  174 | 
  175 |   test.beforeAll(async ({ browser }) => {
  176 |     ({ ctx: adminCtx, page: adminPage } = await freshPage(browser));
  177 |     roundCode = await createTournament(adminPage);
  178 |   });
  179 | 
  180 |   test.afterAll(async () => { await adminCtx.close(); });
  181 | 
  182 |   test.beforeEach(async ({ browser }) => {
  183 |     ({ ctx: playerCtx, page: playerPage } = await freshPage(browser));
  184 |   });
  185 | 
  186 |   test.afterEach(async () => { await playerCtx.close(); });
  187 | 
  188 |   test('4a — after leaving, user lands back on landing page', async () => {
  189 |     await joinAsPlayer(playerPage, roundCode, 'Frank');
  190 |     await expect(playerPage.getByTestId('app-header')).toBeVisible({ timeout: 15000 });
  191 |     const gearBtn = playerPage.locator('[aria-label="Settings"]').first();
  192 |     if (await gearBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
  193 |       await gearBtn.click();
  194 |       const leaveBtn = playerPage.locator('text=/leave this tournament/i').first();
  195 |       if (await leaveBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
  196 |         await leaveBtn.click();
  197 |       }
  198 |     }
  199 |     await expect(playerPage.getByTestId('landing-page')).toBeVisible({ timeout: 15000 });
  200 |   });
  201 | 
  202 |   test('4b — after reload, user is not auto-rejoined', async () => {
  203 |     await joinAsPlayer(playerPage, roundCode, 'Grace');
  204 |     const gearBtn = playerPage.locator('[aria-label="Settings"]').first();
  205 |     if (await gearBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
  206 |       await gearBtn.click();
  207 |       const leaveBtn = playerPage.locator('text=/leave this tournament/i').first();
  208 |       if (await leaveBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
  209 |         await leaveBtn.click();
  210 |       }
  211 |     }
  212 |     await expect(playerPage.getByTestId('landing-page')).toBeVisible({ timeout: 10000 });
```
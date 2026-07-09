const { test, expect } = require('@playwright/test');

// ─── HELPERS ─────────────────────────────────────────────────────────────────

async function freshPage(browser) {
  const ctx = await browser.newContext({ storageState: undefined });
  const page = await ctx.newPage();
  await page.goto('/');
  return { ctx, page };
}

async function assertLandingPage(page) {
  await expect(page.getByTestId('landing-page')).toBeVisible({ timeout: 15000 });
}

async function createTournament(page) {
  await page.getByTestId('start-tournament-btn').click();
  await expect(page.getByTestId('app-header')).toBeVisible({ timeout: 20000 });
  const codeEl = page.getByTestId('round-code');
  await expect(codeEl).toBeVisible({ timeout: 10000 });
  const code = (await codeEl.textContent() || '').trim();
  expect(code).toMatch(/^[A-Z0-9]{5}$/);
  return code;
}

async function joinAsPlayer(page, code, playerName) {
  await assertLandingPage(page);
  await page.getByTestId('join-code-input').fill(code);
  await page.getByTestId('join-btn').click();
  await expect(page.getByTestId('who-are-you-screen')).toBeVisible({ timeout: 15000 });
  const playerBtn = page.locator(`[data-testid^="player-pick-btn"]`).filter({ hasText: playerName }).first();
  if (await playerBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await playerBtn.click();
    await page.getByTestId('confirm-player-btn').click();
  } else {
    await page.getByTestId('not-on-list-btn').click();
    await page.locator('[placeholder="Your name"]').fill(playerName);
    await page.locator('button').filter({ hasText: /join the round/i }).click();
  }
  await expect(page.getByTestId('app-header')).toBeVisible({ timeout: 15000 });
}

// ─── SCENARIO 1: Admin creates tournament ────────────────────────────────────

test.describe('Scenario 1 — Admin creates a tournament', () => {
  let adminCtx, adminPage;

  test.beforeEach(async ({ browser }) => {
    ({ ctx: adminCtx, page: adminPage } = await freshPage(browser));
  });

  test.afterEach(async () => { await adminCtx.close(); });

  test('1a — fresh admin lands on landing page', async () => {
    await assertLandingPage(adminPage);
    await expect(adminPage.getByTestId('start-tournament-btn')).toBeVisible();
    await expect(adminPage.getByTestId('join-code-input')).toBeVisible();
    await expect(adminPage.getByTestId('app-header')).not.toBeVisible();
  });

  test('1b — admin creates tournament and enters dashboard', async () => {
    await adminPage.getByTestId('start-tournament-btn').click();
    await expect(adminPage.getByTestId('landing-page')).not.toBeVisible({ timeout: 15000 });
    await expect(adminPage.getByTestId('app-header')).toBeVisible({ timeout: 20000 });
  });

  test('1c — round code is visible and correctly formatted', async () => {
    await createTournament(adminPage);
    const code = (await adminPage.getByTestId('round-code').textContent() || '').trim();
    expect(code).toMatch(/^[A-Z0-9]{5}$/);
  });

  test('1d — admin controls are present', async () => {
    await createTournament(adminPage);
    const header = adminPage.getByTestId('app-header');
    await expect(header.locator('text=/admin/i').first()).toBeVisible({ timeout: 10000 });
  });

  test('1e — no-players empty state shown before setup', async () => {
    await createTournament(adminPage);
    await expect(adminPage.getByTestId('no-players-state')).toBeVisible({ timeout: 10000 });
    await expect(adminPage.getByTestId('setup-round-btn')).toBeVisible({ timeout: 10000 });
  });
});

// ─── SCENARIO 2: Player joins ─────────────────────────────────────────────────

test.describe('Scenario 2 — Player joins an existing tournament', () => {
  let adminCtx, adminPage, playerCtx, playerPage;
  let roundCode;

  test.beforeAll(async ({ browser }) => {
    ({ ctx: adminCtx, page: adminPage } = await freshPage(browser));
    roundCode = await createTournament(adminPage);
  });

  test.beforeEach(async ({ browser }) => {
    ({ ctx: playerCtx, page: playerPage } = await freshPage(browser));
  });

  test.afterEach(async () => { await playerCtx.close(); });
  test.afterAll(async () => { await adminCtx.close(); });

  test('2a — fresh player lands on landing page not in admin tournament', async () => {
    await assertLandingPage(playerPage);
    await expect(playerPage.getByTestId('app-header')).not.toBeVisible();
  });

  test('2b — player enters join code and sees name picker', async () => {
    await playerPage.getByTestId('join-code-input').fill(roundCode);
    await playerPage.getByTestId('join-btn').click();
    await expect(playerPage.getByTestId('who-are-you-screen')).toBeVisible({ timeout: 15000 });
  });

  test('2c — player can add themselves if not on the list', async () => {
    await playerPage.getByTestId('join-code-input').fill(roundCode);
    await playerPage.getByTestId('join-btn').click();
    await expect(playerPage.getByTestId('who-are-you-screen')).toBeVisible({ timeout: 15000 });
    await playerPage.getByTestId('not-on-list-btn').click();
    await playerPage.locator('[placeholder="Your name"]').fill('Bob');
    await playerPage.locator('button').filter({ hasText: /join the round/i }).click();
    await expect(playerPage.getByTestId('app-header')).toBeVisible({ timeout: 15000 });
  });

  test('2d — player is inside the correct tournament', async () => {
    await joinAsPlayer(playerPage, roundCode, 'Charlie');
    const displayedCode = (await playerPage.getByTestId('round-code').textContent() || '').trim();
    expect(displayedCode).toBe(roundCode);
  });
});

// ─── SCENARIO 3: Invalid join code ───────────────────────────────────────────

test.describe('Scenario 3 — Invalid join code is rejected', () => {
  let ctx, page;

  test.beforeEach(async ({ browser }) => {
    ({ ctx, page } = await freshPage(browser));
  });

  test.afterEach(async () => { await ctx.close(); });

  test('3a — bad code does not route into a tournament', async () => {
    await assertLandingPage(page);
    await page.getByTestId('join-code-input').fill('ZZZZZ');
    await page.getByTestId('join-btn').click();
    await page.waitForTimeout(8000);
    const onLanding = await page.getByTestId('landing-page').isVisible();
    const hasExit = await page.locator('text=/leave|back|home/i').first().isVisible().catch(() => false);
    expect(onLanding || hasExit).toBe(true);
  });

  test('3b — user can recover and try a different code', async () => {
    await page.getByTestId('join-code-input').fill('QQQQQ');
    await page.getByTestId('join-btn').click();
    await page.waitForTimeout(6000);
    const onLanding = await page.getByTestId('landing-page').isVisible();
    if (!onLanding) {
      const leaveBtn = page.locator('text=/leave|home/i').first();
      if (await leaveBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await leaveBtn.click();
      }
    }
    await expect(page.getByTestId('landing-page')).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId('join-code-input')).toBeVisible();
  });
});

// ─── SCENARIO 4: Leave / reset ───────────────────────────────────────────────

test.describe('Scenario 4 — Leave/reset clears session', () => {
  let adminCtx, adminPage, playerCtx, playerPage;
  let roundCode;

  test.beforeAll(async ({ browser }) => {
    ({ ctx: adminCtx, page: adminPage } = await freshPage(browser));
    roundCode = await createTournament(adminPage);
  });

  test.afterAll(async () => { await adminCtx.close(); });

  test.beforeEach(async ({ browser }) => {
    ({ ctx: playerCtx, page: playerPage } = await freshPage(browser));
  });

  test.afterEach(async () => { await playerCtx.close(); });

  test('4a — after leaving, user lands back on landing page', async () => {
    await joinAsPlayer(playerPage, roundCode, 'Frank');
    await expect(playerPage.getByTestId('app-header')).toBeVisible({ timeout: 15000 });
    const gearBtn = playerPage.locator('[aria-label="Settings"]').first();
    if (await gearBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await gearBtn.click();
      const leaveBtn = playerPage.locator('text=/leave this tournament/i').first();
      if (await leaveBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await leaveBtn.click();
      }
    }
    await expect(playerPage.getByTestId('landing-page')).toBeVisible({ timeout: 15000 });
  });

  test('4b — after reload, user is not auto-rejoined', async () => {
    await joinAsPlayer(playerPage, roundCode, 'Grace');
    const gearBtn = playerPage.locator('[aria-label="Settings"]').first();
    if (await gearBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await gearBtn.click();
      const leaveBtn = playerPage.locator('text=/leave this tournament/i').first();
      if (await leaveBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await leaveBtn.click();
      }
    }
    await expect(playerPage.getByTestId('landing-page')).toBeVisible({ timeout: 10000 });
    await playerPage.reload();
    await playerPage.waitForTimeout(5000);
    await expect(playerPage.getByTestId('landing-page')).toBeVisible({ timeout: 15000 });
    await expect(playerPage.getByTestId('app-header')).not.toBeVisible();
  });
});

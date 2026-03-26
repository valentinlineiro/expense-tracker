import { test, expect, Page } from '@playwright/test';

// Wait for the Angular store to finish initializing (store.init() is async)
async function waitForApp(page: Page) {
  // The FAB is rendered only after the app shell and store are ready
  await page.getByRole('button', { name: '+' }).waitFor({ state: 'visible' });
}

async function openModal(page: Page) {
  await page.getByRole('button', { name: '+' }).click();
  await page.getByText('Nueva transacción').waitFor({ state: 'visible' });
}

async function fillAmount(page: Page, amount: string) {
  await page.locator('input[type="number"]').fill(amount);
}

async function selectCategory(page: Page, name: string) {
  // Click the category button that contains the category name text
  await page.locator('button', { hasText: name }).first().click();
}

test.describe('Today view', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForApp(page);
  });

  test('shows empty state on first load', async ({ page }) => {
    await expect(page.getByText('Sin movimientos hoy')).toBeVisible();
  });

  test('FAB opens the transaction modal', async ({ page }) => {
    await page.getByRole('button', { name: '+' }).click();
    await expect(page.getByText('Nueva transacción')).toBeVisible();
  });

  test('save button is disabled when amount is empty', async ({ page }) => {
    await openModal(page);
    await expect(page.getByRole('button', { name: 'Agregar' })).toBeDisabled();
  });

  test('save button enables after entering a valid amount', async ({ page }) => {
    await openModal(page);
    await fillAmount(page, '25.50');
    await expect(page.getByRole('button', { name: 'Agregar' })).toBeEnabled();
  });

  test('can add an expense and see it in the list', async ({ page }) => {
    await openModal(page);
    await fillAmount(page, '12.50');
    await page.getByRole('button', { name: 'Agregar' }).click();

    await expect(page.getByText('Nueva transacción')).not.toBeVisible();
    await expect(page.getByText('Comida')).toBeVisible();
  });

  test('can add an expense with a note', async ({ page }) => {
    await openModal(page);
    await fillAmount(page, '8.00');
    await page.locator('input[placeholder="Descripción..."]').fill('Café con leche');
    await page.getByRole('button', { name: 'Agregar' }).click();

    await expect(page.getByText('Café con leche')).toBeVisible();
  });

  test('can add an income', async ({ page }) => {
    await openModal(page);
    await page.getByRole('button', { name: 'Ingreso' }).click();
    await fillAmount(page, '1500');
    await selectCategory(page, 'Salario');
    await page.getByRole('button', { name: 'Agregar' }).click();

    await expect(page.getByText('Nueva transacción')).not.toBeVisible();
    await expect(page.getByText('Salario')).toBeVisible();
  });

  test('can delete a transaction', async ({ page }) => {
    await openModal(page);
    await fillAmount(page, '5');
    await page.getByRole('button', { name: 'Agregar' }).click();
    await expect(page.getByText('Comida')).toBeVisible();

    page.once('dialog', d => d.accept());
    await page.getByTitle('Eliminar').click();
    await expect(page.getByText('Sin movimientos hoy')).toBeVisible();
  });

  test('closing the modal without saving keeps the list empty', async ({ page }) => {
    await openModal(page);
    await fillAmount(page, '50');
    await page.getByRole('button', { name: '✕' }).click();

    await expect(page.getByText('Sin movimientos hoy')).toBeVisible();
  });

  test('balance reflects added transactions', async ({ page }) => {
    await openModal(page);
    await fillAmount(page, '30');
    await page.getByRole('button', { name: 'Agregar' }).click();
    await expect(page.getByText('Comida')).toBeVisible();

    // Balance card shows the expense amount somewhere on the page
    await expect(page.locator('.mono').filter({ hasText: '30' }).first()).toBeVisible();
  });
});

test.describe('Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForApp(page);
  });

  test('navigates to Mes', async ({ page }) => {
    await page.getByRole('link', { name: /Mes/i }).click();
    await expect(page).toHaveURL(/\/month/);
  });

  test('navigates to Stats', async ({ page }) => {
    await page.getByRole('link', { name: /Stats/i }).click();
    await expect(page).toHaveURL(/\/stats/);
  });

  test('navigates to Ajustes', async ({ page }) => {
    await page.getByRole('link', { name: /Ajustes/i }).click();
    await expect(page).toHaveURL(/\/settings/);
  });
});

test.describe('Settings', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/settings');
    // Wait for settings to load
    await page.getByText('Ajustes').waitFor({ state: 'visible' });
  });

  test('can change the currency symbol', async ({ page }) => {
    const input = page.locator('input[maxlength="3"]');
    await input.clear();
    await input.fill('$');
    await page.getByRole('button', { name: 'Guardar' }).click();
    await expect(page.getByText('✓ Guardado')).toBeVisible();
  });

  test('can add a custom category', async ({ page }) => {
    await page.locator('input[maxlength="2"]').fill('🍕');
    await page.locator('input[placeholder="Nombre"]').fill('Pizza');
    await page.getByRole('button', { name: '+ Agregar' }).click();
    await expect(page.getByText('Pizza')).toBeVisible();
  });
});

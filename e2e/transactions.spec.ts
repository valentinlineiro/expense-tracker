import { test, expect, Page } from '@playwright/test';

// Clear IndexedDB before each test for a clean state
async function clearDB(page: Page) {
  await page.evaluate(() =>
    new Promise<void>((resolve, reject) => {
      const req = indexedDB.deleteDatabase('expense-tracker-db');
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
      req.onblocked = () => resolve(); // still continue
    })
  );
  await page.reload();
}

test.describe('Today view', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await clearDB(page);
  });

  test('shows empty state', async ({ page }) => {
    await expect(page.getByText('Sin movimientos hoy')).toBeVisible();
  });

  test('FAB opens the transaction modal', async ({ page }) => {
    await page.getByRole('button', { name: '+' }).click();
    await expect(page.getByText('Nueva transacción')).toBeVisible();
  });

  test('save button is disabled when amount is empty', async ({ page }) => {
    await page.getByRole('button', { name: '+' }).click();
    const saveBtn = page.getByRole('button', { name: 'Agregar' });
    await expect(saveBtn).toBeDisabled();
  });

  test('save button enables after entering a valid amount', async ({ page }) => {
    await page.getByRole('button', { name: '+' }).click();
    await page.locator('input[type="number"]').fill('25.50');
    const saveBtn = page.getByRole('button', { name: 'Agregar' });
    await expect(saveBtn).toBeEnabled();
  });

  test('can add an expense and see it in the list', async ({ page }) => {
    await page.getByRole('button', { name: '+' }).click();
    await page.locator('input[type="number"]').fill('12.50');
    await page.getByRole('button', { name: 'Agregar' }).click();

    // Modal closes and transaction appears
    await expect(page.getByText('Nueva transacción')).not.toBeVisible();
    await expect(page.getByText('Comida')).toBeVisible();
  });

  test('can add an expense with a note', async ({ page }) => {
    await page.getByRole('button', { name: '+' }).click();
    await page.locator('input[type="number"]').fill('8.00');
    await page.locator('input[placeholder="Descripción..."]').fill('Café con leche');
    await page.getByRole('button', { name: 'Agregar' }).click();

    await expect(page.getByText('Café con leche')).toBeVisible();
  });

  test('can add an income', async ({ page }) => {
    await page.getByRole('button', { name: '+' }).click();
    await page.getByRole('button', { name: 'Ingreso' }).click();
    await page.locator('input[type="number"]').fill('1500');
    // Select Salario category
    await page.getByText('Salario').click();
    await page.getByRole('button', { name: 'Agregar' }).click();

    await expect(page.getByText('Salario')).toBeVisible();
  });

  test('balance updates after adding transactions', async ({ page }) => {
    // Add expense
    await page.getByRole('button', { name: '+' }).click();
    await page.locator('input[type="number"]').fill('30');
    await page.getByRole('button', { name: 'Agregar' }).click();

    // Balance shows negative
    await expect(page.locator('.mono').first()).toContainText('30');
  });

  test('can delete a transaction', async ({ page }) => {
    // Add one first
    await page.getByRole('button', { name: '+' }).click();
    await page.locator('input[type="number"]').fill('5');
    await page.getByRole('button', { name: 'Agregar' }).click();
    await expect(page.getByText('Comida')).toBeVisible();

    // Delete it
    page.once('dialog', d => d.accept());
    await page.getByTitle('Eliminar').click();
    await expect(page.getByText('Sin movimientos hoy')).toBeVisible();
  });

  test('closing the modal without saving keeps the list empty', async ({ page }) => {
    await page.getByRole('button', { name: '+' }).click();
    await page.locator('input[type="number"]').fill('50');
    await page.getByRole('button', { name: '✕' }).click();

    await expect(page.getByText('Sin movimientos hoy')).toBeVisible();
  });
});

test.describe('Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('bottom nav navigates to Mes', async ({ page }) => {
    await page.getByRole('link', { name: /Mes/i }).click();
    await expect(page).toHaveURL(/\/month/);
  });

  test('bottom nav navigates to Stats', async ({ page }) => {
    await page.getByRole('link', { name: /Stats/i }).click();
    await expect(page).toHaveURL(/\/stats/);
  });

  test('bottom nav navigates to Ajustes', async ({ page }) => {
    await page.getByRole('link', { name: /Ajustes/i }).click();
    await expect(page).toHaveURL(/\/settings/);
  });
});

test.describe('Settings', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/settings');
  });

  test('can change the currency symbol', async ({ page }) => {
    await page.locator('input[placeholder="€"]').fill('$');
    await page.getByRole('button', { name: 'Guardar' }).click();
    await expect(page.getByText('✓ Guardado')).toBeVisible();
  });

  test('can add a custom category', async ({ page }) => {
    await page.locator('input[placeholder="🏷"]').fill('🍕');
    await page.locator('input[placeholder="Nombre"]').fill('Pizza');
    await page.getByRole('button', { name: '+ Agregar' }).click();
    await expect(page.getByText('Pizza')).toBeVisible();
  });
});

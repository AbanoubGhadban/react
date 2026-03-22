import {test, expect} from '@playwright/test';

test('smoke test', async ({page}) => {
  const consoleErrors = [];
  page.on('console', msg => {
    const type = msg.type();
    if (type === 'warn' || type === 'error') {
      consoleErrors.push({type: type, text: msg.text()});
    }
  });
  const pageErrors = [];
  page.on('pageerror', error => {
    pageErrors.push(error.stack);
  });
  await page.goto('/');
  await expect(page.getByTestId('promise-as-a-child-test')).toHaveText(
    'Promise as a child hydrates without errors: deferred text'
  );
  await expect(page.getByTestId('prerendered')).not.toBeAttached();

  await expect(consoleErrors).toEqual([]);
  await expect(pageErrors).toEqual([]);

  await page.goto('/prerender');
  await expect(page.getByTestId('prerendered')).toBeAttached();

  await expect(consoleErrors).toEqual([]);
  await expect(pageErrors).toEqual([]);
});

test('records JS chunks for CSS-importing client component and loads it in both paths', async ({
  page,
  request,
}) => {
  const consoleErrors = [];
  page.on('console', msg => {
    const type = msg.type();
    if (type === 'warn' || type === 'error') {
      consoleErrors.push({type, text: msg.text()});
    }
  });

  const pageErrors = [];
  page.on('pageerror', error => {
    pageErrors.push(error.stack || error.message);
  });

  await page.goto('/');

  const manifestResponse = await request.get('/react-client-manifest.json');
  expect(manifestResponse.ok()).toBe(true);
  const manifest = await manifestResponse.json();

  const moduleMetadata =
    manifest.filePathToModuleMetadata ?? manifest;

  const dynamicEntry = Object.entries(moduleMetadata).find(([key]) =>
    key.includes('Dynamic.js')
  );
  expect(dynamicEntry).toBeTruthy();

  const [, entry] = dynamicEntry;
  expect(entry.chunks.length).toBeGreaterThan(0);

  const filenames = entry.chunks.filter((_, index) => index % 2 === 1);
  expect(
    filenames.some(
      name => typeof name === 'string' && name.endsWith('.js') && !name.endsWith('.hot-update.js')
    )
  ).toBe(true);
  expect(
    filenames.some(name => typeof name === 'string' && name.endsWith('.css'))
  ).toBe(false);

  await expect(page.getByTestId('dynamic-component')).toHaveCount(1);
  await expect(pageErrors).toEqual([]);
  await expect(consoleErrors).toEqual([]);

  await page.getByRole('button', {name: 'Load dynamic import Component'}).click();

  await expect(page.getByText('loaded dynamically:')).toBeVisible();
  await expect(page.getByTestId('dynamic-component')).toHaveCount(2);

  await expect(pageErrors).toEqual([]);
  await expect(consoleErrors).toEqual([]);
});

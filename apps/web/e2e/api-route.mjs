export const E2E_ADMIN_TOKEN =
  'eyJhbGciOiJub25lIn0.eyJleHAiOjQxMDM5ODc5OTksInN1YiI6ImFkbWluLTEifQ.';

export function apiRoutePattern(pathPattern) {
  return new RegExp(
    `^https?://(?:localhost|127\\.0\\.0\\.1):4101${pathPattern}$`,
  );
}

export async function stubAdminRefresh(page) {
  await page.route(apiRoutePattern('/auth/refresh'), async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ accessToken: E2E_ADMIN_TOKEN }),
    });
  });
}

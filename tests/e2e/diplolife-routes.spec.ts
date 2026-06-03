import { expect, test } from "@playwright/test";

const ROUTES = [
  { path: "/", heading: "DiploLife" },
  { path: "/onboarding", heading: "체류 정보를 기준으로 DiploLife를 설정합니다" },
  { path: "/dashboard", heading: "오늘의 체류 상태" },
  { path: "/chat", heading: "체류 생활 상담" },
  { path: "/sos", heading: "긴급 상황" },
  { path: "/cost", heading: "생활비 인사이트" },
  { path: "/settings", heading: "설정 / 프로필" },
  { path: "/safety", heading: "안전 상세" },
  { path: "/visa", heading: "비자 가이드" },
  { path: "/notices", heading: "공지 목록" },
] as const;

for (const route of ROUTES) {
  test(`${route.path} renders the DiploLife route`, async ({ page }) => {
    await page.goto(route.path);
    await expect(page.locator("#main-content")).toBeVisible();
    await expect(page.getByRole("heading", { name: route.heading, level: 1 })).toBeVisible();
  });
}

test("desktop shell exposes the fixed primary navigation", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/dashboard");

  const primaryNav = page.getByRole("navigation", { name: "주요 메뉴" });
  await expect(primaryNav).toBeVisible();
  await expect(primaryNav.getByRole("link", { name: "대시보드" })).toHaveAttribute(
    "aria-current",
    "page",
  );
  await expect(primaryNav.getByRole("link", { name: "AI 어시스턴트" })).toHaveAttribute(
    "href",
    "/chat",
  );
  await expect(page.getByRole("link", { name: "SOS 열기" })).toBeVisible();
});

test("mobile shell exposes the bottom tab navigation", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/chat");

  const bottomNav = page.getByRole("navigation", { name: "하단 메뉴" });
  await expect(bottomNav).toBeVisible();
  await expect(bottomNav.getByRole("link", { name: "AI" })).toHaveAttribute(
    "aria-current",
    "page",
  );
  await expect(bottomNav.getByRole("link", { name: "홈" })).toHaveAttribute("href", "/dashboard");
  await expect(page.getByRole("button", { name: "알림" })).toBeVisible();
  await expect(page.getByRole("button", { name: "메뉴" })).toBeVisible();
});

import { test, expect } from "@playwright/test";
import tags from "../test-data/tags.json";

test.beforeEach(async ({ page }) => {
  await page.route("*/**/api/tags", async (route) => {
    await route.fulfill({
      body: JSON.stringify(tags),
    });
  });

  await page.goto("https://conduit.bondaracademy.com/");
});

test("Has title", async ({ page }) => {
  await page.route("*/**/api/articles*", async (route) => {
    const response = await route.fetch();
    const resBody = await response.json();
    resBody.articles[0].title = "This is a Mock test title";
    resBody.articles[0].description = "This is a Mock description";

    await route.fulfill({
      body: JSON.stringify(resBody),
    });
  });

  await page.getByText("Global Feed").click();
  await expect(page.locator(".navbar-brand")).toHaveText("conduit");
  await expect(page.locator("app-article-list h1").first()).toContainText(
    "This is a Mock test title"
  );
  await expect(page.locator("app-article-list p").first()).toContainText(
    "This is a Mock description"
  );
});

test("Delete article", async ({ page, request }) => {
  const response = await request.post(
    "https://conduit-api.bondaracademy.com/api/users/login",
    {
      data: {
        user: {
          email: "",
          password: "",
        },
      },
    }
  );

  const resBody = await response.json();
  const accessToken = resBody.user.token;

  const articleResponse = await request.post(
    "https://conduit-api.bondaracademy.com/api/articles/",
    {
      data: {
        article: {
          title: "This is a test article",
          description: "Test description",
          body: "Test body",
          tagList: [],
        },
      },
      headers: {
        Authorization: `Token ${accessToken}`,
      },
    }
  );
  expect(articleResponse.status()).toEqual(201);

  await page.getByText("Global Feed").click();
  await page.getByText("This is a test article").click();
  await page.getByRole("button", { name: "Delete Article" }).first().click();
  await page.getByText("Global Feed").click();
  await expect(page.locator("app-article-list h1").first()).not.toContainText("This is a test article");
});

test("Create article", async ({ page, request }) => {
  await page.getByText("New Article").click();
  await page.getByRole("textbox", { name: "Article Title" }).fill("Playwright is awesome");
  await page.getByRole("textbox", { name: "What's this article about?" }).fill("About the playwright");
  await page.getByRole("textbox", { name: "Write your article (in markdown)" }).fill("We like to use playwright for automation");
  await page.getByRole("button", { name: "Publish Article" }).click();
  const articleRes =  await page.waitForResponse("https://conduit-api.bondaracademy.com/api/articles/");
  const articleResBody = await articleRes.json();
  const slugId = await articleResBody.article.slug;

  await expect(page.locator(".article-page h1")).toContainText('Playwright is awesome');  
  await page.getByText("Home").click();
  await page.getByText("Global Feed").click();
  await expect(page.locator("app-article-list h1").first()).toContainText("Playwright is awesome");

  const response = await request.post(
    "https://conduit-api.bondaracademy.com/api/users/login",
    {
      data: {
        user: {
          email: "",
          password: "",
        },
      },
    }
  );

  const resBody = await response.json();
  const accessToken = resBody.user.token;

  const deleteArticleRes = await request.delete(`https://conduit-api.bondaracademy.com/api/articles/${slugId}`, {
    headers: {
      Authorization: `Token ${accessToken}`
    },
  })
  expect(deleteArticleRes.status()).toEqual(204);
});

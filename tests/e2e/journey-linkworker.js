// Journey D: link worker builds a Spanish sheet with needs, prints it, and the form is wiped.
async (page) => {
  const base = "http://localhost:3761";
  const vw = page.viewportSize()?.width ?? 0;
  const tag = vw < 600 ? "mobile" : "desktop";
  const shots = "D:/claude/regulars/tests/e2e/screens";
  const out = {};

  await page.goto(`${base}/link-worker`);
  await page.getByLabel("First name on the sheet").fill("Rosa");
  const hood = page.getByLabel("Neighborhood and city");
  await hood.fill("Ballard, Seattle");
  await hood.blur();
  await page.getByText("Ballard, Seattle").first().waitFor({ timeout: 15000 });
  const loves = ["Ella Fitzgerald", "Murder, She Wrote", "Agatha Christie"];
  for (let i = 0; i < 3; i++) {
    const f = page.getByLabel(`Thing they love ${i + 1}`);
    await f.fill(loves[i]);
    await f.blur();
  }
  await page.waitForTimeout(2500);
  out.resolved = await page.locator("fieldset p[aria-live]").allInnerTexts();
  await page.getByRole("button", { name: "Step free entrance" }).click();
  await page.getByRole("button", { name: "Daytime only" }).click();
  await page.getByLabel("Sheet language").selectOption("es");
  await page.getByLabel("Your name").fill("Jordan Ellis");
  await page.getByLabel("Your phone").fill("(206) 555 0148");

  const t0 = Date.now();
  await page.getByRole("button", { name: "Build the Sheet" }).click();
  await page.locator(".print-sheet").waitFor({ timeout: 70000 });
  out.buildMs = Date.now() - t0;
  out.sheet = (await page.locator(".print-sheet").innerText()).slice(0, 900);
  out.storageKeys = await page.evaluate(() => Object.keys(localStorage));
  await page.screenshot({ path: `${shots}/${tag}-linkworker.png`, fullPage: true });

  await page.emulateMedia({ media: "print" });
  await page.screenshot({ path: `${shots}/${tag}-sheet-print.png`, fullPage: true });
  await page.pdf?.({ path: `${shots}/sheet.pdf`, format: "Letter" }).catch(() => null);
  await page.emulateMedia({ media: "screen" });

  // Simulate the print dialog closing: the form must clear itself.
  await page.evaluate(() => {
    window.__printed = true;
  }).catch(() => null);
  await page.getByRole("button", { name: "Print Sheet" }).evaluate(() => {
    window.print = () => window.dispatchEvent(new Event("afterprint"));
  });
  await page.getByRole("button", { name: "Print Sheet" }).click();
  await page.getByText("Sheet printed. Everything you typed has been cleared.").waitFor({ timeout: 5000 });
  out.afterPrint = {
    name: await page.getByLabel("First name on the sheet").inputValue(),
    sheetVisible: await page.locator(".print-sheet").count(),
  };
  return JSON.stringify(out, null, 2);
}

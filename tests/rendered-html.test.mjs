import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("startsidan innehåller varumärke och prisräknare", async () => {
  const html = await readFile("dist/static/index.html", "utf8");
  assert.match(html, /Rent hemma/);
  assert.match(html, /PRISRÄKNARE/);
  assert.match(html, /35 kr/);
});

import { readFile } from "node:fs/promises";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { BrandMark, filmIconPath } from "@/components/brand-mark";

describe("IDriveTube brand mark", () => {
  it("uses the same film glyph in the navbar and favicon", async () => {
    const markup = renderToStaticMarkup(<BrandMark />);
    const favicon = await readFile("src/app/icon.svg", "utf8");
    expect(markup).toContain(filmIconPath);
    expect(favicon).toContain(filmIconPath);
  });
});

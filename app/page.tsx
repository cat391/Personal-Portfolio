// Palette for ANSI truecolor segments.
const faceColorRgb = [102, 169, 173];
const outlineColorRgb = [102, 169, 173]; // outline characters ▀ ▄ ▐ ▌
const doubleLineColorRgb = [184, 210, 211]; // box-drawing ║ ═ ╔ ╗ ╚ ╝ ╠ ╣ ╦ ╩ ╬

// Glyphs for each letter, built from block and box-drawing characters to give a pixel-outline vibe.
const letters: Record<string, string[]> = {
  C: [
    " ▐█████╗",
    "▐██████║",
    "███╔═══╝",
    "███║    ",
    "███╚═══╗",
    "▐██████║",
    " ▐█████╝",
  ],
  O: [
    " ██████ ",
    "▐██████▌",
    "██╔═══██",
    "██║   ██",
    "██╚═══██",
    "▐██████▌",
    " ██████ ",
  ],
  L: [
    "███╗    ",
    "███║    ",
    "███║    ",
    "███║    ",
    "███╚═══╗",
    "███████║",
    "███████╝",
  ],
  E: [
    "████████╗",
    "███╔════╝",
    "███╚════╗",
    "████████║",
    "███╔════╝",
    "███╚════╗",
    "████████╝",
  ],
};

// Turns an ASCII line into an ANSI-colored string based on per-character mapping.
const applyAnsiColorsToLine = (line: string): string => {
  const ansiReset = "\u001b[0m"; // Resets all ANSI styles
  const toAnsiColorCode = (rgb: number[]) => `\u001b[38;2;${rgb.join(";")}m`; // Sets foreground color

  // Map each character to a palette entry; undefined leaves the default text color intact.
  const mapCharToColor = (character: string): number[] | undefined => {
    if ("█" === character) return faceColorRgb;
    if ("▏▎▍▌▋▊▉▐▕▐▍▌▎▏".includes(character)) return outlineColorRgb;
    if ("║═╔╗╚╝╠╣╦╩╬".includes(character)) return doubleLineColorRgb;
    return undefined;
  };

  let ansiLine = "";
  let activeColor: number[] | undefined;

  // Walk characters, emit ANSI start codes when the color changes, and reset when leaving colored spans.
  for (const character of line) {
    const nextColor = mapCharToColor(character);
    if (
      (nextColor && !activeColor) ||
      (nextColor &&
        activeColor &&
        nextColor.some((value, idx) => value !== activeColor[idx]))
    ) {
      ansiLine += toAnsiColorCode(nextColor);
      activeColor = nextColor;
    } else if (!nextColor && activeColor) {
      ansiLine += ansiReset;
      activeColor = undefined;
    }
    ansiLine += character;
  }

  if (activeColor) ansiLine += ansiReset;
  return ansiLine;
};

// Breaks an ANSI string into styled spans so the browser can render colors (since DOM ignores raw ANSI).
// It scans for ANSI codes, slices the text between them, and annotates each slice with the last seen color.
const parseAnsiToSegments = (
  line: string
): { text: string; color?: string }[] => {
  const ansiSegments: { text: string; color?: string }[] = [];
  // Captures ANSI escape sequences like "\u001b[38;2;R;G;Bm" or "\u001b[0m".
  const regex = /\u001b\[(\d+(?:;\d+)*)m/g;
  let lastIndex = 0; // Tracks the end of the previous match to slice plain text that precedes the next code.
  let currentRgbCss: string | undefined; // Holds the active RGB color as a CSS string while iterating.

  let match: RegExpExecArray | null;
  while ((match = regex.exec(line)) !== null) {
    // Any plain text before this escape code is emitted with the current color (if any).
    const before = line.slice(lastIndex, match.index);
    if (before) ansiSegments.push({ text: before, color: currentRgbCss });

    // Interpret the escape payload and update the active color.
    const code = match[1];
    if (code === "0") {
      currentRgbCss = undefined;
    } else if (code.startsWith("38;2;")) {
      // Format is 38;2;R;G;B — grab each component explicitly.
      const [, , rStr, gStr, bStr] = code.split(";");
      const [r, g, b] = [rStr, gStr, bStr].map((n) => parseInt(n, 10));
      currentRgbCss = `rgb(${r}, ${g}, ${b})`;
    }
    lastIndex = regex.lastIndex;
  }

  // Emit any trailing text after the final escape code.
  const rest = line.slice(lastIndex);
  if (rest) ansiSegments.push({ text: rest, color: currentRgbCss });

  return ansiSegments;
};

const ColeLogo = () => {
  const logoLetters = ["C", "O", "L", "E"];
  // Build rows by stitching together each letter’s row with padding for spacing.
  const mergedRows = Array.from({ length: 8 }, (_, row) =>
    logoLetters.map((letter) => letters[letter][row]).join("  ")
  );

  // Apply coloring after rows are composed; each row becomes an ANSI-styled string.
  const coloredRows = mergedRows.map(applyAnsiColorsToLine);

  return (
    <div className="w-full flex justify-center px-4">
      <pre className="inline-block font-mono text-[12px] leading-[12px] sm:text-[14px] sm:leading-[14px] whitespace-pre">
        {coloredRows.map((line, rowIndex) => (
          <span key={rowIndex} className="block">
            {parseAnsiToSegments(line).map((segment, segmentIndex) => (
              <span
                key={segmentIndex}
                style={segment.color ? { color: segment.color } : undefined}
              >
                {segment.text}
              </span>
            ))}
          </span>
        ))}
      </pre>
    </div>
  );
};

export default function Home() {
  return (
    <main className="min-h-screen flex items-start justify-center pt-8 text-orange-200">
      <ColeLogo />
    </main>
  );
}

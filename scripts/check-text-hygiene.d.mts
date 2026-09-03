export interface TextHygieneFinding {
  file: string;
  line: number;
  column: number;
  codePoint: string;
  escaped: string;
  name: string;
}

export declare function checkText(
  content: string,
  file: string,
): { findings: TextHygieneFinding[]; total: number };
export declare function formatFinding(finding: TextHygieneFinding): string;

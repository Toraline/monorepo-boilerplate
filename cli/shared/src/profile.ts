/**
 * Reads one value of the project profile: the table in AGENTS.md whose rows
 * are "| `key` | `value` | meaning |". Returns "" when the key is missing or
 * its value is not set yet ("<ask>"). The same rule as scripts/profile.sh.
 */
export function profileValue(agentsFileText: string, key: string): string {
  for (const line of agentsFileText.split("\n")) {
    const cells = line.split("|").map((cell) => cell.trim().replaceAll("`", ""));
    if (cells[1] === key) {
      const value = cells[2] ?? "";
      return value.startsWith("<ask>") ? "" : value;
    }
  }
  return "";
}

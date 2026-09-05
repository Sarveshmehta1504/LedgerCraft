// Same policy the backend enforces on signup and reset (see docs/API_DOCUMENTATION.md).
export const PASSWORD_HINT =
  "Over 8 characters, with upper, lower and a special character.";

export function validatePassword(value: string): string | undefined {
  if (value.length <= 8) return "Must be more than 8 characters.";
  if (!/[a-z]/.test(value)) return "Must include a lowercase letter.";
  if (!/[A-Z]/.test(value)) return "Must include an uppercase letter.";
  if (!/[^A-Za-z0-9]/.test(value)) return "Must include a special character.";
  return undefined;
}

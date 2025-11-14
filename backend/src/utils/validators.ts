// Check that the PIN is four digits
export function isValidPin(pin: string): boolean {
  return /^\d{4}$/.test(pin);
}

// Make sure the name exists and is a reasonable length
export function isValidName(name: string): boolean {
  return name && name.trim().length > 0 && name.trim().length <= 50;
}

// Confirm the lobby code matches our pattern
export function isValidLobbyCode(code: string): boolean {
  return /^[A-Z0-9]{6}$/.test(code);
}

// Strip angle brackets, trim, and shorten inputs
export function sanitizeString(input: string): string {
  return input
    .replace(/[<>]/g, '')
    .trim()
    .slice(0, 200); // Limit length
}

// Check that an answer is present and not huge
export function isValidAnswer(answer: string): boolean {
  return answer && answer.trim().length > 0 && answer.length <= 500;
}

// Ensure max players sits inside the allowed range
export function isValidMaxPlayers(maxPlayers: number): boolean {
  return Number.isInteger(maxPlayers) && maxPlayers >= 2 && maxPlayers <= 16;
}

// Make sure question count stays within limits
export function isValidQuestionCount(count: number): boolean {
  return Number.isInteger(count) && count >= 5 && count <= 50;
}


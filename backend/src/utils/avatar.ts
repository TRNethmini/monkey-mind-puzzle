export const generateAvatarUrl = (): string => {
  const randomSeed = Date.now() + Math.floor(Math.random() * 1_000_000);
  return `https://www.placemonkeys.com/300?random=${randomSeed}`;
};

export const ensureAvatar = (existingUrl?: string): string => {
  return existingUrl && existingUrl.trim().length > 0 ? existingUrl : generateAvatarUrl();
};


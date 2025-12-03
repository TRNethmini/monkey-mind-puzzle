export const generateAvatarUrl = () => {
  const randomSeed = Date.now() + Math.floor(Math.random() * 1_000_000);
  return `https://www.placemonkeys.com/300?random=${randomSeed}`;
};

export const ensureAvatar = (existingUrl) => {
  return existingUrl && existingUrl.trim().length > 0 ? existingUrl : generateAvatarUrl();
};


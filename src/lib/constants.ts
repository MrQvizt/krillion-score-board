/** Krillion serves 7 prompts a day; the rarest answer on a prompt pays 100. */
export const PROMPTS_PER_DAY = 7;
export const MAX_PROMPT_SCORE = 100;
export const MAX_DAILY_SCORE = PROMPTS_PER_DAY * MAX_PROMPT_SCORE; // 700

/** Krillion converts points to dive depth at 1 point = 10 metres (230 points shows as 2,300 m in the game). */
export const METRES_PER_POINT = 10;

/** Scores older than this cannot be logged (keeps the date picker sane). */
export const EARLIEST_PLAY_DATE = "2024-01-01";

/** The actual game. Linked from the top bar and the daily reminder. */
export const KRILLION_URL = "https://krillion.io/";

export const SITE_NAME = "Krillion Score Board";
export const SITE_TAGLINE = "Log your daily dive. Out-krill your friends.";

export const BOARD_EMOJIS = ["🦐", "🐙", "🐡", "🦑", "🐠", "🐳", "🦀", "🐚", "🌊", "⚓", "🏆", "🔥"];

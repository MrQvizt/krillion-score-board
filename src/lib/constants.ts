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
/** For the top bar on phones. */
export const SITE_SHORT_NAME = "Krillion";
export const SITE_TAGLINE = "Log your daily dive. Out-krill your friends.";

/**
 * A picture mascot with no emoji of its own, drawn by BoardMascot. It is saved
 * in the board's emoji column under this key, so it must stay within the
 * column's 8 characters.
 */
export const SNORKEL_DUCK = ":duck:";

/** The mascots an admin can pick for a board. */
export const BOARD_EMOJIS = ["🦐", "🐙", "🐡", "🦑", "🐠", "🐳", "🦀", "🐚", "🌊", "⚓", "🏆", "🔥", SNORKEL_DUCK];

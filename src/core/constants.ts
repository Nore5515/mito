/**
 * In Mito, our standard units of measurement are:
 *
 * Distance - tiles.
 * Time - seconds.
 */

/**
 * How many tiles per second the Player moves.
 */
export const PLAYER_BASE_SPEED = 4.2;
export const PLAYER_MAX_RESOURCES = 100;
export const PLAYER_STARTING_WATER = 25;
export const PLAYER_STARTING_SUGAR = 25;

export const PLAYER_INTERACT_EXCHANGE_SPEED = 30;

/**
 * 3 resources per second.
 */
export const PLAYER_INTERACT_EXCHANGE_NONCELL_SPEED = 3;
/**
 * How fast the Player moves from standing on Transport.
 */
export const PLAYER_MOVED_BY_TRANSPORT_SPEED = 0.3;

/**
 * Number of realtime seconds in a game year.
 */
export const TIME_PER_YEAR = 60 * 36; // 60 seconds * 36 minutes = 1800 seconds
export const TIME_PER_SEASON = TIME_PER_YEAR / 4; // 480 seconds per season (9 minutes)
export const TIME_PER_MONTH = TIME_PER_SEASON / 3; // 180 seconds per month (3 minutes)
export const TIME_PER_DAY = TIME_PER_MONTH / 3; // 60 seconds per day (1 minute)

/**
 * How many seconds by default it takes to build a Cell.
 */
export const CELL_BUILD_TIME = 0;

/**
 * How many tiles per frame a cell will freefall in the Air. Unscaled
 * by time.
 */
export const CELL_DROOP = 0.027;

/**
 * In a two Cell system with one Water, this water will diffuse, on average, after this many seconds.
 * Divide this by 8 to get an idea of how "fast" a single water will move on a fully filled out Tissue plane.
 */
export const CELL_DIFFUSION_WATER_TIME = 16.6667;

/**
 * See CELL_DIFFUSION_WATER_TIME explanation.
 */
export const CELL_DIFFUSION_SUGAR_TIME = 16.6667;

/**
 * Max inventory capacity of Tissue, Transports, and Roots.
 */
export const TISSUE_INVENTORY_CAPACITY = 6;

/**
 * On average, for each Air tile adjacent to each Leaf, water will be converted to sugar after this many seconds.
 */
export const LEAF_REACTION_TIME = 40;

export const SUNLIGHT_REINTRODUCTION = 0.15;

export const SUNLIGHT_DIFFUSION = 0.0;

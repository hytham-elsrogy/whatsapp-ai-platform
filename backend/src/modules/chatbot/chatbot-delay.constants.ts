export const CHATBOT_DELAY_QUEUE = 'chatbot-delay';

// A misconfigured huge delay (e.g. a typo like 999999999 seconds) shouldn't
// leave an effectively-permanent BullMQ delayed job sitting around.
export const MAX_DELAY_SECONDS = 24 * 60 * 60; // 24h

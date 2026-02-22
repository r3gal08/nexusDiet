// classifier.js

// TODO: Maybe export this into a more official file (this is good for now....)
const CATEGORY_DICTIONARY = {
    "Technology": ["software", "programming", "hardware", "app", "developer", "cloud", "ai", "cybersecurity", "tech", "algorithm", "javascript", "python", "computer"],
    "Sports": ["football", "basketball", "soccer", "olympics", "tournament", "championship", "coach", "athlete", "nfl", "nba", "pitch", "goal", "stadium"],
    "Politics": ["election", "government", "congress", "senate", "lawmaker", "democrat", "republican", "policy", "president", "vote", "campaign", "parliament"],
    "History": ["century", "ancient", "war", "historical", "empire", "archaeology", "museum", "medieval", "chronicle", "artifact", "dynasty"],
    "Science": ["research", "study", "scientist", "physics", "biology", "space", "astronomy", "dna", "chemistry", "quantum", "experiment", "molecule"],
    "Entertainment": ["movie", "film", "celebrity", "music", "album", "actor", "hollywood", "concert", "singer", "pop", "tv", "show", "director"]
};

/**
 * Calculates a category based on keyword matching heuristics.
 * This is a "good enough" approach until we implement until future version 
 * can replace this with LLM/Transformers.js logic.
 * 
 * @param {Object} pageData - Data extracted from the content script
 * @returns {Promise<string>} - The resulting category string
 */
export async function categorizePage(pageData) {

    // In JS using const is a "safety first" approach. It tells the computer (and other programmers): "I am going to use this category name, but I promise I won't accidentally overwrite it with a different value while I'm working with it."
    // If you tried to change cat inside the loop, JavaScript would stop you and throw an error, which helps prevent bugs.
    const scores = {};
    for (const cat in CATEGORY_DICTIONARY) {
        scores[cat] = 0;
    }

    const title = (pageData.title || "").toLowerCase();
    const keywords = (pageData.keywords || "").toLowerCase();
    const description = (pageData.description || "").toLowerCase();
    const content = (pageData.contentClean || "").toLowerCase();

    for (const [category, words] of Object.entries(CATEGORY_DICTIONARY)) {
        for (const word of words) {
            // Very basic word boundary matching to avoid partial matches (e.g., 'app' matching 'apple')
            // Using regex to ensure we match the standalone word.
            // Global flat 'g' means match all occurrences, not just the first one.
            const regex = new RegExp(`\\b${word}\\b`, 'g');

            // Weight 3: Title or Meta Keywords
            if (regex.test(title)) scores[category] += 3;
            // Reset regex state since we use 'g' flag, or just use match().length
            const keywordMatches = keywords.match(regex);
            if (keywordMatches) scores[category] += (keywordMatches.length * 3);

            // Weight 2: Description
            const descMatches = description.match(regex);
            if (descMatches) scores[category] += (descMatches.length * 2);

            // Weight 1: Body Content
            const contentMatches = content.match(regex);
            if (contentMatches) scores[category] += (contentMatches.length * 1);
        }
    }

    // Find the max score
    let topCategory = "Uncategorized";
    let maxScore = 0;

    for (const [category, score] of Object.entries(scores)) {
        if (score > maxScore) {
            maxScore = score;
            topCategory = category;
        }
    }

    // Optional: Add a threshold. If maxScore < 2, it might just be noise.
    if (maxScore < 2) {
        return "Uncategorized";
    }

    return topCategory;
}

// TODO: Need to review the heuristics for this function in general, but could enough for the general idea
/**
 * Calculates a "nutrition score" from 1-10 based on the content and read engagement.
 * Higher scores mean "healthier" (more educational/longer) reading.
 * Lower scores mean "junk food" (short, low engagement, entertainment).
 * 
 * @param {Object} pageData - Data extracted from the content script
 * @param {string} category - The category determined for this page
 * @returns {number} - The nutrition score (1-10)
 */
export function calculateNutritionScore(pageData, category) {
    let score = 5; // Start at a baseline of 5

    // TODO: Save these category types in a more official spot... (and add more of course!)
    // 1. Topic/Category adjustments
    const educationalCategories = ["Science", "History", "Technology"];
    const leisureCategories = ["Entertainment", "Sports"];

    if (educationalCategories.includes(category)) {
        score += 2;
    } else if (leisureCategories.includes(category)) {
        score -= 2;
    }

    // 2. Reading Engagement Check
    const words = parseInt(pageData.wordCount) || 0;
    const timeSpentSecs = (parseInt(pageData.activeReadTimeMs) || 0) / 1000;
    const scrollPercent = parseInt(pageData.maxScrollPercent) || 0;

    // TODO: Honestly scroll percent could be useless if its a short page? IE the data could still be valid
    // Determine if they actually "read" something substantial
    // E.g., spent at least 15 seconds AND scrolled a bit, OR it's a very short piece they glanced at.
    const actuallyRead = timeSpentSecs >= 5 && scrollPercent >= 10;

    // 3. Length adjustments (ONLY if they actually read it)
    if (words > 1000) {
        if (actuallyRead && timeSpentSecs > 15) { // Ensure they spent at least 15s on a 1000+ word article
            score += 3;
        }
    } else if (words > 500) {
        if (actuallyRead) {
            score += 1;
        }
    } else if (words < 200) {
        // Doomscrolling penalty (especially if they just glazed over it quickly)
        score -= 2;
    }

    // 4. Clamp between 1 and 10
    return Math.max(1, Math.min(10, score));
}

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

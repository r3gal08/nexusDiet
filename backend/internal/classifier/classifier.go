package classifier

import (
	"regexp"
	"strings"
)

// CategoryDictionary contains keywords for scoring page categorization
// TODO: There has to be a much better way to do this such as pulling from some other API for "categories" look into this at a later date
var CategoryDictionary = map[string][]string{
	"Technology":    {"software", "programming", "hardware", "app", "developer", "cloud", "ai", "cybersecurity", "tech", "algorithm", "javascript", "python", "computer"},
	"Sports":        {"football", "basketball", "soccer", "olympics", "tournament", "championship", "coach", "athlete", "nfl", "nba", "pitch", "goal", "stadium"},
	"Politics":      {"election", "government", "congress", "senate", "lawmaker", "democrat", "republican", "policy", "president", "vote", "campaign", "parliament"},
	"History":       {"century", "ancient", "war", "historical", "empire", "archaeology", "museum", "medieval", "chronicle", "artifact", "dynasty"},
	"Science":       {"research", "study", "scientist", "physics", "biology", "space", "astronomy", "dna", "chemistry", "quantum", "experiment", "molecule"},
	"Entertainment": {"movie", "film", "celebrity", "music", "album", "actor", "hollywood", "concert", "singer", "pop", "tv", "show", "director"},
}

// precompile regexes for performance
var regexMap map[string][]*regexp.Regexp

func init() {
	regexMap = make(map[string][]*regexp.Regexp)
	for category, words := range CategoryDictionary {
		for _, word := range words {
			// Basic word boundary matching \b word \b
			re := regexp.MustCompile(`\b` + word + `\b`)
			regexMap[category] = append(regexMap[category], re)
		}
	}
}

// Categorize calculates a category based on keyword matching heuristics.
// It ports the logic from extension/src/services/classifier.js
func Categorize(title, keywords, description, content string) string {
	title = strings.ToLower(title)
	keywords = strings.ToLower(keywords)
	description = strings.ToLower(description)
	content = strings.ToLower(content)

	scores := make(map[string]int)
	for cat := range CategoryDictionary {
		scores[cat] = 0
	}

	for category, regexList := range regexMap {
		for _, re := range regexList {
			// Weight 3: Title
			// C++-brain note: Go automatically dereferences the pointer here
			if re.MatchString(title) {
				scores[category] += 3
			}

			// Weight 3: Keywords
			keywordMatches := re.FindAllString(keywords, -1)
			if keywordMatches != nil {
				scores[category] += len(keywordMatches) * 3
			}

			// Weight 2: Description
			descMatches := re.FindAllString(description, -1)
			if descMatches != nil {
				scores[category] += len(descMatches) * 2
			}

			// Weight 1: Body Content
			contentMatches := re.FindAllString(content, -1)
			if contentMatches != nil {
				scores[category] += len(contentMatches) * 1
			}
		}
	}

	topCategory := "Uncategorized"
	maxScore := 0

	// Range returns the Map key-value pair
	for cat, score := range scores {
		if score > maxScore {
			maxScore = score
			topCategory = cat
		}
	}

	if maxScore < 2 {
		return "Uncategorized"
	}

	return topCategory
}

# Brainstorming: The Next Phase of Nexus Diet

Now that we have a solid foundation—data collection, basic categorization, and a beautiful dashboard—it's time to decide how to make the app more actionable or intelligent. 

Here are four different paths we could take for the next major feature:

### Option 1: True "Nutritional" Scoring (Junk Food vs. Healthy)
Right now, we track *what* you eat (Technology, Sports), but not *how healthy* it is. 
*   **The Idea**: Assign a "nutrition" score to visits. Is the user reading long-form, thoughtful articles (Healthy / Vegetables), or are they doomscrolling short, low-word-count snippets on social media (Junk Food / Sugar)?
*   **Implementation**: We could adjust `classifier.js` to output a `nutritionScore` (1-10) based on factors like word count, domain reputation (e.g., locking `wikipedia.org` to high, `twitter.com` to low), or reading time versus page scroll heuristics. The dashboard could then show your "Junk Food %".

### Option 2: Goal Setting & Limits
Data is only useful if it drives change. 
*   **The Idea**: Allow the user to set a specific weekly goal (e.g., "Read 10,000 words of Technology" or "Limit Entertainment to 20% of my total diet").
*   **Implementation**: Add a "Goals" tab to the dashboard. The `popup.js` could show a mini progress bar toward the daily/weekly goal, turning Green when on track and Red when slipping.

### Option 3: Upgrade to AI Classification (Transformers.js)
Our keyword heuristic is fast, but it's rigid. 
*   **The Idea**: Replace the keyword dictionary with a true, privacy-preserving Local AI model that runs entirely in the browser. 
*   **Implementation**: We would integrate `Transformers.js` and a lightweight text-classification model (like a quantized BERT). It would read the `contentSnippet` and return highly accurate categorizations without your data ever leaving the device. This is the hardest option technically but provides the biggest "Wow" factor.

### Option 4: The Weekly Digest
*   **The Idea**: Provide a retrospective summary to the user rather than making them check the dashboard manually.
*   **Implementation**: The background script checks the date. Every Sunday morning, it generates a Chrome Notification: "Your Nexus Diet Weekly Report is ready!" Clicking it opens a special view summarizing the longest article read, the dominant category, and how it compared to last week.

## User Review Required

> [!IMPORTANT]
> **Which path sounds the most exciting?**
>
> Or, do you have a completely different idea in mind? (e.g., Syncing between devices, exporting data, UI overhauls, gamification badges...) Let me know what direction you want to explore!

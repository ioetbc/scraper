Overview

We are building a feature called Creator Score (CS) — a numerical rating (0–100) that evaluates the overall impact and quality of a social media creator for brand collaborations.

The goal is to create a metric similar in concept to Ahrefs Domain Rating (DR), but applied to influencer marketing.

🎯 Objective

The Creator Score should answer this core question:

“If I collaborate with this creator, how valuable will it likely be for my brand?”

It is designed to help users:

quickly compare influencers

prioritize high-impact creators

avoid low-quality collaborations

make faster, data-driven marketing decisions

🧩 Core Concept

Each creator is assigned a score between 0 and 100, based on their recent performance.

The score is calculated using data from the creator’s last 10 videos.

⚙️ Scoring Model (MVP)

The Creator Score is composed of three components:

1. Reach (40%)

Measures how many people the creator can reach.

Input: average views across last 10 videos

Output: normalized score (0–100)

Example buckets:

<10K views → 20

10K–50K → 40

50K–200K → 60

200K–1M → 80

1M+ → 100

2. Engagement (40%)

Measures how much the audience interacts with content.

Formula:
Engagement Rate (ER) = (likes + comments + shares) / views

Normalize ER into score (0–100):

Example:

<2% → 20

2–5% → 40

5–8% → 60

8–12% → 80

12%+ → 100

3. Consistency (20%)

Measures how reliably the creator performs.

Metric:
% of last 10 videos performing above their average views

Example:

<30% → 20

30–50% → 40

50–70% → 60

70–90% → 80

90%+ → 100

🧮 Final Formula
Creator Score =
(Reach _ 0.4) +
(Engagement _ 0.4) +
(Consistency \* 0.2)

Output:

integer between 0–100

🎨 UI Requirements

1. Table Integration

Add a “CS” column in the main table.

Display format:

82 ●

Optional label:

82 ● High 2. Color Coding

80–100 → Green (High impact)

50–79 → Amber (Medium)

<50 → Red (Low)

3. Tooltip (Required)

On hover, show score breakdown:

Creator Score: 82

Reach: 80
Engagement: 85
Consistency: 75

Based on last 10 videos 4. Sorting & Filtering

Allow sorting by Creator Score (descending by default)

Add filter options:

High (80+)

Medium (50–79)

Low (<50)

5. Insights Tab Integration

Display:

Top creators by Creator Score

Count of high-score creators (e.g. “3 creators with CS > 70”)

📊 Data Requirements

For each creator:

last 10 videos

views per video

likes per video

comments per video

shares per video (if available)

🚀 Why This Feature Matters

This is not just a metric — it is a decision-making shortcut.

Without Creator Score:

users manually compare metrics

decisions are slow and inconsistent

With Creator Score:

instant prioritization

clear ranking of creators

improved trust in the platform

💡 Future Improvements (not in MVP)

topic relevance scoring

sponsored vs organic performance weighting

audience quality (fake follower detection)

conversion likelihood prediction

✅ Success Criteria

The feature is successful if:

users sort by Creator Score immediately

users use it to choose influencers

it becomes a default decision signal in the product

🧠 Summary

Creator Score transforms raw social media data into a single, trusted metric that helps users answer:

“Who should I work with?”

It is a foundational feature that elevates the product from a data tool to a decision engine.

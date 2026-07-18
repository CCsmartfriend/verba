# Verba

Verba is a personal expression style analyser and rewriting prototype. It helps people turn generic AI text into writing that is closer to their own voice.

Live demo: [https://voicy.rjcui2012.workers.dev](https://voicy.rjcui2012.workers.dev)

## Overview

Most writing assistants optimise for grammar, fluency, or generic polish. Verba focuses on a different problem: personal expression.

Users can create a style profile from their own writing samples, then compare new text against that profile. The app extracts writing signals such as sentence rhythm, paragraph structure, connector usage, tone, pronoun habits, punctuation, emoji usage, and argument patterns. It then rewrites text while trying to preserve meaning, formatting, and the user's stated boundaries.

The current prototype supports a bilingual interface in Chinese and English. The analysis layer is strongest for Chinese writing at this stage. English style analysis is being extended with language-specific metrics such as contractions, readability, modal verbs, passive voice, and English connector patterns.

## Features

- Create personal style profiles from writing samples.
- Add samples as separate records instead of merging them into one long input.
- Store profile metadata such as role, audience, field, content scene, expression preference, and boundaries.
- Analyse text with a multidimensional style scoring system.
- Rewrite text towards a selected style profile.
- Preserve paragraph structure and formatting during rewrite.
- Detect and reduce unwanted sentence patterns such as repeated contrast templates.
- View style profile details, sample count, baseline summary, and editable profile data.
- Switch the product interface between Chinese and English.
- Deploy as a Cloudflare Worker.

## Why This Project

AI writing often sounds fluent but impersonal. Many users do not want text that simply looks less machine-generated. They want text that sounds like them.

Verba treats style as a profile built from evidence. It looks at repeated habits in a user's own writing, then uses those signals to guide scoring and rewriting. This makes the product useful for founders, creators, students, researchers, and knowledge workers who need AI assistance without losing their own expression.

## How It Works

1. The user creates a style profile.
2. The user uploads or pastes past writing samples.
3. The app extracts a style baseline from those samples.
4. The user pastes new text into the workbench.
5. Verba compares the new text with the selected profile.
6. The model first infers recurring style signals, then keeps or edits each sentence according to a concrete reason.
7. The output receives a style match score and dimension-level feedback.

## Style Analysis Dimensions

The prototype currently analyses these dimensions:

- Text length and structure
- Sentence rhythm
- Paragraph structure
- Punctuation habits
- Vocabulary habits
- Function words and connectors
- Pronoun usage
- Sentence patterns
- Discourse structure
- Tone and emotional intensity
- Content organisation
- Scenario fit

The next iteration will align the bilingual analysis model around nine shared dimensions:

- Text Structure
- Sentence Rhythm
- Paragraph Rhythm
- Vocabulary and Diction
- Formality and Naturalness
- Pronoun and Perspective
- Connectors and Logic Flow
- Tone and Stance
- Argument and Thinking Pattern

## Tech Stack

- React
- TypeScript
- Vite
- Tailwind CSS
- Zustand
- Cloudflare Workers
- Cloudflare Workers AI
- Wrangler

## Running Locally

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

Run checks:

```bash
npm run lint
npm test
npm run build
```

Preview the Worker locally:

```bash
npm run preview
```

Deploy to Cloudflare Workers:

```bash
npm run deploy
```

## Submission Notes for OpenAI Build Week

This project was built for OpenAI Build Week in the Apps for Your Life / Work and Productivity area. The working demo is available online, and the repository includes the code needed to run and inspect the prototype.

According to the hackathon rules, the project repository must be available to judges. If this repository is private, it should be shared with:

- `testing@devpost.com`
- `build-week-event@openai.com`

## How I Used GPT-5.6 and Codex

Verba was developed through an AI-native workflow. I used GPT-5.6 and Codex as collaborators across product design, engineering, testing, and iteration.

### GPT-5.6

GPT-5.6 was used as a product and reasoning partner. It helped turn an early idea about personal writing style into a structured product framework.

It contributed to:

- defining the product problem and target users;
- separating "personal expression style" from generic AI humanisation;
- designing the writing style analysis framework;
- breaking style into measurable dimensions;
- reasoning about Chinese and English style differences;
- refining the scoring model and rewrite constraints;
- improving the user journey for profile creation, sample upload, and style comparison;
- preparing hackathon-facing product explanations.

### Codex

Codex was used as the primary engineering partner. It helped implement, debug, and deploy the working prototype.

It contributed to:

- building the React and TypeScript application structure;
- implementing the style profile system;
- creating the scoring and feature extraction modules;
- improving the rewrite pipeline after repeated user testing;
- fixing bugs around sample counting, formatting preservation, and unwanted sentence patterns;
- adding bilingual product UI;
- preparing the Cloudflare Worker deployment;
- writing and updating project documentation for the hackathon submission.

The final product reflects a human-led workflow. I made the product, design, and quality decisions through testing and review. GPT-5.6 helped shape the reasoning framework, and Codex helped convert that framework into a working application quickly.

## Current Limitations

- The current prototype does not require user accounts.
- Data is stored locally in the browser for demo use.
- The Chinese style analysis layer is more complete than the English layer.
- The rewrite engine is a prototype and is still being tuned for stronger style fidelity.
- The current demo does not require a separate large language model API key to run.

## Roadmap

- Add account login and cloud storage.
- Add stronger English-specific analysis.
- Add structured sample metadata with language, source, and scenario.
- Add profile-level import from public links.
- Add export and download options for rewritten text.
- Add evaluation datasets built from user-approved edits.

## Licence

This project is currently prepared for hackathon review. Add a repository licence before making the project broadly public.

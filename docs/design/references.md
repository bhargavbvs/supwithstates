# Design References & Party Color Audit: "ssup with Andhra"

This document serves as the core design and visual identity reference for **"ssup with Andhra"**—a modern, civic data and representative tracking platform built specifically to engage Gen-Z citizens across Andhra Pradesh's 175 assembly constituencies.

---

## Part 1: Design References

A curated collection of civic-data platforms, scrollytelling projects, and data visualization hubs that successfully bridge dense public data and viral Gen-Z shareability.

### 1. NammaKasa
- **URL**: [https://nammakasa.in](https://nammakasa.in)
- **Visual Trait / Screenshot Description**: Ultra-minimalist, high-utility mobile-first interface featuring an instant camera/photo upload CTA, live GPS geolocation pin, and an automatic lookup that maps the reported civic failure directly to a crisp MLA/MP photo card with ward boundaries. Zero login or app download required.
- **Element to "Steal"**: **The Zero-Friction Accountability Lookup Card** — Instantly resolving a user's location or selected pin into their specific MLA's name, photo, and direct office contact in under 3 seconds without forcing authentication.

---

### 2. The Pudding (pudding.cool)
- **URL**: [https://pudding.cool](https://pudding.cool)
- **Visual Trait / Screenshot Description**: Bespoke visual essays driven by smooth scroll-triggered step-by-step animations (scrollytelling), dynamic beeswarm/dot-density charts, punchy editorial headlines, and micro-interactions where readers explore complex sociological distributions one dimension at a time.
- **Element to "Steal"**: **Scroll-Driven Beeswarm Distributions** — Replacing static ranking tables with interactive dot-density charts (e.g., visualizing all 175 MLAs by declared net worth, criminal charges, or age where each dot smoothly transitions on scroll).

---

### 3. FiveThirtyEight / ABC News 538
- **URL**: [https://projects.fivethirtyeight.com](https://projects.fivethirtyeight.com) / [https://abcnews.go.com/538](https://abcnews.go.com/538)
- **Visual Trait / Screenshot Description**: Equal-area hexagonal cartogram maps (giving every district/constituency identical visual weight regardless of land area), winding "snake" charts for majority thresholds, and dynamic interactive filters by margin of victory and demographic swing.
- **Element to "Steal"**: **The 175-Seat Hexagonal Tile Cartogram & 88-Seat Majority Bar** — An equal-area hexagon grid map of AP that prevents rural, geographically large constituencies from visually overpowering compact urban seats, paired with a central majority progress bar.

---

### 4. Lok Dhaba (TCPD, Ashoka University)
- **URL**: [https://lokdhaba.ashoka.edu.in](https://lokdhaba.ashoka.edu.in)
- **Visual Trait / Screenshot Description**: Clean, open-access academic election portal providing longitudinal constituency data, multi-term turnout graphs, candidate vote-share breakdowns, and cross-party mobility indices.
- **Element to "Steal"**: **The "Turncoat" & Political Trajectory Timeline** — A visual timeline badge showing an MLA's party-switching history, incumbency streaks, and margin-of-victory deltas across past elections.

---

### 5. TheyWorkForYou (mySociety)
- **URL**: [https://www.theyworkforyou.com](https://www.theyworkforyou.com)
- **Visual Trait / Screenshot Description**: Accessible, plain-English representative scorecards aggregating legislative performance into clear metric callouts: attendance records, questions raised, debates spoken, and voting stances compared against regional/national averages with comparative benchmark pills.
- **Element to "Steal"**: **Contextual Benchmark Badges ("Relative to AP Average")** — Displaying performance statistics alongside simple comparative tags (e.g., *"48 Assembly questions raised — Well above average for AP MLAs"*).

---

### 6. Rest of World Visual Stories
- **URL**: [https://restofworld.org](https://restofworld.org)
- **Visual Trait / Screenshot Description**: Editorial, mobile-first data stories featuring vivid high-contrast color accents, swipeable horizontal card stacks, bold editorial typography, and modular infographics built for rapid mobile skimming.
- **Element to "Steal"**: **Instagram/WhatsApp-Native Snapshot Cards** — 1-click shareable graphic cards (9:16 story and 1:1 square formats) summarizing an MLA’s key stats with bold typography and high-contrast badges for social sharing.

---

### 7. Association for Democratic Reforms (ADR) / MyNeta
- **URL**: [https://myneta.info](https://myneta.info)
- **Visual Trait / Screenshot Description**: The authoritative repository of Election Commission affidavits across India, detailing assets, liabilities, educational qualifications, and IPC criminal case filings in exhaustive tabular format.
- **Element to "Steal"**: **The Affidavit Breakdown Taxonomy (Asset Delta & Serious IPC Categorization)** — Converting raw affidavit tables into clean visual widgets: Net Worth vs. Liabilities balance gauge and a clear distinction between serious vs. non-serious criminal charges.

---

### 8. India in Pixels (IIP)
- **URL**: [https://indiainpixels.com](https://indiainpixels.com)
- **Visual Trait / Screenshot Description**: Viral thematic cartography and data charts tailored for Indian cultural context, using distinct regional color schemes, intuitive choropleths, and highly shareable social graphics.
- **Element to "Steal"**: **Cultural Aesthetic & Data Gamification** — Clean, instantly recognizable district-level choropleths with custom tooltips, region-specific insights, and bite-sized trivia cards that spark organic online debate.

---

## Part 2: Party Color Audit

To maintain political neutrality, visual authenticity, and digital accessibility, the platform uses verified political party brand colors mapped against WCAG 2.1 AA/AAA contrast standards (minimum **4.5:1** contrast ratio for normal text and **3:1** for large/bold text).

### Verified Palette & Contrast Matrix

| Party | Background Hex | Text Color | Contrast Ratio | WCAG Compliance | Source |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **TDP** (Telugu Desam Party) | `#FFED00` | `#111827` | **14.67:1** | Pass (AAA) | [Wikipedia Module:Political party/T](https://en.wikipedia.org/wiki/Module:Political_party/T) / [TDP Official](https://telugudesam.org) |
| **YSRCP** (YSR Congress Party) | `#1569C7` | `#FFFFFF` | **5.42:1** | Pass (AA) | [Wikipedia Module:Political party/Y](https://en.wikipedia.org/wiki/Module:Political_party/Y) / [YSRCP Official](https://ysrcongress.com) |
| **JSP** (Jana Sena Party) | `#E8232A` | `#000000` | **4.71:1** | Pass (AA) | [Wikipedia Module:Political party/J](https://en.wikipedia.org/wiki/Module:Political_party/J) / [Jana Sena Official](https://janasenaparty.org) |
| **JSP** *(Accessible White-Text Variant)* | `#D81E24` | `#FFFFFF` | **5.08:1** | Pass (AA) | Brand Red tuned for dark-mode / white text badges |
| **BJP** (Bharatiya Janata Party) | `#FF9933` | `#111827` | **8.33:1** | Pass (AAA) | [Wikipedia Module:Political party/B](https://en.wikipedia.org/wiki/Module:Political_party/B) / [BJP Official](https://bjp.org) |
| **INC** (Indian National Congress) | `#00BFFF` | `#0F172A` | **8.41:1** | Pass (AAA) | [Wikipedia Module:Political party/I](https://en.wikipedia.org/wiki/Module:Political_party/I) / [INC Official](https://inc.in) |
| **Others / Independents** | `#475569` | `#FFFFFF` | **7.58:1** | Pass (AAA) | Slate Gray Standard (ECI neutral palette) |

---

### Implementation Guidelines for Developers

1. **Yellow & Orange Backgrounds (TDP & BJP)**:
   - Always pair with dark text (`#111827` or `#000000`).
   - *Never* use white text on `#FFED00` (contrast ratio `1.21:1`) or `#FF9933` (contrast ratio `2.13:1`), as both violate basic accessibility standards.

2. **Red Backgrounds (JSP)**:
   - When displaying badges with the official `#E8232A` hex, use `#000000` text for strict WCAG AA compliance (`4.71:1`).
   - If white badge text is required by the visual design system, use `#D81E24` as the background (`5.08:1`), which retains brand fidelity while ensuring high legibility.

3. **Blue Backgrounds (YSRCP & INC)**:
   - YSRCP royal blue (`#1569C7`) pairs with crisp white text (`#FFFFFF`) at `5.42:1`.
   - INC sky blue (`#00BFFF`) requires dark navy/charcoal text (`#0F172A`) at `8.41:1`.

4. **CSS Token Definition**:
```css
:root {
  /* Party Brand Colors */
  --party-tdp-bg: #FFED00;
  --party-tdp-text: #111827;

  --party-ysrcp-bg: #1569C7;
  --party-ysrcp-text: #FFFFFF;

  --party-jsp-bg: #E8232A;
  --party-jsp-bg-accessible: #D81E24;
  --party-jsp-text-dark: #000000;
  --party-jsp-text-light: #FFFFFF;

  --party-bjp-bg: #FF9933;
  --party-bjp-text: #111827;

  --party-inc-bg: #00BFFF;
  --party-inc-text: #0F172A;

  --party-ind-bg: #475569;
  --party-ind-text: #FFFFFF;
}
```

# PART II: CAPABILITIES IN FULL DEPTH

---

## Chapter 4: Information & Research Capabilities

### 4.1 Deep Web Research

Manus can conduct genuine multi-source research by navigating to real websites, reading their content, and synthesizing findings. This is not keyword retrieval — it is the same process a human researcher would follow, executed autonomously.

The research workflow:

1. **Query formulation:** Manus identifies the most effective search queries for the topic, including English-language variants for non-English topics to maximize coverage
2. **Source discovery:** The `search` tool returns results across 7 categories: `info` (general web), `image`, `api`, `news`, `tool`, `data`, and `research` (academic papers)
3. **Source navigation:** Manus navigates to multiple URLs from search results using the `browser` tool, reading full page content rather than relying on snippets
4. **Cross-validation:** Claims are verified across multiple sources before being included in outputs
5. **Citation tracking:** Every factual claim is attributed to its source with an inline citation

The `search` tool supports up to 3 query variants per call (query expansions of the same intent), enabling broad coverage in a single operation. For complex research, Manus breaks the topic into sequential sub-searches rather than attempting one complex query.

**What Manus can research:**
- Current market data, statistics, and forecasts
- Academic papers and scientific literature
- Company information, financials, and news
- Technical documentation and API references
- Legal and regulatory information
- Historical facts and timelines
- Product comparisons and reviews
- Any publicly accessible information on the web

**Limitations:**
- Cannot access paywalled content without credentials
- Cannot access content that requires login (unless the user has previously logged in via the browser)
- Research reflects the state of the web at the time of the session — not real-time streaming data
- Cannot access the dark web or private networks

### 4.2 The Deep Research Skill

For tasks requiring maximum research depth, the `deep-research` skill invokes Google Gemini's Deep Research Agent via the `research-lookup` skill's Perplexity Sonar Pro integration. This produces detailed, multi-source reports with full citations, typically taking 2–10 minutes but producing output comparable to a professional research analyst's work product.

The `research-lookup` skill provides access to Perplexity's Sonar Pro Search and Sonar Reasoning Pro models through OpenRouter, automatically selecting the appropriate model based on query complexity. This is particularly valuable for:
- Academic literature reviews
- Market intelligence reports
- Technical due diligence
- Competitive landscaping
- Policy and regulatory research

### 4.3 Browser Automation

The browser tool gives Manus full control of a real Chromium browser:

- Navigate to any URL
- Read page content (text, structure, data)
- Interact with web applications (forms, buttons, navigation)
- Maintain login state across tool calls within a session
- Handle JavaScript-rendered content (unlike simple HTTP requests)

The browser has three intent modes:
- **Navigational:** General browsing, following links
- **Informational:** Reading and extracting content from articles, documents, data pages
- **Transactional:** Performing actions in web applications (submitting forms, clicking buttons)

For sensitive transactional operations (posting content, completing payments), Manus asks for user confirmation before proceeding. For operations requiring login credentials, Manus asks the user to take over the browser temporarily.

### 4.4 Real-Time Information

Manus has internet access and can retrieve current information at any time. The `search` tool with `type: "news"` retrieves time-sensitive content from trusted media sources. This means Manus's outputs can reflect the current state of the world, not just its training data cutoff.

---

## Chapter 5: Data Analysis and Visualization

### 5.1 The Data Analysis Workflow

Manus approaches data analysis as a complete pipeline: data acquisition → cleaning → analysis → visualization → interpretation → presentation. Each stage is executed with real code running in the sandbox.

**Data acquisition:** Manus can load data from CSV, Excel, JSON, Parquet, and dozens of other formats using pandas. It can also retrieve data from public APIs, scrape structured data from websites, or generate synthetic datasets based on real-world parameters.

**Cleaning and transformation:** Standard pandas operations — handling missing values, type conversion, normalization, aggregation, pivoting, merging — are all available. For complex transformations, Manus writes and executes Python scripts.

**Statistical analysis:** The `statistical-analysis` skill provides guided test selection, assumption checking, power analysis, and APA-formatted results reporting. Available methods include t-tests, ANOVA, chi-square, regression (linear, logistic, polynomial), correlation analysis, time series decomposition, and non-parametric alternatives.

**Visualization:** Manus uses matplotlib, seaborn, and plotly for static and interactive charts. The `scientific-visualization` skill provides publication-ready figure generation with multi-panel layouts, significance annotations, error bars, colorblind-safe palettes, and journal-specific formatting (Nature, Science, Cell).

### 5.2 Chart Types and When to Use Each

| Chart Type | Library | Best For |
|-----------|---------|---------|
| Bar chart (grouped/stacked) | matplotlib/seaborn | Comparing categories, showing composition |
| Line chart with CI bands | matplotlib | Time series with uncertainty |
| Scatter plot with regression | seaborn | Correlation, distribution |
| Heatmap | seaborn | Matrix data, correlation matrices |
| Box/violin plot | seaborn | Distribution comparison across groups |
| Donut/pie chart | matplotlib | Part-to-whole relationships (use sparingly) |
| Horizontal bar | matplotlib | Rankings, survey results |
| Area chart | plotly | Cumulative trends, stacked time series |
| Sankey diagram | plotly | Flow and allocation |
| Treemap | plotly | Hierarchical proportions |
| Gantt chart | plotly | Project timelines |
| Geographic choropleth | plotly | Spatial data |
| Network graph | networkx + matplotlib | Relationships, dependencies |

### 5.3 The CSV Data Summarizer Skill

The `csv-data-summarizer` skill provides automated analysis of any CSV file: summary statistics, distribution plots, correlation matrices, missing value analysis, and quick visualizations — all generated in a single pass. This is useful for rapid exploratory analysis before deeper investigation.

### 5.4 The Exploratory Data Analysis Skill

The `exploratory-data-analysis` skill handles 200+ scientific file formats beyond CSV: chemistry files (SDF, MOL, PDB), bioinformatics (FASTQ, BAM, VCF), microscopy (TIFF stacks), spectroscopy (mzML), proteomics, metabolomics, and general scientific data. It generates detailed markdown reports with format-specific analysis, quality metrics, and downstream analysis recommendations.

### 5.5 Excel Generation

The `excel-generator` skill produces professional Excel workbooks with:
- Multiple worksheets with consistent styling
- Embedded charts (bar, line, pie, scatter) using openpyxl
- Conditional formatting (color scales, data bars, icon sets)
- Named ranges and data validation
- Freeze panes, auto-filters, and print settings
- Professional color themes and typography

The `xlsx` skill handles any spreadsheet task: reading, editing, cleaning, converting, and creating `.xlsx`, `.xlsm`, `.csv`, and `.tsv` files.

### 5.6 Database Integration

With the `web-db-user` feature enabled on web projects, Manus can design and interact with PostgreSQL databases. The `postgres` skill enables read-only SQL queries against multiple PostgreSQL databases for data analysis workflows. Schema exploration, complex SELECT queries, and data extraction are all supported.

---

## Chapter 6: Visual Creation — Diagrams, Images, and Design

### 6.1 Architecture and Technical Diagrams

Manus can produce professional technical diagrams using two rendering engines:

**D2 (for architecture and complex diagrams):** D2 is a declarative diagram language that produces clean, professional diagrams from text source. Manus writes `.d2` files and renders them to PNG using `manus-render-diagram`. D2 is ideal for:
- System architecture diagrams
- Network topology diagrams
- Entity-relationship diagrams
- Sequence diagrams
- Class diagrams
- Infrastructure diagrams

**Mermaid (for flowcharts and simpler diagrams):** Mermaid is a markdown-like syntax for diagrams. Manus writes `.mmd` files and renders them to PNG. Mermaid is ideal for:
- Flowcharts and decision trees
- State machine diagrams
- Gantt charts
- User journey maps
- Git graphs
- Pie charts

Both engines produce vector-quality PNG output suitable for documents, presentations, and web use.

### 6.2 AI Image Generation

Manus can generate images from text descriptions using the `generate_image` tool. Key characteristics:

**Quality:** The tool produces high-resolution images (up to 2752×1536 for 16:9) with photorealistic, illustrative, or artistic styles depending on the prompt.

**Aspect ratios:** `1:1`, `2:3`, `3:2`, `3:4`, `4:3`, `4:5`, `5:4`, `9:16`, `16:9`, `21:9` — covering all standard use cases from social media to cinema.

**Batch generation:** Up to 5 images can be generated in a single call, enabling parallel production of related assets.

**Reference images:** Existing images can be provided as references to guide style, composition, or subject consistency across multiple generated images.

**Transparent backgrounds:** Images can be generated with transparent backgrounds by specifying a background color to remove.

**Best practices for prompts:**
- Specify style explicitly (photorealistic, editorial illustration, technical diagram, watercolor, etc.)
- Describe lighting, perspective, and composition
- Include color palette information
- For consistency across multiple images, generate one reference first, then use it for subsequent generations

### 6.3 AI Image Editing

The `generate_image_variation` tool edits existing images using AI:
- Apply artistic styles or filters
- Modify specific elements within an image
- Adjust lighting, colors, contrast, or textures
- Add, remove, or replace text and objects
- Change the mood or atmosphere of a scene

This is distinct from programmatic image processing — it uses AI understanding of image content to make semantic edits.

### 6.4 Programmatic Image Processing

For deterministic image operations, Manus uses Python with PIL/Pillow:
- Resize, crop, rotate, flip, mirror
- Format conversion (PNG, JPG, WebP, TIFF, BMP)
- Color adjustments (brightness, contrast, saturation, hue)
- Compositing (layering multiple images)
- Annotation (adding text, shapes, arrows, callouts)
- Watermarking
- Batch processing of image sets

The `screenshot-annotator` skill specializes in annotating screenshots with arrows, boxes, circles, numbered callouts, text labels, highlights, and redactions — useful for documentation, bug reports, tutorials, and marketing materials.

### 6.5 Canvas Design and Posters

The `canvas-design` skill creates beautiful visual art in PNG and PDF format — posters, infographics, certificates, social media graphics, and other static visual designs. It applies design philosophy principles: composition, color theory, typography hierarchy, and visual balance.

### 6.6 Web Design

The `frontend-design` skill creates distinctive, production-grade frontend interfaces with high design quality. It avoids generic AI aesthetics by applying specific design movements, color philosophies, layout paradigms, and signature visual elements. The `web-design-guidelines` skill audits existing UI code for accessibility, best practices, and design quality.

---

## Chapter 7: Technical and Creative Writing

### 7.1 Research Reports and Long-Form Documents

Manus can produce research reports of any length, grounded in real sources. The `market-research-reports` skill generates comprehensive market research reports (50+ pages) in the style of top consulting firms (McKinsey, BCG, Gartner), with:
- Professional LaTeX formatting
- Porter Five Forces, PESTLE, SWOT, TAM/SAM/SOM, BCG Matrix analysis
- Extensive visual generation
- Deep integration with research tools for data gathering
- Executive summaries, methodology sections, and appendices

The `content-research-writer` skill assists with high-quality content writing by conducting research, adding citations, improving hooks, iterating on outlines, and providing real-time feedback on each section.

### 7.2 Markdown to PDF

Any Markdown document can be converted to a professionally formatted PDF using `manus-md-to-pdf`. The output supports:
- Headers, subheaders, and table of contents
- Tables, code blocks, and blockquotes
- Embedded images (referenced by file path)
- Mathematical notation
- Footnotes and citations

### 7.3 Word Documents (.docx)

The `docx` skill creates fully formatted Word documents using the `python-docx` library:
- Styled cover pages with logo and metadata
- Heading hierarchy (H1–H6) with consistent formatting
- Tables with merged cells, borders, and shading
- Embedded images with captions
- Headers and footers with page numbers
- Table of contents (auto-generated)
- Tracked changes and comments
- Letterhead templates

### 7.4 PDF Manipulation

The `pdf` skill handles all PDF operations:
- **Reading:** Extract text, tables, metadata, and images from any PDF
- **Merging:** Combine multiple PDFs into one
- **Splitting:** Extract specific pages or page ranges
- **Rotating:** Rotate individual pages or entire documents
- **Watermarking:** Add text or image watermarks
- **Password protection:** Encrypt/decrypt PDFs
- **Form filling:** Fill PDF forms programmatically
- **OCR:** Make scanned PDFs searchable using pytesseract

### 7.5 PowerPoint (.pptx)

The `pptx` skill handles all PowerPoint operations — creating, reading, editing, and converting `.pptx` files. This is distinct from the built-in slide system (which produces HTML-based presentations) and is used when the output format must specifically be `.pptx`.

### 7.6 Internal Communications

The `internal-comms` skill produces all standard organizational communication formats: status reports, leadership updates, third-party updates, company newsletters, FAQs, incident reports, project updates, and more — using the formats and conventions that organizations expect.

### 7.7 Resume and Career Documents

The `tailored-resume-generator` skill analyzes job descriptions and generates tailored resumes that highlight relevant experience, skills, and achievements to maximize interview chances. It produces ATS-optimized documents with appropriate keyword density and formatting.

### 7.8 Academic and Scientific Writing

For academic writing, Manus follows citation standards (APA, MLA, Chicago, IEEE), uses appropriate hedging language, structures arguments with evidence, and produces documents suitable for journal submission. The `statistical-analysis` skill produces APA-formatted results sections with correct statistical notation.

---

## Chapter 8: Web Application Development

### 8.1 The Web Development Stack

Manus builds production-ready web applications using a modern, opinionated stack:

**Frontend:**
- React 19 with TypeScript
- Tailwind CSS 4 with OKLCH color tokens
- shadcn/ui component library (Radix UI primitives)
- Wouter for client-side routing
- Recharts for data visualization
- Framer Motion for animations
- Lucide React for icons

**Backend (when enabled):**
- Express.js server
- PostgreSQL database
- Drizzle ORM
- JWT authentication
- Manus OAuth integration

**Build tooling:**
- Vite 7 for development and production builds
- pnpm for package management
- TypeScript 5.6 for type safety
- ESBuild for server bundling

### 8.2 The Development Workflow

Web projects follow a structured workflow:

1. **`webdev_init_project`:** Scaffolds the complete project structure, installs dependencies, starts the development server, and creates an initial checkpoint
2. **Brainstorming:** Manus generates three distinct design philosophies in `ideas.md` and commits to one, documenting the design system
3. **Image generation:** 3–5 high-quality AI-generated images are produced for visually prominent areas (hero sections, banners) before any code is written
4. **Component development:** Pages and components are built incrementally, with the design system applied consistently
5. **`webdev_save_checkpoint`:** Creates a git snapshot that can be rolled back to if needed
6. **`webdev_add_feature`:** Upgrades static projects to full-stack with database, authentication, and backend
7. **Publishing:** Users click the Publish button in the Management UI to deploy to a public URL

### 8.3 Design Engineering Philosophy

Manus approaches web development as a **Design Engineer** — someone who thinks about both the technical implementation and the visual/experiential quality of the result. The default is elevated aesthetics:

- **Strategic typography:** Intentional font weight combinations, not uniform Inter throughout
- **Functional whitespace:** Deliberate spacing as an active design ingredient
- **Depth and texture:** Subtle shadows, gradients, blur effects, and grain
- **Interactive nuances:** Fluid transitions, hover effects, entrance animations
- **Aesthetic cohesion:** A unified style enforced across all components

Manus actively avoids what it calls "AI slop" — the generic patterns that make AI-generated interfaces look identical: excessive centered layouts, purple gradients, uniform rounded corners, and Inter font everywhere.

### 8.4 Feature Capabilities

**Static (default):** Pure React frontend, deployed as static files. No server-side logic, no database. Suitable for landing pages, dashboards, portfolios, and tools that don't require user accounts or persistent data.

**Full-stack (`web-db-user` feature):** Adds Express.js backend, PostgreSQL database, Drizzle ORM, JWT authentication, Manus OAuth, S3 file storage, LLM integration, Whisper speech-to-text, image generation API, push notifications, and custom secrets management.

**Stripe (`stripe` feature):** Adds Stripe payment processing with checkout sessions, webhooks, and subscription management.

### 8.5 Deployment and Hosting

Web projects are deployed to Manus's built-in hosting infrastructure at `{project-name}.manus.space`. The Management UI provides:
- Live preview with persistent login state
- Visual editor for direct element manipulation
- Version history with rollback
- Custom domain support (purchase, register, and assign domains in-app)
- Analytics (UV/PV) for published sites
- GitHub export

### 8.6 Maps Integration

Manus has built-in Google Maps integration with full API access (no user API key required) — including Places, Geocoder, Directions, Drawing, Heatmaps, Street View, and all other Google Maps JavaScript API features. Authentication is handled automatically by the Manus proxy.

### 8.7 Testing and Quality Assurance

The `webapp-testing` skill provides Playwright-based testing for web applications: verifying frontend functionality, debugging UI behavior, capturing screenshots, and viewing browser logs. The `vercel-react-best-practices` skill provides React and Next.js performance optimization guidelines.

---

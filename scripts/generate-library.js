import fs from 'fs';
import path from 'path';

console.log('Generating Prompt Library (150+ templates across 12 categories)...');

const categories = [
  'Coding', 'Writing', 'Marketing', 'Research', 'Data', 
  'Design', 'Email', 'SQL', 'Excel', 'Learning', 'Creative', 'Productivity'
];

const prompts = [];

// Helper to push templates
let id = 1;
function addPrompt(category, title, prompt, useCase = '') {
  prompts.push({
    id: String(id++),
    category,
    title,
    prompt: prompt.trim(),
    useCase
  });
}

// 1. Coding (13 prompts)
addPrompt('Coding', 'Refactor for Performance', 'Act as a senior software architect. Analyze this code snippet for performance bottlenecks, memory usage, and runtime efficiency. Suggest refactored code and explain each optimization.', 'Improve performance of slow code');
addPrompt('Coding', 'Generate Unit Tests', 'Act as a QA engineer. Write a comprehensive suite of unit tests for the following function using [Framework]. Cover typical inputs, boundary conditions, edge cases, and error handling.', 'Write unit tests for functions');
addPrompt('Coding', 'Find Security Vulnerabilities', 'Act as an application security expert. Audit the following code for vulnerabilities like SQL injection, XSS, CSRF, or authentication flaws. Explain any risks and provide secure code versions.', 'Audit code for security issues');
addPrompt('Coding', 'Explain Complex Code', 'Act as a programming tutor. Explain what the following code does step-by-step in simple language. Break down complex algorithms and library functions used.', 'Learn how a block of code works');
addPrompt('Coding', 'Write API Documentation', 'Act as a technical writer. Write clean, professional API documentation for the following code. Include endpoint details, request/response structures, and code examples.', 'Document API endpoints');
addPrompt('Coding', 'Design Pattern Implementation', 'Act as an OOP expert. Rewrite the following code to implement the [Design Pattern] pattern. Explain why this pattern is appropriate and how it enhances scalability.', 'Apply design patterns');
addPrompt('Coding', 'Translate Language', 'Translate the following code from [Source Language] to [Target Language]. Maintain the original logic, variable names, and comments while adopting target language idioms.', 'Port code to another language');
addPrompt('Coding', 'SQL Injection Patch', 'Review the following backend query code and modify it to prevent SQL injection. Use prepared statements or parameterized queries. Explain the fix.', 'Secure database query code');
addPrompt('Coding', 'Debug Error Message', 'I am getting the following error: "[Error message]". Here is the code that caused it. Diagnose the cause of this error, suggest fixes, and provide the updated code.', 'Fix compiler/runtime errors');
addPrompt('Coding', 'Optimize CSS/Styles', 'Review this CSS code and optimize it. Identify redundant selectors, suggest modern layouts like Flexbox/Grid where appropriate, and clean up variables.', 'Clean up stylesheets');
addPrompt('Coding', 'RegEx Generator', 'Act as a regular expression expert. Generate a regex pattern that matches [pattern requirement]. Provide examples of matching and non-matching strings, and explain the regex blocks.', 'Build regular expressions');
addPrompt('Coding', 'HTML/A11y Audit', 'Act as an accessibility specialist. Review the following HTML block for WCAG compliance. Suggest corrections for ARIA attributes, semantic elements, and keyboard navigability.', 'Improve HTML accessibility');
addPrompt('Coding', 'Git Command Helper', 'I want to perform the following git operation: [git action]. Write the sequence of git commands required, explain what each command does, and suggest safety precautions.', 'Get help with git operations');

// 2. Writing (13 prompts)
addPrompt('Writing', 'Polish Tone & Clarity', 'Act as a professional copy editor. Revise the following text to improve clarity, flow, and active voice. Maintain a [professional/casual/friendly] tone.', 'Polish articles, blogs, or copy');
addPrompt('Writing', 'Write Blog Outline', 'Act as an SEO content planner. Create a detailed outline for a blog post about "[Topic]". Include H2/H3 headings, target keywords, and brief notes for each section.', 'Outline articles for blog SEO');
addPrompt('Writing', 'Summarize Research Paper', 'Act as an academic researcher. Read the following paper text and write a structured summary including context, methodology, key findings, and limitations.', 'Summarize academic papers');
addPrompt('Writing', 'Catchy Headings', 'Generate 10 catchy, click-worthy headings for an article about "[Topic]" targeted at [Target Audience]. Avoid cheap clickbait while keeping it engaging.', 'Brainstorm article headlines');
addPrompt('Writing', 'Draft Newsletter', 'Act as an email copywriter. Write a weekly newsletter about "[Topic]" for [Target Audience]. The tone should be conversational. Include a call to action to read our new post.', 'Draft email newsletter copy');
addPrompt('Writing', 'Rewrite in Active Voice', 'Rewrite the following paragraphs to convert passive voice to active voice. Make the sentences punchier and more direct.', 'Convert passive sentences');
addPrompt('Writing', 'Expand Outline to Post', 'Act as a content writer. Expand the following outline into a 500-word blog post. Use an engaging tone and include transition sentences between sections.', 'Write blog post from outline');
addPrompt('Writing', 'Short Story Generator', 'Act as a creative writer. Write a short story based on the prompt: [Prompt description]. Use descriptive sensory details and create suspense.', 'Write creative stories');
addPrompt('Writing', 'Product Review Article', 'Act as a tech reviewer. Write a detailed, unbiased product review for [Product]. Cover key features, pros, cons, and a final verdict.', 'Draft product reviews');
addPrompt('Writing', 'Press Release Draft', 'Act as a PR specialist. Write a press release announcing [Event/Launch]. Include a hook, standard quotes, media contact details, and boilerplate.', 'Write news press releases');
addPrompt('Writing', 'Paraphrase Document', 'Paraphrase the following text to make it simpler and easier for a middle-school student to read. Avoid jargon and define key terms.', 'Simplify text readability');
addPrompt('Writing', 'Cover Letter Draft', 'Act as a career coach. Write a customized cover letter for a [Job Title] role at [Company]. Highlight my experience in [Skills] based on the job description.', 'Draft job application cover letters');
addPrompt('Writing', 'Speech Writing Outline', 'Act as a speechwriter. Write a 5-minute speech outline for a [occasion/theme]. Structure it with a hook, three main points, and a memorable conclusion.', 'Structure public speeches');

// 3. Marketing (13 prompts)
addPrompt('Marketing', 'Ad Copy generator', 'Act as a direct response copywriter. Write 3 variations of Facebook ad copy for [Product/Service]. Each variation should target a different angle: benefit-driven, pain-point, and curiosity.', 'Generate high-converting ad copy');
addPrompt('Marketing', 'SEO Keyword Plan', 'Act as an SEO strategist. Generate a list of 20 relevant keywords for a business selling [Products]. Group them by search intent (informational, transactional) and suggest search volume tiers.', 'Map keywords to search intent');
addPrompt('Marketing', 'Social Content Calendar', 'Act as a social media manager. Create a 7-day content calendar for [Platform] targeting [Audience]. For each day, provide the post topic, copy, hashtag suggestions, and visual idea.', 'Draft weekly social campaigns');
addPrompt('Marketing', 'Persona Development', 'Act as a marketing analyst. Define 3 detailed customer personas for a brand selling [Product]. Include demographics, pain points, core motivations, and buying triggers.', 'Build target buyer profiles');
addPrompt('Marketing', 'Lead Magnet Ideas', 'Act as a growth marketer. Brainstorm 5 unique lead magnet ideas for [Business/Niche] that would attract [Audience]. Explain the content of each and the opt-in mechanism.', 'Generate lead generation ideas');
addPrompt('Marketing', 'Landing Page Copy', 'Act as a conversion rate optimizer. Write the copy for a landing page selling [Product]. Structure it with a headline, sub-headline, value props, social proof section, and CTA.', 'Copywrite sales landing pages');
addPrompt('Marketing', 'Marketing Funnel Strategy', 'Act as a digital marketing consultant. Map out a multi-stage funnel (Awareness, Consideration, Conversion) for a SaaS product in [Niche]. Describe the content for each stage.', 'Design customer acquisition funnels');
addPrompt('Marketing', 'Competitor Analysis Framework', 'Act as a business strategist. Provide a framework to analyze competitors in the [Industry] sector. Detail which metrics to monitor (SEO, social, pricing, ads) and how to gather them.', 'Map competitor metrics');
addPrompt('Marketing', 'Influencer Outreach Script', 'Write a friendly, professional outreach email pitch to micro-influencers in the [Niche] space. Propose a partnership for [Product] and explain the mutual benefits.', 'Pitch marketing collaborations');
addPrompt('Marketing', 'Product Launch Campaign', 'Act as a brand manager. Plan a launch campaign for a new [Product]. Outline pre-launch buzz strategies, launch day activities, and post-launch follow-up.', 'Plan product launches');
addPrompt('Marketing', 'SMS Marketing Copy', 'Write 5 SMS marketing messages under 160 characters for a flash sale on [Product]. Include urgency, a clear discount, and a link placeholder.', 'Write short marketing texts');
addPrompt('Marketing', 'Brand Voice Guide', 'Act as a brand strategist. Develop a brand voice guide for a [Niche] startup. Define 4 voice attributes, do\'s and don\'ts, and provide examples of rewritten statements.', 'Align brand tone guidelines');
addPrompt('Marketing', 'Local SEO Checklist', 'Create a step-by-step checklist to optimize a local business in the [Industry] sector for Google Local Pack. Focus on review building, local citations, and on-page SEO.', 'Optimize local search profiles');

// 4. Research (13 prompts)
addPrompt('Research', 'Literature Review Guide', 'Act as an academic researcher. Write a comprehensive guide on how to conduct a literature review on "[Topic]". Detail search strategies, synthesis methods, and citation structures.', 'Plan research study structures');
addPrompt('Research', 'Extract Key Insights', 'Analyze the following article text. Extract the top 5 key insights, data points, and conclusions. Present them as bullet points with brief context for each.', 'Extract core facts from text');
addPrompt('Research', 'Formulate Hypotheses', 'Act as a scientific advisor. Based on the following problem statement, formulate 3 testable hypotheses. Suggest variables to measure and basic methodology.', 'Draft experimental hypotheses');
addPrompt('Research', 'Compare Two Concepts', 'Act as an educational researcher. Create a comparative analysis table comparing [Concept A] and [Concept B]. Cover definition, mechanism, use cases, pros, and cons.', 'Contrast scientific concepts');
addPrompt('Research', 'Market Trend Analysis', 'Act as a market researcher. Analyze the current trends in the [Industry] sector for the year 2026. Identify major drivers, challenges, and future predictions.', 'Analyze industry trends');
addPrompt('Research', 'Ethical Review Draft', 'Act as an ethics board member. Review this proposed research methodology [Methodology] and identify potential ethical issues (consent, data privacy, safety). Suggest mitigations.', 'Audit research ethics');
addPrompt('Research', 'Historical Context Summary', 'Act as a historian. Provide the historical context and background surrounding the [Event/Period]. Explain the main causes, key figures, and long-term historical impacts.', 'Summarize historical events');
addPrompt('Research', 'Statistical Method Suggestion', 'Act as a biostatistician. Given a dataset with [Type of data] and the research question: [Question], suggest the most appropriate statistical tests. Explain the assumptions.', 'Select statistical methodologies');
addPrompt('Research', 'User Interview Guide', 'Act as a UX researcher. Create a user interview script containing 10 open-ended questions designed to understand user challenges with [Product/Activity].', 'Script user research interviews');
addPrompt('Research', 'Fact-Checking Framework', 'Provide a step-by-step framework to verify the accuracy of a claim related to [Topic]. Detail credible source databases and verification techniques.', 'Validate data claims');
addPrompt('Research', 'Qualitative Data Coding', 'Act as a social researcher. Explain how to code and analyze a transcript of user feedback to extract recurring themes. Provide a sample codebook outline.', 'Plan thematic transcript analysis');
addPrompt('Research', 'Patent Search Plan', 'Act as a patent analyst. Design a search strategy (keywords, classifications, databases) to find existing patents related to [Technology description].', 'Audit patent feasibility');
addPrompt('Research', 'Demographic Data Guide', 'Suggest credible publicly available datasets and repositories to gather demographic data about [Target population] in [Region].', 'Locate open research datasets');

// 5. Data (13 prompts)
addPrompt('Data', 'Clean Data Strategy', 'Act as a data analyst. Outline a detailed strategy to clean a dirty dataset containing [issues, e.g., missing values, duplicates, outliers]. Provide Python pandas snippets for each step.', 'Clean messy spreadsheets/CSV data');
addPrompt('Data', 'Summarize Statistics', 'Act as a statistician. Explain the difference between mean, median, mode, and standard deviation to a non-technical audience. Provide simple examples of when to use each.', 'Learn basic statistics definitions');
addPrompt('Data', 'Visualize Data Ideas', 'Act as a data visualization designer. Suggest the best 3 chart types to display the relationship between [Variable A] and [Variable B] over time. Explain why and suggest design tweaks.', 'Choose visual graph types');
addPrompt('Data', 'Database Schema Plan', 'Act as a database architect. Design a relational database schema for a [Type of application]. List tables, columns, data types, and primary/foreign keys.', 'Draft database architecture');
addPrompt('Data', 'Explain SQL Query', 'Explain the mechanism of the following complex SQL query step-by-step. Focus on the JOIN types, CTEs, and window functions used.', 'Decipher SQL queries');
addPrompt('Data', 'API JSON Parsing', 'Act as a Python developer. Write a script to fetch data from [URL] API, parse the JSON response, extract [fields], and save the result to a CSV file.', 'Fetch and parse web APIs');
addPrompt('Data', 'Interpret Regression', 'Act as a data scientist. Interpret the following regression model summary coefficients, R-squared, and p-values. Explain what these mean for business decisions.', 'Interpret statistical regressions');
addPrompt('Data', 'Machine Learning Setup', 'Act as an ML engineer. Outline a pipeline to train a classification model on [Dataset description]. Include data preprocessing, model selection, and evaluation metrics.', 'Set up ML pipelines');
addPrompt('Data', 'Anonymize User Data', 'Act as a privacy compliance officer. Outline the steps to anonymize a database containing PII to comply with GDPR. Suggest hash and mask methods.', 'Implement user privacy controls');
addPrompt('Data', 'Export Data Pandas', 'Write a Python pandas script to group the following dataframe by [column] and calculate the average, count, and percentage change. Export output to Excel.', 'Group and aggregate datasets');
addPrompt('Data', 'JSON to CSV Converter', 'Write a Node.js script to read a large JSON file, flatten nested properties, and stream the output to a CSV file to avoid memory overflow.', 'Convert JSON data structures');
addPrompt('Data', 'A/B Testing Calculator', 'Act as a marketing analyst. Explain how to calculate the sample size required for an A/B test with a baseline conversion of [X]% and a minimum detectable effect of [Y]%.', 'Size A/B test campaigns');
addPrompt('Data', 'SQL Indexing Guide', 'Act as a database administrator. Explain how indexing works, when to use clustered vs non-clustered indexes, and how to optimize slow SELECT queries.', 'Accelerate database search');

// 6. Design (13 prompts)
addPrompt('Design', 'UI Feedback Audit', 'Act as a Senior UX/UI designer. Review the following layout description or wireframe logic: [Layout details]. Identify usability friction, visual hierarchy issues, and accessibility concerns.', 'Audit interfaces for UX friction');
addPrompt('Design', 'Generate Color Palette', 'Act as a brand designer. Generate a curated color palette of 5 colors for a [Niche] brand. Provide Hex codes, RGB, and explain the emotional impact of the primary color.', 'Select harmonious brand colors');
addPrompt('Design', 'Design System Structure', 'Act as a design system architect. Outline the components, design tokens, and style rules required for a SaaS product design system. Organize by atomic principles.', 'Set up component style libraries');
addPrompt('Design', 'Figma Autolayout Tips', 'Explain how to set up responsive Autolayout in Figma for a complex card component containing an image, title, badge, and action buttons.', 'Learn responsive Figma layouts');
addPrompt('Design', 'A11y Typography Rules', 'Provide font size, line height, and color contrast guidelines for body text, headers, and buttons that ensure WCAG 2.1 AA compliance.', 'Verify typography accessibility');
addPrompt('Design', 'Wireframe Mobile App', 'Describe the wireframe layout and UI flow for a 3-step checkout process on a mobile app. Detail the elements shown on each screen.', 'Wireframe mobile UX steps');
addPrompt('Design', 'Logo Brainstorming Guide', 'Act as a graphic designer. Brainstorm 5 conceptual directions for a logo for a company called "[Name]" that does [Action]. Describe the symbolisms.', 'Generate logo concept directions');
addPrompt('Design', 'UX Copywriting Guide', 'Rewrite the following generic system messages (error state, empty state, success state) to make them clear, friendly, and helpful for users.', 'Polish error and state notifications');
addPrompt('Design', 'User Flow Mapping', 'Outline the user flow and actions required for a user to register, complete onboarding, and connect their calendar in a SaaS app.', 'Map software user flows');
addPrompt('Design', 'Landing Page Hierarchy', 'Analyze a standard landing page layout and rearrange its sections to optimize for user scroll depth and conversions. Explain the order.', 'Structure high-converting landing pages');
addPrompt('Design', 'Component State Checklist', 'Provide a checklist of all states a designer needs to design for an interactive button and text input field (default, hover, focus, disabled, error).', 'Check interactive UI coverage');
addPrompt('Design', 'Responsive Layout Rules', 'Explain how to design grids and breakpoints for a responsive web dashboard that scales smoothly from desktop to mobile.', 'Design responsive grid layouts');
addPrompt('Design', 'UX Persona Creation', 'Act as a product designer. Create a detailed user persona for an app targeted at [Audience]. Detail their tech stack, goals, frustrations, and daily workflows.', 'Build product user personas');

// 7. Email (13 prompts)
addPrompt('Email', 'Cold Sales Outreach', 'Act as an expert B2B copywriter. Write a cold outreach email pitching [Product] to a [Target Title]. Keep it under 150 words, conversational, and with a low-friction CTA.', 'Pitch prospects via email');
addPrompt('Email', 'Follow-up Email Template', 'Write a polite, professional follow-up email to a client who hasn\'t responded to a proposal sent 5 days ago. Keep it warm and non-intrusive.', 'Follow up on pending proposals');
addPrompt('Email', 'Customer Support Template', 'Act as a customer support lead. Write an empathetic email responding to a customer whose package was delayed. Offer a solution and a discount code.', 'Draft customer service templates');
addPrompt('Email', 'Meeting Request Pitch', 'Draft a professional email requesting a 20-minute meeting with [Name] to discuss [Topic]. Provide three availability options in their time zone.', 'Schedule corporate meetings');
addPrompt('Email', 'Declining a Proposal', 'Write a polite, professional email declining a vendor\'s proposal. Thank them for their time and leave the door open for future collaboration.', 'Decline B2B offers gracefully');
addPrompt('Email', 'Salary Negotiation Draft', 'Act as a career advisor. Write an email to negotiate a job offer salary. Focus on value delivered, market rates, and maintain an enthusiastic tone.', 'Negotiate employment packages');
addPrompt('Email', 'Newsletter Subject Lines', 'Generate 10 engaging subject lines and preview texts for an email newsletter about [Topic] to increase open rates. Avoid spam triggers.', 'Boost marketing email open rates');
addPrompt('Email', 'Product Updates Email', 'Write a product update email to existing users announcing the release of [Feature]. Focus on the user benefit and provide a link to the docs.', 'Announce new software updates');
addPrompt('Email', 'Apology Email Template', 'Write an official apology email to users due to a system outage. Explain what happened, how it was resolved, and what steps are taken to prevent it.', 'Communicate server outages');
addPrompt('Email', 'Asking for Feedback', 'Write an email to customers who recently purchased [Product] asking for an honest review or feedback. Keep it short and offer a small incentive.', 'Collect reviews after purchase');
addPrompt('Email', 'Internal Status Update', 'Draft a weekly status update email to stakeholders regarding the progress of the [Project Name] project. Structure with: Accomplishments, Next Steps, Risks.', 'Report project updates internally');
addPrompt('Email', 'Welcome Sequence Email', 'Write the first email in a welcome sequence for new subscribers to a blog about [Topic]. Set expectations, introduce yourself, and share top 3 articles.', 'Draft onboarding email campaigns');
addPrompt('Email', 'Resignation Letter Draft', 'Draft a formal, positive resignation letter to a manager. Provide 2 weeks\' notice, offer transition help, and thank them for the opportunities.', 'Submit career resignations');

// 8. SQL (13 prompts)
addPrompt('SQL', 'Group & Calculate Trend', 'Write a SQL query to calculate the monthly revenue and year-over-year revenue growth percentage from a table called `orders` with columns `order_date` and `total_amount`.', 'Calculate monthly sales trends');
addPrompt('SQL', 'Optimizing Slow Join', 'Explain how to optimize the following slow query. Identify indexes to add and rewrite the JOINs or subqueries if necessary to improve execution speed.', 'Optimize query query execution time');
addPrompt('SQL', 'Find Duplicate Records', 'Write a SQL query to identify duplicate rows in a table `users` based on the `email` column. Show the email and the duplicate count.', 'Locate redundant database rows');
addPrompt('SQL', 'Calculate Running Total', 'Write a SQL query using window functions to calculate the running total of sales for each salesperson over time from a table `sales`.', 'Compute cumulative sales progress');
addPrompt('SQL', 'Compare Active Users', 'Write a SQL query to find users who were active in [Month A] but did not perform any actions in [Month B]. Use a subquery or EXCEPT.', 'Track customer churn rates');
addPrompt('SQL', 'Handle Null Values', 'Explain the differences between COALESCE, ISNULL, and CASE WHEN in SQL. Show examples of how to replace null values with a default string.', 'Replace missing column data');
addPrompt('SQL', 'Design Relational CTEs', 'Write a SQL query using Common Table Expressions (CTEs) to find the top 5 departments with the highest average salary and list their employees.', 'Write complex department analyses');
addPrompt('SQL', 'Implement Upsert Query', 'Provide SQL syntax (PostgreSQL and MySQL variants) to insert a new row or update existing values if a primary key conflict occurs (UPSERT/ON CONFLICT).', 'Perform insert-or-update queries');
addPrompt('SQL', 'Database Partitioning', 'Act as a database administrator. Explain table partitioning, when it is useful, and write a SQL statement to partition a table by date range.', 'Scale database structures');
addPrompt('SQL', 'Find Gaps in Sequence', 'Write a SQL query to identify missing numbers in a sequential column (e.g. invoice numbers or transaction IDs) from a table.', 'Audit gaps in accounting sequences');
addPrompt('SQL', 'Convert Date Formats', 'Write a SQL query to extract day of week, hour of day, and year from a timestamp column, and format it as \'YYYY-MM-DD\'.', 'Format timezone timestamps');
addPrompt('SQL', 'Calculate Daily Retention', 'Write a SQL query to calculate the Day 1 retention rate of users signing up to an application, using an `events` table.', 'Compute app retention statistics');
addPrompt('SQL', 'Rank Items in Group', 'Write a SQL query using DENSE_RANK() to rank products by sales amount within their respective categories.', 'Rank items dynamically in categories');

// 9. Excel (13 prompts)
addPrompt('Excel', 'XLOOKUP Guide', 'Explain how to use the XLOOKUP function in Excel. Provide a step-by-step example comparing it to VLOOKUP and explain its advantages.', 'Locate table cell matches');
addPrompt('Excel', 'Conditional Formatting Rules', 'Write a custom formula for Excel Conditional Formatting to highlight rows where the due date in Column B is past today and the status in Column C is not "Done".', 'Highlight overdue tasks automatically');
addPrompt('Excel', 'Complex Nested IFs', 'Write an Excel formula to assign letter grades based on scores in Column A: A (>=90), B (80-89), C (70-79), D (60-69), F (<60). Use IFS or nested IF.', 'Automate grade distributions');
addPrompt('Excel', 'Clean Text Formulas', 'Write Excel formulas to clean raw customer data in Column A: remove leading/trailing spaces, capitalize only the first letter, and extract domain from email.', 'Clean raw text entries');
addPrompt('Excel', 'Calculate CAGR Formula', 'Provide the Excel formula to calculate the Compound Annual Growth Rate (CAGR) given a starting value, ending value, and number of years.', 'Compute investment compound growth');
addPrompt('Excel', 'Create Dynamic Dropdowns', 'Explain how to set up dependent dropdown lists in Excel (e.g. selecting "Country" updates the second dropdown to show "Cities" in that country).', 'Build interactive spreadsheet forms');
addPrompt('Excel', 'Advanced Pivot Tables', 'Write a guide on how to group dates by quarters in an Excel Pivot Table and calculate the percentage difference from the previous quarter.', 'Aggregate time series metrics');
addPrompt('Excel', 'Extract String with Regex', 'Explain how to extract text between parentheses in Excel using standard formulas like MID, FIND, and LEN.', 'Extract specific text segments');
addPrompt('Excel', 'Summing with Multiple Criteria', 'Explain how to use SUMIFS to sum sales values in Column C where Column A is "Region East" and Column B is "Product Category Electronics".', 'Filter and sum spreadsheets');
addPrompt('Excel', 'Date Calculation Formulas', 'Write an Excel formula to calculate the number of working days between two dates, excluding weekends and a custom list of holidays.', 'Calculate business durations');
addPrompt('Excel', 'Index Match Lookup', 'Explain how to use INDEX and MATCH together in Excel to perform a left lookup. Show a practical example.', 'Perform advanced matrix queries');
addPrompt('Excel', 'Keyboard Shortcut Cheat Sheet', 'List the top 15 Excel keyboard shortcuts for data manipulation, formatting, and navigation to speed up workflows.', 'Accelerate sheet navigation');
addPrompt('Excel', 'Identify Outlier Formulas', 'Explain how to find outliers in a dataset using the IQR method in Excel. Write the required formulas for Q1, Q3, and bounds.', 'Filter statistical outliers');

// 10. Learning (12 prompts)
addPrompt('Learning', 'Explain Like I\'m 5', 'Explain the concept of "[Topic]" in simple terms, using a metaphor that a 5-year-old would understand.', 'Simplify complex theoretical concepts');
addPrompt('Learning', 'Create Study Syllabus', 'Act as an educator. Design a self-study syllabus to learn [Topic] from scratch in 4 weeks. Break it down day-by-day and suggest resource types.', 'Design custom learning paths');
addPrompt('Learning', 'Feynman Technique Guide', 'Teach me how to use the Feynman Technique to understand "[Topic]". Walk me through the steps and ask me questions to check my understanding.', 'Master difficult subjects easily');
addPrompt('Learning', 'Active Recall Flashcards', 'Create 10 high-quality flashcards (Question/Answer format) based on the following text to help me practice active recall.', 'Study using flashcard Q&A');
addPrompt('Learning', 'Socratic Questioning Method', 'Act as a Socratic teacher. Ask me thought-provoking questions one-by-one to help me critically analyze the concept of [Topic].', 'Challenge core assumptions');
addPrompt('Learning', 'Mnemonic Device Creator', 'Generate 3 mnemonic devices or acronyms to help me memorize the following list of terms: [List of terms]. Explain the association.', 'Memorize complex list orders');
addPrompt('Learning', 'Mind Map Outline', 'Create a structured outline that I can use to build a mind map about "[Topic]". Organize by main branches, sub-branches, and keywords.', 'Outline visual mind maps');
addPrompt('Learning', 'Contrast Two Theories', 'Compare and contrast the learning theories of [Theory A] and [Theory B]. Explain how they differ in classroom application.', 'Compare educational frameworks');
addPrompt('Learning', 'Suggest Book Reading List', 'Recommend the top 5 books to read if I want to master [Topic] from intermediate to advanced level. Provide a brief summary of what each book covers.', 'Locate expert literature');
addPrompt('Learning', 'Practice Exam Generator', 'Generate a 5-question multiple-choice practice quiz about [Topic]. Include the questions, options, correct answers, and detailed explanations.', 'Test subject matter comprehension');
addPrompt('Learning', 'Explain Quantum Computing', 'Explain the core principles of quantum computing (superposition, entanglement) to a software engineer who only knows classical programming.', 'Bridge advanced tech domains');
addPrompt('Learning', 'Debating Both Sides', 'Act as a debate coach. Present arguments for both the pros and cons of the following topic: "[Topic]". Use logical reasoning and evidence.', 'Analyze controversial subjects');

// 11. Creative (12 prompts)
addPrompt('Creative', 'Sci-Fi Worldbuilding', 'Act as a worldbuilder. Design a sci-fi city located on [Planet type]. Detail the infrastructure, source of energy, social hierarchy, and one daily custom.', 'Detail fictional environments');
addPrompt('Creative', 'Creative Writing Prompts', 'Generate 5 unique creative writing prompts in the [Genre] genre. Each prompt should include a conflict, a setting, and a character quirk.', 'Overcome writers block');
addPrompt('Creative', 'Character Backstory Creator', 'Act as a novelist. Design a detailed character profile for a protagonist named [Name] in a [Genre] story. Detail their motivation, secret fear, and key relationships.', 'Design fictional characters');
addPrompt('Creative', 'Brainstorm Lyrics Hooks', 'Write 5 catchy song hooks/chorus lyrics for a [Genre] song about [Theme]. Include details about the tempo and emotional delivery.', 'Compose catchy music hooks');
addPrompt('Creative', 'Alternative Plot Twists', 'Suggest 3 alternative plot twists for the following storyline: [Story outline]. The twist should be unexpected but logically consistent.', 'Solve narrative dead-ends');
addPrompt('Creative', 'Metaphor Generator', 'Generate 10 vivid, creative metaphors for "[Concept]" (e.g. anxiety, hope, grief) to use in poetic writing.', 'Draft descriptive prose metaphors');
addPrompt('Creative', 'Recipe Remix Design', 'Remix a classic recipe for [Dish] by introducing 3 unexpected ingredients that pair well. Explain the flavor profiles and steps.', 'Design gourmet food recipes');
addPrompt('Creative', 'Art Prompt Generator', 'Describe a detailed scene for an oil painting. Detail the lighting, composition, color palette, subjects, and emotional atmosphere.', 'Generate illustration ideas');
addPrompt('Creative', 'Naming Fictional Towns', 'Brainstorm 10 names for a mysterious, isolated town in a fantasy novel. Explain the etymology and folklore behind each name.', 'Name fantasy locations');
addPrompt('Creative', 'Fictional Technology design', 'Describe a fictional invention or gadget in a cyberpunk setting. Detail how it functions, its social impact, and its limitations.', 'Invent sci-fi gadgets');
addPrompt('Creative', 'Rewrite Classic Story', 'Rewrite the introduction of the classic fairy tale [Fairy Tale] as a modern neo-noir story. Focus on sensory descriptions.', 'Modernize old legends');
addPrompt('Creative', 'Dialogue Scene Prompt', 'Write a dialogue scene between two characters who are trying to hide a secret from each other while discussing a trivial topic like dining.', 'Draft tense script dialogues');

// 12. Productivity (12 prompts)
addPrompt('Productivity', 'Eisenhower Matrix Plan', 'Sort the following list of tasks using the Eisenhower Matrix (Urgent & Important, Important but Not Urgent, Urgent but Not Important, Neither). Suggest what to delegate or drop.', 'Prioritize daily todo lists');
addPrompt('Productivity', 'Optimize Daily Schedule', 'Analyze my daily schedule: [Schedule]. Suggest optimizations to implement time-blocking, protect deep-focus hours, and reduce meeting fatigue.', 'Organize personal calendars');
addPrompt('Productivity', 'Weekly Review Script', 'Act as a productivity coach. Write a step-by-step checklist to conduct a highly effective 30-minute Sunday Weekly Review to plan the upcoming week.', 'Plan weekly reviews');
addPrompt('Productivity', 'Delegate Tasks Guide', 'Provide a template script to delegate [Task] to a team member. Detail the context, expected deliverables, deadlines, and checkpoints.', 'Delegate tasks efficiently');
addPrompt('Productivity', 'Overcome Procrastination', 'Provide a step-by-step action plan to start working on [Difficult project] when experiencing low motivation. Use techniques like 5-minute rule.', 'Defeat procrastination');
addPrompt('Productivity', 'Habit Stacking Blueprint', 'Design a habit loop blueprint using the Habit Stacking method to build the habit of [New Habit]. Define the Cue, Craving, Response, and Reward.', 'Build positive habits');
addPrompt('Productivity', 'Email Inbox Zero Plan', 'Outline a workflow and list of folder labels/filters to achieve Inbox Zero in under 30 minutes a day. Detail sorting rules.', 'Organize messy email boxes');
addPrompt('Productivity', 'Pomodoro Session Planner', 'Structure a 4-cycle Pomodoro focus block to accomplish [Goal]. Detail the specific sub-tasks to execute during each 25-minute interval.', 'Structure deep focus sessions');
addPrompt('Productivity', 'Meeting Agenda Draft', 'Write a highly focused 30-minute meeting agenda for [Topic]. Detail the purpose, attendees\' pre-work, and a minute-by-minute breakdown.', 'Plan corporate agendas');
addPrompt('Productivity', 'Deconstruct Giant Project', 'Deconstruct the massive goal of "[Project/Goal]" into 10 smaller, actionable, bite-sized tasks. Put them in logical sequence.', 'Break down intimidating goals');
addPrompt('Productivity', 'Digital Clutter Cleanup', 'Provide a checklist to perform a digital cleanup of my desktop, files, browser bookmarks, and download folders in under 1 hour.', 'Organize desktop and local files');
addPrompt('Productivity', 'Journal Prompt Routine', 'Provide a list of 5 morning journaling prompts and 5 evening reflection prompts to improve self-awareness and daily productivity.', 'Reflect on personal progress');


// Ensure directory exists
const dir = path.dirname('/Users/shubhaang/Desktop/PromptIQ/data/library.json');
if (!fs.existsSync(dir)){
    fs.mkdirSync(dir, { recursive: true });
}

// Write file
fs.writeFileSync('/Users/shubhaang/Desktop/PromptIQ/data/library.json', JSON.stringify(prompts, null, 2));

console.log(`Generated ${prompts.length} prompts successfully!`);

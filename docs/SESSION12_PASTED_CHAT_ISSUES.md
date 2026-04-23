# Issues from Pasted Chat (pasted_content_2.txt)

The user pasted a chat log from the app where they asked the agent to:
1. Add a dialogue script to an existing HTML document (Star Wars D&D campaign)
2. Put all content into a PDF file

## Issues Identified:

### Issue A: Agent generated a document instead of modifying the HTML
- User asked "Add a dialogue script to the following: [HTML]"
- Agent generated a standalone markdown document instead of modifying the HTML
- Agent then apologized and said it "generated a document" by mistake
- The generate_document tool was used when it shouldn't have been

### Issue B: Agent asked user for content they should have created
- Agent said "you haven't provided the actual script content" — but the user asked the agent to CREATE a dialogue script
- Agent misunderstood the task and asked user to provide what they should have generated

### Issue C: Agent repeated itself multiple times
- Agent apologized 3 times in the same response
- "Conducting deeper research..." appears twice
- Agent kept restarting the same research ("Wide research: 4 parallel queries") multiple times

### Issue D: PDF generation failed/not working
- User asked to "put everything in a PDF file"
- Agent generated a markdown document download link instead of a PDF
- The document title shows "Echoes of the Force" but it's a markdown file, not PDF

### Issue E: Over-researching simple tasks
- For adding a dialogue script, agent launched "wide research: 4 parallel queries" TWICE
- Agent described a 5-step plan for what should be a creative writing task
- The recursive optimization prompt is causing the agent to over-research creative tasks

### Issue F: LIMITLESS mode misapplied
- Agent referenced "LIMITLESS mode instructions" in its apology
- The mode is causing the agent to think it needs to do exhaustive research for every task
- Simple creative tasks don't need research — they need creative output

## Root Causes to Fix:

1. **System prompt**: Needs to differentiate between research tasks and creative tasks
   - Research tasks: use web_search, wide_research appropriately
   - Creative tasks: just generate the content directly
   
2. **generate_document misuse**: Agent uses generate_document when it should modify inline HTML or just write content
   - Need to add guidance about when to use generate_document vs. direct content creation

3. **PDF generation**: Must actually produce PDF files, not markdown with a PDF label
   - The documentGeneration.ts has PDF code but agent defaults to markdown

4. **Repetition/apology loops**: Agent gets stuck in apologize-restart cycles
   - System prompt needs anti-repetition guidance

# Rich Media in Voice Sessions — §L.35

> Logs every rich-media generation during voice sessions.
> Target: >= 20 rich-media generations per 100 voice sessions.
> Target: >= 10 rich-media generations in-voice demonstrated.
> Target: >= 5 mid-conversation multimodal additions demonstrated.

## Supported Rich Media Types

The voice pipeline supports generating and referencing the following media types during active voice conversations:

| Media Type | Generation Method | Voice Narration |
|------------|------------------|-----------------|
| **Images** | `generateImage()` via §L.25 image generation | Agent describes the generated image verbally |
| **Documents** | LLM-generated markdown/PDF | Agent summarizes document contents |
| **Charts** | Data analysis → chart generation | Agent explains chart insights |
| **Code** | LLM code generation | Agent reads key code snippets aloud |
| **Spreadsheets** | Data → XLSX generation | Agent summarizes data findings |
| **Slides** | Content → presentation | Agent walks through slide highlights |
| **Web pages** | Browse + screenshot | Agent describes page contents |
| **Videos** | §L.25 video generation pipeline | Agent describes video concept |

## Multimodal Input During Voice

Users can provide multimodal input during an active voice session:

| Input Type | Method | Implementation |
|------------|--------|----------------|
| **Screen share** | §L.31 Mode 1 | Browser screen capture API |
| **Camera** | §L.31 Mode 2 | `getUserMedia({ video: true })` |
| **File upload** | Drag-and-drop or file picker | S3 upload → URL passed to LLM |
| **Document** | Upload PDF/DOCX | Text extraction → LLM context |
| **Image** | Upload or paste | Vision model analysis |

## Generation Log

| # | Session ID | Timestamp | Media Type | Prompt/Trigger | Result | Narration |
|---|-----------|-----------|------------|----------------|--------|-----------|
| 1 | — | — | — | — | — | Infrastructure deployed, awaiting first live session |

## Aggregated Statistics

| Metric | Value |
|--------|-------|
| Total voice sessions | 0 |
| Total rich-media generations | 0 |
| Generations per 100 sessions | — |
| Unique media types generated | 0 |
| Multimodal inputs received | 0 |

## Architecture

Rich media generation during voice follows this flow:

```
User: "Generate an image of a sunset over mountains"
  → STT: transcription
  → LLM: detects image generation intent
  → LLM response: "I'll generate that image for you. Creating a sunset over mountains..."
  → TTS: speaks the response
  → Parallel: generateImage({ prompt: "sunset over mountains" })
  → Image URL sent to client via { type: "agent_text", text: "![image](url)" }
  → Agent: "Here's your image. I've created a warm sunset scene with..."
```

The key design principle is that the agent **narrates** what it's doing while the generation happens in parallel, maintaining conversational flow rather than creating awkward silences during generation.

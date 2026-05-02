/**
 * Session 31: Agent Quality Fixes
 * Tests for frustration detection, visible text output, and follow-up handling
 */
import { describe, it, expect } from "vitest";

// Test the frustration detection regex
const FRUSTRATION_REGEX = /\b(why (did|didn't|is|isn't|are|aren't) (you|there|it|none|no)|you completed prematurely|I didn't ask|stop (doing|generating|making)|what happened|no response|not responding|broken|doesn't work|why is none|you ignored|ignoring me|wrong|that's not what I|I said)\b/i;

// Test the demonstration regex
const DEMONSTRATION_REGEX = /\b(demonstrate\s+(each|all|every)|show\s+(me\s+)?(all|each|every)\s+(your\s+)?(capabilities|tools|features)|what\s+can\s+you\s+do.*(demonstrate|show)|go\s+until\s+done|do\s+them\s+all|show\s+me\s+all)\b/i;

// Test the proportional response regex (simple questions)
const SIMPLE_QUESTION_REGEX = /^(what (is|are|was|were|time|date|day)|who (is|are|was)|where (is|are)|when (is|was|did)|how (many|much|old|long|far|tall)|tell me (about|the)|define |explain |describe |list |name )/i;

describe("Frustration Detection", () => {
  it("detects 'why did you' pattern", () => {
    expect(FRUSTRATION_REGEX.test("why did you generate an image?")).toBe(true);
  });

  it("detects 'you completed prematurely'", () => {
    expect(FRUSTRATION_REGEX.test("you completed prematurely")).toBe(true);
  });

  it("detects 'I didn't ask'", () => {
    expect(FRUSTRATION_REGEX.test("I didn't ask for that")).toBe(true);
  });

  it("detects 'stop doing'", () => {
    expect(FRUSTRATION_REGEX.test("stop doing that")).toBe(true);
  });

  it("detects 'why is none'", () => {
    expect(FRUSTRATION_REGEX.test("why is none of your text displayed")).toBe(true);
  });

  it("detects 'not responding'", () => {
    expect(FRUSTRATION_REGEX.test("you're not responding to me")).toBe(true);
  });

  it("detects 'you ignored'", () => {
    expect(FRUSTRATION_REGEX.test("you ignored my question")).toBe(true);
  });

  it("detects 'doesn't work'", () => {
    expect(FRUSTRATION_REGEX.test("this doesn't work")).toBe(true);
  });

  it("detects 'that's not what I'", () => {
    expect(FRUSTRATION_REGEX.test("that's not what I asked for")).toBe(true);
  });

  it("does NOT trigger on normal questions", () => {
    expect(FRUSTRATION_REGEX.test("What is the weather today?")).toBe(false);
  });

  it("does NOT trigger on 'generate an image'", () => {
    expect(FRUSTRATION_REGEX.test("generate an image of a sunset")).toBe(false);
  });

  it("does NOT trigger on 'continue'", () => {
    expect(FRUSTRATION_REGEX.test("continue with the next step")).toBe(false);
  });

  it("does NOT trigger on 'why is the sky blue'", () => {
    // "why is" + "the" should NOT match because "the" is not in (you|there|it|none|no)
    expect(FRUSTRATION_REGEX.test("why is the sky blue")).toBe(false);
  });
});

describe("Demonstration Detection", () => {
  it("matches 'demonstrate each capability'", () => {
    expect(DEMONSTRATION_REGEX.test("demonstrate each capability")).toBe(true);
  });

  it("matches 'show me all your capabilities'", () => {
    expect(DEMONSTRATION_REGEX.test("show me all your capabilities")).toBe(true);
  });

  it("matches 'go until done'", () => {
    expect(DEMONSTRATION_REGEX.test("go until done")).toBe(true);
  });

  it("does NOT match 'generate an example of each'", () => {
    expect(DEMONSTRATION_REGEX.test("generate an example of each")).toBe(false);
  });

  it("does NOT match 'show me the weather'", () => {
    expect(DEMONSTRATION_REGEX.test("show me the weather")).toBe(false);
  });

  it("does NOT match normal requests", () => {
    expect(DEMONSTRATION_REGEX.test("research AI agent architectures")).toBe(false);
  });
});

describe("Proportional Response - Simple Questions", () => {
  it("matches 'what is the current date'", () => {
    expect(SIMPLE_QUESTION_REGEX.test("what is the current date")).toBe(true);
  });

  it("matches 'who is the president'", () => {
    expect(SIMPLE_QUESTION_REGEX.test("who is the president")).toBe(true);
  });

  it("matches 'how many planets are there'", () => {
    expect(SIMPLE_QUESTION_REGEX.test("how many planets are there")).toBe(true);
  });

  it("matches 'explain quantum computing'", () => {
    expect(SIMPLE_QUESTION_REGEX.test("explain quantum computing")).toBe(true);
  });

  it("matches 'tell me about AI agents'", () => {
    expect(SIMPLE_QUESTION_REGEX.test("tell me about AI agents")).toBe(true);
  });

  it("does NOT match 'research AI agent architectures'", () => {
    expect(SIMPLE_QUESTION_REGEX.test("research AI agent architectures")).toBe(false);
  });

  it("does NOT match 'generate a PDF report'", () => {
    expect(SIMPLE_QUESTION_REGEX.test("generate a PDF report")).toBe(false);
  });

  it("does NOT match 'build me a website'", () => {
    expect(SIMPLE_QUESTION_REGEX.test("build me a website")).toBe(false);
  });
});

describe("Visible Text Output Safety Net", () => {
  it("safety net triggers when finalContent is empty and tool calls were made", () => {
    const finalContent = "";
    const completedToolCalls = 3;
    const shouldTriggerSafetyNet = !finalContent.trim() && completedToolCalls > 0;
    expect(shouldTriggerSafetyNet).toBe(true);
  });

  it("safety net does NOT trigger when finalContent has text", () => {
    const finalContent = "Here are the results of my research...";
    const completedToolCalls = 3;
    const shouldTriggerSafetyNet = !finalContent.trim() && completedToolCalls > 0;
    expect(shouldTriggerSafetyNet).toBe(false);
  });

  it("safety net does NOT trigger when no tool calls were made", () => {
    const finalContent = "";
    const completedToolCalls = 0;
    const shouldTriggerSafetyNet = !finalContent.trim() && completedToolCalls > 0;
    expect(shouldTriggerSafetyNet).toBe(false);
  });
});

describe("Follow-up Message Priority", () => {
  it("frustration overrides demonstration mode", () => {
    const lastUserText = "you completed prematurely, why did you stop?";
    const isUserFrustrated = FRUSTRATION_REGEX.test(lastUserText);
    const wantsDemonstration = !isUserFrustrated && DEMONSTRATION_REGEX.test(lastUserText);
    
    expect(isUserFrustrated).toBe(true);
    expect(wantsDemonstration).toBe(false);
  });

  it("normal follow-up does not trigger frustration", () => {
    const lastUserText = "now generate a PDF report about the findings";
    const isUserFrustrated = FRUSTRATION_REGEX.test(lastUserText);
    expect(isUserFrustrated).toBe(false);
  });

  it("'continue' does not trigger frustration", () => {
    const lastUserText = "continue with the demonstration";
    const isUserFrustrated = FRUSTRATION_REGEX.test(lastUserText);
    expect(isUserFrustrated).toBe(false);
  });
});

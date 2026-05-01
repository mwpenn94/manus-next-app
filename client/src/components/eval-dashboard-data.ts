export type EvaluationMetric = "BLEU" | "ROUGE" | "BERTScore" | "Human Rating";

export interface EvaluationSample {
  id: string;
  input: string;
  output: string;
  expected: string;
  category: string;
  scores: Record<EvaluationMetric, number>;
}

export interface EvaluationSet {
  id: string;
  name: string;
  samples: EvaluationSample[];
}

export interface ModelVersion {
  id: string;
  name: string;
  metrics: Record<EvaluationMetric, number>;
}

const categories = ["Summarization", "Translation", "QA", "Reasoning", "Code"];

function generateSamples(count: number): EvaluationSample[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `sample-${i + 1}`,
    input: `Input text for sample ${i + 1}: ${categories[i % categories.length]} task.`,
    output: `Model output for sample ${i + 1}.`,
    expected: `Expected output for sample ${i + 1}.`,
    category: categories[i % categories.length],
    scores: {
      BLEU: parseFloat((0.3 + Math.random() * 0.6).toFixed(3)),
      ROUGE: parseFloat((0.4 + Math.random() * 0.5).toFixed(3)),
      BERTScore: parseFloat((0.5 + Math.random() * 0.45).toFixed(3)),
      "Human Rating": Math.floor(Math.random() * 5) + 1,
    },
  }));
}

export const evaluationSets: EvaluationSet[] = [
  { id: "eval-set-1", name: "General Benchmark v1", samples: generateSamples(100) },
  { id: "eval-set-2", name: "Domain-Specific v2", samples: generateSamples(100) },
  { id: "eval-set-3", name: "Adversarial Test v3", samples: generateSamples(100) },
];

export const modelVersions: ModelVersion[] = [
  { id: "v1", name: "v1.0", metrics: { BLEU: 0.52, ROUGE: 0.61, BERTScore: 0.72, "Human Rating": 3.2 } },
  { id: "v2", name: "v1.5", metrics: { BLEU: 0.58, ROUGE: 0.65, BERTScore: 0.76, "Human Rating": 3.5 } },
  { id: "v3", name: "v2.0", metrics: { BLEU: 0.65, ROUGE: 0.71, BERTScore: 0.81, "Human Rating": 3.9 } },
  { id: "v4", name: "v2.5", metrics: { BLEU: 0.71, ROUGE: 0.76, BERTScore: 0.85, "Human Rating": 4.2 } },
  { id: "v5", name: "v3.0", metrics: { BLEU: 0.75, ROUGE: 0.80, BERTScore: 0.88, "Human Rating": 4.5 } },
];

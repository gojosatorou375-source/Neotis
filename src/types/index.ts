export type Phase = "landing" | "interview" | "loading" | "completion";

export interface Question {
  id: number;
  title: string;
  description: string;
  placeholder: string;
}

export type Answers = Record<number, string>;

export interface InterviewState {
  phase: Phase;
  currentIndex: number;
  answers: Answers;
}

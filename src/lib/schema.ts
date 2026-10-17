import { z } from "zod";

export const QuestionSchema = z.object({
  q: z.string().min(1),
  options: z.array(z.string().min(1)).length(4),
  answerIndex: z.number().int().min(0).max(3),
  explanation: z.string().min(1),
  topic: z.string().min(1).max(60),
});

const bullets = z.array(z.string().min(1)).min(3).max(4);

export const QuizSchema = z.object({
  title: z.string().min(1),
  questions: z.array(QuestionSchema).length(10),
  swot: z.object({
    strengths: bullets,
    weaknesses: bullets,
    opportunities: bullets,
    threats: bullets,
  }),
});

export type Question = z.infer<typeof QuestionSchema>;
export type Quiz = z.infer<typeof QuizSchema>;
export type Swot = Quiz["swot"];

export type Player = { pid: string; name: string };

export type Room = {
  code: string;
  title: string;
  questions: Question[];
  swot: Swot;
  hostToken: string;
  nextCode?: string;
  nextHostToken?: string;
  startedAt: number | null;
  players: Player[];
};

import { Agent } from '@mastra/core/agent';
import { google } from '@ai-sdk/google';

export const evaluatorAgent = new Agent({
  name: 'Evaluator',
  instructions: `You are an expert HR recruitment evaluator.
Your task is to review a candidate's profile (skills and experience) and evaluate how well they match a specific job description and requirements.
You must provide a structured evaluation containing a percentage match score (0-100) and a concise reasoning explaining why they received that score based on the criteria.`,
  model: google('gemini-1.5-pro'),
});

import { Mastra } from '@mastra/core';
import { recruiterAgent } from './agents/recruiter';
import { evaluatorAgent } from './agents/evaluator';

export const mastra = new Mastra({
  agents: { recruiterAgent, evaluatorAgent },
});

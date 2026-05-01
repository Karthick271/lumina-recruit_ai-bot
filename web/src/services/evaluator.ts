import { z } from 'zod';
import { mastra } from '../mastra';
import { fetchWorkdayJobById } from './workday';

// The schema for our scoring output
export const CandidateScoreSchema = z.object({
  percentage: z.number().min(0).max(100).describe('The overall match percentage score between the candidate and the job requirements'),
  reasoning: z.string().describe('A concise explanation for the score based on the matching and missing skills or experience'),
});

export type CandidateScoreResult = z.infer<typeof CandidateScoreSchema>;

export async function evaluateCandidateMatch(
  candidateProfile: string,
  jobId: string
): Promise<CandidateScoreResult | null> {
  const job = await fetchWorkdayJobById(jobId);
  
  if (!job) {
    console.error(`Job with ID ${jobId} not found.`);
    return null;
  }

  const prompt = `
Please evaluate the following candidate against the job requirements.

Job Title: ${job.title}
Job Description: ${job.description}
Job Requirements:
${job.requirements.map(req => `- ${req}`).join('\n')}

Candidate Profile:
${candidateProfile}

Provide a percentage score and a reasoning for this match.
`;

  try {
    const evaluatorAgent = mastra.getAgent('evaluatorAgent');
    const response = await evaluatorAgent.generate(prompt, {
      output: CandidateScoreSchema
    });
    
    // Check if the response object has the 'object' property correctly matched to our schema.
    if (response && response.object) {
      const result = response.object;
      
      // Store/Log the calculated result
      console.log(`Evaluated candidate for Job ${jobId}. Score: ${result.percentage}%`);
      console.log(`Reasoning: ${result.reasoning}`);
      
      return result;
    } else {
      console.error('Failed to generate structured evaluation output');
      return null;
    }
  } catch (error) {
    console.error('Error during candidate evaluation:', error);
    return null;
  }
}

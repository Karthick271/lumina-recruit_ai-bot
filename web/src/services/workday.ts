// Mock Workday API Integration for POC
// This simulates fetching job records from Workday

export interface JobRecord {
  id: string;
  title: string;
  department: string;
  location: string;
  type: string;
  description: string;
  requirements: string[];
}

const mockJobs: JobRecord[] = [
  {
    id: "wd-job-001",
    title: "Software Engineer",
    department: "Engineering",
    location: "Remote",
    type: "Full-time",
    description: "We are looking for a Software Engineer to join our core team.",
    requirements: ["3+ years TypeScript", "React/Next.js", "Node.js"]
  },
  {
    id: "wd-job-002",
    title: "Product Manager",
    department: "Product",
    location: "New York, NY",
    type: "Full-time",
    description: "Seeking an experienced Product Manager to lead our new AI initiatives.",
    requirements: ["5+ years PM experience", "Agile methodologies", "AI/ML background"]
  }
];

export async function fetchWorkdayJobs(): Promise<JobRecord[]> {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 1000));
  return mockJobs;
}

export async function fetchWorkdayJobById(id: string): Promise<JobRecord | undefined> {
  await new Promise(resolve => setTimeout(resolve, 500));
  return mockJobs.find(job => job.id === id);
}

import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');
const INTERVIEWS_FILE = path.join(DATA_DIR, 'interviews.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

export function saveInterview(interviewId, data) {
  let interviews = {};
  
  // Load existing data
  if (fs.existsSync(INTERVIEWS_FILE)) {
    interviews = JSON.parse(fs.readFileSync(INTERVIEWS_FILE, 'utf8'));
  }
  
  // Add new interview
  interviews[interviewId] = {
    ...data,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  
  // Save to file
  fs.writeFileSync(INTERVIEWS_FILE, JSON.stringify(interviews, null, 2));
}

export function loadInterview(interviewId) {
  if (!fs.existsSync(INTERVIEWS_FILE)) {
    return null;
  }
  
  const interviews = JSON.parse(fs.readFileSync(INTERVIEWS_FILE, 'utf8'));
  return interviews[interviewId] || null;
}

export function loadAllInterviews() {
  if (!fs.existsSync(INTERVIEWS_FILE)) {
    return {};
  }
  
  return JSON.parse(fs.readFileSync(INTERVIEWS_FILE, 'utf8'));
}

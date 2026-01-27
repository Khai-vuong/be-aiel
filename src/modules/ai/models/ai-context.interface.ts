export type AIServiceType = 
  | 'SYSTEM_CONTROL' 
  | 'STUDY_ANALYST' 
  | 'TUTOR' 
  | 'TEACHING_ASSISTANT';

export interface AIContext {
  userId: string;
  userRole: string;
  serviceType: AIServiceType;
  timestamp: Date;
  user?: {
    id: string;
    email: string;
    name: string;
    role: string;
  };
  systemMetrics?: any;
  courseData?: any;
  classData?: any;
  studentData?: {
    enrollments: any[];
    recentAttempts: any[];
  };
  lecturerData?: {
    courses: any[];
  };
  conversationHistory?: any[];
  additionalContext: Record<string, any>;
}

export interface AIProviderConfig {
  apiKey?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  [key: string]: any;
}

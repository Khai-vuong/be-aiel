// import { Injectable, Logger } from '@nestjs/common';
// import { PrismaService } from '../../../../prisma.service';
// import {
//   OuterApiProvider,
//   OuterApiService,
// } from '../outer-api/outer-api.service';
// import {
//   RagCapabilityExecution,
//   RagPlannerService,
// } from './rag-planner.service';
// import {
//   RAG_CAPABILITY_ENTRIES,
// } from './capability-entries';

// type RagContextChunk = {
//   capabilityId: string;
//   title: string;
//   content: string;
//   fetchedAt: string;
// };

// export type RagOrchestratorRequest = {
//   prompt: string;
//   userId: string;
//   userRole: string;
//   metadata?: RagMetadata;
//   provider?: OuterApiProvider;
//   temperature?: number;
//   customSystemPrompt?: string;
//   onlyUseSystemPrompt?: boolean;
//   forcedCapabilityIds?: string[];
//   maxCapabilities?: number;
//   conversationId?: string;
//   convLimit?: number;
// };

// export type RagOrchestratorResponse = {
//   text: string;
//   provider: OuterApiProvider;
//   capabilityPlan: string[];
//   chunksUsed: number;
//   systemPrompt: string;
// };

// @Injectable()
// export class RagOrchestratorService {
//   private readonly logger = new Logger(RagOrchestratorService.name);
//   private readonly contextMaxChars = Number(
//     process.env.RAG_CONTEXT_MAX_CHARS ?? 12000,
//   );

//   constructor(
//     private readonly prisma: PrismaService,
//     private readonly outerApiService: OuterApiService,
//     private readonly ragPlannerService: RagPlannerService,
//   ) {}

//   async chat(input: RagOrchestratorRequest): Promise<RagOrchestratorResponse> {
//     // STEP 1: PLANNING PHASE - Determine which capabilities (data sources) are needed
//     // Input analysis: parse prompt for keywords → match against intentHints
//     // Role-based filtering: ensure user has permission to access each capability
//     // Metadata validation: check if required metadata (classId, courseId) is provided
//     // Output: sorted list of relevant capabilities by priority
//     const plan = await this.ragPlannerService.selectCapabilitiesFromPrompt({
//       prompt: input.prompt,
//       userRole: input.userRole,
//       metadata: input.metadata,
//       provider: input.provider,
//     });

//     this.logger.log(
//       `RAG plan created. capabilities=[${plan.map((entry) => entry.capabilityId).join(', ')}]`,
//     );

//     // STEP 2: CONTEXT RETRIEVAL PHASE - Fetch data from database for each planned capability
//     // For each capability in plan:
//     //   - Call fetchCapabilityContext() to get raw data
//     //   - Convert to JSON string (context chunk)
//     //   - Accumulate chunks until reaching RAG_CONTEXT_MAX_CHARS limit
//     //   - Handle errors gracefully (log warning, continue to next capability)
//     // Output: array of context chunks with title + content
//     const chunks = await this.fetchContextChunks(plan, input);

//     // STEP 3: PROMPT COMPOSITION PHASE - Build final prompt for LLM
//     // Combine user prompt + retrieved context chunks
//     // Format: [capability-id] Title + content for each chunk
//     // Add instruction markers (RAG CONTEXT START/END)
//     // Respect token budget: truncate if necessary
//     const composedPrompt = this.composeRagPrompt(input.prompt, chunks);

//     // STEP 4: LLM INFERENCE PHASE - Send composed prompt to AI provider
//     // Delegate to OuterApiService which handles provider selection (Groq/OpenAI/Gemini)
//     // System prompt + context + user request all included in composed prompt
//     // Provider performs inference and returns generated response
//     const aiResult = await this.outerApiService.chat({
//       prompt: composedPrompt,
//       role: input.userRole,
//       caller: 'rag-orchestrator',
//       provider: input.provider,
//       temperature: input.temperature,
//       customSystemPrompt: input.customSystemPrompt,
//       onlyUseSystemPrompt: input.onlyUseSystemPrompt,
//       conversationId: input.conversationId,
//       userId: input.userId,
//       convLimit: input.convLimit,
//     });

//     // STEP 5: RESPONSE ASSEMBLY - Return result with metadata for traceability
//     // Include: AI response text, which provider was used, capability plan, chunks count
//     // Allows caller to audit which data sources were used and trace decision path
//     return {
//       text: aiResult.text,
//       provider: aiResult.provider,
//       capabilityPlan: plan.map((entry) => entry.capabilityId),
//       chunksUsed: chunks.length,
//       systemPrompt: aiResult.systemPrompt,
//     };
//   }

//   private async fetchContextChunks(
//     plan: RagCapabilityExecution[],
//     input: RagOrchestratorRequest,
//   ): Promise<RagContextChunk[]> {
//     // Initialize empty chunks array to store retrieved context
//     const chunks: RagContextChunk[] = [];

//     // LOOP through capabilities in planned order (by priority)
//     for (const entry of plan) {
//       try {
//         const title =
//           RAG_CAPABILITY_ENTRIES.find(
//             (candidate) => candidate.id === entry.capabilityId,
//           )?.description ?? entry.capabilityId;
//         // STEP A: Fetch capability-specific context from database
//         // Router method that delegates to appropriate fetch function
//         // Passes entry metadata (maxItems, required params) for optimized query
//         const content = await this.fetchCapabilityContext(entry, input);
        
//         // STEP B: Skip if no content retrieved (permission denied or no data)
//         if (!content) {
//           continue;
//         }

//         // STEP C: Create context chunk with metadata
//         // Include: capability ID (for traceability), title (for formatting), content (raw JSON data)
//         // Timestamp for audit trail of when data was fetched
//         chunks.push({
//           capabilityId: entry.capabilityId,
//           title,
//           content,
//           fetchedAt: new Date().toISOString(),
//         });

//         // STEP D: Calculate total accumulated context size (char count)
//         // Sum lengths of all content strings collected so far
//         // Used to enforce token budget limit early before calling LLM
//         const currentLength = chunks.reduce(
//           (sum, chunk) => sum + chunk.content.length,
//           0,
//         );
        
//         // STEP E: Stop fetching if context size limit reached
//         // Prevent excessive data being sent to LLM
//         // Respects environment variable RAG_CONTEXT_MAX_CHARS (default 12000)
//         if (currentLength >= this.contextMaxChars) {
//           break;
//         }
//       } catch (error) {
//         // STEP F: Graceful error handling - log and continue
//         // Individual capability failure doesn't stop entire process
//         // Allows partial context retrieval if some sources fail
//         this.logger.warn(
//           `RAG capability failed: ${entry.capabilityId}. reason=${error instanceof Error ? error.message : String(error)}`,
//         );
//       }
//     }

//     // Return collected chunks in order of priority (earlier = more relevant)
//     return chunks;
//   }

//   private async fetchCapabilityContext(
//     entry: RagCapabilityExecution,
//     input: RagOrchestratorRequest,
//   ): Promise<string | null> {
//     // Extract capability metadata for use in fetch
//     const capabilityId = entry.capabilityId;
//     const maxItems =
//       typeof entry.resolvedParameters?.limit === 'number'
//         ? entry.resolvedParameters.limit
//         : undefined;

//     // ROUTER PATTERN: Dispatch to specialized fetch method based on capability ID
//     // Each method handles its own database query, authorization, and formatting
//     switch (capabilityId) {
//       // Identity-based context: user's own profile
//       case 'user-profile':
//         return this.fetchUserProfile(input.userId);

//       // Class-level context: all class metadata and related quizzes
//       // Requires classId in metadata, validates lecturer/student membership
//       case 'class-snapshot':
//         return this.fetchClassSnapshot(
//           input.userId,
//           input.userRole,
//           entry.resolvedParameters?.classId ?? input.metadata?.classId,
//         );

//       // Course-level context: course info, lecturers, enrollments
//       // Requires courseId in metadata, validates access permission
//       case 'course-snapshot':
//         return this.fetchCourseSnapshot(
//           input.userId,
//           input.userRole,
//           entry.resolvedParameters?.courseId ?? input.metadata?.courseId,
//         );

//       // Performance context: recent quiz attempts by student
//       // Limited by maxItems from capability entry (typically 8)
//       case 'student-recent-attempts':
//         return this.fetchStudentRecentAttempts(input.userId, maxItems);

//       // Notification context: recent platform notifications
//       // Limited by maxItems from capability entry (typically 10)
//       case 'user-notifications':
//         return this.fetchUserNotifications(input.userId, maxItems);

//       // Audit context: user activity history
//       // Limited by maxItems from capability entry (typically 10)
//       case 'user-activity-logs':
//         return this.fetchUserActivityLogs(input.userId, maxItems);

//       // Fallback: unknown capability → return null, will be skipped in fetchContextChunks
//       default:
//         return null;
//     }
//   }

//   private async fetchUserProfile(userId: string): Promise<string | null> {
//     // QUERY: Find user by UID (unique identifier)
//     // Include related profile data based on user role (student/lecturer/admin)
//     // Select only necessary fields to minimize payload size
//     const user = await this.prisma.user.findUnique({
//       where: { uid: userId },
//       include: {
//         // Student profile: if user is a student
//         student: {
//           select: {
//             sid: true,      // Student ID
//             name: true,     // Student full name
//             major: true,    // Academic major
//           },
//         },
//         // Lecturer profile: if user is a lecturer
//         lecturer: {
//           select: {
//             lid: true,      // Lecturer ID
//             name: true,     // Lecturer full name
//           },
//         },
//         // Admin profile: if user is an administrator
//         admin: {
//           select: {
//             aid: true,      // Admin ID
//             name: true,     // Admin name
//           },
//         },
//       },
//     });

//     // ERROR HANDLING: Return null if user not found (authorization check upstream)
//     if (!user) {
//       return null;
//     }

//     // DATA FORMATTING: Build response object with identity info
//     // Include: unique ID, username, role label, account status
//     // Include: role-specific profile (one of student/lecturer/admin will be populated)
//     const payload = {
//       uid: user.uid,
//       username: user.username,
//       role: user.role,
//       status: user.status,
//       student: user.student,
//       lecturer: user.lecturer,
//       admin: user.admin,
//     };

//     // SERIALIZATION: Convert to JSON string for storage in context chunk
//     return JSON.stringify(payload);
//   }

//   private async fetchClassSnapshot(
//     userId: string,
//     userRole: string,
//     classId?: string,
//   ): Promise<string | null> {
//     // VALIDATION: classId must be provided in metadata
//     // Return null early if required parameter missing
//     if (!classId) {
//       return null;
//     }

//     // QUERY: Fetch class by ID with full relationships
//     // Include lecturer (owner), course (parent), students (roster), recent quizzes
//     // Select limited fields for each relation to keep payload manageable
//     const classData = await this.prisma.class.findUnique({
//       where: { clid: classId },
//       include: {
//         // Fetch class owner (lecturer) info
//         lecturer: {
//           select: {
//             lid: true,      // Lecturer ID
//             name: true,     // Name for display
//             user_id: true,  // User ID for authorization check
//           },
//         },
//         // Fetch parent course metadata
//         course: {
//           select: {
//             cid: true,      // Course ID
//             code: true,     // Course code (e.g., CS101)
//             name: true,     // Course name
//             credits: true,  // Credit hours
//           },
//         },
//         // Fetch enrolled students (roster)
//         students: {
//           select: {
//             sid: true,      // Student ID
//             user_id: true,  // User ID for membership check
//           },
//         },
//         // Fetch recent quizzes (activity indicator)
//         quizzes: {
//           select: {
//             qid: true,      // Quiz ID
//             name: true,     // Quiz name
//             status: true,   // Draft/published/archived
//           },
//           orderBy: { created_at: 'desc' },  // Newest first
//           take: 10,         // Limit to 10 most recent
//         },
//       },
//     });

//     // ERROR HANDLING: Return null if class doesn't exist
//     if (!classData) {
//       return null;
//     }

//     // AUTHORIZATION CHECK 1: Lecturer can only see their own classes
//     // Compare lecturer.user_id with requesting userId
//     if (userRole === 'Lecturer' && classData.lecturer.user_id !== userId) {
//       return null;
//     }

//     // AUTHORIZATION CHECK 2: Student can only see classes they're enrolled in
//     // Check if userId appears in students roster
//     if (
//       userRole === 'Student' &&
//       !classData.students.some((student) => student.user_id === userId)
//     ) {
//       return null;
//     }

//     // DATA FORMATTING: Build response object with class overview
//     // Include: basic class info (ID, name, schedule, location)
//     // Include: relationship summaries (lecturer, course, student count)
//     // Include: recent activity (list of recent quizzes)
//     const payload = {
//       clid: classData.clid,           // Class ID
//       name: classData.name,           // Class name
//       status: classData.status,       // Active/Cancelled/Completed
//       location: classData.location,   // Physical location
//       schedule_json: classData.schedule_json,  // Schedule data
//       lecturer: {
//         lid: classData.lecturer.lid,
//         name: classData.lecturer.name,
//       },
//       course: classData.course,       // Full course reference
//       studentCount: classData.students.length,  // Total enrolled
//       quizCount: classData.quizzes.length,      // Total quizzes
//       recentQuizzes: classData.quizzes,         // Latest quiz activity
//     };

//     // SERIALIZATION: Convert to JSON string for context chunk
//     return JSON.stringify(payload);
//   }

//   private async fetchCourseSnapshot(
//     userId: string,
//     userRole: string,
//     courseId?: string,
//   ): Promise<string | null> {
//     // VALIDATION: courseId must be provided in metadata
//     if (!courseId) {
//       return null;
//     }

//     // QUERY: Fetch course with all related data
//     // Include: lecturers (instructors), enrollments (students), classes (sections)
//     const course = await this.prisma.course.findUnique({
//       where: { cid: courseId },
//       include: {
//         // Fetch all lecturers teaching this course
//         lecturers: {
//           select: {
//             lid: true,      // Lecturer ID
//             name: true,     // Name
//             user_id: true,  // User ID for authorization check
//           },
//         },
//         // Fetch all student enrollments in course
//         enrollments: {
//           select: {
//             ceid: true,     // Enrollment ID
//             status: true,   // Pending/Unregistered/Completed
//             student: {
//               select: {
//                 sid: true,      // Student ID
//                 name: true,     // Student name
//                 user_id: true,  // User ID for membership check
//               },
//             },
//           },
//         },
//         // Fetch all class sections of this course
//         classes: {
//           select: {
//             clid: true,     // Class ID
//             name: true,     // Class name
//             status: true,   // Active/Cancelled/Completed
//           },
//           orderBy: { created_at: 'desc' },  // Newest sections first
//           take: 10,                         // Limit to 10 most recent
//         },
//       },
//     });

//     // ERROR HANDLING: Return null if course not found
//     if (!course) {
//       return null;
//     }

//     // AUTHORIZATION CHECK 1: Lecturer can only see courses they teach
//     // Check if userId appears in lecturers list
//     if (
//       userRole === 'Lecturer' &&
//       !course.lecturers.some((lecturer) => lecturer.user_id === userId)
//     ) {
//       return null;
//     }

//     // AUTHORIZATION CHECK 2: Student can only see courses they're enrolled in
//     // Check if userId appears in any enrollment record
//     if (
//       userRole === 'Student' &&
//       !course.enrollments.some(
//         (enrollment) => enrollment.student.user_id === userId,
//       )
//     ) {
//       return null;
//     }

//     // DATA FORMATTING: Build response with course overview
//     // Include: basic course info (code, name, description, credits)
//     // Include: engagement metrics (lecturer count, enrollment count)
//     // Include: section activity (list of active/inactive classes)
//     const payload = {
//       cid: course.cid,                        // Course ID
//       code: course.code,                      // Course code (unique identifier)
//       name: course.name,                      // Course name
//       description: course.description,        // Course description/syllabus
//       credits: course.credits,                // Credit hours
//       lecturerCount: course.lecturers.length, // Number of instructors
//       enrollmentCount: course.enrollments.length,  // Total students enrolled
//       // Count how many classes are currently Active (teaching ongoing)
//       activeClasses: course.classes.filter((item) => item.status === 'Active')
//         .length,
//       classes: course.classes,                // Full list of class sections
//     };

//     // SERIALIZATION: Convert to JSON string for context chunk
//     return JSON.stringify(payload);
//   }

//   private async fetchStudentRecentAttempts(
//     userId: string,
//     maxItems = 8,
//   ): Promise<string | null> {
//     // LOOKUP: Convert userId to student record to get student ID
//     // Student can only view their own attempts (userId → student.sid)
//     const student = await this.prisma.student.findUnique({
//       where: { user_id: userId },
//       select: {
//         sid: true,  // Student ID needed for next query
//       },
//     });

//     // ERROR HANDLING: Return null if user is not a student
//     if (!student) {
//       return null;
//     }

//     // QUERY: Fetch recent quiz attempts by this student
//     // Include quiz metadata (name, class) to provide context
//     // Order by start time descending (most recent first)
//     const attempts = await this.prisma.attempt.findMany({
//       where: {
//         student_id: student.sid,  // Filter to this student's attempts only
//       },
//       select: {
//         atid: true,         // Attempt ID
//         score: true,        // Raw score earned
//         max_score: true,    // Maximum possible score
//         percentage: true,   // Score percentage (0-100)
//         status: true,       // in_progress/submitted/graded
//         started_at: true,   // When quiz was started
//         submitted_at: true, // When quiz was submitted
//         // Include quiz details for context
//         quiz: {
//           select: {
//             qid: true,      // Quiz ID
//             name: true,     // Quiz name
//             // Include class for reference
//             class: {
//               select: {
//                 clid: true,  // Class ID
//                 name: true,  // Class name
//               },
//             },
//           },
//         },
//       },
//       orderBy: { started_at: 'desc' },  // Newest attempts first
//       take: maxItems,                   // Limit to capability's maxItems (default 8)
//     });

//     // EARLY RETURN: If no attempts found, return null (no data to include)
//     if (attempts.length === 0) {
//       return null;
//     }

//     // SERIALIZATION: Convert attempts array to JSON string
//     // Returns chronologically ordered quiz performance history
//     return JSON.stringify(attempts);
//   }

//   private async fetchUserNotifications(
//     userId: string,
//     maxItems = 10,
//   ): Promise<string | null> {
//     // QUERY: Fetch recent notifications for user
//     // Only fetch user's own notifications (user_id = userId)
//     // Include all notification metadata for full context
//     const notifications = await this.prisma.notification.findMany({
//       where: { user_id: userId },  // Filter to this user's notifications only
//       select: {
//         nid: true,          // Notification ID
//         title: true,        // Notification title
//         message: true,      // Notification message body
//         type: true,         // Type: general/quiz_posted/grade_released/etc
//         is_read: true,      // Read status
//         related_type: true, // Resource type: Quiz/Course/Attempt/Assignment
//         related_id: true,   // Resource ID for linking back
//         created_at: true,   // Timestamp for ordering
//       },
//       orderBy: { created_at: 'desc' },  // Newest notifications first
//       take: maxItems,                   // Limit to capability's maxItems (default 10)
//     });

//     // EARLY RETURN: If no notifications found, return null (no data to include)
//     if (notifications.length === 0) {
//       return null;
//     }

//     // SERIALIZATION: Convert notifications array to JSON string
//     // Returns reverse-chronological list of recent platform events
//     return JSON.stringify(notifications);
//   }

//   private async fetchUserActivityLogs(
//     userId: string,
//     maxItems = 10,
//   ): Promise<string | null> {
//     // QUERY: Fetch audit trail of user actions
//     // Only fetch logs for this user (user_id = userId)
//     // Include action type and affected resource (if any)
//     const logs = await this.prisma.log.findMany({
//       where: { user_id: userId },  // Filter to this user's actions only
//       select: {
//         logid: true,        // Log entry ID
//         action: true,       // Action type: login/logout/create_quiz/submit_attempt/etc
//         resource_type: true,// Resource affected: User/Quiz/Attempt/Answer/File/etc
//         resource_id: true,  // ID of the affected resource (if applicable)
//         created_at: true,   // Timestamp for ordering
//       },
//       orderBy: { created_at: 'desc' },  // Newest logs first
//       take: maxItems,                   // Limit to capability's maxItems (default 10)
//     });

//     // EARLY RETURN: If no logs found, return null (no data to include)
//     if (logs.length === 0) {
//       return null;
//     }

//     // SERIALIZATION: Convert logs array to JSON string
//     // Returns reverse-chronological audit trail of user behavior
//     return JSON.stringify(logs);
//   }

//   private composeRagPrompt(prompt: string, chunks: RagContextChunk[]): string {
//     // OPTIMIZATION: If no context chunks retrieved, return original prompt
//     // Fallback behavior: LLM can still respond with just user input
//     if (chunks.length === 0) {
//       return prompt;
//     }

//     // STEP 1: Initialize prompt sections with instruction header
//     // Tell LLM to use provided context and handle missing data gracefully
//     // Add visual delimiter to clearly separate context from user request
//     const sections: string[] = [
//       'Use the following retrieved context from internal systems.',
//       'If context is missing or insufficient, clearly state the limitation.',
//       '',
//       '--- RAG CONTEXT START ---',
//     ];

//     // STEP 2: Iterate through context chunks in priority order
//     // For each chunk: add capability ID tag + title (for traceability)
//     // Add raw content (JSON data fetched from database)
//     // Add blank line for readability between chunks
//     for (const chunk of chunks) {
//       sections.push(`[${chunk.capabilityId}] ${chunk.title}`);
//       sections.push(chunk.content);  // Raw JSON string from DB
//       sections.push('');              // Blank line separator
//     }

//     // STEP 3: Close context section and mark user request start
//     // Use visual markers to help LLM identify boundaries
//     sections.push('--- RAG CONTEXT END ---');
//     sections.push('');
//     sections.push('User request:');
//     // STEP 4: Append original user prompt at end
//     // This is the actual question/task to be answered using context above
//     sections.push(prompt);

//     // STEP 5: Join all sections with newlines to create final prompt
//     const merged = sections.join('\n');
    
//     // STEP 6: Enforce token budget limit (prevent context overflow)
//     // If merged prompt exceeds RAG_CONTEXT_MAX_CHARS, truncate
//     // Preserves beginning of context (most important data) at expense of end
//     if (merged.length <= this.contextMaxChars) {
//       return merged;
//     }

//     // STEP 7: Truncate to fit within char limit if necessary
//     // Character-level truncation (note: may cut in middle of JSON)
//     // Alternative: could implement smarter truncation by removing last chunks
//     return merged.slice(0, this.contextMaxChars);
//   }
// }
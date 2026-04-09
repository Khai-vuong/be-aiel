# RAG Plan Executer Documentation

This document describes the capability IDs executed by [rag-plan-executer.service.ts](/d:/Bin1802/Year%204/Specialized_project/Ai-el/be-aiel/src/modules/ai/services/RAG/rag-plan-executer.service.ts) and the table-shaped context each capability returns.

The executer returns plain text blocks, not JSON. For documentation purposes, mock outputs below are formatted in a more dev-friendly way:

```txt
[TABLE_NAME]
columnA	columnB	columnC
row1A	row1B	row1C
row2A	row2B	row2C
```

## Important Note

There is currently one naming mismatch:

- [capability-entries.ts](/d:/Bin1802/Year%204/Specialized_project/Ai-el/be-aiel/src/modules/ai/services/RAG/capability-entries.ts) contains `analyze-quiz-performance`
- [rag-plan-executer.service.ts](/d:/Bin1802/Year%204/Specialized_project/Ai-el/be-aiel/src/modules/ai/services/RAG/rag-plan-executer.service.ts) currently executes `query-student`

If planner and executer must work together correctly, those IDs should match.

## `log-retrive`

Purpose: Retrieve logs from the system, optionally filtered by log type.

Parameters:

```txt
limit?: number
offset?: number
logType?: string
```

Returns:

- `LOGS`
- `USERS`

Mock output:

```txt
[LOGS]
action	            resource_type	resource_id	created_at	                userUid
LOGIN	            AUTH	        session001	2026-04-09T08:10:00.000Z	admin001
UPDATE_COURSE	    COURSE	        course001	2026-04-09T08:15:00.000Z	admin001
CREATE_QUIZ	        QUIZ	        quiz003	    2026-04-09T08:20:00.000Z	lecturer001

[USERS]
uid	            username	role
admin001	    admin01	    Admin
lecturer001	    lecturer01	Lecturer
```

## `log-from-user`

Purpose: Retrieve profile summary and logs for a specific user.

Parameters:

```txt
userId: string
limit?: number
offset?: number
```

Returns:

- `USER`
- `LOGS`

Mock output:

```txt
[USER]
uid	username	role
lecturer001	lecturer01	Lecturer

[LOGS]
action	        resource_type	resource_id	created_at
CREATE_QUIZ	QUIZ	quiz001	    2026-04-09T08:20:00.000Z
UPDATE_QUIZ	QUIZ	quiz001	    2026-04-09T08:30:00.000Z
```

## `enrollments`

Purpose: Retrieve course enrollments with optional status and date-range filters.

Parameters:

```txt
status?: string
start_range?: string
end_range?: string
limit?: number
offset?: number
```

Returns:

- `ENROLLMENTS`

Mock output:

```txt
[ENROLLMENTS]
studentName	    studentMajor	         courseCode	    courseName	    status	enrolledAt
Alice Johnson	Computer Science	    CS101	        Python Basics	Pending	2026-01-10T00:00:00.000Z
Charlie Davis	Software Engineering	CS101	        Python Basics	Completed	2026-01-11T00:00:00.000Z
```

## `class-overview`

Purpose: Return quiz-level overview for a class and student-level performance summary.

Parameters:

```txt
classId: string
quizId?: string
```

Behavior:

- If `quizId` is omitted, the executer queries all quizzes in the class and returns one overview row per quiz.
- If `quizId` is provided, the overview table contains only one row for that quiz.
- Output uses `quizName` and `studentName` instead of raw IDs.

Returns:

- `CLASS {classId}: QUIZ OVERVIEW`
- `CLASSOVERVIEWSCOPE`
- `STUDENTPERFORMANCE`

Mock output:

```txt
[CLASS L01: QUIZ OVERVIEW]
quizName	                    totalAttempts	averageScore	highestScore	lowestScore	passRate
Control Flow and Loops	        6	            50	            90	            10	        50.0%
Functions and Modules	        6	            55	            100         	30      	50.0%
Lists, Dictionaries, and Sets	6	            48.33	        90          	20      	50.0%
Python Basics Quiz	            6	            53.33   	    70          	30      	83.3%
Variables and Data Types	    6           	51.67	        90          	10	        50.0%

[CLASSOVERVIEWSCOPE]
quizId	totalAttempts	totalStudents	totalQuizzes
null	30	3	5

[STUDENTPERFORMANCE]
studentName	        totalAttempts	averageScore	highestScore	lowestScore
Alice Johnson	    10          	56          	100         	10
Charlie Davis	    10          	52          	90          	10
Eva Thompson	    10          	47          	90          	10
```

## `query-student`

Purpose: Query students in a class by average score with configurable filters.

Parameters:

```txt
classId: string
quizId?: string
take?: number
threshold?: number
comparison?: string (gt, gte, lt, lte)
```

Behavior:

- Compute average score per student within the provided scope.
- Apply optional threshold filtering.
- Sort descending by default.
- If `comparison` is `lt` or `lte`, sort ascending to surface low-performing students first.
- Return only the first `take` matched students.

Returns:

- `STUDENTQUERYSCOPE`
- `QUERIEDSTUDENTS`

Mock output:

```txt
[STUDENTQUERYSCOPE]
classId	    quizId  	take	threshold	comparison	matchedStudents
L01     	null	    5   	50      	lt      	3

[QUERIEDSTUDENTS]
studentId	averageScore	totalAttempts
student005	32.5        	4
student003	41          	4
student007	48.25	        4
```

## `teaching-recommendation`

Purpose: Return monthly completion trend data for a class.

Parameters:

```txt
classId: string
```

Returns:

- `TEACHINGRECOMMENDATIONSCOPE`
- `MONTHLYCOMPLETIONTREND`

Mock output:

```txt
[TEACHINGRECOMMENDATIONSCOPE]
classId	totalAttempts	trackedMonths
L01	30	4

[MONTHLYCOMPLETIONTREND]
month	submissions
2026-01	6
2026-02	7
2026-03	9
2026-04	8
```

## `knowledge-gap`

Purpose: Return question-level correctness and the most common wrong answer to support misconception analysis.

Parameters:

```txt
classId: string
quizId?: string
```

Returns:

- `KNOWLEDGEGAPSCOPE`
- `KNOWLEDGEGAPBYQUESTION`

Mock output:

```txt
[KNOWLEDGEGAPSCOPE]
classId 	quizId	    totalAnswers	totalQuestions
L01	        quiz001 	25	            5

[KNOWLEDGEGAPBYQUESTION]
questionId	                    question	totalAnswers	passRate	topWrongAnswer	topWrongCount
question001	What is a loop?	    5	    40.0%	B	3
question002	What does a function return?	5	60.0%	C	2
question003	Which structure stores unique values?	5	20.0%	List	4
```

## Summary

Current executer handlers:

- `log-retrive`
- `log-from-user`
- `enrollments`
- `class-overview`
- `query-student`
- `teaching-recommendation`
- `knowledge-gap`

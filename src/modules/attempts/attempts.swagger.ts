import { applyDecorators } from '@nestjs/common';
import {
    ApiOperation,
    ApiResponse,
    ApiBearerAuth,
    ApiParam,
    ApiBody
} from '@nestjs/swagger';
import { CreateAttemptDto, SubmitAttemptDto, UpdateAttemptDto } from './attempts.dto';

export function SwaggerCreateAttempt() {
    return applyDecorators(
        ApiBearerAuth('JWT-auth'),
        ApiOperation({
            summary: 'Create a new quiz attempt',
            description: 'Student starts a new attempt for a quiz. Returns attempt details with in_progress status.'
        }),
        ApiBody({ type: CreateAttemptDto }),
        ApiResponse({
            status: 201,
            description: 'Attempt successfully created',
            schema: {
                type: 'object',
                properties: {
                    atid: { type: 'string', example: 'attempt001' },
                    quiz_id: { type: 'string', example: 'quiz001' },
                    student_id: { type: 'string', example: 'student001' },
                    status: { type: 'string', example: 'in_progress', enum: ['in_progress', 'submitted', 'graded'] },
                    attempt_number: { type: 'number', example: 1 },
                    started_at: { type: 'string', format: 'date-time' },
                    submitted_at: { type: 'string', format: 'date-time', nullable: true },
                    score: { type: 'number', nullable: true },
                    percentage: { type: 'number', nullable: true }
                }
            }
        }),
        ApiResponse({ status: 400, description: 'Bad Request - Quiz not found, Student not found, or max attempts reached' }),
        ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing JWT token' })
    );
}

export function SwaggerSubmitAttempt() {
    return applyDecorators(
        ApiBearerAuth('JWT-auth'),
        ApiOperation({
            summary: 'Submit a quiz attempt',
            description: 'Student submits their quiz attempt with all answers. Marks attempt as submitted.'
        }),
        ApiParam({
            name: 'attemptId',
            description: 'Attempt ID',
            example: 'attempt001'
        }),
        ApiBody({ type: SubmitAttemptDto }),
        ApiResponse({
            status: 200,
            description: 'Attempt successfully submitted',
            schema: {
                type: 'object',
                properties: {
                    atid: { type: 'string' },
                    quiz_id: { type: 'string' },
                    student_id: { type: 'string' },
                    status: { type: 'string', example: 'submitted' },
                    attempt_number: { type: 'number' },
                    started_at: { type: 'string', format: 'date-time' },
                    submitted_at: { type: 'string', format: 'date-time' },
                    answers: {
                        type: 'array',
                        items: {
                            type: 'object',
                            properties: {
                                ansid: { type: 'string' },
                                question_id: { type: 'string' },
                                answer_json: { type: 'string' },
                                is_correct: { type: 'boolean', nullable: true },
                                points_awarded: { type: 'number', nullable: true }
                            }
                        }
                    }
                }
            }
        }),
        ApiResponse({ status: 400, description: 'Bad Request - Attempt not in progress or invalid questions' }),
        ApiResponse({ status: 404, description: 'Attempt or Quiz not found' }),
        ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing JWT token' })
    );
}

export function SwaggerGetAttemptsByQuiz() {
    return applyDecorators(
        ApiBearerAuth('JWT-auth'),
        ApiOperation({
            summary: 'Get all attempts for a quiz',
            description: 'Retrieve all attempts for a specific quiz. Only accessible by Admin and Lecturer.'
        }),
        ApiParam({
            name: 'qid',
            description: 'Quiz ID',
            example: 'quiz001'
        }),
        ApiResponse({
            status: 200,
            description: 'Successfully retrieved attempts',
            schema: {
                type: 'array',
                items: {
                    type: 'object',
                    properties: {
                        atid: { type: 'string' },
                        quiz_id: { type: 'string' },
                        student_id: { type: 'string' },
                        student: {
                            type: 'object',
                            properties: {
                                sid: { type: 'string' },
                                name: { type: 'string' }
                            }
                        },
                        status: { type: 'string' },
                        attempt_number: { type: 'number' },
                        score: { type: 'number', nullable: true },
                        percentage: { type: 'number', nullable: true },
                        started_at: { type: 'string', format: 'date-time' },
                        submitted_at: { type: 'string', format: 'date-time', nullable: true }
                    }
                }
            }
        }),
        ApiResponse({ status: 404, description: 'Quiz not found' }),
        ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing JWT token' }),
        ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
    );
}

export function SwaggerGetAttemptsByQuizAndStudent() {
    return applyDecorators(
        ApiBearerAuth('JWT-auth'),
        ApiOperation({
            summary: 'Get attempts for a specific student in a specific quiz',
            description: 'Retrieve all attempts for a student in a quiz by composite key (qid, sid)'
        }),
        ApiParam({
            name: 'qid',
            description: 'Quiz ID',
            example: 'quiz001'
        }),
        ApiParam({
            name: 'sid',
            description: 'Student ID',
            example: 'student001'
        }),
        ApiResponse({
            status: 200,
            description: 'Successfully retrieved attempts',
            schema: {
                type: 'array',
                items: {
                    type: 'object',
                    properties: {
                        atid: { type: 'string' },
                        quiz_id: { type: 'string' },
                        student_id: { type: 'string' },
                        status: { type: 'string' },
                        attempt_number: { type: 'number' },
                        score: { type: 'number', nullable: true },
                        percentage: { type: 'number', nullable: true },
                        started_at: { type: 'string', format: 'date-time' },
                        submitted_at: { type: 'string', format: 'date-time', nullable: true },
                        answers: {
                            type: 'array',
                            items: {
                                type: 'object'
                            }
                        }
                    }
                }
            }
        }),
        ApiResponse({ status: 404, description: 'Quiz or Student not found' }),
        ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing JWT token' })
    );
}

export function SwaggerGetAttempt() {
    return applyDecorators(
        ApiBearerAuth('JWT-auth'),
        ApiOperation({
            summary: 'Get attempt by ID',
            description: 'Retrieve detailed information about a specific attempt including all answers'
        }),
        ApiParam({
            name: 'attemptId',
            description: 'Attempt ID',
            example: 'attempt001'
        }),
        ApiResponse({
            status: 200,
            description: 'Successfully retrieved attempt',
            schema: {
                type: 'object',
                properties: {
                    atid: { type: 'string' },
                    quiz_id: { type: 'string' },
                    student_id: { type: 'string' },
                    quiz: {
                        type: 'object',
                        properties: {
                            qid: { type: 'string' },
                            name: { type: 'string' }
                        }
                    },
                    student: {
                        type: 'object',
                        properties: {
                            sid: { type: 'string' },
                            name: { type: 'string' }
                        }
                    },
                    status: { type: 'string' },
                    attempt_number: { type: 'number' },
                    score: { type: 'number', nullable: true },
                    percentage: { type: 'number', nullable: true },
                    started_at: { type: 'string', format: 'date-time' },
                    submitted_at: { type: 'string', format: 'date-time', nullable: true },
                    answers: {
                        type: 'array',
                        items: {
                            type: 'object',
                            properties: {
                                ansid: { type: 'string' },
                                answer_json: { type: 'string' },
                                is_correct: { type: 'boolean', nullable: true },
                                points_awarded: { type: 'number', nullable: true },
                                question: {
                                    type: 'object',
                                    properties: {
                                        ques_id: { type: 'string' },
                                        content: { type: 'string' },
                                        points: { type: 'number' }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }),
        ApiResponse({ status: 404, description: 'Attempt not found' }),
        ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing JWT token' })
    );
}

export function SwaggerUpdateAttempt() {
    return applyDecorators(
        ApiBearerAuth('JWT-auth'),
        ApiOperation({
            summary: 'Update attempt (typically for grading)',
            description: 'Update attempt information like score and status. Only accessible by Admin and Lecturer.'
        }),
        ApiParam({
            name: 'attemptId',
            description: 'Attempt ID to update',
            example: 'attempt001'
        }),
        ApiBody({ type: UpdateAttemptDto }),
        ApiResponse({
            status: 200,
            description: 'Attempt successfully updated',
            schema: {
                type: 'object',
                properties: {
                    atid: { type: 'string' },
                    quiz_id: { type: 'string' },
                    student_id: { type: 'string' },
                    status: { type: 'string' },
                    score: { type: 'number', nullable: true },
                    percentage: { type: 'number', nullable: true },
                    updated_at: { type: 'string', format: 'date-time' }
                }
            }
        }),
        ApiResponse({ status: 404, description: 'Attempt not found' }),
        ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing JWT token' }),
        ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
    );
}

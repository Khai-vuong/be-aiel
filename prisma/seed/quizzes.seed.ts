import { PrismaClient } from '@prisma/client';
import { createIfMissing } from './utils';

type QuestionSeed = {
  ques_id: string;
  content: string;
  options: Record<string, string>;
  answerKey: { correct: string | string[] };
  points: number;
};

const QUIZ_IDS = ['quiz001', 'quiz002', 'quiz003', 'quiz004', 'quiz005'] as const;
const CLASS_001_STUDENTS = [
  { username: 'student1', sid: 'student001' },
  { username: 'student3', sid: 'student003' },
  { username: 'student5', sid: 'student005' },
] as const;

type ParsedAnswerKey = { correct: string | string[] };

type ParsedQuestion = {
  ques_id: string;
  points: number;
  options: Record<string, string>;
  answerKey: ParsedAnswerKey;
};

function parseJsonObject<T>(value: unknown): T {
  if (typeof value === 'string') {
    return JSON.parse(value) as T;
  }
  return value as T;
}

function getRandomScore(): number {
  const scores = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
  return scores[Math.floor(Math.random() * scores.length)];
}

async function generateAnswersForAttempt(
  prisma: PrismaClient,
  attemptId: string,
  studentId: string,
  questions: ParsedQuestion[],
  percentage: number,
): Promise<void> {
  const correctCount = Math.round((percentage / 100) * questions.length);

  for (let index = 0; index < questions.length; index++) {
    const question = questions[index];
    const isCorrect = index < correctCount;

    let selectedAnswer: string | string[];
    if (Array.isArray(question.answerKey.correct)) {
      selectedAnswer = isCorrect ? question.answerKey.correct : [Object.keys(question.options)[0]];
    } else if (isCorrect) {
      selectedAnswer = question.answerKey.correct;
    } else {
      const wrongOptions = Object.keys(question.options).filter(
        (key) => key !== question.answerKey.correct,
      );
      selectedAnswer = wrongOptions[Math.floor(Math.random() * wrongOptions.length)];
    }

    const answerId = `answer_${attemptId}_${question.ques_id}`;
    await createIfMissing(
      prisma.answer.findUnique({ where: { ansid: answerId }, select: { ansid: true } }),
      () =>
        prisma.answer.create({
          data: {
            ansid: answerId,
            answer_json: JSON.stringify({ selected: selectedAnswer }),
            is_correct: isCorrect,
            points_awarded: isCorrect ? question.points : 0,
            attempt_id: attemptId,
            question_id: question.ques_id,
            student_id: studentId,
          },
        }),
      `Answer ${answerId}`,
    );
  }
}

async function createBaseAttemptAndAnswers(prisma: PrismaClient): Promise<void> {
  const baseAttemptId = 'attempt001';
  await createIfMissing(
    prisma.attempt.findUnique({ where: { atid: baseAttemptId }, select: { atid: true } }),
    () =>
      prisma.attempt.create({
        data: {
          atid: baseAttemptId,
          score: 3,
          max_score: 5,
          percentage: 60,
          status: 'graded',
          attempt_number: 1,
          quiz_id: 'quiz001',
          student_id: 'student001',
          submitted_at: new Date('2024-01-16T10:30:00Z'),
        },
      }),
    `Attempt ${baseAttemptId}`,
  );

  const baseAnswers = [
    { ansid: 'answer001', question_id: 'question001', selected: 'B', is_correct: true, points_awarded: 1 },
    { ansid: 'answer002', question_id: 'question002', selected: 'C', is_correct: false, points_awarded: 0 },
    {
      ansid: 'answer003',
      question_id: 'question003',
      selected: ['B', 'D'],
      is_correct: true,
      points_awarded: 1,
    },
    { ansid: 'answer004', question_id: 'question004', selected: 'A', is_correct: false, points_awarded: 0 },
    { ansid: 'answer005', question_id: 'question005', selected: 'B', is_correct: true, points_awarded: 1 },
  ];

  for (const answer of baseAnswers) {
    await createIfMissing(
      prisma.answer.findUnique({ where: { ansid: answer.ansid }, select: { ansid: true } }),
      () =>
        prisma.answer.create({
          data: {
            ansid: answer.ansid,
            answer_json: JSON.stringify({ selected: answer.selected }),
            is_correct: answer.is_correct,
            points_awarded: answer.points_awarded,
            attempt_id: baseAttemptId,
            question_id: answer.question_id,
            student_id: 'student001',
          },
        }),
      `Answer ${answer.ansid}`,
    );
  }
}

async function createGeneratedAttempts(prisma: PrismaClient): Promise<void> {
  const quizzes = await prisma.quiz.findMany({
    where: { qid: { in: [...QUIZ_IDS] } },
    include: {
      questions: {
        orderBy: {
          ques_id: 'asc',
        },
      },
    },
    orderBy: {
      qid: 'asc',
    },
  });

  const quizData = quizzes.map((quiz) => ({
    qid: quiz.qid,
    name: quiz.name,
    questions: quiz.questions.map((question) => ({
      ques_id: question.ques_id,
      points: question.points,
      options: parseJsonObject<Record<string, string>>(question.options_json),
      answerKey: parseJsonObject<ParsedAnswerKey>(question.answer_key_json),
    })),
  }));

  let attemptCounter = 2;

  for (const student of CLASS_001_STUDENTS) {
    for (const quiz of quizData) {
      const startAttempt = student.sid === 'student001' && quiz.qid === 'quiz001' ? 2 : 1;

      for (let attemptNum = startAttempt; attemptNum <= 2; attemptNum++) {
        const percentage = getRandomScore();
        const score = (percentage / 100) * 5;

        const attemptId = `attempt${String(attemptCounter).padStart(3, '0')}`;
        const createdAttempt = await createIfMissing(
          prisma.attempt.findUnique({ where: { atid: attemptId }, select: { atid: true } }),
          () =>
            prisma.attempt.create({
              data: {
                atid: attemptId,
                score,
                max_score: 5,
                percentage,
                status: 'graded',
                attempt_number: attemptNum,
                quiz_id: quiz.qid,
                student_id: student.sid,
                submitted_at: new Date(
                  `2024-01-${16 + (attemptCounter % 12)}T${10 + (attemptCounter % 10)}:30:00Z`,
                ),
              },
            }),
          `Attempt ${attemptId}`,
        );

        await generateAnswersForAttempt(prisma, attemptId, student.sid, quiz.questions, percentage);
        if (createdAttempt) {
          console.log(
            `  Created ${attemptId} for ${student.username} on ${quiz.name} with score ${percentage}%`,
          );
        }
        attemptCounter++;
      }
    }
  }
}

async function createQuestions(
  prisma: PrismaClient,
  quizId: string,
  questions: QuestionSeed[],
): Promise<void> {
  for (const question of questions) {
    await createIfMissing(
      prisma.question.findUnique({ where: { ques_id: question.ques_id }, select: { ques_id: true } }),
      () =>
        prisma.question.create({
          data: {
            ques_id: question.ques_id,
            content: question.content,
            options_json: JSON.stringify(question.options),
            answer_key_json: JSON.stringify(question.answerKey),
            points: question.points,
            quiz_id: quizId,
          },
        }),
      `Question ${question.ques_id}`,
    );
  }
}

export async function seedQuizzes(prisma: PrismaClient): Promise<void> {
  const quiz1Id = 'quiz001';
  const quiz2Id = 'quiz002';
  const quiz3Id = 'quiz003';
  const quiz4Id = 'quiz004';
  const quiz5Id = 'quiz005';

  await createIfMissing(
    prisma.quiz.findUnique({ where: { qid: quiz1Id }, select: { qid: true } }),
    () =>
      prisma.quiz.create({
        data: {
          qid: quiz1Id,
          name: 'Python Basics Quiz',
          description: 'Test your knowledge of Python fundamentals',
          settings_json: JSON.stringify({ timeLimit: 30, maxAttempts: 2, shuffleQuestions: true }),
          available_from: new Date('2024-01-15T09:00:00Z'),
          available_until: new Date('2024-01-22T23:59:59Z'),
          class_id: 'class001',
          creator_id: 'lecturer001',
          status: 'published',
        },
      }),
    `Quiz ${quiz1Id}`,
  );

  await createIfMissing(
    prisma.quiz.findUnique({ where: { qid: quiz2Id }, select: { qid: true } }),
    () =>
      prisma.quiz.create({
        data: {
          qid: quiz2Id,
          name: 'Variables and Data Types',
          description: 'Quiz on Python variables, data types, and type conversion',
          settings_json: JSON.stringify({ timeLimit: 25, maxAttempts: 2, shuffleQuestions: false }),
          available_from: new Date('2024-01-20T10:00:00Z'),
          available_until: new Date('2024-01-27T23:59:59Z'),
          class_id: 'class001',
          creator_id: 'lecturer001',
          status: 'published',
        },
      }),
    `Quiz ${quiz2Id}`,
  );

  await createIfMissing(
    prisma.quiz.findUnique({ where: { qid: quiz3Id }, select: { qid: true } }),
    () =>
      prisma.quiz.create({
        data: {
          qid: quiz3Id,
          name: 'Control Flow and Loops',
          description: 'Assessment on if statements, for loops, and while loops',
          settings_json: JSON.stringify({ timeLimit: 40, maxAttempts: 3, shuffleQuestions: true }),
          available_from: new Date('2024-02-01T09:00:00Z'),
          available_until: new Date('2024-02-08T23:59:59Z'),
          class_id: 'class001',
          creator_id: 'lecturer001',
          status: 'published',
        },
      }),
    `Quiz ${quiz3Id}`,
  );

  await createIfMissing(
    prisma.quiz.findUnique({ where: { qid: quiz4Id }, select: { qid: true } }),
    () =>
      prisma.quiz.create({
        data: {
          qid: quiz4Id,
          name: 'Functions and Modules',
          description: 'Quiz covering function definition, parameters, return values, and importing modules',
          settings_json: JSON.stringify({ timeLimit: 35, maxAttempts: 2, shuffleQuestions: true }),
          available_from: new Date('2024-02-10T10:00:00Z'),
          available_until: new Date('2024-02-17T23:59:59Z'),
          class_id: 'class001',
          creator_id: 'lecturer001',
          status: 'draft',
        },
      }),
    `Quiz ${quiz4Id}`,
  );

  await createIfMissing(
    prisma.quiz.findUnique({ where: { qid: quiz5Id }, select: { qid: true } }),
    () =>
      prisma.quiz.create({
        data: {
          qid: quiz5Id,
          name: 'Lists, Dictionaries, and Sets',
          description: 'Comprehensive assessment on Python collections and data structures',
          settings_json: JSON.stringify({ timeLimit: 45, maxAttempts: 2, shuffleQuestions: true }),
          available_from: new Date('2024-02-20T09:00:00Z'),
          available_until: new Date('2024-02-27T23:59:59Z'),
          class_id: 'class001',
          creator_id: 'lecturer001',
          status: 'draft',
        },
      }),
    `Quiz ${quiz5Id}`,
  );

  await createQuestions(prisma, quiz1Id, [
    {
      ques_id: 'question001',
      content: 'What is the correct way to declare a variable in Python?',
      options: { A: 'var x = 10', B: 'x = 10', C: 'int x = 10', D: 'declare x = 10' },
      answerKey: { correct: 'B' },
      points: 1,
    },
    {
      ques_id: 'question002',
      content: "What is the output of the following code: print(type(3.14))?",
      options: {
        A: "<class 'int'>",
        B: "<class 'float'>",
        C: "<class 'str'>",
        D: "<class 'number'>",
      },
      answerKey: { correct: 'B' },
      points: 1,
    },
    {
      ques_id: 'question003',
      content: 'Which of the following are valid Python variable names?',
      options: { A: '1variable', B: '_variable123', C: 'my-variable', D: 'MyVariable' },
      answerKey: { correct: ['B', 'D'] },
      points: 1,
    },
    {
      ques_id: 'question004',
      content: 'What does the len() function return for the string "Python"?',
      options: { A: '5', B: '6', C: '7', D: 'None' },
      answerKey: { correct: 'B' },
      points: 1,
    },
    {
      ques_id: 'question005',
      content: 'How do you create a list in Python?',
      options: {
        A: 'list = {1, 2, 3}',
        B: 'list = [1, 2, 3]',
        C: 'list = (1, 2, 3)',
        D: 'list = <1, 2, 3>',
      },
      answerKey: { correct: 'B' },
      points: 1,
    },
  ]);

  await createQuestions(prisma, quiz2Id, [
    {
      ques_id: 'question006',
      content: 'What is the correct way to create a string variable in Python?',
      options: {
        A: 'string x = "Hello"',
        B: 'x = "Hello"',
        C: 'char x = "Hello"',
        D: 'str x = "Hello"',
      },
      answerKey: { correct: 'B' },
      points: 1,
    },
    {
      ques_id: 'question007',
      content: 'What is the output of: print(type(True))?',
      options: {
        A: "<class 'boolean'>",
        B: "<class 'bool'>",
        C: "<class 'int'>",
        D: "<class 'true'>",
      },
      answerKey: { correct: 'B' },
      points: 1,
    },
    {
      ques_id: 'question008',
      content: 'How do you convert a string "123" to an integer?',
      options: { A: 'integer("123")', B: 'int("123")', C: 'toInt("123")', D: 'parse("123")' },
      answerKey: { correct: 'B' },
      points: 1,
    },
    {
      ques_id: 'question009',
      content: 'What is the output of: print(10 / 3)?',
      options: { A: '3', B: '3.0', C: '3.333333333333333', D: '3.33' },
      answerKey: { correct: 'C' },
      points: 1,
    },
    {
      ques_id: 'question010',
      content: 'Which data type is mutable in Python?',
      options: { A: 'tuple', B: 'string', C: 'list', D: 'integer' },
      answerKey: { correct: 'C' },
      points: 1,
    },
  ]);

  await createQuestions(prisma, quiz3Id, [
    {
      ques_id: 'question011',
      content: 'What is the correct syntax for an if statement in Python?',
      options: { A: 'if (x == 5):', B: 'if x == 5:', C: 'if x = 5:', D: 'if x == 5 then:' },
      answerKey: { correct: 'B' },
      points: 1,
    },
    {
      ques_id: 'question012',
      content: 'How many times will this loop run? for i in range(5):',
      options: { A: '4', B: '5', C: '6', D: 'Infinite' },
      answerKey: { correct: 'B' },
      points: 1,
    },
    {
      ques_id: 'question013',
      content: 'What keyword is used to exit a loop prematurely?',
      options: { A: 'exit', B: 'stop', C: 'break', D: 'return' },
      answerKey: { correct: 'C' },
      points: 1,
    },
    {
      ques_id: 'question014',
      content: 'What is the difference between while and for loops?',
      options: {
        A: 'while runs forever, for has a fixed count',
        B: 'while is condition-based, for is iteration-based',
        C: 'They are exactly the same',
        D: 'while is faster than for',
      },
      answerKey: { correct: 'B' },
      points: 1,
    },
    {
      ques_id: 'question015',
      content: 'What does the continue statement do in a loop?',
      options: {
        A: 'Exits the loop',
        B: 'Skips to the next iteration',
        C: 'Stops the program',
        D: 'Restarts the loop from beginning',
      },
      answerKey: { correct: 'B' },
      points: 1,
    },
  ]);

  await createQuestions(prisma, quiz4Id, [
    {
      ques_id: 'question016',
      content: 'What keyword is used to define a function in Python?',
      options: { A: 'function', B: 'def', C: 'func', D: 'define' },
      answerKey: { correct: 'B' },
      points: 1,
    },
    {
      ques_id: 'question017',
      content: 'How do you import a specific function from a module?',
      options: {
        A: 'import math.sqrt',
        B: 'from math import sqrt',
        C: 'import sqrt from math',
        D: 'using math.sqrt',
      },
      answerKey: { correct: 'B' },
      points: 1,
    },
    {
      ques_id: 'question018',
      content: 'What does the return statement do?',
      options: {
        A: 'Prints a value',
        B: 'Exits the function and optionally returns a value',
        C: 'Stores a value in memory',
        D: 'Creates a variable',
      },
      answerKey: { correct: 'B' },
      points: 1,
    },
    {
      ques_id: 'question019',
      content: 'What is a default parameter in a function?',
      options: {
        A: 'A parameter that must be provided',
        B: 'A parameter with a pre-assigned value',
        C: 'The first parameter',
        D: 'A parameter of type default',
      },
      answerKey: { correct: 'B' },
      points: 1,
    },
    {
      ques_id: 'question020',
      content: 'What is *args used for in function parameters?',
      options: {
        A: 'To multiply arguments',
        B: 'To accept variable number of positional arguments',
        C: 'To create a pointer',
        D: 'To make arguments optional',
      },
      answerKey: { correct: 'B' },
      points: 1,
    },
  ]);

  await createQuestions(prisma, quiz5Id, [
    {
      ques_id: 'question021',
      content: 'How do you create an empty dictionary in Python?',
      options: { A: 'd = []', B: 'd = {}', C: 'd = ()', D: 'd = dict[]' },
      answerKey: { correct: 'B' },
      points: 1,
    },
    {
      ques_id: 'question022',
      content: 'What method adds an element to the end of a list?',
      options: { A: 'add()', B: 'append()', C: 'insert()', D: 'push()' },
      answerKey: { correct: 'B' },
      points: 1,
    },
    {
      ques_id: 'question023',
      content: 'What is unique about sets in Python?',
      options: {
        A: 'They allow duplicate values',
        B: 'They are ordered',
        C: 'They do not allow duplicate values',
        D: 'They are immutable',
      },
      answerKey: { correct: 'C' },
      points: 1,
    },
    {
      ques_id: 'question024',
      content: 'How do you access a value in a dictionary with key "name"?',
      options: { A: 'd.name', B: 'd[name]', C: 'd["name"]', D: 'd->name' },
      answerKey: { correct: 'C' },
      points: 1,
    },
    {
      ques_id: 'question025',
      content: 'What does list slicing [1:3] return?',
      options: {
        A: 'Elements at index 1 and 3',
        B: 'Elements at index 1 and 2',
        C: 'Elements at index 0, 1, 2',
        D: 'Elements at index 1, 2, 3',
      },
      answerKey: { correct: 'B' },
      points: 1,
    },
  ]);

  await createBaseAttemptAndAnswers(prisma);
  await createGeneratedAttempts(prisma);
}

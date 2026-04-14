const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const QUIZ_IDS = ['quiz001', 'quiz002', 'quiz003', 'quiz004', 'quiz005'];

async function main() {
	const classRecord = await prisma.class.findUnique({
		where: { clid: 'class001' },
		select: {
			students: {
				select: { sid: true },
			},
		},
	});

	const studentIds = (classRecord?.students ?? []).map((student) => student.sid);

	const totalAttempts = await prisma.attempt.count({
		where: {
			quiz_id: { in: QUIZ_IDS },
			student_id: { in: studentIds },
		},
	});

	const duplicateRows = await prisma.$queryRaw`
		SELECT COUNT(*)::int AS duplicate_groups
		FROM (
			SELECT a.quiz_id, a.student_id, COUNT(*) AS c
			FROM "Attempt" a
			WHERE a.quiz_id IN ('quiz001', 'quiz002', 'quiz003', 'quiz004', 'quiz005')
			AND a.student_id IN (
				SELECT sc."B"
				FROM "_StudentInClass" sc
				WHERE sc."A" = 'class001'
			)
			GROUP BY a.quiz_id, a.student_id
			HAVING COUNT(*) > 1
		) t
	`;
	const duplicateGroups = Number(duplicateRows[0]?.duplicate_groups ?? 0);

	const expectedPairs = studentIds.length * QUIZ_IDS.length;
	const missingRows = await prisma.$queryRaw`
		SELECT COUNT(*)::int AS missing_pairs
		FROM (
			SELECT sc."B" AS sid, q.qid
			FROM "_StudentInClass" sc
			CROSS JOIN "Quiz" q
			WHERE sc."A" = 'class001'
			AND q.qid IN ('quiz001', 'quiz002', 'quiz003', 'quiz004', 'quiz005')
		) expected
		LEFT JOIN "Attempt" a
			ON a.student_id = expected.sid
			AND a.quiz_id = expected.qid
			AND a.attempt_number = 1
		WHERE a.atid IS NULL
	`;
	const missingPairs = Number(missingRows[0]?.missing_pairs ?? 0);

	console.log(`CLASS001_STUDENTS=${studentIds.length}`);
	console.log(`TOTAL_ATTEMPTS_FOR_5_QUIZZES=${totalAttempts}`);
	console.log(`EXPECTED_ATTEMPTS=${expectedPairs}`);
	console.log(`DUPLICATE_GROUPS=${duplicateGroups}`);
	console.log(`MISSING_PAIRS=${missingPairs}`);
}

main()
	.catch((error) => {
		console.error(error);
		process.exitCode = 1;
	})
	.finally(async () => {
		await prisma.$disconnect();
	});

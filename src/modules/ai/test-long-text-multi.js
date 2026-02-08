import { FeatureEmbeddedClassifier } from './ModuleRouterLong.js';

// Test cases designed to trigger multiple intents (primary + secondary)
const longTextTests = [
  {
    input: `First, I need you to analyze the performance data from last week's quiz to identify which topics students struggled with most. 
    Calculate the average score, median, and show me the distribution by question difficulty. 
    Once we have that analysis, I want to create a remedial quiz focusing specifically on those weak areas. 
    Design about 15 practice questions targeting the concepts where students scored below 60%. 
    Make sure the questions progressively increase in difficulty to help students build confidence.`,
    expected: {
      primary: "data_analysis",
      secondary: "quiz_creation"
    },
    description: "Analysis of quiz results followed by remedial quiz creation",
    role: "Lecturer"
  },
  {
    input: `The student dashboard is loading very slowly and I'm getting reports of timeout errors. 
    Check the database query performance and see if any indexes are missing. 
    Also monitor the server CPU and memory to identify bottlenecks. 
    After you fix the performance issues, I need you to pull the student engagement statistics for the past semester. 
    Show me how many students logged in daily, their average session duration, and generate a trend report.`,
    expected: {
      primary: "system_configuration",
      secondary: "data_analysis"
    },
    description: "System troubleshooting followed by engagement analytics request",
    role: "Admin"
  },
  {
    input: `Our LMS has been running slowly during peak hours and students report failed submissions. 
    Please review the server error logs, database query latency, and API response times to identify bottlenecks. 
    Apply any configuration fixes needed to stabilize performance. 
    After the system is stable, generate a report of submission success rates by course and time of day. 
    Calculate the average submission time and highlight any courses with unusually high failure rates.`,
    expected: {
      primary: "system_configuration",
      secondary: "data_analysis"
    },
    description: "System performance fixes followed by submission analytics",
    role: "Admin"
  },
  {
    input: `Before we launch the new semester, verify that all system components are functioning correctly. 
    Check the server health, database connections, backup schedules, and API response times. 
    Make sure the load balancer is properly configured for the expected traffic increase. 
    Once everything is stable, I need to create a diagnostic quiz to assess students' prerequisite knowledge. 
    Design 20 questions covering the fundamental concepts they should know before starting the advanced material.`,
    expected: {
      primary: "system_configuration",
      secondary: "quiz_creation"
    },
    description: "Pre-semester system checks followed by prerequisite assessment creation",
    role: "Admin"
  },
  {
    input: `Generate a detailed performance report for all students in section B showing their grades, attendance, and participation scores. 
    Calculate the correlation between attendance and final grades, and identify at-risk students who may need intervention. 
    Show me percentile rankings and flag anyone below the 25th percentile. 
    Based on this analysis, create a targeted practice test for struggling students focusing on the core competencies they haven't mastered. 
    The practice test should include 12-15 questions with immediate feedback and hints.`,
    expected: {
      primary: "data_analysis",
      secondary: "quiz_creation"
    },
    description: "Student performance analysis followed by intervention practice test",
    role: "Lecturer"
  }
];

async function runLongTextTests() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('TESTING LONG TEXT CLASSIFICATION - MULTI-INTENT SCENARIOS');
  console.log('Test cases designed to trigger primary + secondary intents');
  console.log('═══════════════════════════════════════════════════════════════\n');

  console.log('📋 Test Configuration:');
  console.log(`  • Long text threshold: ${FeatureEmbeddedClassifier.longTextThreshold} words`);
  console.log(`  • Minimum sentence length: ${FeatureEmbeddedClassifier.minSentenceLength} words`);
  console.log(`  • Routing threshold: ${(FeatureEmbeddedClassifier.routingThreshold * 100).toFixed(0)}%`);
  console.log('\n═══════════════════════════════════════════════════════════════\n');

  // Pre-load the classifier
  console.log('⏳ Loading Module Router...\n');
  await FeatureEmbeddedClassifier.getInstance();
  console.log('✓ Router ready!\n');

  for (let i = 0; i < longTextTests.length; i++) {
    const testCase = longTextTests[i];
    const wordCount = FeatureEmbeddedClassifier.countWords(testCase.input);
    
    console.log('═══════════════════════════════════════════════════════════════');
    console.log(`#### Testcase ${i + 1}`);
    console.log(`\n[Test ${i + 1}/${longTextTests.length}] ${testCase.description}`);
    console.log(`Word count: ${wordCount}`);
    console.log(`Role: ${testCase.role}`);
    console.log(`Expected primary: ${testCase.expected.primary}`);
    console.log(`Expected secondary: ${testCase.expected.secondary}`);
    console.log('\nInput text:');
    console.log(`"${testCase.input}"`);
    console.log('\n─────────────────────────────────────────────────────────────');

    // Classify with role
    const result = await FeatureEmbeddedClassifier.classify(testCase.input, testCase.role);

    console.log('\n─────────────────────────────────────────────────────────────');
    console.log('ROUTING RESULT:');
    console.log(`  Decision: ${result.decision}`);
    console.log(`  Best Match: ${result.bestMatch.category} (${(result.bestMatch.score * 100).toFixed(2)}%)`);
    
    if (result.role) {
      console.log(`\n  Original Scores (before role boost):`);
      result.originalScores.forEach(({ category, score }) => {
        console.log(`      ${category.padEnd(25)}: ${(score * 100).toFixed(2)}%`);
      });
      console.log(`\n  Boosted Scores (with ${result.role} role):`);
      result.allScores.forEach(({ category, score }) => {
        const marker = score >= result.threshold ? '✓' : ' ';
        console.log(`    ${marker} ${category.padEnd(25)}: ${(score * 100).toFixed(2)}%`);
      });
    } else {
      console.log(`\n  All Scores:`);
      result.allScores.forEach(({ category, score }) => {
        const marker = score >= result.threshold ? '✓' : ' ';
        console.log(`    ${marker} ${category.padEnd(25)}: ${(score * 100).toFixed(2)}%`);
      });
    }

    // Evaluation for multi-intent (order doesn't matter, just check if both are present)
    let evaluation = '';
    const qualifyingIntents = result.allScores.filter(s => s.score >= result.threshold);
    const detectedCategories = qualifyingIntents.map(intent => intent.category);
    
    const expectedIntents = [testCase.expected.primary, testCase.expected.secondary];
    const primaryDetected = detectedCategories.includes(testCase.expected.primary);
    const secondaryDetected = detectedCategories.includes(testCase.expected.secondary);
    
    if (primaryDetected && secondaryDetected) {
      evaluation = `✓ CORRECT - Both expected intents detected: ${testCase.expected.primary}, ${testCase.expected.secondary}`;
    } else if (primaryDetected || secondaryDetected) {
      const detected = primaryDetected ? testCase.expected.primary : testCase.expected.secondary;
      const missing = primaryDetected ? testCase.expected.secondary : testCase.expected.primary;
      evaluation = `⚠ PARTIAL - Only ${detected} detected above threshold, missing ${missing}`;
    } else {
      evaluation = `✗ INCORRECT - Expected: ${testCase.expected.primary} and ${testCase.expected.secondary}. Got: ${detectedCategories.join(', ') || 'none above threshold'}`;
    }
    
    console.log(`\n${evaluation}`);
    
    // Show detected intents above threshold
    if (qualifyingIntents.length >= 1) {
      console.log(`\nDetected ${qualifyingIntents.length} intent(s) above threshold:`);
      qualifyingIntents.forEach((intent, idx) => {
        console.log(`  ${idx + 1}. ${intent.category}: ${(intent.score * 100).toFixed(2)}%`);
      });
    }
    
    console.log('\n═══════════════════════════════════════════════════════════════\n');
    
    // Add delay to avoid overwhelming the console
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  console.log('═══════════════════════════════════════════════════════════════');
  console.log('TESTING COMPLETE');
  console.log('═══════════════════════════════════════════════════════════════\n');
}

// Run the tests
runLongTextTests().catch(console.error);

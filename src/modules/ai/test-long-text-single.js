import { FeatureEmbeddedClassifier } from './ModuleRouterLong.js';

// Test cases with long paragraphs - single intent only (additional set)
const longTextTests = [
  {
    input: `The production environment is experiencing severe performance degradation. 
    We need to immediately investigate the root cause by checking server logs and monitoring CPU utilization. 
    Please verify that the load balancer is distributing traffic correctly and that none of the application instances are down. 
    Also review the Redis cache performance and database query execution times. 
    If necessary, prepare to scale horizontally by adding more container instances.`,
    expected: "system_configuration",
    description: "Production environment troubleshooting and infrastructure analysis",
    role: "Admin"
  },
  {
    input: `I need to prepare comprehensive final exam materials for my physics course. 
    Start by creating 30 multiple-choice questions covering mechanics, thermodynamics, and electromagnetism. 
    Then design 5 calculation problems that require students to show their work step by step. 
    Include a mix of conceptual questions and numerical problems, and make sure to provide detailed answer explanations. 
    Finally, create a separate practice test with 15 questions for students to use as review material.`,
    expected: "quiz_creation",
    description: "Comprehensive physics exam creation with multiple components",
    role: "Lecturer"
  },
  {
    input: `I'd like a detailed breakdown of how my two sections performed on the midterm examination. 
    Start with descriptive statistics including mean, median, mode, and standard deviation for each section. 
    Then generate a histogram showing the distribution of scores in 10-point intervals. 
    Identify which questions had the lowest success rate and calculate the item difficulty for each question. 
    Finally, perform a t-test to determine if there's a statistically significant difference between the two sections.`,
    expected: "data_analysis",
    description: "Statistical analysis of midterm exam results with hypothesis testing",
    role: "Lecturer"
  },
  {
    input: `Our API gateway has been returning 503 errors intermittently since this morning. 
    Check the health status of all microservices and verify that the message queue isn't backed up. 
    Review the recent deployment logs to see if anything changed in the infrastructure configuration. 
    Monitor the network latency between services and check if any rate limiting is being triggered. 
    We also need to confirm that the database connection pool hasn't been exhausted.`,
    expected: "system_configuration",
    description: "Debugging API gateway errors and microservices health",
    role: "Admin"
  },
  {
    input: `I'm looking for recommendations on planning a road trip across the United States this summer. 
    We want to start in New York and make our way to California over three weeks. 
    What are the must-visit national parks along the way and which route would be most scenic? 
    Should we book accommodations in advance or find places as we go? 
    Also, what's the best way to manage a budget for gas, food, and lodging for a family of four? 
    Any tips on packing essentials for a long road trip?`,
    expected: "outer_api",
    description: "Road trip planning across US with route and budget questions",
    role: "Student"
  }
];

async function runLongTextTests() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('TESTING LONG TEXT CLASSIFICATION - SINGLE INTENT SET 2');
  console.log('Additional test cases with clear single intent');
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
    console.log(`Expected category: ${testCase.expected}`);
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

    // Evaluation
    let evaluation = '';
    if (testCase.expected === 'outer_api') {
      if (result.decision === 'forward to outer API') {
        evaluation = '✓ CORRECT (Routed to outer API)';
      } else {
        evaluation = '✗ INCORRECT (Should route to outer API)';
      }
    } else {
      if (result.decision.includes(testCase.expected)) {
        evaluation = `✓ CORRECT (Routed to ${testCase.expected} module)`;
      } else {
        evaluation = `✗ INCORRECT (Expected: ${testCase.expected}, Got: ${result.bestMatch.category})`;
      }
    }
    
    console.log(`\n${evaluation}`);
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

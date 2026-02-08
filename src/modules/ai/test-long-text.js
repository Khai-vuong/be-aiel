import { FeatureEmbeddedClassifier } from './ModuleRouterLong.js';

// Test cases with long paragraphs - single intent only
const longTextTests = [
  {
    input: `Please check the LMS system health. 
    Review the server status and error logs. 
    Verify the database connection pool settings. 
    Confirm the nightly backup jobs are completing successfully.`,
    expected: "system_configuration",
    description: "Long paragraph about monitoring and fixing LMS infrastructure",
    role: "Admin"
  },
  {
    input: `I want to design a new assessment pack for our biology unit. 
    Create a quiz on cell division and genetics, then add a second section with short-answer questions about DNA replication. 
    Finally, give me a few higher-order questions that assess critical thinking rather than memorization.`,
    expected: "quiz_creation",
    description: "Long paragraph about building multi-part biology assessments",
    role: "Lecturer"
  },
  {
    input: `Could you analyze how my students performed in the last two assignments and summarize the trend? 
    I want the average, median, and a quick distribution by score band, plus a comparison between sections A and B. 
    If possible, flag any outliers and list students who dropped more than 10 points from the previous quiz.`,
    expected: "data_analysis",
    description: "Long paragraph about analytics and performance trends",
    role: "Lecturer"
  },
  {
    input: `I'm planning a vacation to Europe next summer. 
    I want to visit Paris, Rome, and Barcelona, spending about a week in each city. 
    Can you recommend good hotels that are centrally located? 
    Also, what's the best time to book flights to get the cheapest prices? 
    I'm interested in trying authentic local cuisine, so please suggest some restaurants. 
    What are the must-see attractions in each city? 
    Should I rent a car or use public transportation?`,
    expected: "outer_api",
    description: "Long paragraph about vacation planning (unrelated)",
    role: "Student"
  },
  {
    input: `I'm planning next week's review session and want a structured set of materials. 
    Please create a 20-question quiz on probability basics, then add a short section of practice problems about conditional probability and Bayes' theorem. 
    After that, build a separate mini-test for statistics covering mean, variance, and standard deviation, and include an answer key for each part.`,
    expected: "quiz_creation",
    description: "Long paragraph focused on generating quizzes and practice problems",
    role: "Lecturer"
  }
];

async function runLongTextTests() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('TESTING LONG TEXT CLASSIFICATION');
  console.log('With Sentence-Level Analysis and Intent Voting');
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
    if (testCase.expected === 'mixed') {
      evaluation = '⚠ MIXED INTENT (multiple categories expected)';
    } else if (testCase.expected === 'outer_api') {
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

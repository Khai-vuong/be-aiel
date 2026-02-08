import { FeatureEmbeddedClassifier } from './ModuleRouterLong.js';

// Edge case test scenarios: ambiguous queries + adversarial examples
const edgeCaseTests = [
  // ========== AMBIGUOUS QUERIES (5) ==========
  {
    input: `I need to monitor our system's performance metrics over the past month. 
    Pull the CPU utilization, memory consumption, and disk I/O statistics from the server logs. 
    Calculate the average usage, identify peak hours, and show me any correlation between high traffic and resource consumption. 
    Generate a statistical report with percentiles and trends to help us understand the system behavior patterns.`,
    expected: ["system_configuration", "data_analysis"], // Could be either or both
    description: "AMBIGUOUS: System monitoring with statistical analysis - blurs line between system config and data analysis",
    role: "Admin",
    category: "ambiguous"
  },
  {
    input: `I want to review the quiz performance metrics from last semester's final exams. 
    Show me which questions had the highest failure rates and calculate the discrimination index for each item. 
    Based on this analysis, should we revise these questions or create new ones? 
    If we need new questions, help me design better alternatives that test the same learning objectives.`,
    expected: ["data_analysis", "quiz_creation"], // Analysis request that hints at quiz creation
    description: "AMBIGUOUS: Quiz analytics with potential question revision - could be analysis OR creation",
    role: "Lecturer",
    category: "ambiguous"
  },
  {
    input: `We're migrating the student database to a new schema that better supports analytics queries. 
    I need to verify data integrity during the migration process and ensure all foreign key relationships are preserved. 
    After migration, run a full analysis comparing the old and new data structures to confirm nothing was lost. 
    Calculate the performance improvement in query execution time for common reporting operations.`,
    expected: ["system_configuration", "data_analysis"], // Database migration with performance analysis
    description: "AMBIGUOUS: Database migration with analytical validation - system task with data analysis component",
    role: "Admin",
    category: "ambiguous"
  },
  {
    input: `Generate a comprehensive report on system uptime and user access patterns. 
    I need to see login frequency, session duration, error rates, and which modules are most utilized. 
    Present this as a dashboard with visualizations showing trends over time. 
    Also check if the authentication system is configured correctly and whether we need to adjust rate limiting.`,
    expected: ["data_analysis", "system_configuration"], // Reporting with system configuration check
    description: "AMBIGUOUS: Usage report with system configuration review - reporting request with admin concerns",
    role: "Admin",
    category: "ambiguous"
  },
  {
    input: `I need to manage student access permissions for the premium course materials. 
    Show me which students have active subscriptions and calculate the enrollment statistics by program and semester. 
    Identify any access conflicts where students might have expired permissions but are still able to view restricted content. 
    Update the access control list based on current enrollment data.`,
    expected: ["system_configuration", "data_analysis"], // Access management with enrollment analytics
    description: "AMBIGUOUS: Access permission management with enrollment statistics - admin task with analytics component",
    role: "Admin",
    category: "ambiguous"
  },

  // ========== ADVERSARIAL EXAMPLES (5) ==========
  // {
  //   input: `Quiz database server CPU memory configuration analysis statistics create exam performance monitoring system health check logs backup restore average median percentile calculate generate design build deploy configure optimize troubleshoot debug test benchmark measure analyze report dashboard visualization infrastructure network security authentication authorization quiz questions answers grading rubric assessment evaluation feedback score ranking distribution regression correlation.`,
  //   expected: [], // Keyword spam - should ideally reject or score poorly across all categories
  //   description: "ADVERSARIAL: Keyword spam - mixing all category keywords to confuse classifier",
  //   role: "Lecturer",
  //   category: "adversarial"
  // },
  // {
  //   input: `I want to create a quiz for my students about database configuration and server monitoring. 
  //   The quiz should test their knowledge of CPU optimization, memory management, and log analysis. 
  //   Actually, wait, I don't need a quiz. I need you to configure the actual database server settings. 
  //   No wait, I mean analyze the server performance data first, then maybe we'll create a quiz about it later. 
  //   Or should we just configure the system? I'm not sure what I need right now.`,
  //   expected: [], // Contradictory and indecisive - no clear intent
  //   description: "ADVERSARIAL: Contradictory signals - keeps changing intent mid-request",
  //   role: "Lecturer",
  //   category: "adversarial"
  // },
  // {
  //   input: `Can you help me with something? I have this thing I need to do for the platform. 
  //   It's kind of related to the courses but also involves some technical aspects. 
  //   You know what I mean? Just make it work properly and ensure it's done correctly. 
  //   I need it to be good quality and meet our requirements. Please handle this appropriately.`,
  //   expected: [], // Overly vague - no specific intent identifiable
  //   description: "ADVERSARIAL: Overly vague - no concrete action or category identifiable",
  //   role: "Lecturer",
  //   category: "adversarial"
  // },
  // {
  //   input: `So basically I was thinking about how we could potentially improve the overall educational experience by considering various factors that contribute to student success and engagement in our learning management system which includes but is not limited to the user interface design and the backend infrastructure that supports it as well as the pedagogical approaches we employ when creating content and assessments though I'm not entirely sure which specific aspect needs the most attention right now because there are so many interconnected components that all play a role in the bigger picture of educational technology and student outcomes which is really what we're trying to optimize for in the long run even though short term goals are also important and we shouldn't lose sight of the immediate needs while planning for future enhancements.`,
  //   expected: [], // Long rambling with no clear intent
  //   description: "ADVERSARIAL: Rambling text - long discourse with no actionable request",
  //   role: "Admin",
  //   category: "adversarial"
  // },
  // {
  //   input: `I need to check the quiz logs in the database to see if there are any errors in the backup system. 
  //   The quiz server has been showing configuration warnings about exam performance. 
  //   Please analyze the quiz statistics from the system logs and calculate the database CPU usage during quiz creation. 
  //   Also monitor the quiz infrastructure and generate a report on quiz server memory consumption.`,
  //   expected: ["system_configuration"], // Deceptive use of "quiz" - actually about system troubleshooting
  //   description: "ADVERSARIAL: Misleading keywords - uses 'quiz' repeatedly but actually describes system monitoring",
  //   role: "Admin",
  //   category: "adversarial"
  // }
];

async function runEdgeCaseTests() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('TESTING EDGE CASES - AMBIGUOUS QUERIES & ADVERSARIAL EXAMPLES');
  console.log('Testing classifier robustness with challenging scenarios');
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

  let ambiguousCount = 0;
  let adversarialCount = 0;
  let correctCount = 0;
  let partialCount = 0;
  let incorrectCount = 0;

  for (let i = 0; i < edgeCaseTests.length; i++) {
    const testCase = edgeCaseTests[i];
    const wordCount = FeatureEmbeddedClassifier.countWords(testCase.input);
    
    if (testCase.category === 'ambiguous') ambiguousCount++;
    if (testCase.category === 'adversarial') adversarialCount++;
    
    console.log('═══════════════════════════════════════════════════════════════');
    console.log(`#### Testcase ${i + 1} [${testCase.category.toUpperCase()}]`);
    console.log(`\n[Test ${i + 1}/${edgeCaseTests.length}] ${testCase.description}`);
    console.log(`Word count: ${wordCount}`);
    console.log(`Role: ${testCase.role}`);
    console.log(`Expected: ${testCase.expected.length > 0 ? testCase.expected.join(' OR ') : 'NONE (should reject or score low)'}`);
    console.log('\nInput text:');
    console.log(`"${testCase.input}"`);
    console.log('\n');

    // Classify with role
    const result = await FeatureEmbeddedClassifier.classify(testCase.input, testCase.role);

    console.log('\n');
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

    // Evaluation logic (order-agnostic, allows for multiple valid outcomes)
    let evaluation = '';
    const qualifyingIntents = result.allScores.filter(s => s.score >= result.threshold);
    const detectedCategories = qualifyingIntents.map(intent => intent.category);
    
    if (testCase.expected.length === 0) {
      // Adversarial case - expect rejection or low scores
      if (qualifyingIntents.length === 0) {
        evaluation = `✓ CORRECT - No intent qualified above threshold (expected for this adversarial case)`;
        correctCount++;
      } else if (qualifyingIntents.length === 1 && qualifyingIntents[0].score < 0.65) {
        evaluation = `⚠ PARTIAL - One weak intent detected (${qualifyingIntents[0].category}: ${(qualifyingIntents[0].score * 100).toFixed(2)}%) - borderline acceptable`;
        partialCount++;
      } else {
        evaluation = `✗ INCORRECT - Expected rejection but got: ${detectedCategories.join(', ')}`;
        incorrectCount++;
      }
    } else if (testCase.expected.length === 1) {
      // Single expected intent
      if (detectedCategories.includes(testCase.expected[0])) {
        evaluation = `✓ CORRECT - Expected intent detected: ${testCase.expected[0]}`;
        correctCount++;
      } else if (qualifyingIntents.length === 0) {
        evaluation = `✗ INCORRECT - Expected ${testCase.expected[0]} but no intent qualified`;
        incorrectCount++;
      } else {
        evaluation = `✗ INCORRECT - Expected ${testCase.expected[0]} but got: ${detectedCategories.join(', ')}`;
        incorrectCount++;
      }
    } else {
      // Multiple expected intents (ambiguous cases)
      const matchedIntents = testCase.expected.filter(exp => detectedCategories.includes(exp));
      
      if (matchedIntents.length === testCase.expected.length) {
        evaluation = `✓ CORRECT - All expected intents detected: ${matchedIntents.join(', ')}`;
        correctCount++;
      } else if (matchedIntents.length > 0) {
        evaluation = `⚠ PARTIAL - Detected ${matchedIntents.join(', ')} but missing ${testCase.expected.filter(e => !matchedIntents.includes(e)).join(', ')}`;
        partialCount++;
      } else if (detectedCategories.some(detected => testCase.expected.includes(detected))) {
        evaluation = `⚠ PARTIAL - Detected valid intent but not all expected ones`;
        partialCount++;
      } else if (qualifyingIntents.length === 0) {
        evaluation = `⚠ ACCEPTABLE - Ambiguous case resulted in no clear intent (conservative but safe)`;
        partialCount++;
      } else {
        evaluation = `✗ INCORRECT - Expected any of: ${testCase.expected.join(', ')}. Got: ${detectedCategories.join(', ') || 'none'}`;
        incorrectCount++;
      }
    }
    
    console.log(`\n${evaluation}`);
    
    // Show detected intents above threshold
    if (qualifyingIntents.length >= 1) {
      console.log(`\nDetected ${qualifyingIntents.length} intent(s) above threshold:`);
      qualifyingIntents.forEach((intent, idx) => {
        console.log(`  ${idx + 1}. ${intent.category}: ${(intent.score * 100).toFixed(2)}%`);
      });
    } else {
      console.log(`\nNo intents qualified above ${(result.threshold * 100).toFixed(0)}% threshold`);
    }
    
    console.log('\n═══════════════════════════════════════════════════════════════\n');
    
    // Add delay to avoid overwhelming the console
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  // Summary statistics
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('EDGE CASE TESTING SUMMARY');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`\n📊 Test Distribution:`);
  console.log(`  Ambiguous queries:       ${ambiguousCount}/10`);
  console.log(`  Adversarial examples:    ${adversarialCount}/10`);
  console.log(`\n📈 Results:`);
  console.log(`  ✓ Correct:               ${correctCount}/10 (${(correctCount/10*100).toFixed(0)}%)`);
  console.log(`  ⚠ Partial/Acceptable:    ${partialCount}/10 (${(partialCount/10*100).toFixed(0)}%)`);
  console.log(`  ✗ Incorrect:             ${incorrectCount}/10 (${(incorrectCount/10*100).toFixed(0)}%)`);
  console.log(`\n  Total Acceptable:        ${correctCount + partialCount}/10 (${((correctCount + partialCount)/10*100).toFixed(0)}%)`);
  console.log('\n═══════════════════════════════════════════════════════════════');
  
  // Interpretation guidance
  console.log('\n💡 INTERPRETATION GUIDE:');
  console.log('  For ambiguous queries: Both correct AND partial are acceptable outcomes');
  console.log('  For adversarial examples: Rejection (no qualified intents) is ideal');
  console.log('  Edge cases test robustness - 70%+ acceptable rate indicates production readiness');
  console.log('\n═══════════════════════════════════════════════════════════════\n');
}

// Run the tests
runEdgeCaseTests().catch(console.error);

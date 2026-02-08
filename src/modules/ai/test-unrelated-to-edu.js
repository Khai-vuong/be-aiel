import { FeatureEmbeddedClassifier } from './ModuleRouter.js';

// Test cases for module routing
const testCases = [
  // ========== CLEARLY UNRELATED (10 cases) ==========
  {
    input: "What's the weather forecast for tomorrow?",
    expected: "forward to outer api module",
    category: "clearly_unrelated",
    description: "Weather query",
    role: "Student"
  },
  {
    input: "How do I cook spaghetti carbonara?",
    expected: "forward to outer api module",
    category: "clearly_unrelated",
    description: "Cooking recipe",
    role: "Lecturer"
  },
  {
    input: "Tell me a funny joke about cats",
    expected: "forward to outer api module",
    category: "clearly_unrelated",
    description: "Entertainment request",
    role: "Admin"
  },
  {
    input: "What time is the football game tonight?",
    expected: "forward to outer api module",
    category: "clearly_unrelated",
    description: "Sports scheduling",
    role: "Student"
  },
  {
    input: "Can you recommend a good restaurant nearby?",
    expected: "forward to outer api module",
    category: "clearly_unrelated",
    description: "Restaurant recommendation",
    role: null
  },
  {
    input: "How much does a Tesla Model 3 cost?",
    expected: "forward to outer api module",
    category: "clearly_unrelated",
    description: "Product pricing",
    role: "Student"
  },
  {
    input: "What's the best way to fix a leaky faucet?",
    expected: "forward to outer api module",
    category: "clearly_unrelated",
    description: "Home repair",
    role: "Admin"
  },
  {
    input: "Play some relaxing music",
    expected: "forward to outer api module",
    category: "clearly_unrelated",
    description: "Music player command",
    role: null
  },
  {
    input: "Set a timer for 30 minutes",
    expected: "forward to outer api module",
    category: "clearly_unrelated",
    description: "Timer command",
    role: "Lecturer"
  },
  {
    input: "Who won the Oscar for Best Picture last year?",
    expected: "forward to outer api module",
    category: "clearly_unrelated",
    description: "Entertainment trivia",
    role: "Student"
  },

  // ========== GRAY ZONE (10 cases) ==========
  {
    input: "What are the best study techniques for memorization?",
    expected: "gray_zone",
    category: "gray_zone",
    description: "General study advice (could be tutoring-related)",
    role: "Student"
  },
  {
    input: "How can I improve my time management skills?",
    expected: "gray_zone",
    category: "gray_zone",
    description: "Life skill (loosely education-related)",
    role: "Student"
  },
  {
    input: "What's the difference between a university and a college?",
    expected: "gray_zone",
    category: "gray_zone",
    description: "Educational system terminology",
    role: "Student"
  },
  {
    input: "Should I study computer science or business?",
    expected: "gray_zone",
    category: "gray_zone",
    description: "Career/education advice",
    role: "Student"
  },
  {
    input: "How long does it take to learn Python?",
    expected: "gray_zone",
    category: "gray_zone",
    description: "Learning duration inquiry",
    role: "Student"
  },
  {
    input: "What books should I read to improve my vocabulary?",
    expected: "gray_zone",
    category: "gray_zone",
    description: "Self-learning resource request",
    role: "Lecturer"
  },
  {
    input: "Can you explain what a learning management system is?",
    expected: "gray_zone",
    category: "gray_zone",
    description: "LMS explanation (meta-education)",
    role: "Admin"
  },
  {
    input: "How do I motivate myself to study?",
    expected: "gray_zone",
    category: "gray_zone",
    description: "Study motivation (psychological advice)",
    role: "Student"
  },
  {
    input: "What are the top universities for engineering?",
    expected: "gray_zone",
    category: "gray_zone",
    description: "University ranking (not system function)",
    role: "Student"
  },
  {
    input: "Is online learning as effective as in-person classes?",
    expected: "gray_zone",
    category: "gray_zone",
    description: "Educational philosophy discussion",
    role: "Lecturer"
  },

  // ========== MODULE-SPECIFIC (10 cases) ==========
  {
    input: "Check if the server is running",
    expected: "forward to system_configuration module",
    category: "module_specific",
    description: "System status check",
    role: "Admin"
  },
  {
    input: "What's the current system health status?",
    expected: "forward to system_configuration module",
    category: "module_specific",
    description: "Infrastructure health query",
    role: "Admin"
  },
  {
    input: "Monitor the application uptime",
    expected: "forward to system_configuration module",
    category: "module_specific",
    description: "Uptime monitoring",
    role: "Admin"
  },
  {
    input: "Show me the test scores for all students in L01",
    expected: "forward to data_analysis module",
    category: "module_specific",
    description: "Student performance analysis",
    role: "Lecturer"
  },
  {
    input: "Generate a report on student grades",
    expected: "forward to data_analysis module",
    category: "module_specific",
    description: "Grade report generation",
    role: "Lecturer"
  },
  {
    input: "What are the average quiz scores this semester?",
    expected: "forward to data_analysis module",
    category: "module_specific",
    description: "Quiz statistics",
    role: "Admin"
  },
  {
    input: "Create a quiz about linear algebra",
    expected: "forward to quiz_creation module",
    category: "module_specific",
    description: "Quiz creation request",
    role: "Lecturer"
  },
  {
    input: "Generate test questions for biology chapter 3",
    expected: "forward to quiz_creation module",
    category: "module_specific",
    description: "Assessment generation",
    role: "Lecturer"
  },
  {
    input: "Design practice problems for calculus",
    expected: "forward to quiz_creation module",
    category: "module_specific",
    description: "Practice question design",
    role: "Lecturer"
  },
  {
    input: "Make a test about world history",
    expected: "forward to quiz_creation module",
    category: "module_specific",
    description: "Test creation",
    role: "Lecturer"
  }
];

async function runTests() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('TESTING MODULE ROUTER');
  console.log('═══════════════════════════════════════════════════════════════\n');

  console.log('📋 Test Structure:');
  console.log('  • 10 Clearly Unrelated: Should route to outer API');
  console.log('  • 10 Gray Zone: Boundary cases to evaluate routing sensitivity');
  console.log('  • 10 Module-Specific: Should route to specific modules');
  console.log(`  • Threshold: ${(FeatureEmbeddedClassifier.routingThreshold * 100).toFixed(0)}%`);
  console.log('  • Modules: system_configuration, data_analysis, quiz_creation');
  console.log('\n═══════════════════════════════════════════════════════════════\n');

  // Pre-load the classifier
  console.log('⏳ Loading Module Router...\n');
  await FeatureEmbeddedClassifier.getInstance();
  console.log('✓ Router ready!\n');

  let totalTests = testCases.length;
  let correctClassifications = 0;
  let clearlyUnrelatedCorrect = 0;
  let clearlyUnrelatedTotal = 0;
  let grayZoneToOuterAPI = 0;
  let grayZoneToModule = 0;
  let grayZoneTotal = 0;
  let moduleSpecificCorrect = 0;
  let moduleSpecificTotal = 0;

  for (let i = 0; i < testCases.length; i++) {
    const testCase = testCases[i];
    
    console.log('─────────────────────────────────────────────────────────────');
    console.log(`\n[Test ${i + 1}/${totalTests}] ${testCase.category.toUpperCase()}`);
    console.log(`Description: ${testCase.description}`);
    console.log(`Input: "${testCase.input}"`);
    console.log(`Role: ${testCase.role || 'None'}`);
    console.log(`Expected: ${testCase.expected}`);

    // Get routing result with role
    const result = await FeatureEmbeddedClassifier.classify(testCase.input, testCase.role);

    // Display results
    console.log(`\nRouting Result:`);
    console.log(`  Decision: ${result.decision}`);
    console.log(`  Best Match: ${result.bestMatch.category} (${(result.bestMatch.score * 100).toFixed(2)}%)`);
    
    // Show original scores vs boosted scores if role is present
    if (result.role) {
      console.log(`\n  Original Scores (before role boost):`);
      result.originalScores.forEach(({ category, score }) => {
        const percentage = (score * 100).toFixed(2);
        console.log(`      ${category.padEnd(25)}: ${percentage}%`);
      });
      console.log(`\n  Boosted Scores (with ${result.role} role):`);
      result.allScores.forEach(({ category, score }) => {
        const percentage = (score * 100).toFixed(2);
        const marker = score >= result.threshold ? '✓' : ' ';
        console.log(`    ${marker} ${category.padEnd(25)}: ${percentage}%`);
      });
    } else {        
      console.log(`\n  All Scores:`);
      result.allScores.forEach(({ category, score }) => {
        const percentage = (score * 100).toFixed(2);
        const marker = score >= result.threshold ? '✓' : ' ';
        console.log(`    ${marker} ${category.padEnd(25)}: ${percentage}%`);
      });
    }

    // Evaluate correctness
    let isCorrect = false;
    if (testCase.category === 'clearly_unrelated') {
      clearlyUnrelatedTotal++;
      if (result.decision === 'forward to outer api module') {
        isCorrect = true;
        correctClassifications++;
        clearlyUnrelatedCorrect++;
        console.log('\n✓ CORRECT (Properly routed to outer API)');
      } else {
        console.log('\n✗ INCORRECT (Should route to outer API)');
      }
    } else if (testCase.category === 'gray_zone') {
      grayZoneTotal++;
      if (result.decision === 'forward to outer api module') {
        grayZoneToOuterAPI++;
        console.log('\n⚠ GRAY ZONE: Routed to OUTER API');
      } else {
        grayZoneToModule++;
        console.log(`\n⚠ GRAY ZONE: Routed to MODULE (${result.bestMatch.category})`);
      }
      
      // For gray zone, we track the distribution but consider all as "correct"
      isCorrect = true;
      correctClassifications++;
    } else if (testCase.category === 'module_specific') {
      moduleSpecificTotal++;
      if (result.decision === testCase.expected) {
        isCorrect = true;
        correctClassifications++;
        moduleSpecificCorrect++;
        console.log(`\n✓ CORRECT (Properly routed to ${result.bestMatch.category} module)`);
      } else {
        console.log(`\n✗ INCORRECT (Expected: ${testCase.expected}, Got: ${result.decision})`);
      }
    }
  }

  // Display summary
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('SUMMARY');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`Total Tests: ${totalTests}`);
  console.log(`\n📊 CLEARLY UNRELATED Tests (should all route to outer API):`);
  console.log(`  Correct: ${clearlyUnrelatedCorrect}/${clearlyUnrelatedTotal} (${(clearlyUnrelatedCorrect/clearlyUnrelatedTotal*100).toFixed(2)}%)`);
  console.log(`  False Positives: ${clearlyUnrelatedTotal - clearlyUnrelatedCorrect} (incorrectly routed to module)`);
  
  console.log(`\n🤔 GRAY ZONE Tests (boundary cases):`);
  console.log(`  Total: ${grayZoneTotal}`);
  console.log(`  Routed to Outer API: ${grayZoneToOuterAPI} (${(grayZoneToOuterAPI/grayZoneTotal*100).toFixed(2)}%)`);
  console.log(`  Routed to Module: ${grayZoneToModule} (${(grayZoneToModule/grayZoneTotal*100).toFixed(2)}%)`);
  
  console.log(`\n✅ MODULE-SPECIFIC Tests (should route to correct module):`);
  console.log(`  Correct: ${moduleSpecificCorrect}/${moduleSpecificTotal} (${(moduleSpecificCorrect/moduleSpecificTotal*100).toFixed(2)}%)`);
  console.log(`  Misrouted: ${moduleSpecificTotal - moduleSpecificCorrect} (routed to wrong module or outer API)`);
  
  console.log(`\n🎯 Overall Performance:`);
  console.log(`  Accuracy on Clear Cases: ${((clearlyUnrelatedCorrect + grayZoneToOuterAPI + moduleSpecificCorrect)/(clearlyUnrelatedTotal + grayZoneTotal + moduleSpecificTotal)*100).toFixed(2)}%`);
  console.log(`  Total Accuracy (excluding gray zone): ${((clearlyUnrelatedCorrect + moduleSpecificCorrect)/(clearlyUnrelatedTotal + moduleSpecificTotal)*100).toFixed(2)}%`);
  console.log('═══════════════════════════════════════════════════════════════\n');

  console.log('💡 Tuning Recommendations:');
  console.log('─────────────────────────────────────────────────────────────');
  if (clearlyUnrelatedCorrect === clearlyUnrelatedTotal) {
    console.log('✓ Excellent! All clearly unrelated messages routed to outer API.');
  } else {
    console.log(`⚠ ${clearlyUnrelatedTotal - clearlyUnrelatedCorrect} false positives detected.`);
    console.log('  Consider increasing FeatureEmbeddedClassifier.routingThreshold');
    console.log(`  Current: ${(FeatureEmbeddedClassifier.routingThreshold * 100).toFixed(0)}%, Try: ${(FeatureEmbeddedClassifier.routingThreshold * 100 + 10).toFixed(0)}% for stricter routing`);
  }
  
  console.log(`\nGray Zone Handling:`);
  if (grayZoneToModule > grayZoneToOuterAPI) {
    console.log('  📌 Router is lenient - routes most boundary cases to modules');
    console.log('  → Good for: Maximizing module usage');
    console.log('  → Risk: May route some off-topic queries to modules');
  } else {
    console.log('  📌 Router is strict - sends most boundary cases to outer API');
    console.log('  → Good for: Reducing noise in specialized modules');
    console.log('  → Risk: May miss some valid module-appropriate queries');
  }
  console.log('═══════════════════════════════════════════════════════════════\n');
}

// Run the tests
runTests().catch(console.error);

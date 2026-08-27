import { getDivision, calculateAggregate, getGradeDisplay, getSubjectGradeNumber } from '../src/lib/grading';

const p4Fixtures = [
  { name: 'Hudah Ssali', scores: [82, 51, 62, 86], expectedTotalAgg: 13, expectedDiv: 'II' }, // MTC 2 (75-84), SST 6 (50-54), SCE 4 (60-69), ENG 1 (85+) -> wait, 2+6+4+1 = 13.
];

function runTests() {
  console.log("=== Testing Grading Logic ===");
  
  // Test P.4 Fixtures
  console.log("\nTesting P.4 Fixtures:");
  const hudahMarks = [
    { subject_name: 'MTC', score: 75 }, // Grade 2
    { subject_name: 'SST', score: 50 }, // Grade 6
    { subject_name: 'SCIE', score: 60 }, // Grade 4
    { subject_name: 'ENG', score: 85 }, // Grade 1
  ];
  
  const hudahAgg = calculateAggregate(hudahMarks, 'upper_primary');
  const hudahDiv = hudahAgg ? getDivision(hudahAgg) : null;
  console.log(`Hudah Ssali - T/L AGG: ${hudahAgg} (Expected: 13), DIV: ${hudahDiv} (Expected: II)`);
  
  const alaruMarks = [
    { subject_name: 'MTC', score: 70 }, // Grade 3
    { subject_name: 'SST', score: 70 }, // Grade 3
    { subject_name: 'SCIE', score: 75 }, // Grade 2
    { subject_name: 'ENG', score: 85 }, // Grade 1
  ];
  const alaruAgg = calculateAggregate(alaruMarks, 'upper_primary');
  const alaruDiv = alaruAgg ? getDivision(alaruAgg) : null;
  console.log(`Alaru Rahia - T/L AGG: ${alaruAgg} (Expected: 9), DIV: ${alaruDiv} (Expected: I)`);
  
  const naggindaMarks = [
    { subject_name: 'MTC', score: 70 }, // Grade 3
    { subject_name: 'SST', score: 60 }, // Grade 4
    { subject_name: 'SCIE', score: 55 }, // Grade 5
    { subject_name: 'ENG', score: 75 }, // Grade 2
  ];
  const naggindaAgg = calculateAggregate(naggindaMarks, 'upper_primary');
  const naggindaDiv = naggindaAgg ? getDivision(naggindaAgg) : null;
  console.log(`Nagginda Ummu-Sulaim - T/L AGG: ${naggindaAgg} (Expected: 14), DIV: ${naggindaDiv} (Expected: II)`);

  // Test Division Edges
  console.log("\nTesting Division Edges:");
  console.log(`Agg 9 -> Div ${getDivision(9)} (Expected: I)`);
  console.log(`Agg 12 -> Div ${getDivision(12)} (Expected: I)`);
  console.log(`Agg 13 -> Div ${getDivision(13)} (Expected: II)`);
  console.log(`Agg 23 -> Div ${getDivision(23)} (Expected: II)`);
  console.log(`Agg 24 -> Div ${getDivision(24)} (Expected: III)`);
  console.log(`Agg 28 -> Div ${getDivision(28)} (Expected: III)`);
  console.log(`Agg 29 -> Div ${getDivision(29)} (Expected: III)`);
  console.log(`Agg 30 -> Div ${getDivision(30)} (Expected: IV)`);
  console.log(`Agg 34 -> Div ${getDivision(34)} (Expected: IV)`);
  console.log(`Agg 35 -> Div ${getDivision(35)} (Expected: U)`);
  console.log(`Agg 36 -> Div ${getDivision(36)} (Expected: U)`);
}

runTests();

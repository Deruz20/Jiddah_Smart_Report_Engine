import fs from 'fs';

const emptyStatePath = 'src/components/secular-hub/SecularHubEmptyState.tsx';
let emptyStateContent = fs.readFileSync(emptyStatePath, 'utf8');
emptyStateContent = emptyStateContent.replace(/TheologyHubEmptyState/g, 'SecularHubEmptyState');
emptyStateContent = emptyStateContent.replace(/Theology Hub/g, 'Secular Hub');
emptyStateContent = emptyStateContent.replace(/Theology/g, 'Secular');
fs.writeFileSync(emptyStatePath, emptyStateContent);

const clientPath = 'src/components/secular-hub/SecularHubClient.tsx';
let clientContent = fs.readFileSync(clientPath, 'utf8');

// Replace standard names
clientContent = clientContent.replace(/TheologyHubEmptyState/g, 'SecularHubEmptyState');
clientContent = clientContent.replace(/TheologyHubClient/g, 'SecularHubClient');
clientContent = clientContent.replace(/TheologyClassData/g, 'CircularClassData');
clientContent = clientContent.replace(/theologyClasses/g, 'circularClasses');
clientContent = clientContent.replace(/\/api\/theology-hub/g, '/api/secular-hub');
clientContent = clientContent.replace(/Theology Hub/g, 'Secular Hub');
clientContent = clientContent.replace(/theology data/g, 'secular data');
clientContent = clientContent.replace(/theology_class_id/g, 'circular_class_id');
clientContent = clientContent.replace(/class_name_arabic/g, 'class_name');
clientContent = clientContent.replace(/subject_name_arabic/g, 'subject_name');
clientContent = clientContent.replace(/Arabic/g, 'English');

// Update RemarkBadge
clientContent = clientContent.replace(/ممتاز/g, 'Excellent');
clientContent = clientContent.replace(/جيد جداً/g, 'Very Good');
clientContent = clientContent.replace(/جيد/g, 'Good');
clientContent = clientContent.replace(/مقبول/g, 'Fair');
clientContent = clientContent.replace(/ضعيف/g, 'Poor');

// Any other specifics
clientContent = clientContent.replace(/arabic_name/g, 'name'); // Since we display English name for secular students

fs.writeFileSync(clientPath, clientContent);

console.log("Refactoring complete");

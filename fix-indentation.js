const fs = require('fs');
const path = require('path');

// Function to fix indentation in a file
function fixIndentation(filePath) {
    console.log(`Processing ${filePath}...`);
    
    // Read the file content
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Split into lines
    const lines = content.split('\n');
    const fixedLines = lines.map(line => {
        const leadingSpaces = line.match(/^\s*/)[0];
        const spacesCount = leadingSpaces.length;
        const tabsCount = Math.floor(spacesCount / 2);
        const tabs = '\t'.repeat(tabsCount);
        return tabs + line.trimLeft();
    });
    
    // Write back to file
    fs.writeFileSync(filePath, fixedLines.join('\n'), 'utf8');
}

// Process the problematic files
const files = [
    'src/lib/init-config-widget.js',
    'src/main/credential-fill.js'
];

files.forEach(file => {
    console.log(`Fixing indentation in ${file}...`);
    fixIndentation(file);
});

console.log('Indentation fixes completed.'); 
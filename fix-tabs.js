const fs = require('fs');
const path = require('path');

// Function to fix indentation in a file
function fixIndentation(filePath) {
    console.log(`Processing ${filePath}...`);
    
    // Read the file content
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Split into lines
    const lines = content.split('\n');
    const newLines = [];
    
    for (const line of lines) {
        if (line.match(/^\s+/)) {
            // Count leading spaces
            const spaces = line.match(/^(\s+)/)[1];
            const spaceCount = spaces.length;
            
            // Convert to tabs (assuming 2 spaces = 1 tab)
            const tabCount = Math.ceil(spaceCount / 2);
            const tabs = '\t'.repeat(tabCount);
            
            // Replace spaces with tabs
            const newLine = line.replace(/^\s+/, tabs);
            newLines.push(newLine);
        } else {
            newLines.push(line);
        }
    }
    
    // Write back to file
    fs.writeFileSync(filePath, newLines.join('\n'));
}

// Process the problematic files
const files = [
    'src/lib/init-config-widget.js',
    'src/main/credential-fill.js'
];

for (const file of files) {
    fixIndentation(file);
}

console.log('Indentation fixes completed.'); 
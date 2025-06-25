const fs = require('fs');
const path = require('path');

const WORKFLOWS_DIR = path.join(__dirname, '..', 'workflows');
const OUTPUT_FILE = path.join(__dirname, '..', 'n8nboy_workflows', 'workflow-index.json');

function extractWorkflowMetadata(filename, content) {
  try {
    const workflow = JSON.parse(content);
    
    // Extract trigger type from filename
    const parts = filename.split('_');
    const triggerType = parts[parts.length - 1].replace('.json', '').toLowerCase();
    
    // Extract node types
    const nodeTypes = new Set();
    if (workflow.nodes && Array.isArray(workflow.nodes)) {
      workflow.nodes.forEach(node => {
        if (node.type) {
          const nodeType = node.type.split('.').pop().replace(/([A-Z])/g, ' $1').trim().toLowerCase();
          nodeTypes.add(nodeType);
        }
      });
    }
    
    // Extract keywords from name and filename
    const keywords = [
      ...parts.slice(1, -1).map(p => p.toLowerCase()),
      triggerType,
      ...Array.from(nodeTypes)
    ];
    
    return {
      id: parts[0],
      name: workflow.name || 'Untitled Workflow',
      description: workflow.description || workflow.name || 'No description available',
      filename: filename,
      triggerType: triggerType,
      nodeTypes: Array.from(nodeTypes),
      tags: keywords.filter(k => k && k.length > 2),
      nodeCount: workflow.nodes ? workflow.nodes.length : 0
    };
  } catch (error) {
    console.error(`Error parsing ${filename}:`, error.message);
    return null;
  }
}

async function generateIndex() {
  console.log('Starting workflow index generation...');
  
  // Create output directory if it doesn't exist
  const outputDir = path.dirname(OUTPUT_FILE);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  // Read all workflow files
  const files = fs.readdirSync(WORKFLOWS_DIR).filter(f => f.endsWith('.json'));
  console.log(`Found ${files.length} workflow files`);
  
  const workflows = [];
  
  for (const file of files) {
    const filePath = path.join(WORKFLOWS_DIR, file);
    const content = fs.readFileSync(filePath, 'utf8');
    const metadata = extractWorkflowMetadata(file, content);
    
    if (metadata) {
      workflows.push(metadata);
    }
  }
  
  console.log(`Successfully processed ${workflows.length} workflows`);
  
  // Sort by ID
  workflows.sort((a, b) => a.id.localeCompare(b.id));
  
  // Create index object
  const index = {
    version: '1.0',
    totalWorkflows: workflows.length,
    lastUpdated: new Date().toISOString(),
    workflows: workflows
  };
  
  // Write index file
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(index, null, 2));
  console.log(`Index written to ${OUTPUT_FILE}`);
  
  // Print statistics
  const triggerTypes = {};
  workflows.forEach(w => {
    triggerTypes[w.triggerType] = (triggerTypes[w.triggerType] || 0) + 1;
  });
  
  console.log('\nWorkflow Statistics:');
  console.log('Trigger Types:', triggerTypes);
  console.log(`Total size: ${(JSON.stringify(index).length / 1024).toFixed(2)} KB`);
}

generateIndex().catch(console.error);
#!/usr/bin/env node

/**
 * Convert Markdown documentation files to HTML with consistent styling
 * This script:
 * 1. Finds all .md files in the docs directory
 * 2. Converts them to HTML using marked library
 * 3. Applies consistent styling matching documentation.html
 * 4. Preserves directory structure
 */

const fs = require('fs');
const path = require('path');
const { marked } = require('marked');

// Configure marked options
// Note: This is for trusted documentation content only, not user-generated content
marked.setOptions({
  gfm: true, // GitHub Flavored Markdown
  breaks: true, // Convert \n to <br>
  headerIds: true, // Add IDs to headers
  mangle: false, // Don't escape autolinked email addresses
});

// HTML template for documentation pages
const getHtmlTemplate = (title, content, filePath) => {
  // Calculate relative path to root for proper linking
  const depth = filePath.split('/').length - 2; // -2 for docs/ and filename
  const rootPath = depth > 0 ? '../'.repeat(depth) : './';
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="description" content="NoteHub Documentation - ${title}">
    <title>${title} - NoteHub Documentation</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        :root {
            --primary: #6366f1;
            --primary-dark: #4f46e5;
            --secondary: #ec4899;
            --bg: #0f172a;
            --bg-light: #1e293b;
            --bg-lighter: #334155;
            --text: #f1f5f9;
            --text-muted: #cbd5e1;
            --accent: #22d3ee;
            --border: rgba(148, 163, 184, 0.1);
            --code-bg: #1e293b;
            --link: #60a5fa;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Inter', sans-serif;
            background: linear-gradient(135deg, var(--bg) 0%, #1a1f35 100%);
            color: var(--text);
            line-height: 1.7;
            overflow-x: hidden;
        }

        header {
            position: fixed;
            top: 0;
            width: 100%;
            padding: 1rem 2rem;
            background: rgba(15, 23, 42, 0.95);
            backdrop-filter: blur(10px);
            border-bottom: 1px solid var(--border);
            z-index: 1000;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .logo {
            font-size: 1.25rem;
            font-weight: 700;
            background: linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            text-decoration: none;
        }

        nav a {
            color: var(--text-muted);
            text-decoration: none;
            margin-left: 2rem;
            transition: color 0.3s;
            font-size: 0.9rem;
        }

        nav a:hover {
            color: var(--accent);
        }

        main {
            max-width: 900px;
            margin: 0 auto;
            padding: 6rem 2rem 3rem;
        }

        .breadcrumb {
            color: var(--text-muted);
            font-size: 0.9rem;
            margin-bottom: 2rem;
            padding-bottom: 1rem;
            border-bottom: 1px solid var(--border);
        }

        .breadcrumb a {
            color: var(--link);
            text-decoration: none;
            transition: color 0.3s;
        }

        .breadcrumb a:hover {
            color: var(--accent);
        }

        .breadcrumb span {
            margin: 0 0.5rem;
            color: var(--text-muted);
        }

        .content {
            background: rgba(30, 41, 59, 0.5);
            border: 1px solid var(--border);
            border-radius: 12px;
            padding: 3rem;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
        }

        h1 {
            font-size: 2.5rem;
            margin-bottom: 1.5rem;
            background: linear-gradient(135deg, var(--accent) 0%, var(--primary) 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            font-weight: 800;
            line-height: 1.2;
        }

        h2 {
            font-size: 1.875rem;
            margin-top: 2.5rem;
            margin-bottom: 1rem;
            color: var(--accent);
            border-bottom: 2px solid var(--border);
            padding-bottom: 0.5rem;
        }

        h3 {
            font-size: 1.5rem;
            margin-top: 2rem;
            margin-bottom: 0.75rem;
            color: var(--primary);
        }

        h4 {
            font-size: 1.25rem;
            margin-top: 1.5rem;
            margin-bottom: 0.5rem;
            color: var(--text);
        }

        h5, h6 {
            font-size: 1.1rem;
            margin-top: 1rem;
            margin-bottom: 0.5rem;
            color: var(--text-muted);
        }

        p {
            margin-bottom: 1.25rem;
        }

        a {
            color: var(--link);
            text-decoration: none;
            transition: color 0.3s;
        }

        a:hover {
            color: var(--accent);
            text-decoration: underline;
        }

        ul, ol {
            margin-bottom: 1.25rem;
            margin-left: 2rem;
        }

        li {
            margin-bottom: 0.5rem;
        }

        code {
            background: var(--code-bg);
            padding: 0.2rem 0.4rem;
            border-radius: 4px;
            font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
            font-size: 0.9em;
            color: var(--accent);
        }

        pre {
            background: var(--code-bg);
            border: 1px solid var(--border);
            border-radius: 8px;
            padding: 1.5rem;
            margin-bottom: 1.5rem;
            overflow-x: auto;
        }

        pre code {
            background: none;
            padding: 0;
            color: var(--text);
            font-size: 0.875rem;
            line-height: 1.6;
        }

        blockquote {
            border-left: 4px solid var(--primary);
            padding-left: 1.5rem;
            margin: 1.5rem 0;
            color: var(--text-muted);
            font-style: italic;
        }

        table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 1.5rem;
            overflow-x: auto;
            display: block;
        }

        thead {
            background: var(--bg-lighter);
        }

        th, td {
            padding: 0.75rem;
            text-align: left;
            border: 1px solid var(--border);
        }

        th {
            font-weight: 600;
            color: var(--accent);
        }

        tbody tr:hover {
            background: rgba(99, 102, 241, 0.1);
        }

        img {
            max-width: 100%;
            height: auto;
            border-radius: 8px;
            margin: 1.5rem 0;
        }

        hr {
            border: none;
            border-top: 1px solid var(--border);
            margin: 2rem 0;
        }

        .back-link {
            display: inline-block;
            margin-top: 2rem;
            padding: 0.75rem 1.5rem;
            background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%);
            color: white;
            text-decoration: none;
            border-radius: 6px;
            font-weight: 600;
            transition: all 0.3s;
        }

        .back-link:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 15px rgba(99, 102, 241, 0.5);
            text-decoration: none;
        }

        @media (max-width: 768px) {
            main {
                padding: 5rem 1rem 2rem;
            }

            .content {
                padding: 1.5rem;
            }

            h1 {
                font-size: 2rem;
            }

            h2 {
                font-size: 1.5rem;
            }

            nav a {
                margin-left: 1rem;
                font-size: 0.85rem;
            }

            pre {
                padding: 1rem;
            }

            table {
                font-size: 0.875rem;
            }
        }

        /* Syntax highlighting for code blocks */
        .language-javascript .keyword { color: #c792ea; }
        .language-javascript .string { color: #c3e88d; }
        .language-javascript .comment { color: #676e95; }
        .language-bash .command { color: #82aaff; }
        .language-json .property { color: #f07178; }
    </style>
</head>
<body>
    <header>
        <a href="${rootPath}documentation.html" class="logo">📚 NoteHub Documentation</a>
        <nav>
            <a href="${rootPath}documentation.html">Documentation Home</a>
            <a href="${rootPath}INDEX.html">Full Index</a>
            <a href="https://github.com/thienng-it/note-hub" target="_blank" rel="noopener noreferrer">GitHub</a>
        </nav>
    </header>

    <main>
        <div class="breadcrumb">
            <a href="${rootPath}documentation.html">📚 Documentation</a>
            <span>/</span>
            <span>${title}</span>
        </div>

        <article class="content">
            ${content}
        </article>

        <a href="${rootPath}documentation.html" class="back-link">← Back to Documentation</a>
    </main>
</body>
</html>`;
};

// Convert a markdown file to HTML
const convertMarkdownFile = (inputPath, outputPath) => {
  try {
    // Read markdown file
    const markdown = fs.readFileSync(inputPath, 'utf-8');
    
    // Convert to HTML
    const htmlContent = marked.parse(markdown);
    
    // Extract title from first h1 or use filename
    const titleMatch = markdown.match(/^#\s+(.+)$/m);
    const title = titleMatch ? titleMatch[1] : path.basename(inputPath, '.md');
    
    // Get relative path for the template (cross-platform compatible)
    const docsDir = path.join(process.cwd(), 'docs');
    const relativePath = path.relative(docsDir, outputPath);
    
    // Wrap in HTML template
    const fullHtml = getHtmlTemplate(title, htmlContent, relativePath);
    
    // Ensure output directory exists
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    // Write HTML file
    fs.writeFileSync(outputPath, fullHtml, 'utf-8');
    
    return true;
  } catch (error) {
    console.error(`Error converting ${inputPath}:`, error.message);
    return false;
  }
};

// Recursively find all markdown files in a directory
const findMarkdownFiles = (dir, fileList = []) => {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      // Skip node_modules and hidden directories
      if (!file.startsWith('.') && file !== 'node_modules') {
        findMarkdownFiles(filePath, fileList);
      }
    } else if (file.endsWith('.md')) {
      fileList.push(filePath);
    }
  });
  
  return fileList;
};

// Main conversion function
const convertAllDocs = () => {
  const docsDir = path.join(process.cwd(), 'docs');
  
  if (!fs.existsSync(docsDir)) {
    console.error('Error: docs directory not found');
    process.exit(1);
  }
  
  console.log('🔍 Finding markdown files...');
  const markdownFiles = findMarkdownFiles(docsDir);
  
  console.log(`📚 Found ${markdownFiles.length} markdown files`);
  console.log('🔄 Converting to HTML...\n');
  
  let successCount = 0;
  let failCount = 0;
  
  markdownFiles.forEach(filePath => {
    // Generate output path (replace .md with .html)
    const outputPath = filePath.replace(/\.md$/, '.html');
    
    const relativePath = path.relative(docsDir, filePath);
    
    if (convertMarkdownFile(filePath, outputPath)) {
      console.log(`✅ ${relativePath} → ${path.relative(docsDir, outputPath)}`);
      successCount++;
    } else {
      console.log(`❌ Failed: ${relativePath}`);
      failCount++;
    }
  });
  
  console.log(`\n✨ Conversion complete!`);
  console.log(`✅ Success: ${successCount}`);
  if (failCount > 0) {
    console.log(`❌ Failed: ${failCount}`);
  }
};

// Run the conversion
if (require.main === module) {
  convertAllDocs();
}

module.exports = { convertMarkdownFile, findMarkdownFiles, convertAllDocs };

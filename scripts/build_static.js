const fs = require('fs');
const path = require('path');
const ejs = require('ejs');

// Configuration
const SRC_DIR = path.join(__dirname, '..');
const DIST_DIR = path.join(__dirname, '../dist');
const VIEWS_DIR = path.join(SRC_DIR, 'views');
const PUBLIC_DIR = path.join(SRC_DIR, 'public');

// Ensure dist directory exists
if (fs.existsSync(DIST_DIR)) {
    fs.rmSync(DIST_DIR, { recursive: true, force: true });
}
fs.mkdirSync(DIST_DIR);

// Helper: Copy Directory Recursive
function copyDir(src, dest) {
    fs.mkdirSync(dest, { recursive: true });
    const entries = fs.readdirSync(src, { withFileTypes: true });

    for (let entry of entries) {
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);

        if (entry.isDirectory()) {
            copyDir(srcPath, destPath);
        } else {
            fs.copyFileSync(srcPath, destPath);
        }
    }
}

// 1. Copy Public Assets
console.log('Copying public assets...');
copyDir(PUBLIC_DIR, DIST_DIR);

// 2. Define Pages to Render
const pages = [
    { src: 'index', dest: 'index.html', data: { title: 'Home' } },
    { src: 'gemcrest', dest: 'gemcrest.html', data: { title: 'GemCrest', scripts: ['js/checkout.js'] } },
    { src: 'about', dest: 'about.html', data: { title: 'About Us' } },
    { src: 'contact', dest: 'contact.html', data: { title: 'Contact' } },
    { src: 'admin/login', dest: 'admin/login.html', data: { title: 'Admin Login' } },
    { src: 'admin/dashboard', dest: 'admin/dashboard.html', data: { title: 'Command & Control' } }
];

// Add Documentation Pages
const docsDir = path.join(VIEWS_DIR, 'docs');
if (fs.existsSync(docsDir)) {
    const docFiles = fs.readdirSync(docsDir).filter(f => f.endsWith('.ejs'));
    docFiles.forEach(file => {
        const name = path.basename(file, '.ejs');
        if (name === 'index') {
            pages.push({ src: 'docs/index', dest: 'docs/index.html', data: { title: 'Documentation' } });
        } else {
            pages.push({ src: `docs/${name}`, dest: `docs/${name}.html`, data: { title: 'Documentation' } });
        }
    });
}

// Add Legal Pages
const legalDir = path.join(VIEWS_DIR, 'legal');
if (fs.existsSync(legalDir)) {
    const legalFiles = fs.readdirSync(legalDir).filter(f => f.endsWith('.ejs'));
    legalFiles.forEach(file => {
        const name = path.basename(file, '.ejs');
        pages.push({ src: `legal/${name}`, dest: `legal/${name}.html`, data: { title: 'Legal' } });
    });
}

// 3. Render Pages
console.log('Rendering pages...');
pages.forEach(page => {
    const templatePath = path.join(VIEWS_DIR, page.src + '.ejs');
    const outputPath = path.join(DIST_DIR, page.dest);


    // Ensure output dir exists
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    // Calculate relative path to root (e.g., "admin/" -> "../")
    let relativePath = path.relative(outputDir, DIST_DIR);
    if (relativePath === '') relativePath = '.';
    relativePath += '/';
    // Windows fix: ensure forward slashes
    relativePath = relativePath.replace(/\\/g, '/');

    // Merge data with path globals
    const viewData = {
        ...page.data,
        path: relativePath,
        ext: '.html'
    };

    ejs.renderFile(templatePath, viewData, (err, str) => {
        if (err) {
            console.error(`Error rendering ${page.src}:`, err);
            process.exit(1);
        }
        fs.writeFileSync(outputPath, str);
        console.log(`Rendered: ${page.dest}`);
    });
});

// 4. Configuration Injection (Secrets & Env Vars)
console.log('Injecting Configuration...');
const checkoutJsPath = path.join(DIST_DIR, 'js/checkout.js');

if (fs.existsSync(checkoutJsPath)) {
    let content = fs.readFileSync(checkoutJsPath, 'utf8');

    // Helper to replace config values
    const replaceConfig = () => {
        if (process.env.RAZORPAY_KEY) {
            content = content.replace('PLACEHOLDER_RAZORPAY_KEY', process.env.RAZORPAY_KEY);
        }
        if (process.env.SERVER_URL) {
            content = content.replace('PLACEHOLDER_SERVER_URL', process.env.SERVER_URL);
        }
        if (process.env.AMOUNT) {
            content = content.replace("'PLACEHOLDER_AMOUNT'", process.env.AMOUNT);
        }
    };
    replaceConfig();

    fs.writeFileSync(checkoutJsPath, content);
} else {
    console.warn('Warning: checkout.js not found for configuration injection.');
}

// 5. Admin Secret Injection
const adminJsPath = path.join(DIST_DIR, 'js/admin.js');
if (fs.existsSync(adminJsPath)) {
    let content = fs.readFileSync(adminJsPath, 'utf8');
    if (process.env.SERVER_URL) {
        content = content.replace('PLACEHOLDER_SERVER_URL', process.env.SERVER_URL);
    }
    fs.writeFileSync(adminJsPath, content);
    console.log('Injected SERVER_URL into admin.js');
}

console.log('Build complete!');

const express = require('express');
const app = express();
const path = require('path');

require('dotenv').config();

// Set View Engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Dynamic JS Serving (Inject Envs)
const fs = require('fs');

app.get('/js/checkout.js', (req, res) => {
    const filePath = path.join(__dirname, 'public/js/checkout.js');
    fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) return res.status(404).send('Script not found');

        // Inject Envs
        const result = data
            .replace('PLACEHOLDER_SERVER_URL', process.env.SERVER_URL || '')
            .replace('PLACEHOLDER_RAZORPAY_KEY', process.env.RAZORPAY_KEY || '')
            .replace("'PLACEHOLDER_AMOUNT'", process.env.AMOUNT || '500000'); // Remove quotes to make it a number

        res.type('application/javascript').send(result);
    });
});

app.get('/js/admin.js', (req, res) => {
    const filePath = path.join(__dirname, 'public/js/admin.js');
    fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) return res.status(404).send('Script not found');

        const result = data.replace('PLACEHOLDER_SERVER_URL', process.env.SERVER_URL || '');
        res.type('application/javascript').send(result);
    });
});

// Static Files (rest of public)
app.use(express.static(path.join(__dirname, 'public')));

// Routes
app.get('/', (req, res) => {
    res.render('index', { title: 'Home' });
});

app.get('/gemcrest', (req, res) => {
    res.render('gemcrest', { title: 'GemCrest', scripts: ['/js/checkout.js'] });
});

app.get('/about', (req, res) => {
    res.render('about', { title: 'About Us' });
});

app.get('/contact', (req, res) => {
    res.render('contact', { title: 'Contact' });
});

// Documentation Routes
app.get('/docs', (req, res) => {
    res.render('docs/index', { title: 'Documentation' });
});

app.get('/docs/:page', (req, res) => {
    const page = req.params.page;
    // Basic safety check for page name
    if (/^[a-z0-9-]+$/.test(page)) {
        res.render(`docs/${page}`, { title: 'Documentation' }, (err, html) => {
            if (err) {
                // Try finding index if page mismatch or 404
                if (page === 'index') res.render('docs/index', { title: 'Documentation' });
                else res.status(404).send('Page not found');
            } else {
                res.send(html);
            }
        });
    } else {
        res.status(404).send('Invalid page');
    }
});

// Legal Routes
app.get('/legal/:page', (req, res) => {
    const page = req.params.page;
    if (/^[a-z0-9-]+$/.test(page)) {
        res.render(`legal/${page}`, { title: 'Legal' }, (err, html) => {
            if (err) res.status(404).send('Page not found');
            else res.send(html);
        });
    } else {
        res.status(404).send('Invalid page');
    }
});

// Admin Routes
app.get('/admin', (req, res) => {
    res.redirect('/admin/dashboard');
});

app.get('/admin/login', (req, res) => {
    res.render('admin/login', { title: 'Admin Login' });
});

app.get('/admin/dashboard', (req, res) => {
    res.render('admin/dashboard', { title: 'Command & Control' });
});

// Start Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

const express = require('express');
const cookieParser = require('cookie-parser');
const fs = require('fs');
const path = require('path');

const app = express();
const DB_FILE = path.join(__dirname, 'database.json');
const SITE_PASSWORD = "physics2024";

app.use(express.json());
app.use(cookieParser());

// Початкова база з правилами авто-обрахунків
const initialData = {
    formulas: [
        {
            id: "f-accel",
            name: "Прискорення (закон швидкості)",
            category: "Механіка",
            latex: "$$a = \\frac{v - v_0}{t}$$",
            symbols: "a прискорення v швидкість v0 t час",
            description: "Показує зміну швидкості тіла за одиницю часу.",
            resVar: "a",
            mathExpr: "(v - v0) / t",
            substTemplate: "\\frac{v - v_0}{t}",
            unit: "м/с²",
            vars: [
                { sym: "$a$", text: "прискорення (м/с²)" },
                { sym: "$v$", text: "кінцева швидкість (м/с)" },
                { sym: "$v_0$", text: "початкова швидкість (м/с)" },
                { sym: "$t$", text: "час руху (с)" }
            ]
        },
        {
            id: "f-path",
            name: "Шлях при рівноприскореному русі",
            category: "Механіка",
            latex: "$$S = v_0 t + \\frac{a t^2}{2}$$",
            symbols: "s шлях відстань v0 швидкість t час a прискорення",
            description: "Повний шлях, пройдений тілом від початку руху.",
            resVar: "S",
            mathExpr: "v0 * t + (a * t**2) / 2",
            substTemplate: "v_0 \\cdot t + \\frac{a \\cdot t^2}{2}",
            unit: "м",
            vars: [
                { sym: "$S$", text: "шлях (м)" },
                { sym: "$v_0$", text: "початкова швидкість (м/с)" },
                { sym: "$t$", text: "час (с)" },
                { sym: "$a$", text: "прискорення (м/с²)" }
            ]
        }
    ],
    tasks: [],
    labs: []
};

function loadDatabase() {
    try {
        if (!fs.existsSync(DB_FILE)) {
            fs.writeFileSync(DB_FILE, JSON.stringify(initialData, null, 2), 'utf-8');
            return initialData;
        }
        const data = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
        if (!data.formulas) data.formulas = [];
        if (!data.tasks) data.tasks = [];
        if (!data.labs) data.labs = [];

        let changed = false;
        data.formulas = data.formulas.map((f, i) => {
            if (!f.id) { f.id = "f-" + (Date.now() + i); changed = true; }
            return f;
        });
        if (changed) saveDatabase(data);

        return data;
    } catch (e) {
        return initialData;
    }
}

function saveDatabase(data) {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

// Авторизація
app.post('/api/login', (req, res) => {
    const { password } = req.body;
    if (password === SITE_PASSWORD) {
        res.cookie('auth', 'logged_in', { httpOnly: true, maxAge: 30 * 24 * 3600 * 1000 });
        return res.json({ success: true });
    }
    res.status(401).json({ error: 'Невірний пароль' });
});

app.get('/login.html', (req, res) => res.sendFile(path.join(__dirname, 'public', 'login.html')));

app.use((req, res, next) => {
    if (req.cookies.auth === 'logged_in' || req.path === '/api/login' || req.path === '/login.html') {
        next();
    } else {
        res.redirect('/login.html');
    }
});

app.use(express.static('public'));

// ФОРМУЛИ
app.get('/api/formulas', (req, res) => res.json(loadDatabase().formulas));
app.post('/api/formulas', (req, res) => {
    const db = loadDatabase();
    db.formulas.push({ id: "f-" + Date.now(), ...req.body });
    saveDatabase(db);
    res.json({ success: true });
});
app.put('/api/formulas/:id', (req, res) => {
    const db = loadDatabase();
    const id = String(req.params.id);
    const idx = db.formulas.findIndex(f => String(f.id) === id);
    if (idx !== -1) {
        db.formulas[idx] = { ...db.formulas[idx], ...req.body, id: id };
        saveDatabase(db);
        return res.json({ success: true });
    }
    res.status(404).json({ error: 'Не знайдено' });
});
app.delete('/api/formulas/:id', (req, res) => {
    const db = loadDatabase();
    const id = String(req.params.id);
    db.formulas = db.formulas.filter(f => String(f.id) !== id);
    saveDatabase(db);
    res.json({ success: true });
});

// ЗАДАЧІ
app.get('/api/tasks', (req, res) => res.json(loadDatabase().tasks));
app.post('/api/tasks', (req, res) => {
    const db = loadDatabase();
    db.tasks.push({ id: String(Date.now()), ...req.body });
    saveDatabase(db);
    res.json({ success: true });
});
app.put('/api/tasks/:id', (req, res) => {
    const db = loadDatabase();
    const id = String(req.params.id);
    const idx = db.tasks.findIndex(t => String(t.id) === id);
    if (idx !== -1) {
        db.tasks[idx] = { ...db.tasks[idx], ...req.body, id: id };
        saveDatabase(db);
        return res.json({ success: true });
    }
    res.status(404).json({ error: 'Не знайдено' });
});
app.delete('/api/tasks/:id', (req, res) => {
    const db = loadDatabase();
    const id = String(req.params.id);
    db.tasks = db.tasks.filter(t => String(t.id) !== id);
    saveDatabase(db);
    res.json({ success: true });
});

// ЛАБОРАТОРНІ
app.get('/api/labs', (req, res) => res.json(loadDatabase().labs));
app.post('/api/labs', (req, res) => {
    const db = loadDatabase();
    db.labs.push({ id: "lab-" + Date.now(), ...req.body });
    saveDatabase(db);
    res.json({ success: true });
});
app.put('/api/labs/:id', (req, res) => {
    const db = loadDatabase();
    const id = String(req.params.id);
    const idx = db.labs.findIndex(l => String(l.id) === id);
    if (idx !== -1) {
        db.labs[idx] = { ...db.labs[idx], ...req.body, id: id };
        saveDatabase(db);
        return res.json({ success: true });
    }
    res.status(404).json({ error: 'Не знайдено' });
});
app.delete('/api/labs/:id', (req, res) => {
    const db = loadDatabase();
    const id = String(req.params.id);
    db.labs = db.labs.filter(l => String(l.id) !== id);
    saveDatabase(db);
    res.json({ success: true });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Сервер працює: http://localhost:${PORT}`));
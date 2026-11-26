# Arithmetic-Expression-Compiler
A Python + Flask web app that compiles an arithmetic expression and shows the output of every compiler phase in the browser.

## Features

Enter an expression such as `2 + 3 * 4` and see the result of each stage:

1. Lexical analysis (tokens)
2. Syntax analysis (recursive-descent parser)
3. Abstract Syntax Tree (AST)
4. Semantic analysis
5. Intermediate code generation (three-address code)
6. Optimization
7. Final assembly-like code (register-based)

Operator precedence is respected, so multiplication is handled before addition.

## Tech Stack

Python, Flask, Flask-Cors, HTML, CSS, JavaScript

## Project Structure

```
├── backend.py           # Flask server
├── compiler_phases.py   # Compiler logic
├── index.html           # Web interface
├── script.js            # Frontend logic
├── style.css            # Styling
└── screenshots/         # screenshots
```
## Run Locally
Requires Python 3.10+

```bash
python -m venv .venv
.venv\Scripts\activate        # Windows (macOS/Linux: source .venv/bin/activate)
python -m pip install Flask Flask-Cors
python backend.py
```
Then open http://localhost:8000
## Troubleshooting
- **ModuleNotFoundError: flask**: install the packages inside your active environment.
- **Port 8000 in use**: stop the other process, then rerun `python backend.py`.
- **Page loads but nothing works**: open `http://localhost:8000` rather than opening `index.html` directly.


## 📄 License
This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

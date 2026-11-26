let currentData = null;
let currentActiveTab = 'lexical';
let currentTacStage = 'stage2_typed';

document.addEventListener('DOMContentLoaded', () => {
    const savedTheme = localStorage.getItem('compiler_theme') || 'day';
    if (savedTheme === 'night') {
        document.body.classList.add('dark-mode');
        updateThemeButtonUI(true);
    } else {
        document.body.classList.remove('dark-mode');
        updateThemeButtonUI(false);
    }

    analyzeExpression();
});

function toggleTheme() {
    const isDark = document.body.classList.toggle('dark-mode');
    localStorage.setItem('compiler_theme', isDark ? 'night' : 'day');
    updateThemeButtonUI(isDark);
    setTimeout(drawTreeConnectors, 50);
}

function updateThemeButtonUI(isDark) {
    const icon = document.getElementById('theme-icon');
    const label = document.getElementById('theme-label');
    if (isDark) {
        icon.textContent = '☀️';
        label.textContent = 'Day Mode';
    } else {
        icon.textContent = '🌙';
        label.textContent = 'Night Mode';
    }
}

function loadExample(expr) {
    const input = document.getElementById('expression-input');
    input.value = expr;
    analyzeExpression();
}

async function analyzeExpression() {
    const expressionInput = document.getElementById('expression-input');
    const expression = expressionInput.value.trim();

    if (!expression) {
        alert('Please enter an arithmetic expression.');
        return;
    }

    const btnText = document.getElementById('btn-text');
    const btnSpinner = document.getElementById('btn-spinner');
    const analyzeBtn = document.getElementById('analyze-btn');
    btnText.textContent = 'Compiling...';
    btnSpinner.style.display = 'inline-block';
    analyzeBtn.disabled = true;

    try {
        const response = await fetch('/api/analyze', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ expression: expression })
        });

        const data = await response.json();
        currentData = data;

        updateLiveStats(data.stats);
        updateOutputBox(data);
        showAnalyzer(currentActiveTab);

    } catch (error) {
        currentData = null;
        updateOutputBox({
            error: `Failed to communicate with compiler backend: ${error.message}`,
            error_type: 'Syntax Error'
        });
        document.getElementById('output-box').innerHTML = `
            <div class="output-error-banner">
                <strong>Connection Error:</strong> ${escapeHtml(error.message)}<br>
                Please verify that the backend server is running on http://localhost:8000.
            </div>
        `;
    } finally {
        btnText.textContent = 'Compile & Analyze';
        btnSpinner.style.display = 'none';
        analyzeBtn.disabled = false;
    }
}

function updateLiveStats(stats) {
    if (!stats) return;
    document.getElementById('stat-tokens').textContent = stats.tokens ?? 0;
    document.getElementById('stat-ast').textContent = stats.ast_nodes ?? 0;
    document.getElementById('stat-tac').textContent = stats.tac_instructions ?? 0;
    document.getElementById('stat-asm').textContent = stats.assembly_instructions ?? 0;
}

function updateOutputBox(data) {
    const outputBox = document.getElementById('output-result-box');
    const badgeContainer = document.getElementById('status-badge-container');

    if (data.error) {
        const errorType = data.error_type || 'Compilation Error';
        badgeContainer.innerHTML = `<span class="error-badge-tag">${escapeHtml(errorType)}</span>`;
        outputBox.innerHTML = `
            <div class="output-error-banner">
                <div class="error-what"><strong>What Happened:</strong> ${escapeHtml(data.error)}</div>
                <div class="error-where"><strong>Where:</strong> Stage: ${escapeHtml(data.stage || 'Pipeline')}</div>
                <div class="error-why"><strong>Why:</strong> The compiler encountered an invalid token, syntax rule violation, or unsupported operation.</div>
            </div>
        `;
    } else {
        const resText = data.output?.result || 'Compilation completed successfully.';
        badgeContainer.innerHTML = `<span class="status-indicator-badge" style="padding: 3px 10px; font-size: 0.8em;"><span class="pulse-dot"></span> Valid</span>`;
        outputBox.innerHTML = `
            <div class="output-success">
                <strong>${escapeHtml(resText)}</strong>
            </div>
        `;
    }
}

function showAnalyzer(type) {
    currentActiveTab = type;

    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    const activeBtn = document.getElementById(`tab-${type}`);
    if (activeBtn) activeBtn.classList.add('active');

    const outputBox = document.getElementById('output-box');

    if (!currentData) {
        outputBox.innerHTML = '<div class="output-placeholder"><p>Enter an expression and click "Compile &amp; Analyze" to see stage details.</p></div>';
        return;
    }

    if (currentData.error && ['parse_tree_hierarchy', 'semantic', 'tac', 'optimization', 'final_code'].includes(type)) {
        const errStage = currentData.stage || 'Pipeline';
        if ((type === 'semantic' && errStage === 'Syntax Analyzer') ||
            (type !== 'lexical' && type !== 'syntax' && (errStage === 'Syntax Analyzer' || errStage === 'Semantic Analysis'))) {
            outputBox.innerHTML = `
                <div class="output-error-banner">
                    <div class="error-what"><strong>Compilation Halted:</strong> Cannot generate ${escapeHtml(type.replace('_', ' ').toUpperCase())} view.</div>
                    <div class="error-where"><strong>Where:</strong> Failure occurred at ${escapeHtml(errStage)}.</div>
                    <div class="error-why"><strong>Why:</strong> ${escapeHtml(currentData.error)}</div>
                </div>
            `;
            return;
        }
    }

    switch (type) {
        case 'lexical':
            outputBox.innerHTML = renderLexicalStage(currentData.lexical);
            break;
        case 'syntax':
            outputBox.innerHTML = renderSyntaxStage(currentData.syntax);
            break;
        case 'parse_tree_hierarchy':
            outputBox.innerHTML = renderParseTreeHierarchyStage(currentData.parse_tree_hierarchy || currentData.syntax);
            setTimeout(drawTreeConnectors, 60);
            break;
        case 'semantic':
            outputBox.innerHTML = renderSemanticStage(currentData.semantic);
            break;
        case 'tac':
            outputBox.innerHTML = renderTACStage(currentData.tac);
            break;
        case 'optimization':
            outputBox.innerHTML = renderOptimizationStage(currentData.optimization);
            break;
        case 'final_code':
            outputBox.innerHTML = renderFinalCodeStage(currentData.final_code);
            break;
        default:
            outputBox.innerHTML = '<div class="output-placeholder"><p>Select a stage tab to inspect.</p></div>';
    }
}

function renderLexicalStage(data) {
    if (!data || !data.tokens) {
        return '<div class="output-error-banner">Lexical analysis tokens not available.</div>';
    }

    let html = `
        <div class="stage-header">
            <h2 class="stage-title">Lexical Analyzer</h2>
            <span class="stage-summary-badge">${data.tokens.length} Tokens Recognized</span>
        </div>
        <p style="margin-bottom: 15px; color: var(--text-secondary);">
            Token stream generated by the lexical scanner with variable canonicalization:
        </p>
        <div class="token-grid">
    `;

    data.tokens.forEach(tok => {
        html += `
            <div class="token-card">
                <div>
                    <span class="token-type-tag">${escapeHtml(tok.type)}</span>
                    <span class="token-val" style="margin-left: 8px;">${escapeHtml(tok.value)}</span>
                </div>
                ${tok.mapped ? `<span class="token-mapped-val">→ ${escapeHtml(tok.mapped)}</span>` : ''}
            </div>
        `;
    });

    html += `</div>`;

    if (data.mappings && data.mappings.length > 0) {
        html += `
            <h3 style="margin-top: 25px; margin-bottom: 10px; color: var(--text-primary);">Symbol Variable Mapping Table</h3>
            <div class="custom-table-container">
                <table class="custom-table">
                    <thead>
                        <tr>
                            <th>Original Variable Name</th>
                            <th>Canonical Symbol</th>
                            <th>Scope</th>
                        </tr>
                    </thead>
                    <tbody>
        `;
        data.mappings.forEach(m => {
            html += `
                <tr>
                    <td><strong>${escapeHtml(m.original)}</strong></td>
                    <td style="color: var(--primary-color);"><strong>${escapeHtml(m.mapped)}</strong></td>
                    <td>Global</td>
                </tr>
            `;
        });
        html += `</tbody></table></div>`;
    }

    return html;
}

function renderSyntaxStage(data) {
    if (!data) return '<div class="output-error-banner">Syntax data not available.</div>';

    let html = `
        <div class="stage-header">
            <h2 class="stage-title">Syntax Analyzer</h2>
            <span class="stage-summary-badge">Grammar Validated</span>
        </div>
        <p style="margin-bottom: 15px; color: var(--text-secondary);">
            Context-Free Grammar (CFG) rules and operator precedence verification:
        </p>
        <div class="code-display-box" style="margin-bottom: 20px;">
            <div class="code-line"><span class="code-comment"># Grammar Productions Applied:</span></div>
            <div class="code-line"><span class="line-num">1</span><span class="code-content">Expression  → Term (('+' | '-') Term)*</span></div>
            <div class="code-line"><span class="line-num">2</span><span class="code-content">Term        → Factor (('*' | '/') Factor)*</span></div>
            <div class="code-line"><span class="line-num">3</span><span class="code-content">Factor      → ('+' | '-') Factor | Primary</span></div>
            <div class="code-line"><span class="line-num">4</span><span class="code-content">Primary     → Identifier | Number | '(' Expression ')'</span></div>
            <div class="code-line"><span class="line-num">5</span><span class="code-content">Assignment  → Identifier '=' Expression</span></div>
        </div>

        <h3 style="margin-top: 20px; margin-bottom: 10px; color: var(--text-primary);">Textual Parse Tree Representation</h3>
        <pre class="code-display-box" style="white-space: pre-wrap; font-size: 0.95em;">${escapeHtml(data.tree || 'No parse tree available')}</pre>
    `;

    return html;
}

function renderParseTreeHierarchyStage(data) {
    if (!data || (!data.tree_json && !data.tree)) {
        return '<div class="output-error-banner">Parse tree hierarchy not available.</div>';
    }

    const treeData = data.tree_json || parseTreeStructureFromText(data.tree);

    let html = `
        <div class="stage-header">
            <h2 class="stage-title">Parse Tree Hierarchy</h2>
            <div class="tree-toolbar">
                <button class="action-btn" onclick="exportTreeAsImage('png')">
                    <span>📷</span> Download PNG
                </button>
                <button class="action-btn" onclick="exportTreeAsImage('jpeg')">
                    <span>🖼️</span> Download JPEG
                </button>
            </div>
        </div>
        <p style="margin-bottom: 15px; color: var(--text-secondary);">
            Hierarchical parent-child node tree with accurate geometric connectors and color coding:
        </p>
        <div class="visual-tree-container" id="visual-tree-root">
            ${renderVisualTreeNode(treeData, 0)}
        </div>
    `;

    return html;
}

function renderVisualTreeNode(node, level = 0) {
    if (!node) return '';

    let nodeTypeClass = 'operation';
    let label = node.value || '';
    let typeName = 'OP';

    if (node.type === 'identifier') {
        nodeTypeClass = 'identifier';
        typeName = 'ID';
        label = node.mapped ? `${node.value} (${node.mapped})` : node.value;
    } else if (node.type === 'number') {
        nodeTypeClass = 'number';
        typeName = 'NUM';
        label = parseFloat(node.value).toString();
    } else if (node.type === 'unary') {
        nodeTypeClass = 'unary';
        typeName = 'UNARY';
        label = node.value;
    } else if (node.type === 'operation') {
        nodeTypeClass = 'operation';
        typeName = node.value === '=' ? 'ASSIGN' : 'OP';
        label = node.value;
    }

    const hasChildren = node.children && node.children.length > 0;
    const isSingleChild = node.children && node.children.length === 1;

    let html = `<div class="tree-node-wrapper" data-level="${level}">`;
    html += `
        <div class="tree-node ${nodeTypeClass}" title="Node Type: ${node.type}, Value: ${escapeHtml(label)}">
            <span class="node-type-badge">${typeName}</span>
            <span class="node-val">${escapeHtml(label)}</span>
        </div>
    `;

    if (hasChildren) {
        html += `<div class="tree-children ${isSingleChild ? 'single-child' : ''}">`;
        node.children.forEach(child => {
            html += `<div class="tree-child-wrapper">`;
            html += renderVisualTreeNode(child, level + 1);
            html += `</div>`;
        });
        html += `</div>`;
    }

    html += `</div>`;
    return html;
}

function parseTreeStructureFromText(treeText) {
    if (!treeText) return null;
    const lines = treeText.split('\n').filter(l => l.trim());
    if (lines.length === 0) return null;

    const stack = [];
    let root = null;

    lines.forEach(line => {
        const indent = (line.match(/^(\s*)/)[1].length) / 2;
        const trimmed = line.trim();

        let ntype = 'operation';
        let nval = '';

        if (trimmed.startsWith('OPERATION:')) {
            ntype = 'operation';
            nval = trimmed.replace('OPERATION:', '').trim();
        } else if (trimmed.startsWith('IDENTIFIER:')) {
            ntype = 'identifier';
            nval = trimmed.replace('IDENTIFIER:', '').trim();
        } else if (trimmed.startsWith('NUMBER:')) {
            ntype = 'number';
            nval = trimmed.replace('NUMBER:', '').trim();
        } else if (trimmed.startsWith('UNARY:')) {
            ntype = 'unary';
            nval = trimmed.replace('UNARY:', '').trim();
        }

        const node = { type: ntype, value: nval, level: indent, children: [] };

        while (stack.length > 0 && stack[stack.length - 1].level >= indent) {
            stack.pop();
        }

        if (stack.length > 0) {
            stack[stack.length - 1].children.push(node);
        } else {
            root = node;
        }

        stack.push(node);
    });

    return root;
}

function drawTreeConnectors() {
    const rootContainer = document.getElementById('visual-tree-root');
    if (!rootContainer) return;

    const oldSvg = rootContainer.querySelector('.tree-svg-overlay');
    if (oldSvg) oldSvg.remove();

    const rootRect = rootContainer.getBoundingClientRect();
    const scrollW = rootContainer.scrollWidth;
    const scrollH = rootContainer.scrollHeight;

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'tree-svg-overlay');
    svg.setAttribute('width', scrollW);
    svg.setAttribute('height', scrollH);
    svg.style.position = 'absolute';
    svg.style.top = '0';
    svg.style.left = '0';
    svg.style.pointerEvents = 'none';
    svg.style.zIndex = '1';

    const isDark = document.body.classList.contains('dark-mode');
    const lineColor = isDark ? '#94a3b8' : '#64748b';

    const wrappers = rootContainer.querySelectorAll('.tree-node-wrapper');
    wrappers.forEach(wrapper => {
        const parentNode = wrapper.querySelector(':scope > .tree-node');
        const childrenContainer = wrapper.querySelector(':scope > .tree-children');
        if (!parentNode || !childrenContainer) return;

        const pRect = parentNode.getBoundingClientRect();
        const pX = pRect.left + pRect.width / 2 - rootRect.left + rootContainer.scrollLeft;
        const pY = pRect.bottom - rootRect.top + rootContainer.scrollTop;

        const childWrappers = childrenContainer.querySelectorAll(':scope > .tree-child-wrapper');
        childWrappers.forEach(childWrap => {
            const childNode = childWrap.querySelector(':scope > .tree-node-wrapper > .tree-node') || childWrap.querySelector('.tree-node');
            if (!childNode) return;

            const cRect = childNode.getBoundingClientRect();
            const cX = cRect.left + cRect.width / 2 - rootRect.left + rootContainer.scrollLeft;
            const cY = cRect.top - rootRect.top + rootContainer.scrollTop;

            const midY = pY + (cY - pY) / 2;

            const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            const d = `M ${pX} ${pY} V ${midY} H ${cX} V ${cY}`;
            path.setAttribute('d', d);
            path.setAttribute('stroke', lineColor);
            path.setAttribute('stroke-width', '2.5');
            path.setAttribute('fill', 'none');
            path.setAttribute('stroke-linecap', 'round');
            path.setAttribute('stroke-linejoin', 'round');
            svg.appendChild(path);
        });
    });

    rootContainer.appendChild(svg);
}

window.addEventListener('resize', () => {
    if (currentActiveTab === 'parse_tree_hierarchy') {
        drawTreeConnectors();
    }
});

function exportTreeAsImage(format = 'png') {
    const treeData = currentData?.parse_tree_hierarchy?.tree_json || currentData?.syntax?.tree_json;
    if (!treeData) {
        alert('Parse tree data not available for export.');
        return;
    }

    const canvas = document.getElementById('export-canvas');
    const ctx = canvas.getContext('2d');

    const NODE_RADIUS = 28;
    const LEVEL_HEIGHT = 90;
    const MIN_NODE_GAP = 70;

    function computeSubtreeWidth(node) {
        if (!node.children || node.children.length === 0) {
            node._width = MIN_NODE_GAP;
            return MIN_NODE_GAP;
        }
        let w = 0;
        node.children.forEach(child => {
            w += computeSubtreeWidth(child);
        });
        node._width = Math.max(MIN_NODE_GAP, w);
        return node._width;
    }

    computeSubtreeWidth(treeData);

    const totalWidth = Math.max(800, treeData._width + 120);
    function getTreeDepth(node) {
        if (!node.children || node.children.length === 0) return 1;
        return 1 + Math.max(...node.children.map(getTreeDepth));
    }
    const depth = getTreeDepth(treeData);
    const totalHeight = depth * LEVEL_HEIGHT + 140;

    const scale = 2;
    canvas.width = totalWidth * scale;
    canvas.height = totalHeight * scale;
    ctx.scale(scale, scale);

    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, totalWidth, totalHeight);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 18px Segoe UI, sans-serif';
    ctx.fillText('Arithmetic Expression Compiler - Parse Tree Hierarchy', 30, 40);
    ctx.fillStyle = '#94a3b8';
    ctx.font = '12px Segoe UI, sans-serif';
    ctx.fillText('K. M. Shakhawat Hossain', 30, 60);

    function assignPositions(node, left, right, y) {
        node._x = (left + right) / 2;
        node._y = y;
        let currentLeft = left;
        if (node.children && node.children.length > 0) {
            node.children.forEach(child => {
                const childRight = currentLeft + child._width;
                assignPositions(child, currentLeft, childRight, y + LEVEL_HEIGHT);
                currentLeft = childRight;
            });
        }
    }

    assignPositions(treeData, 40, totalWidth - 40, 110);

    function drawLines(node) {
        if (node.children && node.children.length > 0) {
            node.children.forEach(child => {
                ctx.beginPath();
                ctx.moveTo(node._x, node._y + 15);
                ctx.lineTo(child._x, child._y - 15);
                ctx.strokeStyle = '#64748b';
                ctx.lineWidth = 2;
                ctx.stroke();
                drawLines(child);
            });
        }
    }
    drawLines(treeData);

    function drawNodes(node) {
        ctx.save();
        let bg = '#ff6b6b';
        let textColor = '#ffffff';
        let strokeColor = '#ffffff';

        if (node.type === 'identifier') {
            bg = '#4ecdc4';
            textColor = '#063c46';
        } else if (node.type === 'number') {
            bg = '#ffd32a';
            textColor = '#2c1a00';
        } else if (node.type === 'unary') {
            bg = '#a55eea';
            textColor = '#ffffff';
        }

        ctx.beginPath();
        ctx.arc(node._x, node._y, NODE_RADIUS, 0, Math.PI * 2);
        ctx.fillStyle = bg;
        ctx.fill();
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = 3;
        ctx.stroke();

        ctx.fillStyle = textColor;
        ctx.font = 'bold 13px Consolas, monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const label = String(node.value || '');
        ctx.fillText(label, node._x, node._y);
        ctx.restore();

        if (node.children) {
            node.children.forEach(drawNodes);
        }
    }
    drawNodes(treeData);

    const mimeType = format === 'jpeg' ? 'image/jpeg' : 'image/png';
    const filename = `parse_tree_${Date.now()}.${format}`;
    const dataUrl = canvas.toDataURL(mimeType, 0.95);

    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

function renderSemanticStage(data) {
    if (!data) return '<div class="output-error-banner">Semantic data not available.</div>';

    let html = `
        <div class="stage-header">
            <h2 class="stage-title">Semantic Analysis</h2>
            <span class="stage-summary-badge">${data.symbol_table ? data.symbol_table.length : 0} Identifiers Checked</span>
        </div>
        <p style="margin-bottom: 15px; color: var(--text-secondary);">
            Symbol table inspection, type compatibility, and static semantic verification:
        </p>
    `;

    if (data.symbol_table && data.symbol_table.length > 0) {
        html += `
            <h3 style="margin-top: 15px; margin-bottom: 10px; color: var(--text-primary);">Symbol Table &amp; Declarations</h3>
            <div class="custom-table-container">
                <table class="custom-table">
                    <thead>
                        <tr>
                            <th>Identifier</th>
                            <th>Canonical Mapping</th>
                            <th>Inferred Type</th>
                            <th>Scope</th>
                            <th>Memory Location</th>
                            <th>Declaration Status</th>
                        </tr>
                    </thead>
                    <tbody>
        `;
        data.symbol_table.forEach(sym => {
            html += `
                <tr>
                    <td><strong>${escapeHtml(sym.name)}</strong></td>
                    <td style="color: var(--primary-color);">${escapeHtml(sym.mapped)}</td>
                    <td><span style="background: rgba(99, 102, 241, 0.15); color: var(--primary-color); padding: 2px 8px; border-radius: 4px; font-weight: 700;">${escapeHtml(sym.type)}</span></td>
                    <td>${escapeHtml(sym.scope)}</td>
                    <td><code>${escapeHtml(sym.offset)}</code></td>
                    <td style="color: #10b981; font-weight: 600;">✓ Declared</td>
                </tr>
            `;
        });
        html += `</tbody></table></div>`;
    }

    html += `
        <div class="semantic-grid" style="margin-top: 25px;">
            <div class="semantic-card">
                <h4>Semantic Verification Checks</h4>
    `;
    if (data.checks && data.checks.length > 0) {
        data.checks.forEach(chk => {
            html += `<div class="check-item"><span>✓</span> <div>${escapeHtml(chk)}</div></div>`;
        });
    }
    html += `</div>`;

    html += `
        <div class="semantic-card">
            <h4>Type Promotions &amp; Conversions</h4>
    `;
    if (data.type_conversions && data.type_conversions.length > 0) {
        data.type_conversions.forEach(tc => {
            html += `
                <div class="check-item" style="background: rgba(99, 102, 241, 0.1); border-left-color: var(--primary-color); color: var(--primary-color);">
                    <span>⚙</span> <div>Explicit Coercion: <code>${escapeHtml(tc.op)}</code> (${escapeHtml(tc.from)} → ${escapeHtml(tc.to)})</div>
                </div>
            `;
        });
    } else {
        html += `<p style="color: var(--text-secondary); font-size: 0.9em;">All operands share homogeneous data types. No implicit promotion required.</p>`;
    }
    html += `</div></div>`;

    return html;
}

function renderTACStage(data) {
    if (!data) return '<div class="output-error-banner">TAC intermediate code data not available.</div>';

    let html = `
        <div class="stage-header">
            <h2 class="stage-title">TAC 1–5 Stages</h2>
            <span class="stage-summary-badge">Intermediate Code Generation</span>
        </div>
        <p style="margin-bottom: 15px; color: var(--text-secondary);">
            Dynamic progressive compiler Three-Address Code transformations:
        </p>

        <div class="tac-stage-selector" role="tablist">
            <button class="tac-stage-btn ${currentTacStage === 'stage1_raw' ? 'active' : ''}" data-stage="stage1_raw" onclick="switchTacStage('stage1_raw')">
                Stage 1: Raw TAC
            </button>
            <button class="tac-stage-btn ${currentTacStage === 'stage2_typed' ? 'active' : ''}" data-stage="stage2_typed" onclick="switchTacStage('stage2_typed')">
                Stage 2: Type Coercion TAC
            </button>
            <button class="tac-stage-btn ${currentTacStage === 'stage3_quadruples' ? 'active' : ''}" data-stage="stage3_quadruples" onclick="switchTacStage('stage3_quadruples')">
                Stage 3: Quadruples Table
            </button>
            <button class="tac-stage-btn ${currentTacStage === 'stage4_simplified' ? 'active' : ''}" data-stage="stage4_simplified" onclick="switchTacStage('stage4_simplified')">
                Stage 4: Intermediate TAC
            </button>
            <button class="tac-stage-btn ${currentTacStage === 'stage5_vreg' ? 'active' : ''}" data-stage="stage5_vreg" onclick="switchTacStage('stage5_vreg')">
                Stage 5: Virtual Registers
            </button>
        </div>

        <div id="tac-stage-content">
            ${getTacStageContent(data, currentTacStage)}
        </div>
    `;

    return html;
}

function switchTacStage(stageKey) {
    currentTacStage = stageKey;
    document.querySelectorAll('.tac-stage-btn').forEach(btn => btn.classList.remove('active'));
    const activeBtn = document.querySelector(`.tac-stage-btn[data-stage="${stageKey}"]`);
    if (activeBtn) activeBtn.classList.add('active');
    const container = document.getElementById('tac-stage-content');
    if (container && currentData?.tac) {
        container.innerHTML = getTacStageContent(currentData.tac, stageKey);
    }
}

function getTacStageContent(tacData, stageKey) {
    if (!tacData) return '';

    if (stageKey === 'stage3_quadruples') {
        const quads = tacData.stage3_quadruples || [];
        if (quads.length === 0) return '<p>No quadruples generated.</p>';

        let tableHtml = `
            <div class="custom-table-container">
                <table class="custom-table">
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>Operator (Op)</th>
                            <th>Argument 1 (Arg1)</th>
                            <th>Argument 2 (Arg2)</th>
                            <th>Result</th>
                        </tr>
                    </thead>
                    <tbody>
        `;
        quads.forEach(q => {
            tableHtml += `
                <tr>
                    <td><strong>${q.index}</strong></td>
                    <td style="color: var(--primary-color);"><strong>${escapeHtml(q.op)}</strong></td>
                    <td>${escapeHtml(q.arg1)}</td>
                    <td>${escapeHtml(q.arg2)}</td>
                    <td><strong style="color: #10b981;">${escapeHtml(q.result)}</strong></td>
                </tr>
            `;
        });
        tableHtml += `</tbody></table></div>`;
        return tableHtml;
    }

    const lines = tacData[stageKey] || tacData.instructions || [];
    if (lines.length === 0) return '<p>No TAC instructions generated for this stage.</p>';

    let codeHtml = `<div class="code-display-box">`;
    lines.forEach((line, idx) => {
        codeHtml += `
            <div class="code-line">
                <span class="line-num">${idx + 1}</span>
                <span class="code-content">${escapeHtml(line)}</span>
            </div>
        `;
    });
    codeHtml += `</div>`;
    return codeHtml;
}

function renderOptimizationStage(data) {
    if (!data) return '<div class="output-error-banner">Optimization data not available.</div>';

    const beforeLines = data.before_tac || [];
    const afterLines = data.after_tac || data.instructions || [];
    const passes = data.applied_optimizations || [];

    let html = `
        <div class="stage-header">
            <h2 class="stage-title">Optimization</h2>
            <span class="stage-summary-badge">${passes.length} Optimization Passes Applied</span>
        </div>
        <p style="margin-bottom: 15px; color: var(--text-secondary);">
            Dynamic intermediate code optimizations including constant folding, algebraic simplifications, and register compaction:
        </p>

        <div class="optimization-comparison">
            <div class="opt-column">
                <h4>Before Optimization (Original TAC)</h4>
                <div class="code-display-box">
    `;

    beforeLines.forEach((line, i) => {
        html += `
            <div class="code-line">
                <span class="line-num">${i + 1}</span>
                <span class="code-content" style="color: #f38ba8;">${escapeHtml(line)}</span>
            </div>
        `;
    });

    html += `
                </div>
            </div>
            <div class="opt-column">
                <h4>After Optimization (Optimized TAC)</h4>
                <div class="code-display-box">
    `;

    afterLines.forEach((line, i) => {
        html += `
            <div class="code-line">
                <span class="line-num">${i + 1}</span>
                <span class="code-content" style="color: #a6e3a1;">${escapeHtml(line)}</span>
            </div>
        `;
    });

    html += `
                </div>
            </div>
        </div>

        <div class="opt-passes-list">
            <h4>Applied Compiler Optimization Details</h4>
    `;

    if (passes.length > 0) {
        passes.forEach(p => {
            html += `
                <div class="pass-card">
                    <strong style="color: var(--primary-color);">${escapeHtml(p.type)}</strong>:
                    <span style="color: #f38ba8; margin: 0 6px;">${escapeHtml(p.before)}</span>
                    <span>➔</span>
                    <span style="color: #a6e3a1; margin-left: 6px;">${escapeHtml(p.after)}</span>
                </div>
            `;
        });
    } else {
        html += `<p style="color: var(--text-secondary); font-size: 0.9em;">No redundant expressions detected. Code is already minimal.</p>`;
    }

    html += `</div>`;
    return html;
}

function renderFinalCodeStage(data) {
    if (!data) return '<div class="output-error-banner">Assembly code data not available.</div>';

    const lines = data.assembly_lines || data.instructions || [];
    const fullText = data.assembly_text || lines.join('\n');

    let html = `
        <div class="stage-header">
            <h2 class="stage-title">Assembly Code</h2>
            <span class="stage-summary-badge">Target: TOC Simple Assembly</span>
        </div>
        <p style="margin-bottom: 15px; color: var(--text-secondary);">
            Clean, human-understandable educational assembly code generated dynamically from optimized Three-Address Code:
        </p>

        <div class="code-container-header">
            <span class="asm-arch-badge">Educational Register Assembly (MOV / ADD / SUB / MUL / DIV)</span>
            <button class="copy-btn" id="copy-asm-btn" onclick="copyAssemblyCode()">
                <span id="copy-icon">📋</span>
                <span id="copy-label">Copy Assembly</span>
            </button>
        </div>

        <div class="code-display-box assembly-code-box">
    `;

    lines.forEach((line, i) => {
        const isComment = line.trim().startsWith('#');
        const isLabel = line.trim().endsWith(':');
        const isDirective = line.trim().startsWith('.');

        let color = '#cdd6f4';
        if (isComment) color = '#6c7086';
        else if (isLabel) color = '#f9e2af';
        else if (isDirective) color = '#89b4fa';

        html += `
            <div class="code-line">
                <span class="line-num">${i + 1}</span>
                <span class="code-content" style="color: ${color};">${escapeHtml(line)}</span>
            </div>
        `;
    });

    html += `</div>`;
    return html;
}

function copyAssemblyCode() {
    const text = currentData?.final_code?.assembly_text ||
                 (currentData?.final_code?.assembly_lines || []).join('\n');

    if (!text) {
        alert('No assembly code to copy.');
        return;
    }

    navigator.clipboard.writeText(text).then(() => {
        const btn = document.getElementById('copy-asm-btn');
        const label = document.getElementById('copy-label');
        const icon = document.getElementById('copy-icon');

        if (btn && label && icon) {
            btn.classList.add('copied');
            label.textContent = 'Copied!';
            icon.textContent = '✓';

            setTimeout(() => {
                btn.classList.remove('copied');
                label.textContent = 'Copy Assembly';
                icon.textContent = '📋';
            }, 2200);
        }
    }).catch(err => {
        alert('Failed to copy to clipboard: ' + err);
    });
}

function escapeHtml(text) {
    if (text === null || text === undefined) return '';
    const div = document.createElement('div');
    div.textContent = String(text);
    return div.innerHTML;
}

document.getElementById('expression-input')?.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        analyzeExpression();
    }
});

// Definir a estrutura de arquivos inicial
let files = [
    {
        id: 'index',
        name: 'index',
        extension: 'html',
        content: '<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8">\n  <title>Minha Página</title>\n  <meta name="viewport" content="width=device-width, initial-scale=1">\n  <link rel="stylesheet" href="styles.css">\n  <script src="script.js"><\/script>\n</head>\n<body>\n  <h1>Olá Mundo!</h1>\n  <p>Este é meu editor de código personalizado.</p>\n</body>\n</html>'
    },
    {
        id: 'styles',
        name: 'styles',
        extension: 'css',
        content: '/* Estilos da página */\nbody {\n  font-family: Arial, sans-serif;\n  line-height: 1.6;\n  color: #333;\n  padding: 20px;\n  max-width: 800px;\n  margin: 0 auto;\n  background-color: #f4f4f4;\n}\n\nh1 {\n  color: #0066cc;\n}\n\np {\n  margin-bottom: 20px;\n}'
    },
    {
        id: 'script',
        name: 'script',
        extension: 'js',
        content: '// JavaScript do projeto\nconsole.log("Script carregado!");\n\n// Adicionar um evento quando a página carregar\ndocument.addEventListener("DOMContentLoaded", function() {\n  console.log("Página carregada completamente!");\n});'
    }
];

// Variáveis para gestão de estado
let currentFileId = null;
let editorChanged = false;
let codeMirrorEditor = null;
let projectName = "meu-projeto";

// Elementos DOM
const fileList = document.getElementById('file-list');
const currentFilename = document.getElementById('current-filename');
const resultFrame = document.getElementById('result-frame');
const consoleOutput = document.getElementById('console-output');
const newFileModal = document.getElementById('new-file-modal');
const addFileBtn = document.getElementById('add-file-btn');
const cancelNewFileBtn = document.getElementById('cancel-new-file');
const createNewFileBtn = document.getElementById('create-new-file');
const renameFileModal = document.getElementById('rename-file-modal');
const renameFileInput = document.getElementById('rename-file-name');
const renameFileId = document.getElementById('rename-file-id');
const cancelRenameBtn = document.getElementById('cancel-rename-file');
const confirmRenameBtn = document.getElementById('confirm-rename-file');
const formatCodeBtn = document.getElementById('format-code-btn');
const formatCurrentFileBtn = document.getElementById('format-current-file');
const saveProjectBtn = document.getElementById('save-project-btn');
const exportBtn = document.getElementById('export-btn');
const exportModal = document.getElementById('export-modal');
const cancelExportBtn = document.getElementById('cancel-export');
const confirmExportBtn = document.getElementById('confirm-export');
const toggleFullscreenBtn = document.getElementById('toggle-fullscreen');
const clearConsoleBtn = document.getElementById('clear-console-btn');

// Funções de utilidade para destaque de sintaxe
function getEditorMode(extension) {
    switch (extension) {
        case 'html': return 'htmlmixed';
        case 'css': return 'css';
        case 'js': return 'javascript';
        default: return 'text/plain';
    }
}

// Funções de utilidade para formatação de código
function formatCode(code, fileType) {
    try {
        let formattedCode;

        switch (fileType) {
            case 'html':
                formattedCode = prettier.format(code, {
                    parser: 'html',
                    plugins: prettierPlugins,
                    printWidth: 100,
                    tabWidth: 2,
                    useTabs: false
                });
                break;
            case 'css':
                formattedCode = prettier.format(code, {
                    parser: 'css',
                    plugins: prettierPlugins,
                    printWidth: 100,
                    tabWidth: 2,
                    useTabs: false
                });
                break;
            case 'js':
                formattedCode = prettier.format(code, {
                    parser: 'babel',
                    plugins: prettierPlugins,
                    printWidth: 100,
                    tabWidth: 2,
                    useTabs: false,
                    semi: true,
                    singleQuote: true
                });
                break;
            default:
                formattedCode = code;
        }

        return formattedCode;
    } catch (error) {
        console.error('Erro ao formatar código:', error);
        addConsoleMessage('Erro ao formatar código: ' + error.message, 'error');
        return code;
    }
}

// Renderizar a lista de arquivos
function renderFileList() {
    fileList.innerHTML = '';

    files.forEach(file => {
        const fileItem = document.createElement('div');
        fileItem.className = `file-item file-item-${file.extension}${currentFileId === file.id ? ' active' : ''}`;
        fileItem.setAttribute('data-id', file.id);

        fileItem.innerHTML = `
            <span class="file-name">${file.name}.${file.extension}</span>
            <div class="file-actions">
                <button class="file-action-btn rename-file" data-id="${file.id}">✏️</button>
                <button class="file-action-btn delete-file" data-id="${file.id}">🗑️</button>
            </div>
        `;

        fileItem.addEventListener('click', (e) => {
            if (!e.target.classList.contains('file-action-btn')) {
                openFile(file.id);
            }
        });

        fileList.appendChild(fileItem);
    });

    // Adicionar eventos para os botões de ação
    document.querySelectorAll('.rename-file').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const fileId = e.target.getAttribute('data-id');
            showRenameModal(fileId);
        });
    });

    document.querySelectorAll('.delete-file').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const fileId = e.target.getAttribute('data-id');
            deleteFile(fileId);
        });
    });
}

// Abrir um arquivo no editor
function openFile(fileId) {
    // Salvar alterações do arquivo atual antes de abrir outro
    if (currentFileId && editorChanged) {
        saveCurrentFile();
    }

    const file = files.find(f => f.id === fileId);
    if (file) {
        currentFileId = fileId;

        // Se já existir um editor CodeMirror, removê-lo
        if (codeMirrorEditor) {
            codeMirrorEditor.toTextArea();
        }

        // Criar um novo elemento textarea para o CodeMirror
        const editorContainer = document.getElementById('code-editor');
        editorContainer.innerHTML = '';
        const textarea = document.createElement('textarea');
        editorContainer.appendChild(textarea);

        // Inicializar o CodeMirror com o conteúdo do arquivo
        codeMirrorEditor = CodeMirror.fromTextArea(textarea, {
            value: file.content,
            mode: getEditorMode(file.extension),
            theme: 'monokai',
            lineNumbers: true,
            lineWrapping: true,
            autoCloseBrackets: true,
            autoCloseTags: true,
            matchBrackets: true,
            indentUnit: 2,
            tabSize: 2,
            extraKeys: {
                'Tab': function (cm) {
                    if (cm.somethingSelected()) {
                        cm.indentSelection('add');
                    } else {
                        cm.replaceSelection('  ', 'end');
                    }
                },
                'Ctrl-Space': 'autocomplete'
            }
        });

        // Definir o conteúdo do editor
        codeMirrorEditor.setValue(file.content);

        // Configurar evento de mudança
        codeMirrorEditor.on('change', () => {
            editorChanged = true;
            updateResult();
        });

        // Atualizar o nome do arquivo no header do editor com a cor correspondente
        currentFilename.textContent = `${file.name}.${file.extension}`;
        currentFilename.className = `editor-header-filename ${file.extension}-header`;

        // Atualizar a classe active na lista de arquivos
        renderFileList();

        // Resetar o flag de mudanças
        editorChanged = false;

        // Atualizar o resultado
        updateResult();
    }
}

// Salvar o arquivo atual
function saveCurrentFile() {
    if (currentFileId && codeMirrorEditor) {
        const fileIndex = files.findIndex(f => f.id === currentFileId);
        if (fileIndex !== -1) {
            files[fileIndex].content = codeMirrorEditor.getValue();
            editorChanged = false;

            // Salvar no localStorage
            saveToLocalStorage();
        }
    }
}

// Criar um novo arquivo
function createNewFile() {
    const fileName = document.getElementById('new-file-name').value.trim();
    const fileExt = document.getElementById('new-file-ext').value;

    if (!fileName) {
        alert('Por favor, informe um nome para o arquivo.');
        return;
    }

    // Verificar se já existe um arquivo com o mesmo nome e extensão
    const fileExists = files.some(f => f.name === fileName && f.extension === fileExt);
    if (fileExists) {
        alert(`Já existe um arquivo chamado "${fileName}.${fileExt}"`);
        return;
    }

    // Criar o novo arquivo
    const newFile = {
        id: fileName,
        name: fileName,
        extension: fileExt,
        content: getTemplateContent(fileExt)
    };

    files.push(newFile);
    newFileModal.style.display = 'none';

    // Limpar o formulário
    document.getElementById('new-file-name').value = '';

    // Renderizar a lista de arquivos e abrir o novo arquivo
    renderFileList();
    openFile(newFile.id);

    // Salvar no localStorage
    saveToLocalStorage();
}

// Obter conteúdo de template com base na extensão
function getTemplateContent(extension) {
    switch (extension) {
        case 'html':
            return '<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8">\n  <title>Título</title>\n</head>\n<body>\n  \n</body>\n</html>';
        case 'css':
            return '/* Estilos */\n';
        case 'js':
            return '// JavaScript\n';
        default:
            return '';
    }
}

// Renomear um arquivo
function showRenameModal(fileId) {
    const file = files.find(f => f.id === fileId);
    if (file) {
        renameFileInput.value = file.name;
        renameFileId.value = fileId;
        renameFileModal.style.display = 'flex';
    }
}

function renameFile() {
    const fileId = renameFileId.value;
    const newName = renameFileInput.value.trim();

    if (!newName) {
        alert('Por favor, informe um nome para o arquivo.');
        return;
    }

    const file = files.find(f => f.id === fileId);
    if (file) {
        // Verificar se já existe um arquivo com o mesmo nome e extensão
        const fileExists = files.some(f => f.name === newName && f.extension === file.extension && f.id !== fileId);
        if (fileExists) {
            alert(`Já existe um arquivo chamado "${newName}.${file.extension}"`);
            return;
        }

        // Atualizar todas as referências ao arquivo no código HTML
        if (file.extension !== 'html') {
            updateFileReferences(file.name, newName, file.extension);
        }

        // Renomear o arquivo
        file.name = newName;
        file.id = newName;

        renameFileModal.style.display = 'none';

        // Atualizar a interface
        renderFileList();
        if (currentFileId === fileId) {
            currentFileId = newName;
            currentFilename.textContent = `${newName}.${file.extension}`;
        }

        // Atualizar o resultado
        updateResult();

        // Salvar no localStorage
        saveToLocalStorage();
    }
}

// Função auxiliar para atualizar referências a arquivos no código HTML
function updateFileReferences(oldName, newName, extension) {
    const htmlFiles = files.filter(f => f.extension === 'html');

    htmlFiles.forEach(htmlFile => {
        let updatedContent = htmlFile.content;

        if (extension === 'css') {
            // Atualizar links de CSS
            const cssLinkRegex = new RegExp(`href=["']${oldName}\\.css["']`, 'g');
            updatedContent = updatedContent.replace(cssLinkRegex, `href="${newName}.css"`);
        } else if (extension === 'js') {
            // Atualizar scripts de JS
            const jsScriptRegex = new RegExp(`src=["']${oldName}\\.js["']`, 'g');
            updatedContent = updatedContent.replace(jsScriptRegex, `src="${newName}.js"`);
        }

        htmlFile.content = updatedContent;
    });
}

// Excluir um arquivo
function deleteFile(fileId) {
    // Não permitir excluir se só houver um arquivo
    if (files.length <= 1) {
        alert('Não é possível excluir o último arquivo.');
        return;
    }

    const fileIndex = files.findIndex(f => f.id === fileId);
    if (fileIndex !== -1) {
        // Confirmar exclusão
        const file = files[fileIndex];
        if (!confirm(`Tem certeza que deseja excluir o arquivo "${file.name}.${file.extension}"?`)) {
            return;
        }

        // Se o arquivo atual for excluído, abrir outro arquivo
        if (currentFileId === fileId) {
            // Encontrar o próximo arquivo para abrir
            const nextFileIndex = fileIndex === files.length - 1 ? fileIndex - 1 : fileIndex + 1;
            currentFileId = files[nextFileIndex].id;
        }

        // Remover o arquivo
        files.splice(fileIndex, 1);

        // Atualizar a interface
        renderFileList();
        openFile(currentFileId);

        // Salvar no localStorage
        saveToLocalStorage();
    }
}

// Atualizar o resultado no iframe
function updateResult() {
    // Salvar o arquivo atual primeiro
    if (currentFileId && codeMirrorEditor) {
        const fileIndex = files.findIndex(f => f.id === currentFileId);
        if (fileIndex !== -1) {
            files[fileIndex].content = codeMirrorEditor.getValue();
        }
    }

    // Encontrar o arquivo HTML principal (assumimos que é o index.html)
    const htmlFile = files.find(f => f.name === 'index' && f.extension === 'html') ||
        files.find(f => f.extension === 'html');

    if (!htmlFile) return;

    let html = htmlFile.content;

    // Substituir referências a arquivos CSS por seu conteúdo
    html = html.replace(/<link\s+[^>]*?href=["']([^"']+)\.css["'][^>]*?>/gi, (match, fileName) => {
        const cssFile = files.find(f => f.name === fileName && f.extension === 'css');
        if (cssFile) {
            return `<style>${cssFile.content}</style>`;
        }
        return match;
    });

    // Substituir referências a arquivos JS por seu conteúdo
    html = html.replace(/<script\s+[^>]*?src=["']([^"']+)\.js["'][^>]*?><\/script>/gi, (match, fileName) => {
        const jsFile = files.find(f => f.name === fileName && f.extension === 'js');
        if (jsFile) {
            return `<script>${jsFile.content}<\/script>`;
        }
        return match;
    });

    // Adicionar código para capturar console.log no iframe
    const consoleInterceptor = `
        <script>
        (function() {
            // Salvar os métodos originais
            const originalConsole = {};
            originalConsole.log = console.log;
            originalConsole.error = console.error;
            originalConsole.warn = console.warn;
            originalConsole.info = console.info;
            
            // Interceptar mensagens de console
            function interceptConsole(method, type) {
                console[method] = function() {
                    // Chamar o método original
                    originalConsole[method].apply(console, arguments);
                    
                    // Enviar a mensagem para o pai
                    const message = Array.from(arguments).map(arg => 
                        typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
                    ).join(' ');
                    
                    window.parent.postMessage({
                        type: 'console',
                        messageType: type,
                        content: message
                    }, '*');
                };
            }
            
            // Interceptar todos os métodos
            interceptConsole('log', 'log');
            interceptConsole('error', 'error');
            interceptConsole('warn', 'warn');
            interceptConsole('info', 'info');
            
            // Capturar erros não tratados
            window.addEventListener('error', function(event) {
                window.parent.postMessage({
                    type: 'console',
                    messageType: 'error',
                    content: event.message + ' at line ' + event.lineno + ' in ' + event.filename
                }, '*');
                return false;
            });
        })();
        <\/script>
    `;

    // Injetar o interceptor de console logo após a tag <head>
    html = html.replace(/<head>/i, '<head>' + consoleInterceptor);

    // Atualizar o iframe
    const resultDocument = resultFrame.contentDocument;
    resultDocument.open();
    resultDocument.write(html);
    resultDocument.close();
}

// Gerenciar o console de depuração
function setupConsole() {
    // Limpar console ao iniciar
    clearConsole();

    // Configurar recepção de mensagens do iframe
    window.addEventListener('message', function (event) {
        if (event.data && event.data.type === 'console') {
            addConsoleMessage(event.data.content, event.data.messageType);
        }
    });
}

// Adicionar mensagem ao console
function addConsoleMessage(message, type = 'log') {
    const messageElement = document.createElement('div');
    messageElement.className = `console-message console-${type}`;
    messageElement.textContent = message;
    consoleOutput.appendChild(messageElement);
    consoleOutput.scrollTop = consoleOutput.scrollHeight;
}

// Limpar o console
function clearConsole() {
    consoleOutput.innerHTML = '';
}

// Formatar o código do arquivo atual
function formatCurrentFile() {
    if (!currentFileId || !codeMirrorEditor) return;

    const file = files.find(f => f.id === currentFileId);
    if (file) {
        try {
            const originalCode = codeMirrorEditor.getValue();
            const formattedCode = formatCode(originalCode, file.extension);

            // Atualizar o editor com o código formatado
            codeMirrorEditor.setValue(formattedCode);

            // Atualizar o arquivo
            file.content = formattedCode;

            // Atualizar o resultado
            updateResult();

            // Salvar no localStorage
            saveToLocalStorage();

            addConsoleMessage('Código formatado com sucesso!', 'info');
        } catch (error) {
            addConsoleMessage(`Erro ao formatar: ${error.message}`, 'error');
        }
    }
}

// Exportar o projeto
function exportProject() {
    const exportType = document.getElementById('export-type').value;

    if (exportType === 'html') {
        // Exportar como HTML único combinado
        const htmlFile = files.find(f => f.name === 'index' && f.extension === 'html') ||
            files.find(f => f.extension === 'html');

        if (!htmlFile) {
            alert('Nenhum arquivo HTML encontrado para exportar.');
            return;
        }

        let html = htmlFile.content;

        // Substituir referências a arquivos CSS por seu conteúdo
        html = html.replace(/<link\s+[^>]*?href=["']([^"']+)\.css["'][^>]*?>/gi, (match, fileName) => {
            const cssFile = files.find(f => f.name === fileName && f.extension === 'css');
            if (cssFile) {
                return `<style>\n${cssFile.content}\n</style>`;
            }
            return match;
        });

        // Substituir referências a arquivos JS por seu conteúdo
        html = html.replace(/<script\s+[^>]*?src=["']([^"']+)\.js["'][^>]*?><\/script>/gi, (match, fileName) => {
            const jsFile = files.find(f => f.name === fileName && f.extension === 'js');
            if (jsFile) {
                return `<script>\n${jsFile.content}\n<\/script>`;
            }
            return match;
        });

        // Criar um link de download
        const blob = new Blob([html], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'projeto_completo.html';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    } else if (exportType === 'zip') {
        // Para ZIP, vamos fazer uma exportação de texto formatado
        let output = `# Projeto: ${projectName}\n\n`;

        files.forEach(file => {
            output += `## ${file.name}.${file.extension}\n\`\`\`${file.extension}\n${file.content}\n\`\`\`\n\n`;
        });

        const blob = new Blob([output], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${projectName}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    // Fechar o modal
    exportModal.style.display = 'none';

    // Adicionar mensagem de sucesso
    addConsoleMessage('Projeto exportado com sucesso!', 'info');
}

// Salvar o projeto no localStorage
function saveToLocalStorage() {
    try {
        localStorage.setItem(`codepen-clone-${projectName}`, JSON.stringify(files));
        addConsoleMessage('Projeto salvo com sucesso!', 'info');
    } catch (error) {
        console.error('Erro ao salvar no localStorage:', error);
        addConsoleMessage('Erro ao salvar o projeto: ' + error.message, 'error');
    }
}

// Carregar o projeto do localStorage
function loadFromLocalStorage() {
    try {
        const savedFiles = localStorage.getItem(`codepen-clone-${projectName}`);
        if (savedFiles) {
            files = JSON.parse(savedFiles);
            renderFileList();
            if (files.length > 0) {
                openFile(files[0].id);
            }
            addConsoleMessage('Projeto carregado do armazenamento local.', 'info');
        }
    } catch (error) {
        console.error('Erro ao carregar do localStorage:', error);
        addConsoleMessage('Erro ao carregar o projeto: ' + error.message, 'error');
    }
}

// Alternar o modo de tela cheia para o resultado
function toggleResultFullscreen() {
    const editorContainer = document.getElementById('editor-container');
    const resultContainer = document.querySelector('.result-container');
    const toggleBtn = document.getElementById('toggle-fullscreen');

    if (resultContainer.style.height === '100%') {
        // Voltar ao modo normal
        editorContainer.style.display = 'flex';
        resultContainer.style.height = '40%';
        toggleBtn.textContent = '⛶';
    } else {
        // Ativar o modo de tela cheia
        editorContainer.style.display = 'none';
        resultContainer.style.height = '100%';
        toggleBtn.textContent = '⮌';
    }
}

// Configurar abas de resultado
function setupResultTabs() {
    const tabs = document.querySelectorAll('.result-tab');
    const panes = document.querySelectorAll('.result-pane');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const tabId = tab.getAttribute('data-tab');

            // Remover classe active de todas as abas e painéis
            tabs.forEach(t => t.classList.remove('active'));
            panes.forEach(p => p.classList.remove('active'));

            // Adicionar classe active à aba clicada e painel correspondente
            tab.classList.add('active');
            document.getElementById(`${tabId}-pane`).classList.add('active');
        });
    });
}

// Configuração do redimensionamento dos painéis
function initializeResizing() {
    const fileExplorer = document.querySelector('.file-explorer');
    const mainContent = document.querySelector('.main-content');
    const fileExplorerResizeHandle = document.getElementById('file-explorer-resize');

    const resultContainer = document.querySelector('.result-container');
    const editorContainer = document.getElementById('editor-container');
    const resultResizeHandle = document.getElementById('result-resize');

    // Manipulador de redimensionamento do explorador de arquivos
    fileExplorerResizeHandle.addEventListener('mousedown', (e) => {
        e.preventDefault();

        const startX = e.clientX;
        const startWidth = parseInt(window.getComputedStyle(fileExplorer).width, 10);

        function handleMouseMove(e) {
            const newWidth = startWidth + e.clientX - startX;
            if (newWidth >= 100 && newWidth <= 1600) {
                fileExplorer.style.width = `${newWidth}px`;
            }
        }

        function handleMouseUp() {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        }

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    });

    // Manipulador de redimensionamento do resultado
    resultResizeHandle.addEventListener('mousedown', (e) => {
        e.preventDefault();

        const startY = e.clientY;
        const mainContentHeight = parseInt(window.getComputedStyle(mainContent).height, 10);
        const startResultHeight = parseInt(window.getComputedStyle(resultContainer).height, 10);

        function handleMouseMove(e) {
            const diff = startY - e.clientY;
            const newResultHeight = startResultHeight + diff;

            const minResultHeight = 50;
            const maxResultHeight = mainContentHeight * 0.9; // Allow up to 90% of the height

            if (newResultHeight >= minResultHeight && newResultHeight <= maxResultHeight) {
                const resultHeightPercent = (newResultHeight / mainContentHeight) * 100;
                resultContainer.style.height = `${resultHeightPercent}%`;
            }
        }

        function handleMouseUp() {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        }

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    });

    // Adicionar evento de duplo clique para maximizar/minimizar
    resultResizeHandle.addEventListener('dblclick', () => {
        const mainContentHeight = parseInt(window.getComputedStyle(mainContent).height, 10);
        const currentResultHeight = parseInt(window.getComputedStyle(resultContainer).height, 10);
        const threshold = mainContentHeight * 0.1;

        if (currentResultHeight < threshold) {
            resultContainer.style.height = '100%';
        } else {
            resultContainer.style.height = '10%';
        }
    });
}

// Configurar eventos
function setupEventListeners() {
    // Eventos para o editor
    formatCodeBtn.addEventListener('click', formatCurrentFile);
    formatCurrentFileBtn.addEventListener('click', formatCurrentFile);
    clearConsoleBtn.addEventListener('click', clearConsole);

    // Eventos para gerenciamento de arquivos
    addFileBtn.addEventListener('click', () => {
        newFileModal.style.display = 'flex';
    });

    cancelNewFileBtn.addEventListener('click', () => {
        newFileModal.style.display = 'none';
    });

    createNewFileBtn.addEventListener('click', createNewFile);

    cancelRenameBtn.addEventListener('click', () => {
        renameFileModal.style.display = 'none';
    });

    confirmRenameBtn.addEventListener('click', renameFile);

    // Evento para exportar projeto
    exportBtn.addEventListener('click', () => {
        exportModal.style.display = 'flex';
    });

    cancelExportBtn.addEventListener('click', () => {
        exportModal.style.display = 'none';
    });

    confirmExportBtn.addEventListener('click', exportProject);

    // Evento para salvar projeto
    saveProjectBtn.addEventListener('click', saveToLocalStorage);

    // Evento para alternar tela cheia
    toggleFullscreenBtn.addEventListener('click', toggleResultFullscreen);

    // Interceptar teclas para atalhos
    document.addEventListener('keydown', function (e) {
        // Ctrl+S para salvar
        if (e.ctrlKey && e.key === 's') {
            e.preventDefault();
            saveToLocalStorage();
        }

        // Shift+Alt+F ou Ctrl+Alt+L para formatar
        if ((e.shiftKey && e.altKey && e.key === 'F') ||
            (e.ctrlKey && e.altKey && e.key === 'l') ||
            (e.ctrlKey && e.altKey && e.key === 'L')) {
            e.preventDefault();
            formatCurrentFile();
        }

        // Ctrl+Alt+C para limpar console
        if (e.ctrlKey && e.altKey && e.key === 'c') {
            e.preventDefault();
            clearConsole();
        }
    });
}

// Inicializar a aplicação
function init() {
    // Configurar console de depuração
    setupConsole();

    // Configurar tabs de resultado
    setupResultTabs();

    // Configurar eventos
    setupEventListeners();

    // Inicializar redimensionamento dos painéis
    initializeResizing();

    // Tentar carregar do localStorage
    loadFromLocalStorage();

    // Se não houver arquivos salvos, renderizar os arquivos iniciais
    if (files.length === 0) {
        renderFileList();
        if (files.length > 0) {
            openFile(files[0].id);
        }
    }

    // Adicionar mensagem de boas-vindas
    addConsoleMessage('Editor de código iniciado! 🚀', 'info');
    addConsoleMessage('Use Ctrl+S para salvar, Shift+Alt+F para formatar código', 'info');
}

// Inicializar quando a página carregar
document.addEventListener('DOMContentLoaded', init);



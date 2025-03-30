document.addEventListener('DOMContentLoaded', () => {
    const socket = io();
    const chatMessages = document.getElementById('chatMessages');
    const messageInput = document.getElementById('messageInput');
    const sendButton = document.getElementById('sendButton');
    const toolsList = document.getElementById('toolsList');
    const clearChatButton = document.getElementById('clearChat');

    // Set up markdown renderer
    const markedOptions = {
        breaks: true,
        gfm: true,
        headerIds: false,
        highlight: function(code, language) {
            if (language && hljs.getLanguage(language)) {
                try {
                    return hljs.highlight(code, { language }).value;
                } catch (err) {}
            }
            return code;
        }
    };

    marked.setOptions(markedOptions);

    // Load available tools
    socket.emit('list tools');
    socket.on('tools list', (data) => {
        if (data.tools && data.tools.length > 0) {
            toolsList.innerHTML = '';
            data.tools.forEach(tool => {
                const toolItem = document.createElement('div');
                toolItem.className = 'tool-item';
                
                // Create tool header with name and toggle button
                const toolHeader = document.createElement('div');
                toolHeader.className = 'tool-header';
                
                // Create name span
                const nameSpan = document.createElement('span');
                nameSpan.textContent = tool.name;
                nameSpan.title = "Click to use this tool";
                
                // Create toggle button
                const toggleSpan = document.createElement('span');
                toggleSpan.className = 'tool-toggle';
                toggleSpan.textContent = '▼';
                toggleSpan.title = "Click to view description";
                
                // Add elements to header
                toolHeader.appendChild(nameSpan);
                toolHeader.appendChild(toggleSpan);
                
                // Create description container
                const descriptionContainer = document.createElement('div');
                descriptionContainer.className = 'tool-description';
                descriptionContainer.textContent = tool.description || 'No description available';
                
                // Add elements to tool item
                toolItem.appendChild(toolHeader);
                toolItem.appendChild(descriptionContainer);
                
                // Add click handler for the dropdown toggle
                const toggleButton = toolHeader.querySelector('.tool-toggle');
                toggleButton.addEventListener('click', (e) => {
                    // Toggle description visibility
                    descriptionContainer.classList.toggle('active');
                    toggleButton.classList.toggle('active');
                    // Stop event propagation to prevent triggering other click handlers
                    e.stopPropagation();
                });
                
                // Add click handler to use tool (only on the name, not the toggle)
                const toolName = toolHeader.querySelector('span:first-child');
                toolName.addEventListener('click', () => {
                    messageInput.value += `Using ${tool.name}: `;
                    messageInput.focus();
                });
                
                toolsList.appendChild(toolItem);
            });
        } else {
            toolsList.innerHTML = '<p>No tools available</p>';
        }
    });

    // Handle sending messages
    sendButton.addEventListener('click', sendMessage);
    messageInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });

    function sendMessage() {
        const message = messageInput.value.trim();
        if (!message) return;

        // Add message to UI
        appendMessage('user', message);
        messageInput.value = '';

        // Add a loading indicator
        const loadingEl = document.createElement('div');
        loadingEl.className = 'message assistant-message';
        loadingEl.innerHTML = '<div class="loading"></div>';
        loadingEl.id = 'loading-indicator';
        chatMessages.appendChild(loadingEl);
        chatMessages.scrollTop = chatMessages.scrollHeight;

        // Send to server
        socket.emit('chat message', message);
    }

    // Handle receiving responses
    socket.on('chat response', (response) => {
        // Remove loading indicator
        const loadingIndicator = document.getElementById('loading-indicator');
        if (loadingIndicator) {
            loadingIndicator.remove();
        }

        appendMessage('assistant', response);
    });

    // Handle errors
    socket.on('error', (error) => {
        // Remove loading indicator
        const loadingIndicator = document.getElementById('loading-indicator');
        if (loadingIndicator) {
            loadingIndicator.remove();
        }

        appendMessage('assistant', `Error: ${error.error}`, true);
    });

    // Helper function to append messages
    function appendMessage(sender, content, isError = false) {
        const messageEl = document.createElement('div');
        messageEl.className = `message ${sender}-message`;
        
        // Process content if it's from the assistant
        let processedContent = content;
        if (sender === 'assistant' && !isError) {
            processedContent = marked.parse(content);
        } else {
            processedContent = `<div class="message-content">${escapeHtml(content)}</div>`;
        }
        
        messageEl.innerHTML = processedContent;
        
        // Apply syntax highlighting to code blocks
        if (sender === 'assistant') {
            setTimeout(() => {
                messageEl.querySelectorAll('pre code').forEach((block) => {
                    hljs.highlightElement(block);
                });
            }, 0);
        }
        
        chatMessages.appendChild(messageEl);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    // Clear chat
    clearChatButton.addEventListener('click', () => {
        chatMessages.innerHTML = '';
    });

    // Helper function to escape HTML
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Set focus on input
    messageInput.focus();
});

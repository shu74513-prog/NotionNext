/**
 * NotionNext 英语学习增强版脚本
 * 支持三种效果：填空、悬停翻译、完整词汇卡片
 * 
 * 使用方法：
 * 1. 填空：[_:答案:颜色] 或 [blank:答案:颜色]
 * 2. 悬停翻译：[中文>>英文:颜色]
 * 3. 词汇卡片（简单）：[word:翻译]
 * 4. 词汇卡片（完整）：[word:翻译:音标:英英释义:例句EN:例句CN:同义词:颜色]
 */

(function() {
    'use strict';
    
    // ===== 配置 =====
    const CONFIG = {
        colors: {
            yellow: '#f57c00',
            green: '#4caf50',
            blue: '#2196f3',
            purple: '#9c27b0',
            pink: '#e91e63',
            orange: '#ff5722',
            red: '#f44336',
            gray: '#757575',
            cyan: '#00bcd4'
        },
        cardWidth: 580,
        cardMaxHeight: '85vh',
        spacing: 10,
        ttsLang: 'en-US', // TTS语言
        ttsRate: 0.9 // TTS速度
    };
    
    // ===== 存储 =====
    const vocabularyData = {};
    let currentCard = null;
    let currentVocab = null;
    
    // ===== 初始化样式 =====
    function initStyles() {
        const style = document.createElement('style');
        style.textContent = `
            /* ========== 填空框样式 ========== */
            .blank-box {
                display: inline-block;
                padding: 0px 6px;
                border: 1px solid #d0d0d0;
                border-radius: 5px;
                background: white;
                cursor: pointer;
                transition: all 0.2s;
                vertical-align: baseline;
            }
            
            .blank-box:hover {
                border-color: #2196f3;
                background: #f8f9fa;
            }
            
            .blank-content {
                display: inline;
                font-weight: normal;
                color: transparent;
                user-select: none;
            }
            
            .blank-box.show .blank-content {
                color: var(--answer-color, #2196f3);
            }
            
            /* ========== 悬停翻译样式 ========== */
            .hover-word {
                position: relative;
                display: inline;
                cursor: pointer;
                font-weight: 500;
                text-decoration: underline;
                text-decoration-thickness: 2px;
                text-underline-offset: 3px;
                transition: all 0.2s;
            }
            
            .hover-word::before {
                content: attr(data-translation);
                position: absolute;
                bottom: 100%;
                left: 50%;
                transform: translateX(-50%) translateY(-8px);
                background: #2c3e50;
                color: white;
                padding: 6px 12px;
                border-radius: 5px;
                font-size: 14px;
                font-weight: normal;
                white-space: nowrap;
                opacity: 0;
                pointer-events: none;
                transition: all 0.3s ease;
                font-style: italic;
                box-shadow: 0 2px 8px rgba(0,0,0,0.2);
                z-index: 1000;
            }
            
            .hover-word::after {
                content: "";
                position: absolute;
                bottom: 100%;
                left: 50%;
                transform: translateX(-50%) translateY(-2px);
                border: 5px solid transparent;
                border-top-color: #2c3e50;
                opacity: 0;
                transition: all 0.3s ease;
                z-index: 1000;
            }
            
            .hover-word:hover::before,
            .hover-word:hover::after {
                opacity: 1;
                transform: translateX(-50%) translateY(0);
            }
            
            /* ========== 词汇单词样式 ========== */
            .vocab-word {
                position: relative;
                display: inline;
                cursor: pointer;
                font-weight: 500;
                padding: 2px 6px;
                border-radius: 4px;
                transition: all 0.2s;
            }
            
            .vocab-word:hover {
                opacity: 0.8;
                transform: translateY(-1px);
            }
            
            /* ========== 词汇卡片样式 ========== */
            .vocab-card {
                display: none;
                position: fixed !important;
                background: white;
                border-radius: 10px;
                box-shadow: 0 6px 24px rgba(0, 0, 0, 0.18);
                z-index: 999999 !important;
                width: ${CONFIG.cardWidth}px;
                max-height: ${CONFIG.cardMaxHeight};
                overflow-y: auto;
                animation: slideDown 0.3s ease;
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            }
            
            .vocab-card.show {
                display: block;
            }
            
            @keyframes slideDown {
                from {
                    opacity: 0;
                    transform: translateY(-10px);
                }
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }
            
            .vocab-card-content {
                padding: 30px;
            }
            
            /* 标题行 */
            .vocab-card-header {
                display: flex;
                align-items: baseline;
                gap: 12px;
                margin-bottom: 8px;
            }
            
            .vocab-card-title {
                font-size: 32px;
                font-weight: 600;
                color: #2c3e50;
                font-family: Georgia, serif;
            }
            
            .vocab-card-phonetic {
                font-size: 18px;
                color: #7f8c8d;
                font-family: "Lucida Sans Unicode", sans-serif;
            }
            
            .vocab-card-buttons {
                display: flex;
                gap: 8px;
                margin-left: auto;
            }
            
            .vocab-card-btn {
                width: 32px;
                height: 32px;
                border: none;
                background: none;
                cursor: pointer;
                font-size: 20px;
                transition: transform 0.2s;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            
            .vocab-card-btn:hover {
                background: #f0f0f0;
                transform: scale(1.1);
            }
            
            .vocab-card-btn.favorite.active {
                color: #e74c3c;
            }
            
            /* 翻译 */
            .vocab-card-translation {
                font-size: 18px;
                color: #34495e;
                margin-bottom: 20px;
                padding: 12px;
                background: #f8f9fa;
                border-radius: 6px;
                border-left: 3px solid var(--vocab-color, #3498db);
            }
            
            /* 区域 */
            .vocab-card-section {
                margin-bottom: 20px;
            }
            
            .vocab-card-section-title {
                font-size: 13px;
                font-weight: 600;
                color: #7f8c8d;
                margin-bottom: 8px;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }
            
            .vocab-card-section-content {
                font-size: 16px;
                line-height: 1.6;
                color: #2c3e50;
            }
            
            /* 例句 */
            .vocab-card-example {
                background: #f8f9fa;
                padding: 15px;
                border-radius: 6px;
                margin-top: 8px;
            }
            
            .vocab-card-example-en {
                font-size: 15px;
                font-style: italic;
                color: #2c3e50;
                margin-bottom: 8px;
                font-family: Georgia, serif;
            }
            
            .vocab-card-example-cn {
                font-size: 14px;
                color: #7f8c8d;
            }
            
            /* 同义词标签 */
            .vocab-card-synonyms {
                display: flex;
                flex-wrap: wrap;
                gap: 8px;
                margin-top: 8px;
            }
            
            .vocab-synonym-tag {
                background: white;
                border: 1.5px solid #e0e0e0;
                color: #555;
                padding: 6px 14px;
                border-radius: 16px;
                font-size: 14px;
                font-family: Georgia, serif;
                transition: all 0.2s;
            }
            
            .vocab-synonym-tag:hover {
                border-color: var(--vocab-color, #3498db);
                color: var(--vocab-color, #3498db);
            }
            
            /* 关闭按钮 */
            .vocab-card-close {
                position: absolute;
                top: 15px;
                right: 15px;
                width: 32px;
                height: 32px;
                border-radius: 50%;
                background: #f0f0f0;
                border: none;
                cursor: pointer;
                font-size: 20px;
                line-height: 32px;
                text-align: center;
                transition: all 0.2s;
                color: #666;
            }
            
            .vocab-card-close:hover {
                background: #e0e0e0;
                transform: rotate(90deg);
                color: #333;
            }
            
            /* 滚动条 */
            .vocab-card::-webkit-scrollbar {
                width: 8px;
            }
            
            .vocab-card::-webkit-scrollbar-track {
                background: #f1f1f1;
                border-radius: 4px;
            }
            
            .vocab-card::-webkit-scrollbar-thumb {
                background: #c0c0c0;
                border-radius: 4px;
            }
            
            .vocab-card::-webkit-scrollbar-thumb:hover {
                background: #a0a0a0;
            }
            
            /* 响应式 */
            @media (max-width: 768px) {
                .vocab-card {
                    width: calc(100vw - 20px);
                    left: 10px !important;
                    right: 10px;
                }
                
                .vocab-card-content {
                    padding: 20px;
                }
                
                .vocab-card-title {
                    font-size: 24px;
                }
            }
        `;
        document.head.appendChild(style);
    }
    
    // ===== TTS发音功能 =====
    function playTTS(text) {
        if (!('speechSynthesis' in window)) {
            console.warn('浏览器不支持TTS');
            return;
        }
        
        try {
            window.speechSynthesis.cancel();
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = CONFIG.ttsLang;
            utterance.rate = CONFIG.ttsRate;
            
            utterance.onerror = function(event) {
                console.error('TTS错误:', event.error);
            };
            
            window.speechSynthesis.speak(utterance);
        } catch (error) {
            console.error('TTS异常:', error);
        }
    }
    
    // ===== 收藏功能 =====
    function toggleFavorite(word, data) {
        let favorites = JSON.parse(localStorage.getItem('vocab_favorites') || '{}');
        
        if (favorites[word]) {
            delete favorites[word];
            console.log('取消收藏:', word);
            return false;
        } else {
            favorites[word] = {
                ...data,
                favoriteTime: new Date().toISOString()
            };
            console.log('已收藏:', word);
            localStorage.setItem('vocab_favorites', JSON.stringify(favorites));
            return true;
        }
    }
    
    function isFavorite(word) {
        const favorites = JSON.parse(localStorage.getItem('vocab_favorites') || '{}');
        return !!favorites[word];
    }
    
    // ===== 解析标记 =====
    function parseMarks(text) {
        const results = [];
        let lastIndex = 0;
        const regex = /\[([^\]]+)\]/g;
        let match;
        
        while ((match = regex.exec(text)) !== null) {
            if (match.index > lastIndex) {
                results.push({
                    type: 'text',
                    content: text.substring(lastIndex, match.index)
                });
            }
            
            const content = match[1];
            const parts = content.split(':');
            
            if (parts[0] === '_' || parts[0] === 'blank') {
                // 填空
                results.push({
                    type: 'blank',
                    answer: parts[1] || '',
                    color: parts[2] || 'blue'
                });
            } else if (content.includes('>>')) {
                // 悬停翻译
                const [main, colorPart] = content.split('>>');
                const [translation, color] = (colorPart || '').split(':');
                results.push({
                    type: 'hover',
                    text: main,
                    translation: translation || '',
                    color: color || 'blue'
                });
            } else if (parts.length >= 2) {
                // 词汇卡片
                results.push({
                    type: 'vocab',
                    word: parts[0] || '',
                    translation: parts[1] || '',
                    phonetic: parts[2] || '',
                    definition: parts[3] || '',
                    exampleEN: parts[4] || '',
                    exampleCN: parts[5] || '',
                    synonyms: parts[6] || '',
                    color: parts[7] || ''
                });
            } else {
                results.push({
                    type: 'text',
                    content: match[0]
                });
            }
            
            lastIndex = regex.lastIndex;
        }
        
        if (lastIndex < text.length) {
            results.push({
                type: 'text',
                content: text.substring(lastIndex)
            });
        }
        
        return results;
    }
    
    // ===== 创建填空框 =====
    function createBlankBox(data) {
        const span = document.createElement('span');
        span.className = 'blank-box';
        
        const color = CONFIG.colors[data.color] || CONFIG.colors.blue;
        span.style.setProperty('--answer-color', color);
        
        const content = document.createElement('span');
        content.className = 'blank-content';
        content.textContent = data.answer;
        
        span.appendChild(content);
        
        span.addEventListener('click', function(e) {
            e.stopPropagation();
            this.classList.toggle('show');
        });
        
        return span;
    }
    
    // ===== 创建悬停词汇 =====
    function createHoverWord(data) {
        const span = document.createElement('span');
        span.className = 'hover-word';
        span.textContent = data.text;
        span.setAttribute('data-translation', data.translation);
        
        const color = CONFIG.colors[data.color] || CONFIG.colors.blue;
        span.style.color = color;
        span.style.textDecorationColor = color;
        
        return span;
    }
    
    // ===== 创建词汇词 =====
    function createVocabWord(data, vocabId) {
        const span = document.createElement('span');
        span.className = 'vocab-word';
        span.textContent = data.word;
        span.setAttribute('data-vocab-id', vocabId);
        
        // 颜色
        let color;
        if (data.color && CONFIG.colors[data.color]) {
            color = CONFIG.colors[data.color];
        } else {
            const colorKeys = Object.keys(CONFIG.colors);
            color = CONFIG.colors[colorKeys[Math.floor(Math.random() * colorKeys.length)]];
        }
        
        span.style.color = color;
        span.style.backgroundColor = color + '20';
        span.setAttribute('data-color', color);
        
        span.addEventListener('click', function(e) {
            e.stopPropagation();
            showCard(this, vocabId);
        });
        
        return span;
    }
    
    // ===== 生成卡片HTML =====
    function generateCardHTML(data, vocabId) {
        const color = vocabularyData[vocabId].color || '#3498db';
        const isFav = isFavorite(data.word);
        
        let html = `
            <button class="vocab-card-close" onclick="this.closest('.vocab-card').remove()">×</button>
            <div class="vocab-card-content">
                <div class="vocab-card-header">
                    <h1 class="vocab-card-title">${data.word}</h1>
                    ${data.phonetic ? `<span class="vocab-card-phonetic">${data.phonetic}</span>` : ''}
                    <div class="vocab-card-buttons">
                        <button class="vocab-card-btn sound" data-word="${data.word}" title="发音">🔊</button>
                        <button class="vocab-card-btn favorite ${isFav ? 'active' : ''}" 
                                data-vocab-id="${vocabId}" 
                                title="${isFav ? '取消收藏' : '收藏'}">${isFav ? '❤' : '♡'}</button>
                    </div>
                </div>
                
                <div class="vocab-card-translation" style="border-left-color: ${color}">
                    ${data.translation}
                </div>
        `;
        
        // 英英释义
        if (data.definition) {
            html += `
                <div class="vocab-card-section">
                    <div class="vocab-card-section-title">Definition</div>
                    <div class="vocab-card-section-content">${data.definition}</div>
                </div>
            `;
        }
        
        // 例句
        if (data.exampleEN || data.exampleCN) {
            html += `
                <div class="vocab-card-section">
                    <div class="vocab-card-section-title">Example</div>
                    <div class="vocab-card-example">
            `;
            
            if (data.exampleEN) {
                html += `<div class="vocab-card-example-en">${data.exampleEN}</div>`;
            }
            
            if (data.exampleCN) {
                html += `<div class="vocab-card-example-cn">${data.exampleCN}</div>`;
            }
            
            html += `
                    </div>
                </div>
            `;
        }
        
        // 同义词
        if (data.synonyms) {
            const synonymList = data.synonyms.split(',').map(s => s.trim()).filter(Boolean);
            if (synonymList.length > 0) {
                html += `
                    <div class="vocab-card-section">
                        <div class="vocab-card-section-title">Synonyms</div>
                        <div class="vocab-card-synonyms">
                `;
                
                synonymList.forEach(synonym => {
                    html += `<span class="vocab-synonym-tag" style="--vocab-color: ${color}">${synonym}</span>`;
                });
                
                html += `
                        </div>
                    </div>
                `;
            }
        }
        
        html += `</div>`;
        
        return html;
    }
    
    // ===== 计算卡片位置 =====
    function positionCard(card, vocabElement) {
        const rect = vocabElement.getBoundingClientRect();
        const cardHeight = Math.min(500, window.innerHeight * 0.85);
        const spacing = CONFIG.spacing;
        
        const spaceBelow = window.innerHeight - rect.bottom;
        const spaceAbove = rect.top;
        
        if (spaceBelow >= cardHeight || spaceBelow > spaceAbove) {
            card.style.top = (rect.bottom + spacing) + 'px';
            card.style.bottom = 'auto';
        } else {
            card.style.top = 'auto';
            card.style.bottom = (window.innerHeight - rect.top + spacing) + 'px';
        }
        
        let left = rect.left + (rect.width / 2) - (CONFIG.cardWidth / 2);
        const minLeft = 10;
        const maxLeft = window.innerWidth - CONFIG.cardWidth - 10;
        left = Math.max(minLeft, Math.min(left, maxLeft));
        
        card.style.left = left + 'px';
    }
    
    // ===== 显示卡片 =====
    function showCard(vocabElement, vocabId) {
        const data = vocabularyData[vocabId];
        if (!data) return;
        
        if (currentVocab === vocabElement && currentCard) {
            hideCard();
            return;
        }
        
        hideCard();
        
        const card = document.createElement('div');
        card.className = 'vocab-card';
        card.innerHTML = generateCardHTML(data, vocabId);
        
        // 保存颜色
        const color = vocabElement.getAttribute('data-color');
        if (color) {
            card.style.setProperty('--vocab-color', color);
        }
        
        document.body.appendChild(card);
        positionCard(card, vocabElement);
        
        // 绑定事件
        const soundBtn = card.querySelector('.sound');
        if (soundBtn) {
            soundBtn.addEventListener('click', function(e) {
                e.stopPropagation();
                playTTS(data.word);
            });
        }
        
        const favoriteBtn = card.querySelector('.favorite');
        if (favoriteBtn) {
            favoriteBtn.addEventListener('click', function(e) {
                e.stopPropagation();
                const isNowFav = toggleFavorite(data.word, data);
                this.classList.toggle('active', isNowFav);
                this.textContent = isNowFav ? '❤' : '♡';
                this.title = isNowFav ? '取消收藏' : '收藏';
            });
        }
        
        setTimeout(() => {
            card.classList.add('show');
        }, 10);
        
        currentCard = card;
        currentVocab = vocabElement;
    }
    
    // ===== 隐藏卡片 =====
    function hideCard() {
        if (currentCard) {
            currentCard.remove();
            currentCard = null;
            currentVocab = null;
        }
    }
    
    // ===== 扫描并处理页面 =====
    function scanAndProcess() {
        const walker = document.createTreeWalker(
            document.body,
            NodeFilter.SHOW_TEXT,
            {
                acceptNode: function(node) {
                    if (node.parentElement.tagName === 'SCRIPT' || 
                        node.parentElement.tagName === 'STYLE') {
                        return NodeFilter.FILTER_REJECT;
                    }
                    if (node.textContent.includes('[') && node.textContent.includes(']')) {
                        return NodeFilter.FILTER_ACCEPT;
                    }
                    return NodeFilter.FILTER_REJECT;
                }
            }
        );
        
        const nodesToProcess = [];
        let node;
        while (node = walker.nextNode()) {
            nodesToProcess.push(node);
        }
        
        nodesToProcess.forEach(textNode => {
            const text = textNode.textContent;
            const parsed = parseMarks(text);
            
            if (parsed.length > 1 || parsed[0].type !== 'text') {
                const fragments = [];
                
                parsed.forEach(item => {
                    if (item.type === 'text') {
                        fragments.push(document.createTextNode(item.content));
                    } else if (item.type === 'blank') {
                        fragments.push(createBlankBox(item));
                    } else if (item.type === 'hover') {
                        fragments.push(createHoverWord(item));
                    } else if (item.type === 'vocab') {
                        const vocabId = 'vocab_' + Math.random().toString(36).substr(2, 9);
                        // 保存颜色信息
                        const colorKeys = Object.keys(CONFIG.colors);
                        const color = item.color && CONFIG.colors[item.color] 
                            ? CONFIG.colors[item.color]
                            : CONFIG.colors[colorKeys[Math.floor(Math.random() * colorKeys.length)]];
                        item.color = color;
                        vocabularyData[vocabId] = item;
                        fragments.push(createVocabWord(item, vocabId));
                    }
                });
                
                const parent = textNode.parentNode;
                fragments.forEach(fragment => {
                    parent.insertBefore(fragment, textNode);
                });
                parent.removeChild(textNode);
            }
        });
    }
    
    // ===== 事件监听 =====
    document.addEventListener('click', function(e) {
        if (!e.target.closest('.vocab-word') && !e.target.closest('.vocab-card')) {
            hideCard();
        }
    });
    
    window.addEventListener('scroll', function() {
        if (currentCard) {
            hideCard();
        }
    });
    
    window.addEventListener('resize', function() {
        if (currentCard && currentVocab) {
            positionCard(currentCard, currentVocab);
        }
    });
    
    // ===== 初始化 =====
    function init() {
        console.log('🎯 英语学习系统初始化...');
        initStyles();
        
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', scanAndProcess);
        } else {
            scanAndProcess();
        }
        
        console.log('✅ 系统启动完成');
        console.log('📝 支持格式:');
        console.log('  - 填空: [_:答案:颜色]');
        console.log('  - 翻译: [中文>>英文:颜色]');
        console.log('  - 简单卡片: [word:翻译]');
        console.log('  - 完整卡片: [word:翻译:音标:释义:例句EN:例句CN:同义词:颜色]');
        console.log('🎯 新功能:');
        console.log('  - 🔊 TTS发音');
        console.log('  - ❤️  收藏功能');
        console.log('  - 📝 英英释义');
        console.log('  - 📚 中英例句');
        console.log('  - 🏷️  同义词');
        
        // 显示收藏统计
        const favorites = JSON.parse(localStorage.getItem('vocab_favorites') || '{}');
        console.log('📌 当前收藏:', Object.keys(favorites).length, '个单词');
    }
    
    init();
    
})();

/**
 * NotionNext 英语学习完整脚本
 * 支持三种效果：填空、悬停翻译、词汇卡片
 * 
 * 使用方法：
 * 1. 填空：[_:答案:颜色] 或 [blank:答案:颜色]
 * 2. 悬停翻译：[中文>>英文:颜色] 或 [中文>>英文]
 * 3. 词汇卡片：[词汇:翻译:音标:释义:例句]
 */

(function() {
    'use strict';
    
    // ===== 配置 =====
    const CONFIG = {
        // 颜色映射
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
        // 卡片配置
        cardWidth: 580,
        cardMaxHeight: '85vh',
        spacing: 10
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
                position: relative;
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
                font-family: Georgia, serif;
                box-shadow: 0 2px 8px rgba(0,0,0,0.2);
                z-index: 1000;
                margin-bottom: 2px;
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
            
            /* ========== 词汇卡片样式 ========== */
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
            
            .vocab-card-title {
                font-size: 28px;
                font-weight: bold;
                color: #2c3e50;
                margin-bottom: 8px;
            }
            
            .vocab-card-phonetic {
                font-size: 16px;
                color: #7f8c8d;
                margin-bottom: 15px;
            }
            
            .vocab-card-translation {
                font-size: 18px;
                color: #34495e;
                margin-bottom: 20px;
                padding: 10px;
                background: #f8f9fa;
                border-radius: 5px;
            }
            
            .vocab-card-section {
                margin-bottom: 20px;
            }
            
            .vocab-card-section-title {
                font-size: 14px;
                font-weight: bold;
                color: #7f8c8d;
                margin-bottom: 8px;
                text-transform: uppercase;
            }
            
            .vocab-card-section-content {
                font-size: 16px;
                line-height: 1.6;
                color: #2c3e50;
            }
            
            .vocab-card-close {
                position: absolute;
                top: 15px;
                right: 15px;
                width: 30px;
                height: 30px;
                border-radius: 50%;
                background: #f0f0f0;
                border: none;
                cursor: pointer;
                font-size: 20px;
                line-height: 30px;
                text-align: center;
                transition: all 0.2s;
            }
            
            .vocab-card-close:hover {
                background: #e0e0e0;
                transform: rotate(90deg);
            }
            
            /* 滚动条 */
            .vocab-card::-webkit-scrollbar {
                width: 10px;
            }
            
            .vocab-card::-webkit-scrollbar-track {
                background: #f1f1f1;
                border-radius: 5px;
            }
            
            .vocab-card::-webkit-scrollbar-thumb {
                background: #999;
                border-radius: 5px;
            }
            
            .vocab-card::-webkit-scrollbar-thumb:hover {
                background: #666;
            }
        `;
        document.head.appendChild(style);
    }
    
    // ===== 解析标记 =====
    function parseMarks(text) {
        const results = [];
        let lastIndex = 0;
        
        // 匹配所有标记：[内容]
        const regex = /\[([^\]]+)\]/g;
        let match;
        
        while ((match = regex.exec(text)) !== null) {
            // 添加之前的普通文本
            if (match.index > lastIndex) {
                results.push({
                    type: 'text',
                    content: text.substring(lastIndex, match.index)
                });
            }
            
            const content = match[1];
            const parts = content.split(':');
            
            // 判断标记类型
            if (parts[0] === '_' || parts[0] === 'blank') {
                // 填空格式：[_:答案:颜色] 或 [blank:答案:颜色]
                results.push({
                    type: 'blank',
                    answer: parts[1] || '',
                    color: parts[2] || 'blue'
                });
            } else if (content.includes('>>')) {
                // 悬停翻译格式：[中文>>英文:颜色]
                const [main, colorPart] = content.split('>>');
                const [translation, color] = (colorPart || '').split(':');
                results.push({
                    type: 'hover',
                    text: main,
                    translation: translation || '',
                    color: color || 'blue'
                });
            } else if (parts.length >= 2) {
                // 词汇卡片格式：[词汇:翻译:音标:释义:例句]
                results.push({
                    type: 'vocab',
                    word: parts[0] || '',
                    translation: parts[1] || '',
                    phonetic: parts[2] || '',
                    definition: parts[3] || '',
                    example: parts[4] || ''
                });
            } else {
                // 无效格式，保持原样
                results.push({
                    type: 'text',
                    content: match[0]
                });
            }
            
            lastIndex = regex.lastIndex;
        }
        
        // 添加剩余文本
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
    
    // ===== 创建词汇词（带卡片）=====
    function createVocabWord(data, vocabId) {
        const span = document.createElement('span');
        span.className = 'vocab-word';
        span.textContent = data.word;
        span.setAttribute('data-vocab-id', vocabId);
        
        // 随机颜色
        const colorKeys = Object.keys(CONFIG.colors);
        const randomColor = CONFIG.colors[colorKeys[Math.floor(Math.random() * colorKeys.length)]];
        span.style.color = randomColor;
        span.style.backgroundColor = randomColor + '20'; // 20% 透明度
        
        span.addEventListener('click', function(e) {
            e.stopPropagation();
            showCard(this, vocabId);
        });
        
        return span;
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
    
    // ===== 生成卡片HTML =====
    function generateCardHTML(data) {
        return `
            <button class="vocab-card-close" onclick="this.closest('.vocab-card').remove()">×</button>
            <div class="vocab-card-content">
                <h1 class="vocab-card-title">${data.word}</h1>
                ${data.phonetic ? `<div class="vocab-card-phonetic">${data.phonetic}</div>` : ''}
                <div class="vocab-card-translation">${data.translation}</div>
                ${data.definition ? `
                    <div class="vocab-card-section">
                        <div class="vocab-card-section-title">Definition</div>
                        <div class="vocab-card-section-content">${data.definition}</div>
                    </div>
                ` : ''}
                ${data.example ? `
                    <div class="vocab-card-section">
                        <div class="vocab-card-section-title">Example</div>
                        <div class="vocab-card-section-content">${data.example}</div>
                    </div>
                ` : ''}
            </div>
        `;
    }
    
    // ===== 计算卡片位置 =====
    function positionCard(card, vocabElement) {
        const rect = vocabElement.getBoundingClientRect();
        const cardHeight = 500;
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
        card.innerHTML = generateCardHTML(data);
        
        document.body.appendChild(card);
        positionCard(card, vocabElement);
        
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
        console.log('  - 卡片: [词汇:翻译:音标:释义:例句]');
    }
    
    init();
    
})();

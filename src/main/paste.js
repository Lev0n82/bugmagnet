(async () => {
    try {
        const text = await navigator.clipboard.readText();
        const active = document.activeElement;
        if (active && typeof active.value !== 'undefined') {
            const start = active.selectionStart || 0;
            const end = active.selectionEnd || 0;
            active.setRangeText(text, start, end, 'end');
        } else if (active && active.isContentEditable) {
            document.execCommand('insertText', false, text);
        }
    } catch (err) {
        console.error(err);
        document.execCommand('paste');
    }
})();
